import { View } from 'react-native';

import type { FormErrors } from '@/lib/auth';
import { type Theme, useStyles } from '@/theme';
import { Button, Input, Text } from '@/ui';

import { TextLink } from './text-link';

export type ForgotPasswordFormProps = {
  values: { email: string };
  errors?: FormErrors<{ email: string }>;
  onChange: (values: { email: string }) => void;
  onSubmit: () => void;
  loading?: boolean;
  /** Message from the API (e.g. no account with that email); shown above the CTA. */
  serverError?: string;
  onBack: () => void;
};

/** Placeholder forgot-password form; the visual design is expected to be replaced. */
export function ForgotPasswordForm({
  values,
  errors = {},
  onChange,
  onSubmit,
  loading = false,
  serverError,
  onBack,
}: ForgotPasswordFormProps) {
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
      {serverError ? (
        <Text variant="caption" style={styles.serverError}>
          {serverError}
        </Text>
      ) : null}
      <Button label="Send code" onPress={onSubmit} loading={loading} />
      <TextLink label="Back to sign in" onPress={onBack} style={styles.centered} />
    </View>
  );
}

const makeStyles = (theme: Theme) => ({
  form: { gap: theme.spacing[4] },
  serverError: { color: theme.colors.danger },
  centered: { alignSelf: 'center' as const, paddingTop: theme.spacing[3] },
});
