/// <reference types="jest" />

import { ApiError, apiFetch, clearAccessToken, onSessionLost, setAccessToken } from '@/api/http';
import { clearRefreshToken, getRefreshToken, setRefreshToken } from '@/auth/token-store';
import { __reset } from '@/test/mocks/secure-store';

// Real implementation by default (so seeding/reading tokens in tests still works); individual
// tests can override one call with mockRejectedValueOnce to simulate a SecureStore write failure.
jest.mock('@/auth/token-store', () => {
  const actual: typeof import('@/auth/token-store') = jest.requireActual('@/auth/token-store');
  return { ...actual, setRefreshToken: jest.fn(actual.setRefreshToken) };
});

type Call = [string, RequestInit];

const ok = (body: unknown, status = 200) => ({
  ok: true,
  status,
  json: () => Promise.resolve(body),
});
const fail = (status: number, body: unknown = { message: 'nope' }) => ({
  ok: false,
  status,
  json: () => Promise.resolve(body),
});
const session = (n: number) => ({
  accessToken: `access-${n}`,
  accessTokenExpiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
  refreshToken: `refresh-${n}`,
  user: { id: 'u1' },
});

let fetchMock: jest.Mock;
const calls = () => fetchMock.mock.calls as Call[];
const header = (call: Call, name: string) => (call[1].headers as Record<string, string>)[name];

beforeEach(async () => {
  __reset();
  clearAccessToken();
  fetchMock = jest.fn();
  global.fetch = fetchMock as unknown as typeof fetch;
});

describe('public requests', () => {
  it('sends no bearer and parses JSON', async () => {
    fetchMock.mockResolvedValue(ok({ id: 'abc' }));
    await expect(
      apiFetch('/v1/auth/sign-in', { method: 'POST' }, { auth: false }),
    ).resolves.toEqual({ id: 'abc' });
    expect(header(calls()[0]!, 'authorization')).toBeUndefined();
    expect(header(calls()[0]!, 'x-user-id')).toBeUndefined();
  });

  it('throws ApiError with status and code', async () => {
    fetchMock.mockResolvedValue(
      fail(403, { message: 'Email not verified', code: 'EMAIL_NOT_VERIFIED' }),
    );
    const error = await apiFetch('/v1/auth/sign-in', {}, { auth: false }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 403,
      code: 'EMAIL_NOT_VERIFIED',
      message: 'Email not verified',
    });
  });
});

describe('authenticated requests', () => {
  it('fails fast with 401 when there is no session at all', async () => {
    await expect(apiFetch('/v1/users/me')).rejects.toMatchObject({ status: 401 });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('uses the in-memory access token while it is fresh', async () => {
    setAccessToken('access-0', new Date(Date.now() + 10 * 60 * 1000).toISOString());
    fetchMock.mockResolvedValue(ok({ id: 'u1' }));
    await apiFetch('/v1/users/me');
    expect(calls()).toHaveLength(1);
    expect(header(calls()[0]!, 'authorization')).toBe('Bearer access-0');
  });

  it('refreshes first when the access token is missing or about to expire', async () => {
    await setRefreshToken('refresh-0');
    fetchMock.mockResolvedValueOnce(ok(session(1))).mockResolvedValueOnce(ok({ id: 'u1' }));
    await apiFetch('/v1/users/me');
    expect(calls()[0]![0]).toMatch(/\/v1\/auth\/refresh$/);
    expect(JSON.parse(calls()[0]![1].body as string)).toEqual({ refreshToken: 'refresh-0' });
    expect(header(calls()[1]!, 'authorization')).toBe('Bearer access-1');
    await expect(getRefreshToken()).resolves.toBe('refresh-1');
  });

  it('shares one refresh between concurrent callers', async () => {
    await setRefreshToken('refresh-0');
    fetchMock.mockResolvedValueOnce(ok(session(1))).mockResolvedValue(ok({}));
    await Promise.all([apiFetch('/v1/friends'), apiFetch('/v1/users/me'), apiFetch('/v1/friends')]);
    expect(calls().filter(([url]) => url.endsWith('/v1/auth/refresh'))).toHaveLength(1);
  });

  it('retries once after a 401 by refreshing', async () => {
    setAccessToken('stale', new Date(Date.now() + 10 * 60 * 1000).toISOString());
    await setRefreshToken('refresh-0');
    fetchMock
      .mockResolvedValueOnce(fail(401))
      .mockResolvedValueOnce(ok(session(2)))
      .mockResolvedValueOnce(ok({ id: 'u1' }));
    await expect(apiFetch('/v1/users/me')).resolves.toEqual({ id: 'u1' });
    expect(header(calls()[2]!, 'authorization')).toBe('Bearer access-2');
  });

  it('drops the session when the refresh itself is rejected', async () => {
    const lost = jest.fn();
    const unsubscribe = onSessionLost(lost);
    await setRefreshToken('refresh-0');
    fetchMock.mockResolvedValueOnce(fail(401));
    await expect(apiFetch('/v1/users/me')).rejects.toMatchObject({ status: 401 });
    await expect(getRefreshToken()).resolves.toBeNull();
    expect(lost).toHaveBeenCalledTimes(1);
    unsubscribe();
  });

  it('keeps the session when the refresh fails for network reasons', async () => {
    const lost = jest.fn();
    onSessionLost(lost);
    await setRefreshToken('refresh-0');
    fetchMock.mockRejectedValueOnce(new TypeError('Network request failed'));
    await expect(apiFetch('/v1/users/me')).rejects.toThrow('Network request failed');
    await expect(getRefreshToken()).resolves.toBe('refresh-0');
    expect(lost).not.toHaveBeenCalled();
  });

  it('clears the session locally when persisting the refreshed token fails', async () => {
    const lost = jest.fn();
    const unsubscribe = onSessionLost(lost);
    await setRefreshToken('refresh-0');
    jest.mocked(setRefreshToken).mockRejectedValueOnce(new Error('keychain unavailable'));
    fetchMock.mockResolvedValueOnce(ok(session(1)));
    await expect(apiFetch('/v1/users/me')).rejects.toThrow('keychain unavailable');
    await expect(getRefreshToken()).resolves.toBeNull();
    expect(lost).toHaveBeenCalledTimes(1);
    unsubscribe();
  });

  it('does not retry a second 401 after a successful refresh', async () => {
    await setRefreshToken('refresh-0');
    fetchMock
      .mockResolvedValueOnce(ok(session(1)))
      .mockResolvedValueOnce(fail(401))
      .mockResolvedValueOnce(ok(session(2)))
      .mockResolvedValueOnce(fail(401));
    await expect(apiFetch('/v1/users/me')).rejects.toMatchObject({ status: 401 });
    expect(calls()).toHaveLength(4);
    await clearRefreshToken();
  });
});
