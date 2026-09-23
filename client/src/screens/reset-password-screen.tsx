import { useState } from 'react';
import { View } from 'react-native';

import { useResetPassword } from '@/api/use-reset-password';
import { useSession } from '@/auth/session';
import { PasswordInput } from '@/components/auth/password-input';
import { type FormErrors, type ResetPasswordValues, validateResetPassword } from '@/lib/auth';
import { type Theme, useStyles } from '@/theme';
import { Button, Input, Text } from '@/ui';

import { AuthScreenLayout } from './auth-screen-layout';

export type ResetPasswordScreenProps = { email: string };

export function ResetPasswordScreen({ email }: ResetPasswordScreenProps) {
  const styles = useStyles(makeStyles);
  const session = useSession();
  const reset = useResetPassword();
  const [values, setValues] = useState<ResetPasswordValues>({ code: '', newPassword: '' });
  const [errors, setErrors] = useState<FormErrors<ResetPasswordValues>>({});

  const set = (next: ResetPasswordValues) => {
    setValues(next);
    if (Object.keys(errors).length > 0) setErrors({});
  };

  const submit = () => {
    const next = validateResetPassword(values);
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    reset.mutate(
      { email, code: values.code, newPassword: values.newPassword },
      { onSuccess: (response) => session.signIn(response) },
    );
  };

  return (
    <AuthScreenLayout title="Choose a new password" subtitle={`Use the code we sent to ${email}.`}>
      <View style={styles.form}>
        <Input
          label="Code"
          value={values.code}
          onChangeText={(code) => set({ ...values, code: code.replace(/\D/g, '') })}
          error={errors.code}
          keyboardType="number-pad"
          textContentType="oneTimeCode"
          autoComplete="one-time-code"
          maxLength={6}
        />
        <PasswordInput
          label="New password"
          value={values.newPassword}
          onChangeText={(newPassword) => set({ ...values, newPassword })}
          error={errors.newPassword}
          autoComplete="new-password"
          textContentType="newPassword"
          onSubmitEditing={submit}
        />
        {reset.error ? (
          <Text variant="caption" style={styles.serverError}>
            {reset.error.message}
          </Text>
        ) : null}
        <Button label="Save password" onPress={submit} loading={reset.isPending} />
      </View>
    </AuthScreenLayout>
  );
}

const makeStyles = (theme: Theme) => ({
  form: { gap: theme.spacing[4] },
  serverError: { color: theme.colors.danger },
});
