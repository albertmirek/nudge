import { useRouter } from 'expo-router';
import { useState } from 'react';

import { ApiError } from '@/api/http';
import { useSignIn } from '@/api/use-sign-in';
import { useSession } from '@/auth/session';
import { SignInForm } from '@/components/auth/sign-in-form';
import { type CredentialsValues, type FormErrors, validateCredentials } from '@/lib/auth';

import { AuthScreenLayout } from './auth-screen-layout';

export function SignInScreen() {
  const router = useRouter();
  const session = useSession();
  const signIn = useSignIn();
  const [values, setValues] = useState<CredentialsValues>({ email: '', password: '' });
  const [errors, setErrors] = useState<FormErrors<CredentialsValues>>({});

  const submit = () => {
    const next = validateCredentials(values);
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    const email = values.email.trim().toLowerCase();
    signIn.mutate(
      { email, password: values.password },
      {
        onSuccess: (response) => session.signIn(response),
        onError: (error) => {
          // The server already re-sent a code; the user just needs to type it.
          if (error instanceof ApiError && error.code === 'EMAIL_NOT_VERIFIED') {
            router.push({ pathname: '/verify-email', params: { email } });
          }
        },
      },
    );
  };

  const serverError =
    signIn.error instanceof ApiError && signIn.error.code === 'EMAIL_NOT_VERIFIED'
      ? undefined
      : signIn.error?.message;

  return (
    <AuthScreenLayout title="Welcome back" subtitle="Sign in to see who's due for a catch-up.">
      <SignInForm
        values={values}
        errors={errors}
        onChange={(next) => {
          setValues(next);
          if (Object.keys(errors).length > 0) setErrors({});
        }}
        onSubmit={submit}
        loading={signIn.isPending}
        serverError={serverError}
        onForgotPassword={() => router.push('/forgot-password')}
        onCreateAccount={() => router.push('/sign-up')}
      />
    </AuthScreenLayout>
  );
}
