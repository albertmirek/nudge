import { useEffect, useState } from 'react';
import {
  AppState,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { Channel, ChannelType, CreateChannelBody, UpdateChannelBody } from '@/api/types';
import { type ParsedChannel, parseChannelInput } from '@/lib/channel-input';
import { CHANNEL_PLATFORMS, CHANNEL_TYPES, deviceCountry, formatHandle } from '@/lib/channels';
import { pickContactValues, readClipboard } from '@/lib/device-input';
import { type Theme, useStyles } from '@/theme';
import { Button, ChoiceChips, Input, Text } from '@/ui';

export type ChannelModalProps = {
  visible: boolean;
  /** The channel being edited; omit to add a new one. */
  channel?: Channel;
  onCreate: (body: CreateChannelBody) => void;
  onUpdate: (body: UpdateChannelBody) => void;
  onDelete: () => void;
  /** Opens the saved channel's link without recording contact (edit mode only). */
  onTest: (channel: Channel) => void;
  onClose: () => void;
  saving?: boolean;
  /** Request failure shown under the header. */
  error?: string;
};

type Step =
  | { step: 'platform' }
  | { step: 'details'; type: ChannelType }
  | { step: 'confirm'; type: ChannelType; handle: string; deepLink?: string };

const FIELD_LABEL = {
  phone: 'Phone number',
  phoneOrEmail: 'Phone number or email',
  username: 'Username',
  email: 'Email',
  other: 'Label',
} as const;

const KIND_NOUN = {
  phone: 'phone number',
  phoneOrEmail: 'phone number or email',
  username: 'username or link',
  email: 'email',
  other: 'label',
} as const;

/** Add or edit a way to reach a friend: pick the platform, enter details, confirm. */
export function ChannelModal({ visible, ...props }: ChannelModalProps) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={props.onClose}
    >
      {/* Mounted per opening so every add starts at the platform grid. */}
      {visible ? <ChannelEditor {...props} /> : null}
    </Modal>
  );
}

