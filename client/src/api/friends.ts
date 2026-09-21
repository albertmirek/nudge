import { apiFetch } from '@/api/http';
import type { CreateFriendBody, Friend, UpdateFriendBody } from '@/api/types';

export function listFriends(): Promise<Friend[]> {
  return apiFetch<Friend[]>('/v1/friends');
}

export function createFriend(body: CreateFriendBody): Promise<Friend> {
  return apiFetch<Friend>('/v1/friends', { method: 'POST', body: JSON.stringify(body) });
}

export function getFriend(friendId: string): Promise<Friend> {
  return apiFetch<Friend>(`/v1/friends/${friendId}`);
}

export function updateFriend(friendId: string, body: UpdateFriendBody): Promise<Friend> {
  return apiFetch<Friend>(`/v1/friends/${friendId}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}
