import { ActivityIndicator, Pressable, type StyleProp, type ViewStyle } from 'react-native';

import { type Theme, useStyles, useTheme } from '@/theme';
import { Text } from '@/ui/text/text';

export type ButtonVariant = 'highlight' | 'accent';

export type ButtonProps = {
  label: string;
  onPress: () => void;
  /** `highlight` is the Figma lime "Save" pill; `accent` the indigo brand colour. */
  variant?: ButtonVariant;
  disabled?: boolean;
  /** Replaces the label with a spinner and blocks presses (e.g. while a request is in flight). */
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Button({
  label,
  onPress,
  variant = 'highlight',
  disabled = false,
  loading = false,
  style,
}: ButtonProps) {
  const theme = useTheme();
  const styles = useStyles(makeStyles);
  const inactive = disabled || loading;
  const foreground = variant === 'highlight' ? theme.colors.onHighlight : theme.colors.onAccent;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        pressed && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator testID="button-spinner" color={foreground} />
      ) : (
        <Text variant="body" style={[styles.label, { color: foreground }]}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const makeStyles = (theme: Theme) => ({
  base: {
    height: theme.sizes.button,
    minWidth: theme.sizes.button * 2,
    paddingHorizontal: theme.spacing[5],
    borderRadius: theme.radii.full,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  highlight: { backgroundColor: theme.colors.highlight },
  accent: { backgroundColor: theme.colors.accent },
  label: { ...theme.typography.body, fontFamily: theme.typography.title.fontFamily },
  pressed: { opacity: 0.8 },
  disabled: { opacity: 0.4 },
});
