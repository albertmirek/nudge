import { apiFetch } from '@/api/http';
import type { Nudge } from '@/api/types';

export function confirmNudge(nudgeId: string, revision: number): Promise<Nudge> {
  return apiFetch<Nudge>(`/v1/nudges/${nudgeId}/confirm`, {
    method: 'POST',
    body: JSON.stringify({ revision }),
  });
}
