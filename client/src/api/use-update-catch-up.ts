import { useMutation, useQueryClient } from '@tanstack/react-query';

import { updateCatchUp } from '@/api/catch-ups';
import { catchUpsQueryKey } from '@/api/use-catch-ups';

export function useUpdateCatchUp(friendId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ catchUpId, note }: { catchUpId: string; note: string }) =>
      updateCatchUp(friendId, catchUpId, note),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: catchUpsQueryKey(friendId) });
    },
  });
}
