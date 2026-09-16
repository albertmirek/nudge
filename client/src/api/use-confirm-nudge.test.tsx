/// <reference types="jest" />

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { useConfirmNudge } from '@/api/use-confirm-nudge';
import * as nudgesApi from '@/api/nudges';
import type { Nudge } from '@/api/types';

jest.mock('@/api/nudges');

const NUDGE: Nudge = {
  id: 'nudge-1',
  scheduledFor: '2026-10-01T12:00:00Z',
  status: 'PLANNED',
  revision: 2,
  lastEditedAt: '2026-09-14T12:00:00Z',
};

it('confirms a nudge and invalidates the friends query on success', async () => {
  jest.mocked(nudgesApi.confirmNudge).mockResolvedValue(NUDGE);
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { gcTime: 0 } },
  });
  const invalidateSpy = jest.spyOn(client, 'invalidateQueries');
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );

  const { result } = await renderHook(() => useConfirmNudge(), { wrapper });
  result.current.mutate({ nudgeId: 'nudge-1', revision: 1 });

  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(nudgesApi.confirmNudge).toHaveBeenCalledWith('nudge-1', 1);
  expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['friends'] });
});
