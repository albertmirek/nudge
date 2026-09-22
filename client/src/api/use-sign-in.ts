import { useMutation } from '@tanstack/react-query';

import { signIn } from '@/api/auth';
import type { CredentialsBody } from '@/api/types';

export function useSignIn() {
  return useMutation({ mutationFn: (body: CredentialsBody) => signIn(body) });
}
