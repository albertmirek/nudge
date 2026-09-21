import type { Friend } from '@/api/types';

import {
  PERIODICITY_OPTIONS,
  emptyFriendForm,
  friendToProfileValues,
  toCreateFriendBody,
  toUpdateFriendBody,
  validateFriendForm,
  validateFriendProfile,
} from './friend-form';

const NOW = new Date('2026-09-17T10:00:00Z');

describe('validateFriendForm', () => {
  it('requires a name and a contact frequency', () => {
    expect(validateFriendForm(emptyFriendForm(), NOW)).toEqual({
      name: 'Name is required',
      periodicity: 'Pick how often to check in',
    });
  });

  it('treats a whitespace-only name as missing', () => {
    const errors = validateFriendForm({ ...emptyFriendForm(), name: '   ' }, NOW);
    expect(errors.name).toBe('Name is required');
  });

  it('passes a minimal valid form', () => {
    expect(
      validateFriendForm({ ...emptyFriendForm(), name: 'Alice', periodicity: 'MONTHLY' }, NOW),
    ).toEqual({});
  });

  it.each(['17.05.1990', '1990-2-3', '1990-02-30', 'soon'])(
    'rejects a malformed birthday %s',
    (birthday) => {
      const errors = validateFriendForm(
        { ...emptyFriendForm(), name: 'Alice', periodicity: 'MONTHLY', birthday },
        NOW,
      );
      expect(errors.birthday).toBe('Use the YYYY-MM-DD format');
    },
  );

  it('rejects a last contact in the future but accepts today', () => {
    const base = { ...emptyFriendForm(), name: 'Alice', periodicity: 'MONTHLY' as const };
    expect(validateFriendForm({ ...base, lastContactAt: '2026-09-18' }, NOW).lastContactAt).toBe(
      "Can't be in the future",
    );
    expect(validateFriendForm({ ...base, lastContactAt: '2026-09-17' }, NOW)).toEqual({});
    expect(validateFriendForm({ ...base, lastContactAt: 'never' }, NOW).lastContactAt).toBe(
      'Use the YYYY-MM-DD format',
    );
  });
});

describe('toCreateFriendBody', () => {
  it('sends only name and periodicity when the optional fields are blank', () => {
    expect(
      toCreateFriendBody({ ...emptyFriendForm(), name: ' Alice ', periodicity: 'WEEKLY' }),
    ).toEqual({ name: 'Alice', periodicity: 'WEEKLY' });
  });

  it('maps every filled field, converting the last contact date to an ISO timestamp', () => {
    const body = toCreateFriendBody({
      name: 'Alice',
      periodicity: 'MONTHLY',
      lastContactAt: '2026-09-01',
      metAt: ' Prague ',
      livesIn: 'Berlin',
      birthday: '1990-05-17',
      notes: 'Loves hiking',
    });
    expect(body).toEqual({
      name: 'Alice',
      periodicity: 'MONTHLY',
      lastContactAt: new Date(2026, 8, 1).toISOString(),
      metAt: 'Prague',
      livesIn: 'Berlin',
      birthday: '1990-05-17',
      notes: 'Loves hiking',
    });
  });
});

it('offers every backend periodicity with a human label', () => {
  expect(PERIODICITY_OPTIONS.map((option) => option.value)).toEqual([
    'WEEKLY',
    'BIWEEKLY',
    'MONTHLY',
    'QUARTERLY',
  ]);
});

const FRIEND: Friend = {
  id: 'friend-1',
  name: 'Anastasia Kleisioni',
  periodicity: 'MONTHLY',
  lastContactAt: '2025-01-03T10:00:00Z',
  nudgeEnabled: true,
  metAt: 'Stockholm University',
  livesIn: 'Athens',
  birthday: '2000-07-13',
  notes: null,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  nudge: null,
};

describe('friendToProfileValues', () => {
  it('copies the editable profile fields, turning null into empty text', () => {
    expect(friendToProfileValues({ ...FRIEND, livesIn: null, birthday: null })).toEqual({
      name: 'Anastasia Kleisioni',
      periodicity: 'MONTHLY',
      metAt: 'Stockholm University',
      livesIn: '',
      birthday: '',
    });
  });
});

describe('validateFriendProfile', () => {
  it('requires a name and rejects a malformed birthday', () => {
    expect(
      validateFriendProfile({ ...friendToProfileValues(FRIEND), name: ' ', birthday: '13.07' }),
    ).toEqual({ name: 'Name is required', birthday: 'Use the YYYY-MM-DD format' });
  });

  it('passes the values of an existing friend', () => {
    expect(validateFriendProfile(friendToProfileValues(FRIEND))).toEqual({});
  });
});

describe('toUpdateFriendBody', () => {
  it('returns null when nothing changed', () => {
    expect(toUpdateFriendBody(FRIEND, friendToProfileValues(FRIEND))).toBeNull();
  });

  it('sends only the changed fields, trimmed, and null for cleared text', () => {
    const values = {
      ...friendToProfileValues(FRIEND),
      name: ' Ana ',
      periodicity: 'WEEKLY' as const,
      livesIn: '  ',
      birthday: '',
    };
    expect(toUpdateFriendBody(FRIEND, values)).toEqual({
      name: 'Ana',
      periodicity: 'WEEKLY',
      livesIn: null,
      birthday: null,
    });
  });

  it('treats whitespace-only edits of an already empty field as unchanged', () => {
    const friend = { ...FRIEND, livesIn: null };
    expect(
      toUpdateFriendBody(friend, { ...friendToProfileValues(friend), livesIn: ' ' }),
    ).toBeNull();
  });
});
