import { apiFetch } from '@/api/http';
import type { Friend } from '@/api/types';

export function listFriends(): Promise<Friend[]> {
  return apiFetch<Friend[]>('/v1/friends');
}
