import { useMutation, useQueryClient } from '@tanstack/react-query';

import { updateFriend } from '@/api/friends';
import type { UpdateFriendBody } from '@/api/types';

export function useUpdateFriend(friendId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: UpdateFriendBody) => updateFriend(friendId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friends'] });
    },
  });
}
