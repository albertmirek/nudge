import { useRouter } from 'expo-router';
import { useState } from 'react';

import { useForgotPassword } from '@/api/use-forgot-password';
import { ForgotPasswordForm } from '@/components/auth/forgot-password-form';
import { type FormErrors, validateEmailOnly } from '@/lib/auth';

import { AuthScreenLayout } from './auth-screen-layout';

export function ForgotPasswordScreen() {
  const router = useRouter();
  const forgotPassword = useForgotPassword();
  const [values, setValues] = useState<{ email: string }>({ email: '' });
  const [errors, setErrors] = useState<FormErrors<{ email: string }>>({});

  const submit = () => {
    const next = validateEmailOnly(values);
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    const email = values.email.trim().toLowerCase();
    forgotPassword.mutate(
      { email },
      { onSuccess: () => router.push({ pathname: '/reset-password', params: { email } }) },
    );
  };

  return (
    <AuthScreenLayout
      title="Reset your password"
      subtitle="Enter your email and we'll send a code."
    >
      <ForgotPasswordForm
        values={values}
        errors={errors}
        onChange={(next) => {
          setValues(next);
          if (Object.keys(errors).length > 0) setErrors({});
        }}
        onSubmit={submit}
        loading={forgotPassword.isPending}
        serverError={forgotPassword.error?.message}
        onBack={() => router.back()}
      />
    </AuthScreenLayout>
  );
}
