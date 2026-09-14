import { Pressable, View } from 'react-native';

import { formatDaysAgo } from '@/lib/date';
import { type Theme, useStyles } from '@/theme';
import { Avatar, Checkbox, Text } from '@/ui';

export type ContactRowProps = {
  name: string;
  avatarUri?: string;
  lastContactAt: Date;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  /** Tapping the avatar + name. Omit to make that area non-interactive. */
  onPress?: () => void;
  /** Reference time for "n d ago"; defaults to now. Stories/tests pin it for determinism. */
  now?: Date;
};

/** Figma "contact": avatar · name · "288 d ago" · checkbox. Fully controlled. */
export function ContactRow({
  name,
  avatarUri,
  lastContactAt,
  checked,
  onCheckedChange,
  onPress,
  now,
}: ContactRowProps) {
  const styles = useStyles(makeStyles);

  return (
    <View style={styles.row}>
      <Pressable
        style={styles.profile}
        onPress={onPress}
        disabled={!onPress}
        accessibilityRole={onPress ? 'button' : undefined}
        accessibilityLabel={onPress ? name : undefined}
      >
        <Avatar label={name} source={avatarUri} />
        <Text variant="body" numberOfLines={1} style={styles.name}>
          {name}
        </Text>
      </Pressable>
      <View style={styles.meta}>
        <Text variant="bodyLight" style={styles.date}>
          {formatDaysAgo(lastContactAt, now)}
        </Text>
        <Checkbox
          checked={checked}
          onCheckedChange={onCheckedChange}
          accessibilityLabel={`Select ${name}`}
        />
      </View>
    </View>
  );
}

const makeStyles = (theme: Theme) => ({
  row: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: theme.spacing[2],
  },
  profile: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: theme.spacing[2],
  },
  name: { flexShrink: 1 },
  meta: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: theme.spacing[4],
  },
  date: { textAlign: 'right' as const },
});
