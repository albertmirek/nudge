import { apiFetch } from '@/api/http';
import type { CreateFriendBody, Friend } from '@/api/types';

export function listFriends(): Promise<Friend[]> {
  return apiFetch<Friend[]>('/v1/friends');
}

export function createFriend(body: CreateFriendBody): Promise<Friend> {
  return apiFetch<Friend>('/v1/friends', { method: 'POST', body: JSON.stringify(body) });
}
