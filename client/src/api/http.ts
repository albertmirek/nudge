// Dev-only defaults matching the server's devAuthMiddleware and Bruno's Local.bru environment.
// Real authentication (and its client-side counterpart) doesn't exist yet.
const DEFAULT_API_URL = 'http://localhost:3000';
const DEFAULT_DEV_USER_ID = '00000000-0000-0000-0000-000000000001';

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const baseUrl = process.env.EXPO_PUBLIC_API_URL ?? DEFAULT_API_URL;
  const userId = process.env.EXPO_PUBLIC_DEV_USER_ID ?? DEFAULT_DEV_USER_ID;

  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      'content-type': 'application/json',
      'x-user-id': userId,
      ...init?.headers,
    },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const message =
      (body && typeof body === 'object' && 'message' in body && String(body.message)) ||
      `${init?.method ?? 'GET'} ${path} failed with ${response.status}`;
    throw new ApiError(response.status, message);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}
