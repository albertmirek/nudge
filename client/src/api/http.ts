import type { SessionResponse } from '@/api/types';
import { clearRefreshToken, getRefreshToken, setRefreshToken } from '@/auth/token-store';

const DEFAULT_API_URL = 'http://localhost:3000';
/** Refresh ahead of time so a request never leaves with a token that dies in flight. */
const EXPIRY_SLACK_MS = 30 * 1000;

export class ApiError extends Error {
  status: number;
  /** Machine-readable reason the server adds to some errors (e.g. EMAIL_NOT_VERIFIED). */
  code?: string;

  constructor(status: number, message: string, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

export type ApiFetchOptions = {
  /** Public auth endpoints pass false; everything else sends a bearer token. */
  auth?: boolean;
};

// The access token is short-lived and only ever lives here, never on disk.
let accessToken: { value: string; expiresAt: number } | null = null;
let refreshInFlight: Promise<void> | null = null;
const sessionLostListeners = new Set<() => void>();

export function setAccessToken(token: string, expiresAt: string): void {
  accessToken = { value: token, expiresAt: new Date(expiresAt).getTime() };
}

export function clearAccessToken(): void {
  accessToken = null;
}

/** Called when the server definitively rejects the refresh token; the session is already cleared. */
export function onSessionLost(listener: () => void): () => void {
  sessionLostListeners.add(listener);
  return () => sessionLostListeners.delete(listener);
}

function baseUrl(): string {
  return process.env.EXPO_PUBLIC_API_URL ?? DEFAULT_API_URL;
}

async function toApiError(response: Response, fallback: string): Promise<ApiError> {
  const body: unknown = await response.json().catch(() => null);
  const record = body && typeof body === 'object' ? (body as Record<string, unknown>) : {};
  const message = typeof record.message === 'string' ? record.message : fallback;
  const code = typeof record.code === 'string' ? record.code : undefined;
  return new ApiError(response.status, message, code);
}

async function rawFetch<T>(
  path: string,
  init: RequestInit | undefined,
  bearer?: string,
): Promise<{ ok: true; data: T } | { ok: false; error: ApiError }> {
  const response = await fetch(`${baseUrl()}${path}`, {
    ...init,
    headers: {
      'content-type': 'application/json',
      ...(bearer ? { authorization: `Bearer ${bearer}` } : {}),
      ...init?.headers,
    },
  });
  if (!response.ok) {
    return {
      ok: false,
      error: await toApiError(
        response,
        `${init?.method ?? 'GET'} ${path} failed with ${response.status}`,
      ),
    };
  }
  if (response.status === 204) return { ok: true, data: undefined as T };
  return { ok: true, data: (await response.json()) as T };
}

async function doRefresh(): Promise<void> {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) throw new ApiError(401, 'Not signed in');
  const result = await rawFetch<SessionResponse>('/v1/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({ refreshToken }),
  });
  if (!result.ok) {
    if (result.error.status === 401) {
      // The server no longer knows this session: expired, revoked or replayed.
      clearAccessToken();
      await clearRefreshToken();
      sessionLostListeners.forEach((listener) => listener());
    }
    throw result.error;
  }
  await setRefreshToken(result.data.refreshToken);
  setAccessToken(result.data.accessToken, result.data.accessTokenExpiresAt);
}

/** Single-flight: concurrent callers share one refresh round-trip. */
export function refreshSession(): Promise<void> {
  refreshInFlight ??= doRefresh().finally(() => {
    refreshInFlight = null;
  });
  return refreshInFlight;
}

async function currentAccessToken(): Promise<string> {
  if (accessToken && accessToken.expiresAt - Date.now() > EXPIRY_SLACK_MS) return accessToken.value;
  await refreshSession();
  if (!accessToken) throw new ApiError(401, 'Not signed in');
  return accessToken.value;
}

export async function apiFetch<T>(
  path: string,
  init?: RequestInit,
  options: ApiFetchOptions = {},
): Promise<T> {
  if (options.auth === false) {
    const result = await rawFetch<T>(path, init);
    if (!result.ok) throw result.error;
    return result.data;
  }

  const first = await rawFetch<T>(path, init, await currentAccessToken());
  if (first.ok) return first.data;
  if (first.error.status !== 401) throw first.error;

  // The token was rejected although it looked fresh (revoked, clock skew): one refresh, one retry.
  await refreshSession();
  const second = await rawFetch<T>(path, init, accessToken?.value);
  if (!second.ok) throw second.error;
  return second.data;
}
