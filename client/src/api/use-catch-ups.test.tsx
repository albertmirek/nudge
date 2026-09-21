/// <reference types="jest" />

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import * as catchUpsApi from '@/api/catch-ups';
import type { CatchUp } from '@/api/types';
import { useCatchUps } from '@/api/use-catch-ups';
import { useCreateCatchUp } from '@/api/use-create-catch-up';
import { useUpdateCatchUp } from '@/api/use-update-catch-up';

jest.mock('@/api/catch-ups');

const NOTE: CatchUp = { id: 'note-1', note: 'Coffee', createdAt: '2026-09-17T10:00:00Z' };

function setup() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { gcTime: 0 } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { client, wrapper, invalidateSpy: jest.spyOn(client, 'invalidateQueries') };
}

it("fetches a friend's notes", async () => {
  jest.mocked(catchUpsApi.listCatchUps).mockResolvedValue([NOTE]);
  const { wrapper } = setup();

  const { result } = await renderHook(() => useCatchUps('friend-1'), { wrapper });

  await waitFor(() => expect(result.current.data).toEqual([NOTE]));
  expect(catchUpsApi.listCatchUps).toHaveBeenCalledWith('friend-1');
});

it("creates a note and invalidates that friend's notes", async () => {
  jest.mocked(catchUpsApi.createCatchUp).mockResolvedValue(NOTE);
  const { wrapper, invalidateSpy } = setup();

  const { result } = await renderHook(() => useCreateCatchUp('friend-1'), { wrapper });
  result.current.mutate('Coffee');

  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(catchUpsApi.createCatchUp).toHaveBeenCalledWith('friend-1', 'Coffee');
  expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['friends', 'friend-1', 'catch-ups'] });
});

it("edits a note and invalidates that friend's notes", async () => {
  jest.mocked(catchUpsApi.updateCatchUp).mockResolvedValue({ ...NOTE, note: 'Tea' });
  const { wrapper, invalidateSpy } = setup();

  const { result } = await renderHook(() => useUpdateCatchUp('friend-1'), { wrapper });
  result.current.mutate({ catchUpId: 'note-1', note: 'Tea' });

  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(catchUpsApi.updateCatchUp).toHaveBeenCalledWith('friend-1', 'note-1', 'Tea');
  expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['friends', 'friend-1', 'catch-ups'] });
});
