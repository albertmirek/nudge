import { Pressable } from 'react-native';

import type { CatchUp } from '@/api/types';
import { formatDate } from '@/lib/date';
import { type Theme, useStyles } from '@/theme';
import { Text } from '@/ui';

export type NoteCardProps = {
  note: CatchUp;
  /** Opens the note in the full-screen modal. */
  onPress: () => void;
};

/** Figma "Notes" card: fixed height, so long notes are clipped until opened. */
export function NoteCard({ note, onPress }: NoteCardProps) {
  const styles = useStyles(makeStyles);
  const date = formatDate(new Date(note.createdAt));

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Note from ${date}`}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <Text variant="body" numberOfLines={2} style={styles.text}>
        {note.note}
      </Text>
      <Text variant="bodyLight" color="secondary">
        {date}
      </Text>
    </Pressable>
  );
}

const makeStyles = (theme: Theme) => ({
  card: {
    height: theme.sizes.noteCard,
    justifyContent: 'space-between' as const,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.md,
    padding: theme.spacing[3],
  },
  text: { flexShrink: 1 },
  pressed: { opacity: 0.7 },
});
