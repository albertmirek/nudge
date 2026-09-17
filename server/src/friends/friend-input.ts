import { BadRequestException } from '@nestjs/common';
import {
  booleanInput,
  enumInput,
  objectInput,
  optionalDateInput,
  optionalTextInput,
  pastTimestampInput,
  textInput,
} from '../common/input.js';
import { FriendPeriodicity } from './entities/friend-periodicity.enum.js';

export interface FriendProfileInput {
  metAt?: string | null;
  livesIn?: string | null;
  birthday?: string | null;
  notes?: string | null;
}

export interface UpdateFriendInput extends FriendProfileInput {
  name?: string;
  periodicity?: FriendPeriodicity;
  nudgeEnabled?: boolean;
}

export interface CreateFriendInput extends UpdateFriendInput {
  name: string;
  periodicity: FriendPeriodicity;
  /** When the user last talked to this friend; the first nudge is planned from it. */
  lastContactAt?: Date;
}

const UPDATE_FIELDS = [
  'name',
  'periodicity',
  'nudgeEnabled',
  'metAt',
  'livesIn',
  'birthday',
  'notes',
];

function parseFriendFields(body: Record<string, unknown>): UpdateFriendInput {
  return {
    ...(body.name !== undefined ? { name: textInput(body.name, 'name', 200) } : {}),
    ...(body.periodicity !== undefined
      ? {
          periodicity: enumInput(body.periodicity, Object.values(FriendPeriodicity), 'periodicity'),
        }
      : {}),
    ...(body.nudgeEnabled !== undefined
      ? { nudgeEnabled: booleanInput(body.nudgeEnabled, 'nudgeEnabled') }
      : {}),
    ...(body.metAt !== undefined ? { metAt: optionalTextInput(body.metAt, 'metAt', 200) } : {}),
    ...(body.livesIn !== undefined
      ? { livesIn: optionalTextInput(body.livesIn, 'livesIn', 200) }
      : {}),
    ...(body.birthday !== undefined
      ? { birthday: optionalDateInput(body.birthday, 'birthday') }
      : {}),
    ...(body.notes !== undefined ? { notes: optionalTextInput(body.notes, 'notes', 10000) } : {}),
  };
}

export function updateFriendInput(value: unknown): UpdateFriendInput {
  const body = objectInput(value, UPDATE_FIELDS);
  if (!Object.keys(body).length) throw new BadRequestException('At least one field is required');
  return parseFriendFields(body);
}

export function createFriendInput(value: unknown): CreateFriendInput {
  // lastContactAt is only settable on create; later contact is recorded through catch-ups.
  const body = objectInput(value, [...UPDATE_FIELDS, 'lastContactAt']);
  const fields = parseFriendFields(body);
  if (fields.name === undefined || fields.periodicity === undefined) {
    throw new BadRequestException('name and periodicity are required');
  }
  return {
    ...fields,
    name: fields.name,
    periodicity: fields.periodicity,
    ...(body.lastContactAt !== undefined && body.lastContactAt !== null
      ? { lastContactAt: pastTimestampInput(body.lastContactAt, 'lastContactAt') }
      : {}),
  };
}
