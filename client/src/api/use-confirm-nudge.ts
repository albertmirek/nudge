import { useMutation, useQueryClient } from '@tanstack/react-query';

import { confirmNudge } from '@/api/nudges';

export function useConfirmNudge() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ nudgeId, revision }: { nudgeId: string; revision: number }) =>
      confirmNudge(nudgeId, revision),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friends'] });
    },
  });
}
