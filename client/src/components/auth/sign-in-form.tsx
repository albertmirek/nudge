import { View } from 'react-native';

import type { CredentialsValues, FormErrors } from '@/lib/auth';
import { type Theme, useStyles } from '@/theme';
import { Button, Input, Text } from '@/ui';

import { PasswordInput } from './password-input';
import { TextLink } from './text-link';

export type SignInFormProps = {
  values: CredentialsValues;
  errors?: FormErrors<CredentialsValues>;
  onChange: (values: CredentialsValues) => void;
  onSubmit: () => void;
  loading?: boolean;
  /** Message from the API (e.g. wrong password); shown above the CTA. */
  serverError?: string;
  onForgotPassword: () => void;
  onCreateAccount: () => void;
};

/** Placeholder sign-in form; the visual design is expected to be replaced. */
export function SignInForm({
  values,
  errors = {},
  onChange,
  onSubmit,
  loading = false,
  serverError,
  onForgotPassword,
  onCreateAccount,
}: SignInFormProps) {
  const styles = useStyles(makeStyles);
  return (
    <View style={styles.form}>
      <Input
        label="Email"
        value={values.email}
        onChangeText={(email) => onChange({ ...values, email })}
        error={errors.email}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        keyboardType="email-address"
        textContentType="emailAddress"
      />
      <PasswordInput
        label="Password"
        value={values.password}
        onChangeText={(password) => onChange({ ...values, password })}
        error={errors.password}
        autoComplete="password"
        onSubmitEditing={onSubmit}
      />
      <TextLink label="Forgot password?" onPress={onForgotPassword} style={styles.inlineLink} />
      {serverError ? (
        <Text variant="caption" style={styles.serverError}>
          {serverError}
        </Text>
      ) : null}
      <Button label="Sign in" onPress={onSubmit} loading={loading} />
      <View style={styles.footer}>
        <Text variant="body" color="secondary">
          New here?
        </Text>
        <TextLink label="Create account" onPress={onCreateAccount} />
      </View>
    </View>
  );
}

const makeStyles = (theme: Theme) => ({
  form: { gap: theme.spacing[4] },
  inlineLink: { alignSelf: 'flex-end' as const },
  serverError: { color: theme.colors.danger },
  footer: {
    flexDirection: 'row' as const,
    justifyContent: 'center' as const,
    gap: theme.spacing[2],
    paddingTop: theme.spacing[3],
  },
});
