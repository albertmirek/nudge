import { useMutation } from '@tanstack/react-query';

import { resetPassword } from '@/api/auth';
import type { ResetPasswordBody } from '@/api/types';

export function useResetPassword() {
  return useMutation({ mutationFn: (body: ResetPasswordBody) => resetPassword(body) });
}
