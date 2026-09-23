import { useMutation } from '@tanstack/react-query';

import { signUp } from '@/api/auth';
import type { SignUpBody } from '@/api/types';

export function useSignUp() {
  return useMutation({ mutationFn: (body: SignUpBody) => signUp(body) });
}
