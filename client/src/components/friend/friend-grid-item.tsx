import { Pressable } from 'react-native';

import { firstName } from '@/lib/friends';
import { type Theme, useStyles, useTheme } from '@/theme';
import { Avatar, Text } from '@/ui';

export type FriendGridItemProps = {
  name: string;
  avatarUri?: string;
  onPress: () => void;
};

/** Figma "Friend List grid" tile: large avatar over the first name. */
export function FriendGridItem({ name, avatarUri, onPress }: FriendGridItemProps) {
  const theme = useTheme();
  const styles = useStyles(makeStyles);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={name}
      onPress={onPress}
      style={({ pressed }) => [styles.tile, pressed && styles.pressed]}
    >
      <Avatar label={name} source={avatarUri} size={theme.sizes.avatarLarge} />
      <Text variant="body" numberOfLines={1}>
        {firstName(name)}
      </Text>
    </Pressable>
  );
}

const makeStyles = (theme: Theme) => ({
  tile: { alignItems: 'center' as const, gap: theme.spacing[2] },
  pressed: { opacity: 0.7 },
});
