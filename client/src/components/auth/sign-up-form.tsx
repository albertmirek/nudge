import { View } from 'react-native';

import type { CredentialsValues, FormErrors } from '@/lib/auth';
import { type Theme, useStyles } from '@/theme';
import { Button, Input, Text } from '@/ui';

import { PasswordInput } from './password-input';
import { TextLink } from './text-link';

export type SignUpFormProps = {
  values: CredentialsValues;
  errors?: FormErrors<CredentialsValues>;
  onChange: (values: CredentialsValues) => void;
  onSubmit: () => void;
  loading?: boolean;
  /** Message from the API (e.g. email already in use); shown above the CTA. */
  serverError?: string;
  onSignIn: () => void;
};

/** Placeholder sign-up form; the visual design is expected to be replaced. */
export function SignUpForm({
  values,
  errors = {},
  onChange,
  onSubmit,
  loading = false,
  serverError,
  onSignIn,
}: SignUpFormProps) {
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
        autoComplete="new-password"
        textContentType="newPassword"
        onSubmitEditing={onSubmit}
      />
      <Text variant="caption" color="secondary">
        At least 8 characters
      </Text>
      {serverError ? (
        <Text variant="caption" style={styles.serverError}>
          {serverError}
        </Text>
      ) : null}
      <Button label="Create account" onPress={onSubmit} loading={loading} />
      <View style={styles.footer}>
        <Text variant="body" color="secondary">
          Already have an account?
        </Text>
        <TextLink label="Sign in" onPress={onSignIn} />
      </View>
    </View>
  );
}

const makeStyles = (theme: Theme) => ({
  form: { gap: theme.spacing[4] },
  serverError: { color: theme.colors.danger },
  footer: {
    flexDirection: 'row' as const,
    justifyContent: 'center' as const,
    gap: theme.spacing[2],
    paddingTop: theme.spacing[3],
  },
});
