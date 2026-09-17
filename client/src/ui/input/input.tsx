import type { Ref } from 'react';
import { type StyleProp, TextInput, type TextInputProps, View, type ViewStyle } from 'react-native';

import { type Theme, useStyles, useTheme } from '@/theme';
import { Text } from '@/ui/text/text';

export type InputProps = Omit<TextInputProps, 'style' | 'accessibilityLabel'> & {
  /** Visible label above the field; also its accessibility label. */
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  /** Validation message shown under the field. */
  error?: string;
  /** Keep the label for assistive tech only, when the surrounding layout already shows one. */
  hideLabel?: boolean;
  /** Imperative handle to the underlying TextInput, e.g. to focus it from a button. */
  ref?: Ref<TextInput>;
  style?: StyleProp<ViewStyle>;
};

/** Figma form field: label · white rounded text field · optional error. Fully controlled. */
export function Input({
  label,
  value,
  onChangeText,
  error,
  hideLabel = false,
  ref,
  style,
  multiline,
  ...rest
}: InputProps) {
  const theme = useTheme();
  const styles = useStyles(makeStyles);

  return (
    <View style={[styles.wrapper, style]}>
      {hideLabel ? null : <Text variant="body">{label}</Text>}
      <TextInput
        ref={ref}
        accessibilityLabel={label}
        accessibilityHint={error}
        value={value}
        onChangeText={onChangeText}
        multiline={multiline}
        placeholderTextColor={theme.colors.text.secondary}
        textAlignVertical={multiline ? 'top' : 'center'}
        style={[styles.field, multiline && styles.multiline, error ? styles.invalid : null]}
        {...rest}
      />
      {error ? (
        <Text variant="caption" style={styles.error}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const makeStyles = (theme: Theme) => ({
  wrapper: { gap: theme.spacing[2] },
  field: {
    ...theme.typography.body,
    color: theme.colors.text.primary,
    backgroundColor: theme.colors.surface,
    borderWidth: theme.sizes.border,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.md,
    minHeight: theme.sizes.input,
    paddingHorizontal: theme.spacing[3],
    paddingVertical: theme.spacing[2],
  },
  multiline: { minHeight: theme.sizes.inputMultiline },
  invalid: { borderColor: theme.colors.danger },
  error: { color: theme.colors.danger },
});
