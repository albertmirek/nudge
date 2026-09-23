import { View } from 'react-native';

import type { CodeValues, FormErrors } from '@/lib/auth';
import { type Theme, useStyles } from '@/theme';
import { Button, Input, Text } from '@/ui';

import { TextLink } from './text-link';

export type CodeFormProps = {
  values: CodeValues;
  errors?: FormErrors<CodeValues>;
  onChange: (values: CodeValues) => void;
  onSubmit: () => void;
  loading?: boolean;
  serverError?: string;
  submitLabel: string;
  /** Shown as a "Resend code" link when provided (verification only). */
  onResend?: () => void;
};

/** Six-digit code entry shared by email verification and password reset. */
export function CodeForm({
  values,
  errors = {},
  onChange,
  onSubmit,
  loading = false,
  serverError,
  submitLabel,
  onResend,
}: CodeFormProps) {
  const styles = useStyles(makeStyles);
  return (
    <View style={styles.form}>
      <Input
        label="Code"
        value={values.code}
        onChangeText={(code) => onChange({ ...values, code: code.replace(/\D/g, '') })}
        error={errors.code}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="one-time-code"
        maxLength={6}
        onSubmitEditing={onSubmit}
      />
      {serverError ? (
        <Text variant="caption" style={styles.serverError}>
          {serverError}
        </Text>
      ) : null}
      <Button label={submitLabel} onPress={onSubmit} loading={loading} />
      {onResend ? (
        <TextLink label="Resend code" onPress={onResend} style={styles.centered} />
      ) : null}
    </View>
  );
}

const makeStyles = (theme: Theme) => ({
  form: { gap: theme.spacing[4] },
  serverError: { color: theme.colors.danger },
  centered: { alignSelf: 'center' as const, paddingTop: theme.spacing[3] },
});
