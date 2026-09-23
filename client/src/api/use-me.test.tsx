/// <reference types="jest" />

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { useMe } from '@/api/use-me';
import * as usersApi from '@/api/users';
import type { Me } from '@/api/types';

jest.mock('@/api/users');

const ME: Me = {
  id: 'user-1',
  name: 'Sandra',
  email: 'sandra@example.com',
  timezone: 'Europe/Prague',
  preferredReminderLocalTime: '18:00:00',
  nudgeEnabled: true,
  createdAt: '2026-01-01T00:00:00Z',
};

it('fetches and returns the current user', async () => {
  jest.mocked(usersApi.getMe).mockResolvedValue(ME);
  // One client per test, captured by the wrapper closure so every re-render reuses it.
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );

  const { result } = await renderHook(() => useMe(), { wrapper });

  await waitFor(() => expect(result.current.data).toEqual(ME));
  expect(usersApi.getMe).toHaveBeenCalledTimes(1);
});
