import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useCreateFriend } from '@/api/use-create-friend';
import { FriendForm } from '@/components/friend/friend-form';
import {
  type FriendFormErrors,
  emptyFriendForm,
  toCreateFriendBody,
  validateFriendForm,
} from '@/lib/friend-form';
import { type Theme, useStyles } from '@/theme';
import { Button, Text } from '@/ui';

/** Figma "Friend Profile form": Add a friend · Save. Photo picking is not wired up yet. */
export function CreateFriendScreen() {
  const styles = useStyles(makeStyles);
  const router = useRouter();
  const createFriend = useCreateFriend();
  const [values, setValues] = useState(emptyFriendForm);
  const [errors, setErrors] = useState<FriendFormErrors>({});

  const save = () => {
    const nextErrors = validateFriendForm(values, new Date());
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    createFriend.mutate(toCreateFriendBody(values), {
      onSuccess: () => router.replace('/'),
    });
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        style={styles.screen}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          <View style={styles.header}>
            <Text variant="title">Add a friend</Text>
            <Button label="Save" onPress={save} loading={createFriend.isPending} />
          </View>
          {createFriend.isError ? (
            <Text variant="caption" style={styles.submitError}>
              {createFriend.error.message}
            </Text>
          ) : null}
          <FriendForm
            values={values}
            errors={errors}
            onChange={(next) => {
              setValues(next);
              // Clear errors as the user edits; they are recomputed on the next Save.
              if (Object.keys(errors).length > 0) setErrors({});
            }}
            // TODO: open the gallery/camera picker (expo-image-picker) and upload the photo.
            onPickPhoto={() => {}}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const makeStyles = (theme: Theme) => ({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  content: {
    paddingHorizontal: theme.spacing[5],
    paddingBottom: theme.spacing[6],
    gap: theme.spacing[5],
  },
  header: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingVertical: theme.spacing[5],
  },
  submitError: { color: theme.colors.danger },
});
