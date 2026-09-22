import { useMutation } from '@tanstack/react-query';

import { verifyEmail } from '@/api/auth';
import type { CodeBody } from '@/api/types';

export function useVerifyEmail() {
  return useMutation({ mutationFn: (body: CodeBody) => verifyEmail(body) });
}
