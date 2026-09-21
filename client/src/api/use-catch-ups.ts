import { useQuery } from '@tanstack/react-query';

import { listCatchUps } from '@/api/catch-ups';

export const catchUpsQueryKey = (friendId: string) => ['friends', friendId, 'catch-ups'];

export function useCatchUps(friendId: string) {
  return useQuery({ queryKey: catchUpsQueryKey(friendId), queryFn: () => listCatchUps(friendId) });
}
