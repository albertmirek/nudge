import { apiFetch } from '@/api/http';
import type { Channel, CreateChannelBody, OpenChannelResult, UpdateChannelBody } from '@/api/types';

export function createChannel(friendId: string, body: CreateChannelBody): Promise<Channel> {
  return apiFetch<Channel>(`/v1/friends/${friendId}/channels`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function updateChannel(
  friendId: string,
  channelId: string,
  body: UpdateChannelBody,
): Promise<Channel> {
  return apiFetch<Channel>(`/v1/friends/${friendId}/channels/${channelId}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export function deleteChannel(friendId: string, channelId: string): Promise<void> {
  return apiFetch<void>(`/v1/friends/${friendId}/channels/${channelId}`, { method: 'DELETE' });
}

/** Call after the link opened: records contact now and replans the nudge. */
export function openChannel(friendId: string, channelId: string): Promise<OpenChannelResult> {
  return apiFetch<OpenChannelResult>(`/v1/friends/${friendId}/channels/${channelId}/open`, {
    method: 'POST',
  });
}
