import { Pressable, type StyleProp, type ViewStyle } from 'react-native';

import { type Theme, useStyles, useTheme } from '@/theme';
import { Icon, type IconName } from '@/ui/icon/icon';

export type IconButtonProps = {
  icon: IconName;
  /** Required: the icon has no visible text. */
  accessibilityLabel: string;
  onPress: () => void;
  /** `plain` is just the icon in a touch target; `raised` is a surface-coloured disc with a shadow. */
  variant?: 'plain' | 'raised';
  /** `lg` is the Figma photo placeholder (80px disc, 28px icon). */
  size?: 'md' | 'lg';
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function IconButton({
  icon,
  accessibilityLabel,
  onPress,
  variant = 'plain',
  size = 'md',
  disabled = false,
  style,
}: IconButtonProps) {
  const theme = useTheme();
  const styles = useStyles(makeStyles);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        styles[size],
        variant === 'raised' && styles.raised,
        pressed && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
    >
      <Icon name={icon} size={size === 'lg' ? theme.sizes.iconLarge : theme.sizes.icon} />
    </Pressable>
  );
}

const makeStyles = (theme: Theme) => ({
  base: {
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    borderRadius: theme.radii.full,
  },
  md: { width: theme.sizes.iconButton, height: theme.sizes.iconButton },
  lg: { width: theme.sizes.photoButton, height: theme.sizes.photoButton },
  raised: {
    backgroundColor: theme.colors.surface,
    shadowColor: theme.colors.text.primary,
    shadowOpacity: theme.scheme === 'dark' ? 0 : 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  pressed: { opacity: 0.7 },
  disabled: { opacity: 0.4 },
});
