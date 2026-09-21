import { apiFetch } from '@/api/http';
import type { CatchUp } from '@/api/types';

/** Newest first. */
export function listCatchUps(friendId: string): Promise<CatchUp[]> {
  return apiFetch<CatchUp[]>(`/v1/friends/${friendId}/catch-up`);
}

export function createCatchUp(friendId: string, note: string): Promise<CatchUp> {
  return apiFetch<CatchUp>(`/v1/friends/${friendId}/catch-up`, {
    method: 'POST',
    body: JSON.stringify({ note }),
  });
}

export function updateCatchUp(friendId: string, catchUpId: string, note: string): Promise<CatchUp> {
  return apiFetch<CatchUp>(`/v1/friends/${friendId}/catch-up/${catchUpId}`, {
    method: 'PATCH',
    body: JSON.stringify({ note }),
  });
}
