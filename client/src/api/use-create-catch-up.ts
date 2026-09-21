import { useMutation, useQueryClient } from '@tanstack/react-query';

import { createCatchUp } from '@/api/catch-ups';
import { catchUpsQueryKey } from '@/api/use-catch-ups';

export function useCreateCatchUp(friendId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (note: string) => createCatchUp(friendId, note),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: catchUpsQueryKey(friendId) });
    },
  });
}
