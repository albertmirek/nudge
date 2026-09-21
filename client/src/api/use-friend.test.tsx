/// <reference types="jest" />

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import * as friendsApi from '@/api/friends';
import type { Friend } from '@/api/types';
import { useFriend } from '@/api/use-friend';
import { useUpdateFriend } from '@/api/use-update-friend';

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
};

function setup() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { gcTime: 0 } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { client, wrapper };
}

it('fetches one friend by id', async () => {
  jest.mocked(friendsApi.getFriend).mockResolvedValue(FRIEND);
  const { wrapper } = setup();

  const { result } = await renderHook(() => useFriend('friend-1'), { wrapper });

  await waitFor(() => expect(result.current.data).toEqual(FRIEND));
  expect(friendsApi.getFriend).toHaveBeenCalledWith('friend-1');
});

it('updates a friend and invalidates every friends query on success', async () => {
  jest.mocked(friendsApi.updateFriend).mockResolvedValue({ ...FRIEND, name: 'Alicia' });
  const { client, wrapper } = setup();
  const invalidateSpy = jest.spyOn(client, 'invalidateQueries');

  const { result } = await renderHook(() => useUpdateFriend('friend-1'), { wrapper });
  result.current.mutate({ name: 'Alicia' });

  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(friendsApi.updateFriend).toHaveBeenCalledWith('friend-1', { name: 'Alicia' });
  expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['friends'] });
});
