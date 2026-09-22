import { Pressable, type StyleProp, type ViewStyle } from 'react-native';

import { type Theme, useStyles } from '@/theme';
import { Text } from '@/ui';

export type TextLinkProps = { label: string; onPress: () => void; style?: StyleProp<ViewStyle> };

/** Secondary action in the auth flow ("Forgot password?", "Create account"). */
export function TextLink({ label, onPress, style }: TextLinkProps) {
  const styles = useStyles(makeStyles);
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [pressed && styles.pressed, style]}
    >
      <Text variant="body" style={styles.label}>
        {label}
      </Text>
    </Pressable>
  );
}

const makeStyles = (theme: Theme) => ({
  label: { color: theme.colors.accent, fontFamily: theme.typography.title.fontFamily },
  pressed: { opacity: 0.6 },
});
