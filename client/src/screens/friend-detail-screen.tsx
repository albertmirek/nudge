import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ApiError } from '@/api/http';
import type { CatchUp, Friend } from '@/api/types';
import { useCatchUps } from '@/api/use-catch-ups';
import { useConfirmNudge } from '@/api/use-confirm-nudge';
import { useCreateCatchUp } from '@/api/use-create-catch-up';
import { useFriend } from '@/api/use-friend';
import { useUpdateCatchUp } from '@/api/use-update-catch-up';
import { useUpdateFriend } from '@/api/use-update-friend';
import { FriendProfile } from '@/components/friend/friend-profile';
import { NoteCard } from '@/components/friend/note-card';
import { NoteModal } from '@/components/friend/note-modal';
import { BottomNav } from '@/components/navigation/bottom-nav';
import {
  type FriendProfileErrors,
  type FriendProfileValues,
  friendToProfileValues,
  toUpdateFriendBody,
  validateFriendProfile,
} from '@/lib/friend-form';
import { type Theme, useStyles } from '@/theme';
import { IconButton, Text } from '@/ui';

export type FriendDetailScreenProps = { friendId: string };

type NoteSheet = { mode: 'closed' } | { mode: 'create' } | { mode: 'edit'; note: CatchUp };

const CONFLICT_MESSAGE = 'This reminder changed elsewhere. Reloaded — try again.';

/** Figma "Friend profile": editable details, the notes list and the "Contact" action. */
export function FriendDetailScreen({ friendId }: FriendDetailScreenProps) {
  const styles = useStyles(makeStyles);
  const router = useRouter();
  const friend = useFriend(friendId);
  const notes = useCatchUps(friendId);

  const navigateToTab = (route: 'friends' | 'create-friend' | 'index') =>
    router.navigate(route === 'index' ? '/(tabs)' : `/(tabs)/${route}`);

  if (friend.isPending) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.centered}>
          <ActivityIndicator />
        </View>
      </SafeAreaView>
    );
  }

  if (friend.isError) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.centered}>
          <Text color="secondary">Couldn&apos;t load this friend.</Text>
        </View>
        <BottomNav onNavigate={navigateToTab} />
      </SafeAreaView>
    );
  }

  return (
    <LoadedFriend
      friend={friend.data}
      notes={notes.data ?? []}
      notesError={notes.isError}
      onBack={() => router.back()}
      onNavigate={navigateToTab}
    />
  );
}

type LoadedFriendProps = {
  friend: Friend;
  notes: CatchUp[];
  notesError: boolean;
  onBack: () => void;
  onNavigate: (route: 'friends' | 'create-friend' | 'index') => void;
};

function LoadedFriend({ friend, notes, notesError, onBack, onNavigate }: LoadedFriendProps) {
  const styles = useStyles(makeStyles);
  const updateFriend = useUpdateFriend(friend.id);
  const createNote = useCreateCatchUp(friend.id);
  const updateNote = useUpdateCatchUp(friend.id);
  const confirmNudge = useConfirmNudge();

  // Draft values exist only while editing; leaving edit mode discards them.
  const [draft, setDraft] = useState<FriendProfileValues | null>(null);
  const [errors, setErrors] = useState<FriendProfileErrors>({});
  const [sheet, setSheet] = useState<NoteSheet>({ mode: 'closed' });
  const [contactError, setContactError] = useState<string | null>(null);

  const editing = draft !== null;
  const values = draft ?? friendToProfileValues(friend);

  const saveProfile = () => {
    if (!draft) return;
    const nextErrors = validateFriendProfile(draft);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    const body = toUpdateFriendBody(friend, draft);
    if (!body) {
      setDraft(null);
      return;
    }
    updateFriend.mutate(body, { onSuccess: () => setDraft(null) });
  };

  const saveNote = (text: string) => {
    if (sheet.mode === 'create') {
      createNote.mutate(text, { onSuccess: () => setSheet({ mode: 'closed' }) });
    } else if (sheet.mode === 'edit') {
      updateNote.mutate(
        { catchUpId: sheet.note.id, note: text },
        { onSuccess: () => setSheet({ mode: 'closed' }) },
      );
    }
  };

  const contact = () => {
    if (!friend.nudge) return;
    setContactError(null);
    confirmNudge.mutate(
      { nudgeId: friend.nudge.id, revision: friend.nudge.revision },
      {
        // A 409 means the nudge moved on; the friend query refetches so the next tap is current.
        onError: (error) =>
          setContactError(
            error instanceof ApiError && error.status === 409 ? CONFLICT_MESSAGE : error.message,
          ),
      },
    );
  };

  const noteMutation = sheet.mode === 'edit' ? updateNote : createNote;

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        style={styles.screen}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <FlatList
          data={notes}
          keyExtractor={(note) => note.id}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            <View style={styles.header}>
              <IconButton
                icon="chevron-left"
                accessibilityLabel="Back"
                onPress={onBack}
                style={styles.back}
              />
              <FriendProfile
                friend={friend}
                editing={editing}
                values={values}
                errors={errors}
                onChange={(next) => {
                  setDraft(next);
                  if (Object.keys(errors).length > 0) setErrors({});
                }}
                onEdit={() => setDraft(friendToProfileValues(friend))}
                onSave={saveProfile}
                saving={updateFriend.isPending}
              />
              {updateFriend.isError ? (
                <Text variant="caption" style={styles.error}>
                  {updateFriend.error.message}
                </Text>
              ) : null}
              {contactError ? (
                <Text variant="caption" style={styles.error}>
                  {contactError}
                </Text>
              ) : null}
              <View style={styles.notesHeader}>
                <Text variant="body" style={styles.notesTitle}>
                  Notes
                </Text>
                <IconButton
                  icon="plus"
                  accessibilityLabel="Add note"
                  onPress={() => setSheet({ mode: 'create' })}
                />
              </View>
            </View>
          }
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          renderItem={({ item }) => (
            <NoteCard note={item} onPress={() => setSheet({ mode: 'edit', note: item })} />
          )}
          ListEmptyComponent={
            <Text color="secondary">
              {notesError
                ? "Couldn't load notes."
                : 'No notes yet. Add what you last talked about.'}
            </Text>
          }
        />
      </KeyboardAvoidingView>
      <BottomNav
        onNavigate={onNavigate}
        action={{ label: 'Contact', onPress: contact, loading: confirmNudge.isPending }}
      />
      <NoteModal
        visible={sheet.mode !== 'closed'}
        initialNote={sheet.mode === 'edit' ? sheet.note.note : undefined}
        onSave={saveNote}
        onClose={() => setSheet({ mode: 'closed' })}
        saving={noteMutation.isPending}
        error={noteMutation.isError ? noteMutation.error.message : undefined}
      />
    </SafeAreaView>
  );
}

const makeStyles = (theme: Theme) => ({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  centered: { flex: 1, alignItems: 'center' as const, justifyContent: 'center' as const },
  // Bottom padding clears the "Contact" disc floating over the bar.
  content: { paddingHorizontal: theme.spacing[5], paddingBottom: theme.sizes.fab },
  header: { gap: theme.spacing[5], paddingVertical: theme.spacing[3] },
  back: { alignSelf: 'flex-start' as const, marginLeft: -theme.spacing[3] },
  error: { color: theme.colors.danger },
  notesHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
  },
  notesTitle: { fontFamily: theme.typography.title.fontFamily },
  separator: { height: theme.spacing[4] },
});
