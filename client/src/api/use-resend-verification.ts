import { useMutation } from '@tanstack/react-query';

import { resendVerification } from '@/api/auth';
import type { EmailBody } from '@/api/types';

export function useResendVerification() {
  return useMutation({ mutationFn: (body: EmailBody) => resendVerification(body) });
}
