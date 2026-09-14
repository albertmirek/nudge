import type { EntityManager } from 'typeorm';
import { CatchUp } from './entities/catch-up.entity.js';
import { Friend } from './entities/friend.entity.js';

/** Used by catch-up creation and nudge confirmation inside the caller's friend-locked transaction. */
export async function recordCatchUp(
  manager: EntityManager,
  friend: Friend,
  note: string | null,
): Promise<CatchUp> {
  const catchUp = await manager.save(
    CatchUp,
    manager.create(CatchUp, { friendId: friend.id, note, createdAt: new Date() }),
  );
  friend.lastContactAt = catchUp.createdAt;
  await manager.save(Friend, friend);
  return catchUp;
}
