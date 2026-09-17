import { useMutation, useQueryClient } from '@tanstack/react-query';

import { createFriend } from '@/api/friends';
import type { CreateFriendBody } from '@/api/types';

export function useCreateFriend() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: CreateFriendBody) => createFriend(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friends'] });
    },
  });
}
