import { useRef } from 'react';
import { type TextInput, View } from 'react-native';

import {
  type FriendFormErrors,
  type FriendFormValues,
  PERIODICITY_OPTIONS,
} from '@/lib/friend-form';
import { type Theme, useStyles } from '@/theme';
import { ChoiceChips, IconButton, Input, Text } from '@/ui';

export type FriendFormProps = {
  values: FriendFormValues;
  errors?: FriendFormErrors;
  /** Called with the full next values object; the form is fully controlled. */
  onChange: (values: FriendFormValues) => void;
  /** Tapping the photo placeholder. Gallery/camera picking is wired up by the caller. */
  onPickPhoto: () => void;
};

/** Figma "Friend Profile form": photo placeholder, profile fields and a Notes section. */
export function FriendForm({ values, errors = {}, onChange, onPickPhoto }: FriendFormProps) {
  const styles = useStyles(makeStyles);
  const notesRef = useRef<TextInput>(null);

  const set =
    <K extends keyof FriendFormValues>(key: K) =>
    (value: FriendFormValues[K]) =>
      onChange({ ...values, [key]: value });

  return (
    <View style={styles.form}>
      <IconButton
        icon="camera"
        variant="raised"
        size="lg"
        accessibilityLabel="Add photo"
        onPress={onPickPhoto}
        style={styles.photo}
      />

      <View style={styles.fields}>
        <Input
          label="Name"
          value={values.name}
          onChangeText={set('name')}
          error={errors.name}
          autoCapitalize="words"
          autoComplete="name"
        />
        <ChoiceChips
          label="Contact Frequency"
          options={PERIODICITY_OPTIONS}
          value={values.periodicity}
          onChange={set('periodicity')}
          error={errors.periodicity}
        />
        <Input
          label="Last Contact"
          value={values.lastContactAt}
          onChangeText={set('lastContactAt')}
          error={errors.lastContactAt}
          placeholder="YYYY-MM-DD"
          keyboardType="numbers-and-punctuation"
        />
        <Input
          label="Met at"
          value={values.metAt}
          onChangeText={set('metAt')}
          error={errors.metAt}
        />
        <Input
          label="Lives in"
          value={values.livesIn}
          onChangeText={set('livesIn')}
          error={errors.livesIn}
        />
        <Input
          label="Birthday"
          value={values.birthday}
          onChangeText={set('birthday')}
          error={errors.birthday}
          placeholder="YYYY-MM-DD"
          keyboardType="numbers-and-punctuation"
        />
      </View>

      <View style={styles.notesHeader}>
        <Text variant="body" style={styles.notesTitle}>
          Notes
        </Text>
        <IconButton
          icon="plus"
          accessibilityLabel="Add note"
          onPress={() => notesRef.current?.focus()}
        />
      </View>
      <Input
        ref={notesRef}
        label="Notes"
        value={values.notes}
        onChangeText={set('notes')}
        error={errors.notes}
        multiline
        hideLabel
      />
    </View>
  );
}

const makeStyles = (theme: Theme) => ({
  form: { gap: theme.spacing[5] },
  photo: { alignSelf: 'center' as const },
  fields: { gap: theme.spacing[4], paddingHorizontal: theme.spacing[5] },
  notesHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
  },
  notesTitle: { fontFamily: theme.typography.title.fontFamily },
});
