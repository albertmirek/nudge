import { Pressable } from 'react-native';

import { type Theme, useStyles } from '@/theme';
import { Avatar, Text } from '@/ui';

export type FriendListRowProps = {
  name: string;
  avatarUri?: string;
  onPress: () => void;
};

/** Figma "Friend List list" row: avatar · full name. */
export function FriendListRow({ name, avatarUri, onPress }: FriendListRowProps) {
  const styles = useStyles(makeStyles);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={name}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <Avatar label={name} source={avatarUri} />
      <Text variant="body" numberOfLines={1} style={styles.name}>
        {name}
      </Text>
    </Pressable>
  );
}

const makeStyles = (theme: Theme) => ({
  row: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: theme.spacing[4],
  },
  name: { flexShrink: 1 },
  pressed: { opacity: 0.7 },
});
