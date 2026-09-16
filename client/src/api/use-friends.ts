import { useQuery } from '@tanstack/react-query';

import { listFriends } from '@/api/friends';

export function useFriends() {
  return useQuery({ queryKey: ['friends'], queryFn: listFriends });
}
