import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { type Theme, useStyles } from '@/theme';
import { Button, Input, Text } from '@/ui';

export type NoteModalProps = {
  visible: boolean;
  /** Text of the note being edited; omit to create a new one. */
  initialNote?: string;
  onSave: (note: string) => void;
  onClose: () => void;
  saving?: boolean;
  /** Request failure shown above the text. */
  error?: string;
};

/** Figma note modal: a sheet over almost the whole screen for reading or writing one note. */
export function NoteModal({
  visible,
  initialNote,
  onSave,
  onClose,
  saving,
  error,
}: NoteModalProps) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      {/* Mounted per opening so the draft starts from the note being opened. */}
      {visible ? (
        <NoteEditor
          initialNote={initialNote}
          onSave={onSave}
          onClose={onClose}
          saving={saving}
          error={error}
        />
      ) : null}
    </Modal>
  );
}

function NoteEditor({
  initialNote,
  onSave,
  onClose,
  saving = false,
  error,
}: Omit<NoteModalProps, 'visible'>) {
  const styles = useStyles(makeStyles);
  const [draft, setDraft] = useState(initialNote ?? '');
  const text = draft.trim();

  return (
    <SafeAreaView style={styles.sheet} edges={['top', 'bottom', 'left', 'right']}>
      <KeyboardAvoidingView
        style={styles.sheet}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Cancel"
            onPress={onClose}
            hitSlop={8}
          >
            <Text variant="body" color="secondary">
              Cancel
            </Text>
          </Pressable>
          <Text variant="body" style={styles.title}>
            {initialNote === undefined ? 'New note' : 'Edit note'}
          </Text>
          <Button
            label="Save"
            onPress={() => onSave(text)}
            disabled={text.length === 0}
            loading={saving}
          />
        </View>
        {error ? (
          <Text variant="caption" style={styles.error}>
            {error}
          </Text>
        ) : null}
        <Input
          label="Note"
          hideLabel
          value={draft}
          onChangeText={setDraft}
          multiline
          autoFocus
          placeholder="What did you talk about?"
          style={styles.input}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const makeStyles = (theme: Theme) => ({
  sheet: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    padding: theme.spacing[5],
  },
  title: { fontFamily: theme.typography.title.fontFamily },
  error: { color: theme.colors.danger, paddingHorizontal: theme.spacing[5] },
  input: { flex: 1, paddingHorizontal: theme.spacing[5], paddingBottom: theme.spacing[5] },
});
