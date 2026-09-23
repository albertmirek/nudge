import { useMutation } from '@tanstack/react-query';

import { useSession } from '@/auth/session';

export function useSignOut() {
  const { signOut } = useSession();
  return useMutation({ mutationFn: () => signOut() });
}
