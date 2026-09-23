import { Pressable, View } from 'react-native';

import type { Channel } from '@/api/types';
import { CHANNEL_PLATFORMS, formatHandle } from '@/lib/channels';
import { type Theme, useStyles } from '@/theme';
import { IconButton, Text } from '@/ui';

export type ChannelListProps = {
  channels: Channel[];
  /** Tapping a row opens the chat, which records contact. */
  onOpen: (channel: Channel) => void;
  onEdit: (channel: Channel) => void;
  onAdd: () => void;
};

/** "Contact via": the friend's channels, one tap to open each conversation. */
export function ChannelList({ channels, onOpen, onEdit, onAdd }: ChannelListProps) {
  const styles = useStyles(makeStyles);
  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text variant="body" style={styles.title}>
          Contact via
        </Text>
        <IconButton icon="plus" accessibilityLabel="Add a way to reach" onPress={onAdd} />
      </View>
      {channels.length === 0 ? (
        <Text color="secondary">
          Add WhatsApp, Instagram or another app to reach them in one tap.
        </Text>
      ) : (
        channels.map((channel) => {
          const { label } = CHANNEL_PLATFORMS[channel.type];
          return (
            <View key={channel.id} style={styles.row}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Open ${label}`}
                onPress={() => onOpen(channel)}
                style={({ pressed }) => [styles.open, pressed && styles.pressed]}
              >
                <Text variant="body">{label}</Text>
                <Text color="secondary">{formatHandle(channel.type, channel.handle)}</Text>
              </Pressable>
              <IconButton
                icon="pencil"
                accessibilityLabel={`Edit ${label}`}
                onPress={() => onEdit(channel)}
              />
            </View>
          );
        })
      )}
    </View>
  );
}

const makeStyles = (theme: Theme) => ({
  root: { gap: theme.spacing[3] },
  header: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
  },
  title: { fontFamily: theme.typography.title.fontFamily },
  row: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: theme.spacing[2] },
  open: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    minHeight: theme.sizes.input,
    paddingHorizontal: theme.spacing[3],
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.surface,
  },
  pressed: { opacity: 0.7 },
});
