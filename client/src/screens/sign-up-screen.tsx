import { useRouter } from 'expo-router';
import { useState } from 'react';

import { useSignUp } from '@/api/use-sign-up';
import { SignUpForm } from '@/components/auth/sign-up-form';
import {
  type CredentialsValues,
  deviceTimezone,
  type FormErrors,
  validateCredentials,
} from '@/lib/auth';

import { AuthScreenLayout } from './auth-screen-layout';

export function SignUpScreen() {
  const router = useRouter();
  const signUp = useSignUp();
  const [values, setValues] = useState<CredentialsValues>({ email: '', password: '' });
  const [errors, setErrors] = useState<FormErrors<CredentialsValues>>({});

  const submit = () => {
    const next = validateCredentials(values);
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    const email = values.email.trim().toLowerCase();
    signUp.mutate(
      { email, password: values.password, timezone: deviceTimezone() },
      {
        onSuccess: () => router.push({ pathname: '/verify-email', params: { email } }),
      },
    );
  };

  return (
    <AuthScreenLayout
      title="Create your account"
      subtitle="We'll email you a code to confirm it's you."
    >
      <SignUpForm
        values={values}
        errors={errors}
        onChange={(next) => {
          setValues(next);
          if (Object.keys(errors).length > 0) setErrors({});
        }}
        onSubmit={submit}
        loading={signUp.isPending}
        serverError={signUp.error?.message}
        onSignIn={() => router.back()}
      />
    </AuthScreenLayout>
  );
}
