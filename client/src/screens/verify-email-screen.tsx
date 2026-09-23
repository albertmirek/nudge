import { useState } from 'react';

import { useResendVerification } from '@/api/use-resend-verification';
import { useVerifyEmail } from '@/api/use-verify-email';
import { useSession } from '@/auth/session';
import { CodeForm } from '@/components/auth/code-form';
import { type CodeValues, type FormErrors, validateCode } from '@/lib/auth';

import { AuthScreenLayout } from './auth-screen-layout';

export type VerifyEmailScreenProps = { email: string };

export function VerifyEmailScreen({ email }: VerifyEmailScreenProps) {
  const session = useSession();
  const verify = useVerifyEmail();
  const resend = useResendVerification();
  const [values, setValues] = useState<CodeValues>({ code: '' });
  const [errors, setErrors] = useState<FormErrors<CodeValues>>({});

  const submit = () => {
    const next = validateCode(values);
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    verify.mutate(
      { email, code: values.code },
      { onSuccess: (response) => session.signIn(response) },
    );
  };

  const subtitle = resend.isSuccess
    ? `Code sent. Check ${email} again.`
    : `We sent a 6-digit code to ${email}.`;

  return (
    <AuthScreenLayout title="Check your inbox" subtitle={subtitle}>
      <CodeForm
        values={values}
        errors={errors}
        onChange={(next) => {
          setValues(next);
          if (Object.keys(errors).length > 0) setErrors({});
        }}
        onSubmit={submit}
        loading={verify.isPending}
        serverError={verify.error?.message ?? resend.error?.message}
        submitLabel="Verify"
        onResend={() => resend.mutate({ email })}
      />
    </AuthScreenLayout>
  );
}
