import type { CreateFriendBody, Friend, FriendPeriodicity, UpdateFriendBody } from '@/api/types';

/** Raw text of every field in the "Add a friend" form; dates are typed as YYYY-MM-DD. */
export type FriendFormValues = {
  name: string;
  periodicity: FriendPeriodicity | null;
  lastContactAt: string;
  metAt: string;
  livesIn: string;
  birthday: string;
  notes: string;
};

export type FriendFormErrors = Partial<Record<keyof FriendFormValues, string>>;

export const PERIODICITY_OPTIONS: readonly { value: FriendPeriodicity; label: string }[] = [
  { value: 'WEEKLY', label: 'Weekly' },
  { value: 'BIWEEKLY', label: 'Every 2 weeks' },
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'QUARTERLY', label: 'Quarterly' },
];

export function emptyFriendForm(): FriendFormValues {
  return {
    name: '',
    periodicity: null,
    lastContactAt: '',
    metAt: '',
    livesIn: '',
    birthday: '',
    notes: '',
  };
}

const DATE_FORMAT_ERROR = 'Use the YYYY-MM-DD format';

/** Local-midnight Date for a YYYY-MM-DD string, or null when malformed or not a real date. */
function parseLocalDate(text: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  // The Date constructor rolls invalid days over (Feb 30 -> Mar 2); reject those.
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }
  return date;
}

export function validateFriendForm(values: FriendFormValues, now: Date): FriendFormErrors {
  const errors: FriendFormErrors = {};
  if (!values.name.trim()) errors.name = 'Name is required';
  if (!values.periodicity) errors.periodicity = 'Pick how often to check in';
  if (values.birthday && !parseLocalDate(values.birthday)) errors.birthday = DATE_FORMAT_ERROR;
  if (values.lastContactAt) {
    const date = parseLocalDate(values.lastContactAt);
    if (!date) errors.lastContactAt = DATE_FORMAT_ERROR;
    else if (date.getTime() > now.getTime()) errors.lastContactAt = "Can't be in the future";
  }
  return errors;
}

/** Request body for POST /v1/friends; blank optional fields are omitted. Call after validating. */
export function toCreateFriendBody(values: FriendFormValues): CreateFriendBody {
  if (!values.periodicity) throw new Error('periodicity is required');
  const lastContact = values.lastContactAt ? parseLocalDate(values.lastContactAt) : null;
  const text = (value: string) => (value.trim() ? { value: value.trim() } : null);
  const metAt = text(values.metAt);
  const livesIn = text(values.livesIn);
  const notes = text(values.notes);
  return {
    name: values.name.trim(),
    periodicity: values.periodicity,
    ...(lastContact ? { lastContactAt: lastContact.toISOString() } : {}),
    ...(metAt ? { metAt: metAt.value } : {}),
    ...(livesIn ? { livesIn: livesIn.value } : {}),
    ...(values.birthday ? { birthday: values.birthday } : {}),
    ...(notes ? { notes: notes.value } : {}),
  };
}

/** The fields the friend profile lets you edit in place; last contact is set by confirming a nudge. */
export type FriendProfileValues = Pick<
  FriendFormValues,
  'name' | 'periodicity' | 'metAt' | 'livesIn' | 'birthday'
>;

export type FriendProfileErrors = Partial<Record<keyof FriendProfileValues, string>>;

export function friendToProfileValues(friend: Friend): FriendProfileValues {
  return {
    name: friend.name,
    periodicity: friend.periodicity,
    metAt: friend.metAt ?? '',
    livesIn: friend.livesIn ?? '',
    birthday: friend.birthday ?? '',
  };
}

export function validateFriendProfile(values: FriendProfileValues): FriendProfileErrors {
  const {
    lastContactAt: _ignored,
    notes: _notes,
    ...errors
  } = validateFriendForm({ ...values, lastContactAt: '', notes: '' }, new Date());
  return errors;
}

/**
 * PATCH /v1/friends/:id body with only the fields that differ from `friend`, or null when
 * nothing changed. Blank text clears a profile field. Call after validating.
 */
export function toUpdateFriendBody(
  friend: Friend,
  values: FriendProfileValues,
): UpdateFriendBody | null {
  if (!values.periodicity) throw new Error('periodicity is required');
  const body: UpdateFriendBody = {};
  const name = values.name.trim();
  if (name !== friend.name) body.name = name;
  if (values.periodicity !== friend.periodicity) body.periodicity = values.periodicity;
  for (const key of ['metAt', 'livesIn', 'birthday'] as const) {
    const next = values[key].trim() || null;
    if (next !== friend[key]) body[key] = next;
  }
  return Object.keys(body).length ? body : null;
}
