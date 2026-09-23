/// <reference types="jest" />

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { useCreateFriend } from '@/api/use-create-friend';
import * as friendsApi from '@/api/friends';
import type { Friend } from '@/api/types';

jest.mock('@/api/friends');

const FRIEND: Friend = {
  id: 'friend-1',
  name: 'Alice',
  periodicity: 'MONTHLY',
  lastContactAt: null,
  nudgeEnabled: true,
  metAt: null,
  livesIn: null,
  birthday: null,
  notes: null,
  createdAt: '2026-09-17T10:00:00Z',
  updatedAt: '2026-09-17T10:00:00Z',
  nudge: null,
  channels: [],
};

it('creates a friend and invalidates the friends query on success', async () => {
  jest.mocked(friendsApi.createFriend).mockResolvedValue(FRIEND);
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { gcTime: 0 } },
  });
  const invalidateSpy = jest.spyOn(client, 'invalidateQueries');
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );

  const { result } = await renderHook(() => useCreateFriend(), { wrapper });
  result.current.mutate({ name: 'Alice', periodicity: 'MONTHLY' });

  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(friendsApi.createFriend).toHaveBeenCalledWith({ name: 'Alice', periodicity: 'MONTHLY' });
  expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['friends'] });
});
