/// <reference types="jest" />

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import * as channelsApi from '@/api/channels';
import type { Channel } from '@/api/types';
import {
  useCreateChannel,
  useDeleteChannel,
  useOpenChannel,
  useUpdateChannel,
} from '@/api/use-channel-mutations';

jest.mock('@/api/channels');

const CHANNEL: Channel = {
  id: 'channel-1',
  type: 'WHATSAPP',
  handle: '+420777123456',
  deepLink: null,
  link: 'https://wa.me/420777123456',
};

function setup() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { gcTime: 0 } },
  });
  const invalidateSpy = jest.spyOn(client, 'invalidateQueries');
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { wrapper, invalidateSpy };
}

beforeEach(() => {
  jest.mocked(channelsApi.createChannel).mockResolvedValue(CHANNEL);
  jest.mocked(channelsApi.updateChannel).mockResolvedValue(CHANNEL);
  jest.mocked(channelsApi.deleteChannel).mockResolvedValue(undefined);
  jest.mocked(channelsApi.openChannel).mockResolvedValue({
    lastContactAt: '2026-09-23T10:00:00Z',
    nudge: {
      id: 'nudge-1',
      scheduledFor: '2026-10-23T16:00:00Z',
      status: 'PLANNED',
      revision: 3,
      lastEditedAt: '2026-09-23T10:00:00Z',
    },
  });
});

it('creates a channel and refreshes friends', async () => {
  const { wrapper, invalidateSpy } = setup();
  const { result } = await renderHook(() => useCreateChannel('friend-1'), { wrapper });
  result.current.mutate({ type: 'WHATSAPP', handle: '+420777123456' });
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(channelsApi.createChannel).toHaveBeenCalledWith('friend-1', {
    type: 'WHATSAPP',
    handle: '+420777123456',
  });
  expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['friends'] });
});

it('updates a channel', async () => {
  const { wrapper, invalidateSpy } = setup();
  const { result } = await renderHook(() => useUpdateChannel('friend-1'), { wrapper });
  result.current.mutate({ channelId: 'channel-1', body: { handle: '+420777000111' } });
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(channelsApi.updateChannel).toHaveBeenCalledWith('friend-1', 'channel-1', {
    handle: '+420777000111',
  });
  expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['friends'] });
});

it('deletes a channel', async () => {
  const { wrapper, invalidateSpy } = setup();
  const { result } = await renderHook(() => useDeleteChannel('friend-1'), { wrapper });
  result.current.mutate('channel-1');
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(channelsApi.deleteChannel).toHaveBeenCalledWith('friend-1', 'channel-1');
  expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['friends'] });
});

it('records an opened channel', async () => {
  const { wrapper, invalidateSpy } = setup();
  const { result } = await renderHook(() => useOpenChannel('friend-1'), { wrapper });
  result.current.mutate('channel-1');
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(channelsApi.openChannel).toHaveBeenCalledWith('friend-1', 'channel-1');
  expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['friends'] });
});
