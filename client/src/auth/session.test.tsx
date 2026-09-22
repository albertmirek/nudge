/// <reference types="jest" />

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import * as authApi from '@/api/auth';
import { SessionProvider, useSession } from '@/auth/session';
import { getRefreshToken, setRefreshToken } from '@/auth/token-store';
import type { SessionResponse } from '@/api/types';
import { __reset } from '@/test/mocks/secure-store';

jest.mock('@/api/auth');

const SESSION: SessionResponse = {
  accessToken: 'access-1',
  accessTokenExpiresAt: new Date(Date.now() + 900_000).toISOString(),
  refreshToken: 'refresh-1',
  user: {
    id: 'u1',
    email: 'a@b.co',
    name: '',
    timezone: 'UTC',
    preferredReminderLocalTime: '18:00:00',
    nudgeEnabled: true,
    createdAt: '2026-09-21T00:00:00Z',
  },
};

function setup() {
  // No gcTime override: the `['me']` cache entry set by `signIn` has no active observer in
  // this test, so `gcTime: 0` would race a real setTimeout(0) GC against the assertion below.
  // Each test gets its own fresh client, so there's no cross-test isolation reason to zero it.
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>
      <SessionProvider>{children}</SessionProvider>
    </QueryClientProvider>
  );
  return { client, wrapper };
}

beforeEach(() => {
  __reset();
  jest.mocked(authApi.signOut).mockResolvedValue(undefined);
});

it('starts signed out when nothing is stored', async () => {
  const { wrapper } = setup();
  const { result } = await renderHook(() => useSession(), { wrapper });
  await waitFor(() => expect(result.current.status).toBe('signedOut'));
});

it('starts signed in when a refresh token is stored, without touching the network', async () => {
  await setRefreshToken('refresh-0');
  const fetchMock = jest.fn();
  global.fetch = fetchMock as unknown as typeof fetch;
  const { wrapper } = setup();
  const { result } = await renderHook(() => useSession(), { wrapper });
  await waitFor(() => expect(result.current.status).toBe('signedIn'));
  expect(fetchMock).not.toHaveBeenCalled();
});

it('signIn stores the token, seeds me, and flips the status', async () => {
  const { client, wrapper } = setup();
  const { result } = await renderHook(() => useSession(), { wrapper });
  await waitFor(() => expect(result.current.status).toBe('signedOut'));
  await act(() => result.current.signIn(SESSION));
  expect(result.current.status).toBe('signedIn');
  await expect(getRefreshToken()).resolves.toBe('refresh-1');
  expect(client.getQueryData(['me'])).toEqual(SESSION.user);
});

it('signOut revokes on the server best-effort and clears everything', async () => {
  await setRefreshToken('refresh-0');
  jest.mocked(authApi.signOut).mockRejectedValue(new Error('offline'));
  const { client, wrapper } = setup();
  client.setQueryData(['friends'], []);
  const { result } = await renderHook(() => useSession(), { wrapper });
  await waitFor(() => expect(result.current.status).toBe('signedIn'));
  await act(() => result.current.signOut());
  expect(authApi.signOut).toHaveBeenCalledWith({ refreshToken: 'refresh-0' });
  expect(result.current.status).toBe('signedOut');
  await expect(getRefreshToken()).resolves.toBeNull();
  expect(client.getQueryData(['friends'])).toBeUndefined();
});
