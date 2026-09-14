import { BadRequestException } from '@nestjs/common';
import { booleanInput, enumInput, objectInput, textInput } from '../common/input.js';
import { FriendPeriodicity } from './entities/friend-periodicity.enum.js';

export interface CreateFriendInput {
  name: string;
  periodicity: FriendPeriodicity;
  nudgeEnabled?: boolean;
}

export function updateFriendInput(value: unknown): Partial<CreateFriendInput> {
  const body = objectInput(value, ['name', 'periodicity', 'nudgeEnabled']);
  if (!Object.keys(body).length) throw new BadRequestException('At least one field is required');
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
  };
}

export function createFriendInput(value: unknown): CreateFriendInput {
  const body = updateFriendInput(value);
  if (body.name === undefined || body.periodicity === undefined) {
    throw new BadRequestException('name and periodicity are required');
  }
  return { ...body, name: body.name, periodicity: body.periodicity };
}
