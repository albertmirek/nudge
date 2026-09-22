import { useMutation } from '@tanstack/react-query';

import { forgotPassword } from '@/api/auth';
import type { EmailBody } from '@/api/types';

export function useForgotPassword() {
  return useMutation({ mutationFn: (body: EmailBody) => forgotPassword(body) });
}
