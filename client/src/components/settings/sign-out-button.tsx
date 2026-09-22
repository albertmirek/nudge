import { Pressable, type StyleProp, type ViewStyle } from 'react-native';

import { useSignOut } from '@/api/use-sign-out';
import { type Theme, useStyles } from '@/theme';
import { Text } from '@/ui';

export type SignOutButtonProps = {
  /** Overrides the session mutation (Storybook). */
  signOut?: () => void;
  style?: StyleProp<ViewStyle>;
};

/** Temporary home for sign-out until a settings screen exists. */
export function SignOutButton({ signOut, style }: SignOutButtonProps) {
  const styles = useStyles(makeStyles);
  const mutation = useSignOut();
  const onPress = signOut ?? (() => mutation.mutate());
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Sign out"
      accessibilityState={{ busy: mutation.isPending }}
      disabled={mutation.isPending}
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [styles.button, pressed && styles.pressed, style]}
    >
      <Text variant="caption" style={styles.label}>
        Sign out
      </Text>
    </Pressable>
  );
}

const makeStyles = (theme: Theme) => ({
  button: { alignSelf: 'center' as const, paddingVertical: theme.spacing[4] },
  pressed: { opacity: 0.6 },
  label: { color: theme.colors.danger },
});
