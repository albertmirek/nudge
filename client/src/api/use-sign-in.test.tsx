/// <reference types="jest" />

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import * as authApi from '@/api/auth';
import { useSignIn } from '@/api/use-sign-in';

jest.mock('@/api/auth');

it('signs in and resolves with the session', async () => {
  const session = {
    accessToken: 'a',
    accessTokenExpiresAt: '2026-09-21T10:15:00Z',
    refreshToken: 'r',
    user: { id: 'u1' },
  };
  jest.mocked(authApi.signIn).mockResolvedValue(session as never);
  const client = new QueryClient({ defaultOptions: { mutations: { gcTime: 0 } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );

  const { result } = await renderHook(() => useSignIn(), { wrapper });
  result.current.mutate({ email: 'a@b.co', password: 'password1' });

  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(result.current.data).toEqual(session);
});
