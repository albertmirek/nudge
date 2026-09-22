import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { type Theme, useStyles } from '@/theme';
import { Input, type InputProps, Text } from '@/ui';

export type PasswordInputProps = Omit<InputProps, 'secureTextEntry' | 'multiline'>;

/** `Input` with a Show/Hide toggle — the cheapest fix for the most common sign-up typo. */
export function PasswordInput(props: PasswordInputProps) {
  const styles = useStyles(makeStyles);
  const [visible, setVisible] = useState(false);
  const toggleLabel = visible ? 'Hide password' : 'Show password';
  return (
    <View>
      <Input
        {...props}
        secureTextEntry={!visible}
        autoCapitalize="none"
        autoCorrect={false}
        textContentType={props.textContentType ?? 'password'}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={toggleLabel}
        onPress={() => setVisible((v) => !v)}
        hitSlop={8}
        style={styles.toggle}
      >
        <Text variant="caption" style={styles.toggleLabel}>
          {visible ? 'Hide' : 'Show'}
        </Text>
      </Pressable>
    </View>
  );
}

const makeStyles = (theme: Theme) => ({
  toggle: { position: 'absolute' as const, right: theme.spacing[3], top: 0 },
  toggleLabel: { color: theme.colors.accent },
});
