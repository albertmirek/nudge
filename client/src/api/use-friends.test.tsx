/// <reference types="jest" />

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { useFriends } from '@/api/use-friends';
import * as friendsApi from '@/api/friends';
import type { Friend } from '@/api/types';

jest.mock('@/api/friends');

const FRIENDS: Friend[] = [
  {
    id: 'f1',
    name: 'Alice',
    periodicity: 'MONTHLY',
    lastContactAt: null,
    nudgeEnabled: true,
    metAt: null,
    livesIn: null,
    birthday: null,
    notes: null,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    nudge: null,
  },
];

it('fetches and returns the friends list', async () => {
  jest.mocked(friendsApi.listFriends).mockResolvedValue(FRIENDS);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );

  const { result } = await renderHook(() => useFriends(), { wrapper });

  await waitFor(() => expect(result.current.data).toEqual(FRIENDS));
  expect(friendsApi.listFriends).toHaveBeenCalledTimes(1);
});
