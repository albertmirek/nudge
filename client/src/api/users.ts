import { apiFetch } from '@/api/http';
import type { Me } from '@/api/types';

export function getMe(): Promise<Me> {
  return apiFetch<Me>('/v1/users/me');
}
