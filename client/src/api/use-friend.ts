import { useQuery } from '@tanstack/react-query';

import { getFriend } from '@/api/friends';

/** Keyed under ['friends'] so list-level invalidation refreshes the detail too. */
export function useFriend(friendId: string) {
  return useQuery({ queryKey: ['friends', friendId], queryFn: () => getFriend(friendId) });
}