function ChannelEditor({
  channel,
  onCreate,
  onUpdate,
  onDelete,
  onTest,
  onClose,
  saving = false,
  error,
}: Omit<ChannelModalProps, 'visible'>) {
  const styles = useStyles(makeStyles);
  const [state, setState] = useState<Step>(
    channel ? { step: 'details', type: channel.type } : { step: 'platform' },
  );
  const [value, setValue] = useState(channel?.handle ?? '');
  const [link, setLink] = useState(channel?.deepLink ?? '');
  const [inputError, setInputError] = useState<string | null>(null);
  const [suggestion, setSuggestion] = useState<ParsedChannel | null>(null);
  const [contactValues, setContactValues] = useState<string[]>([]);

  // Copying a profile link in another app and coming back offers it here.
  useEffect(() => {
    if (channel) return;
    const check = () =>
      readClipboard()
        .then((text) => setSuggestion(parseChannelInput(text, undefined, deviceCountry())))
        .catch(() => setSuggestion(null));
    check();
    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'active') check();
    });
    return () => subscription.remove();
  }, [channel]);

  const confirm = (next: ParsedChannel) => {
    setInputError(null);
    setState({ step: 'confirm', ...next });
  };

  const submitDetails = (type: ChannelType) => {
    const { input, label } = CHANNEL_PLATFORMS[type];
    if (input === 'other') {
      if (!value.trim() || !/^(https:\/\/|tel:|sms:|mailto:)\S+$/.test(link.trim())) {
        setInputError('Add a label and a link starting with https://, tel:, sms: or mailto:.');
        return;
      }
      setInputError(null);
      setState({ step: 'confirm', type, handle: value.trim(), deepLink: link.trim() });
      return;
    }
    const parsed = parseChannelInput(value, type, deviceCountry());
    if (!parsed) {
      setInputError(`That doesn't look like a ${label} ${KIND_NOUN[input]}.`);
      return;
    }
    // A recognized link always wins over the hint (right for add mode), but a channel's
    // type is fixed once created, so a link for a different platform can't be saved here.
    if (channel && parsed.type !== channel.type) {
      setInputError(
        `That link is for ${CHANNEL_PLATFORMS[parsed.type].label} — this channel is ${label}.`,
      );
      return;
    }
    confirm(parsed);
  };

  const save = (current: Extract<Step, { step: 'confirm' }>) => {
    if (channel) {
      onUpdate({
        handle: current.handle,
        ...(current.deepLink !== undefined ? { deepLink: current.deepLink } : {}),
      });
    } else {
      onCreate({
        type: current.type,
        handle: current.handle,
        ...(current.deepLink !== undefined ? { deepLink: current.deepLink } : {}),
      });
    }
  };

  const paste = async () => {
    const text = await readClipboard().catch(() => undefined);
    if (text !== undefined) setValue(text);
  };

  const pickContact = async () => {
    const values = await pickContactValues().catch(() => null);
    if (!values?.length) return;
    if (values.length === 1) setValue(values[0]!);
    else setContactValues(values);
  };

  const title = channel ? `Edit ${CHANNEL_PLATFORMS[channel.type].label}` : 'Add a way to reach';

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
            {title}
          </Text>
          <View style={styles.headerSpacer} />
        </View>
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          {error ? (
            <Text variant="caption" style={styles.error}>
              {error}
            </Text>
          ) : null}

          {suggestion && state.step !== 'confirm' ? (
            <Button
              variant="accent"
              label={`Use ${CHANNEL_PLATFORMS[suggestion.type].label} ${formatHandle(suggestion.type, suggestion.handle)}`}
              onPress={() => confirm(suggestion)}
            />
          ) : null}

          {state.step === 'platform' ? (
            <View style={styles.grid}>
              {CHANNEL_TYPES.map((type) => (
                <Button
                  key={type}
                  label={CHANNEL_PLATFORMS[type].label}
                  onPress={() => {
                    setValue('');
                    setLink('');
                    setInputError(null);
                    setContactValues([]);
                    setState({ step: 'details', type });
                  }}
                  style={styles.tile}
                />
              ))}
            </View>
          ) : null}

          {state.step === 'details' ? (
            <DetailsStep
              type={state.type}
              value={value}
              link={link}
              error={inputError ?? undefined}
              contactValues={contactValues}
              editing={Boolean(channel)}
              onChangeValue={(next) => {
                setValue(next);
                setInputError(null);
              }}
              onChangeLink={setLink}
              onPaste={paste}
              onPickContact={pickContact}
              onChooseContactValue={(next) => {
                setValue(next);
                setContactValues([]);
              }}
              onContinue={() => submitDetails(state.type)}
              onBack={() => setState({ step: 'platform' })}
              onTest={channel ? () => onTest(channel) : undefined}
              onDelete={channel ? onDelete : undefined}
            />
          ) : null}

          {state.step === 'confirm' ? (
            <View style={styles.section}>
              <Text variant="body">
                {`${CHANNEL_PLATFORMS[state.type].label} · ${formatHandle(state.type, state.handle)}`}
              </Text>
              {state.deepLink ? <Text color="secondary">{state.deepLink}</Text> : null}
              <Button label="Save" onPress={() => save(state)} loading={saving} />
              <Button
                variant="accent"
                label="Back"
                onPress={() => setState({ step: 'details', type: state.type })}
              />
            </View>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

type DetailsStepProps = {
  type: ChannelType;
  value: string;
  link: string;
  error?: string;
  contactValues: string[];
  editing: boolean;
  onChangeValue: (value: string) => void;
  onChangeLink: (value: string) => void;
  onPaste: () => void;
  onPickContact: () => void;
  onChooseContactValue: (value: string) => void;
  onContinue: () => void;
  onBack: () => void;
  onTest?: () => void;
  onDelete?: () => void;
};

function DetailsStep({
  type,
  value,
  link,
  error,
  contactValues,
  editing,
  onChangeValue,
  onChangeLink,
  onPaste,
  onPickContact,
  onChooseContactValue,
  onContinue,
  onBack,
  onTest,
  onDelete,
}: DetailsStepProps) {
  const styles = useStyles(makeStyles);
  const platform = CHANNEL_PLATFORMS[type];
  const phoneLike = platform.input === 'phone' || platform.input === 'phoneOrEmail';

  return (
    <View style={styles.section}>
      <Input
        label={FIELD_LABEL[platform.input]}
        value={value}
        onChangeText={onChangeValue}
        error={platform.input === 'other' ? undefined : error}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType={
          platform.input === 'phone'
            ? 'phone-pad'
            : platform.input === 'email'
              ? 'email-address'
              : 'default'
        }
      />
      {platform.input === 'other' ? (
        <Input
          label="Link"
          value={link}
          onChangeText={onChangeLink}
          error={error}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
        />
      ) : null}
      {platform.howTo ? <Text color="secondary">{platform.howTo}</Text> : null}
      <View style={styles.actions}>
        {platform.input === 'other' ? null : (
          <Button variant="accent" label="Paste" onPress={onPaste} />
        )}
        {phoneLike ? (
          <Button variant="accent" label="Pick from contacts" onPress={onPickContact} />
        ) : null}
        {platform.appUrl ? (
          <Button
            variant="accent"
            label={`Open ${platform.label}`}
            onPress={() => Linking.openURL(platform.appUrl!).catch(() => {})}
          />
        ) : null}
      </View>
      {contactValues.length > 1 ? (
        <ChoiceChips
          label="Which one?"
          options={contactValues.map((option) => ({ label: option, value: option }))}
          value={value}
          onChange={onChooseContactValue}
        />
      ) : null}
      <Button label="Continue" onPress={onContinue} />
      {editing ? (
        <View style={styles.actions}>
          {onTest ? <Button variant="accent" label="Test" onPress={onTest} /> : null}
          {onDelete ? <Button variant="accent" label="Delete" onPress={onDelete} /> : null}
        </View>
      ) : (
        <Button variant="accent" label="Back" onPress={onBack} />
      )}
    </View>
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
  // Balances the Cancel link so the title stays centred.
  headerSpacer: { width: theme.sizes.input },
  title: { fontFamily: theme.typography.title.fontFamily },
  body: {
    gap: theme.spacing[4],
    paddingHorizontal: theme.spacing[5],
    paddingBottom: theme.spacing[5],
  },
  error: { color: theme.colors.danger },
  grid: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: theme.spacing[3] },
  tile: { minWidth: '30%' as const, flexGrow: 1 },
  section: { gap: theme.spacing[3] },
  actions: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: theme.spacing[2] },
});
