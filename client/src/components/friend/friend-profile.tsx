import type { ReactNode } from 'react';
import { TextInput, type TextInputProps, View } from 'react-native';

import type { Friend } from '@/api/types';
import { formatCalendarDate, formatDate } from '@/lib/date';
import {
  type FriendProfileErrors,
  type FriendProfileValues,
  PERIODICITY_OPTIONS,
} from '@/lib/friend-form';
import { type Theme, useStyles, useTheme } from '@/theme';
import { Avatar, Button, ChoiceChips, IconButton, Text } from '@/ui';

export type FriendProfileProps = {
  friend: Friend;
  /** Editing enables the fields (Figma: white, tappable) and swaps the pencil for Save. */
  editing: boolean;
  /** Draft field text while editing; ignored otherwise. Fully controlled, like FriendForm. */
  values: FriendProfileValues;
  errors?: FriendProfileErrors;
  onChange: (values: FriendProfileValues) => void;
  /** The pencil. */
  onEdit: () => void;
  /** The Save button shown while editing. */
  onSave: () => void;
  saving?: boolean;
  /** Photo upload isn't wired up yet; the avatar falls back to the accent disc. */
  avatarUri?: string;
};

/** Figma "Friend profile": avatar, name, birthday and the four contact rows; Notes live below. */
export function FriendProfile({
  friend,
  editing,
  values,
  errors = {},
  onChange,
  onEdit,
  onSave,
  saving = false,
  avatarUri,
}: FriendProfileProps) {
  const theme = useTheme();
  const styles = useStyles(makeStyles);

  const set =
    <K extends keyof FriendProfileValues>(key: K) =>
    (value: FriendProfileValues[K]) =>
      onChange({ ...values, [key]: value });

  const field = (key: 'name' | 'metAt' | 'livesIn' | 'birthday', display: string) =>
    editing ? values[key] : display;

  const periodicityLabel =
    PERIODICITY_OPTIONS.find((option) => option.value === friend.periodicity)?.label ??
    friend.periodicity;

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text variant="body" style={styles.heading}>
          Friend profile
        </Text>
        {editing ? (
          <Button label="Save" onPress={onSave} loading={saving} />
        ) : (
          <IconButton icon="pencil" accessibilityLabel="Edit profile" onPress={onEdit} />
        )}
      </View>

      <View style={styles.identity}>
        <Avatar label={friend.name} source={avatarUri} size={theme.sizes.photoButton} />
        <View style={styles.identityFields}>
          <ProfileField
            label="Name"
            editing={editing}
            value={field('name', friend.name)}
            onChangeText={set('name')}
            error={errors.name}
            style={styles.nameField}
            autoCapitalize="words"
          />
          <ProfileField
            label="Birthday"
            editing={editing}
            value={field('birthday', friend.birthday ? formatCalendarDate(friend.birthday) : '')}
            onChangeText={set('birthday')}
            error={errors.birthday}
            placeholder="YYYY-MM-DD"
            keyboardType="numbers-and-punctuation"
          />
        </View>
      </View>

      <View style={styles.rows}>
        <ProfileRow label="Met at">
          <ProfileField
            label="Met at"
            hideLabel
            editing={editing}
            value={field('metAt', friend.metAt ?? '')}
            onChangeText={set('metAt')}
            error={errors.metAt}
            style={styles.rowField}
          />
        </ProfileRow>
        <ProfileRow label="Lives in">
          <ProfileField
            label="Lives in"
            hideLabel
            editing={editing}
            value={field('livesIn', friend.livesIn ?? '')}
            onChangeText={set('livesIn')}
            error={errors.livesIn}
            style={styles.rowField}
          />
        </ProfileRow>
        {editing ? (
          <ChoiceChips
            label="Contact Frequency"
            options={PERIODICITY_OPTIONS}
            value={values.periodicity}
            onChange={set('periodicity')}
            error={errors.periodicity}
          />
        ) : (
          <ProfileRow label="Contact Frequency">
            <Text variant="body">{periodicityLabel.toLowerCase()}</Text>
          </ProfileRow>
        )}
        {/* Last contact is recorded by "Contact" (nudge confirmation), never typed in. */}
        <ProfileRow label="Last Contact">
          <Text variant="body">
            {friend.lastContactAt ? formatDate(new Date(friend.lastContactAt)) : 'Never'}
          </Text>
        </ProfileRow>
      </View>
    </View>
  );
}

function ProfileRow({ label, children }: { label: string; children: ReactNode }) {
  const styles = useStyles(makeStyles);
  return (
    <View style={styles.row}>
      <Text variant="body">{label}</Text>
      {children}
    </View>
  );
}

type ProfileFieldProps = Omit<TextInputProps, 'style' | 'editable' | 'accessibilityLabel'> & {
  label: string;
  editing: boolean;
  value: string;
  onChangeText: (text: string) => void;
  error?: string;
  /** The surrounding row already shows the label. */
  hideLabel?: boolean;
  style?: TextInputProps['style'];
};

/** A value that reads as plain text until editing turns it into a tappable field. */
function ProfileField({
  label,
  editing,
  value,
  onChangeText,
  error,
  hideLabel = false,
  style,
  ...rest
}: ProfileFieldProps) {
  const theme = useTheme();
  const styles = useStyles(makeStyles);
  return (
    <View style={styles.fieldWrapper}>
      {hideLabel || !editing ? null : <Text variant="caption">{label}</Text>}
      <TextInput
        accessibilityLabel={label}
        accessibilityHint={error}
        accessibilityState={{ disabled: !editing }}
        editable={editing}
        value={value}
        onChangeText={onChangeText}
        placeholderTextColor={theme.colors.text.secondary}
        style={[styles.field, editing && styles.fieldEditing, error ? styles.invalid : null, style]}
        {...rest}
      />
      {error ? (
        <Text variant="caption" style={styles.error}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const makeStyles = (theme: Theme) => ({
  root: { gap: theme.spacing[5] },
  header: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
  },
  heading: { fontFamily: theme.typography.title.fontFamily },
  identity: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: theme.spacing[5] },
  identityFields: { flex: 1, gap: theme.spacing[2] },
  nameField: { fontFamily: theme.typography.title.fontFamily },
  rows: { gap: theme.spacing[3] },
  row: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    gap: theme.spacing[4],
    minHeight: theme.sizes.input,
  },
  rowField: { flex: 1, textAlign: 'right' as const },
  fieldWrapper: { gap: theme.spacing[1] },
  field: {
    ...theme.typography.body,
    color: theme.colors.text.primary,
    minHeight: theme.sizes.input,
    paddingHorizontal: theme.spacing[3],
    paddingVertical: theme.spacing[2],
    borderRadius: theme.radii.md,
    borderWidth: theme.sizes.border,
    borderColor: 'transparent',
  },
  fieldEditing: { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
  invalid: { borderColor: theme.colors.danger },
  error: { color: theme.colors.danger },
});
