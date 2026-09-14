import { NotFoundException } from '@nestjs/common';
import type { EntityManager } from 'typeorm';
import { Friend } from './entities/friend.entity.js';

/** All mutations lock the friend first, then its nudge, to use one consistent lock order. */
export async function ownedFriend(
  manager: EntityManager,
  userId: string,
  friendId: string,
  lock = false,
): Promise<Friend> {
  const friend = await manager.findOne(Friend, {
    where: { id: friendId, userId },
    ...(lock ? { lock: { mode: 'pessimistic_write' as const } } : {}),
  });
  if (!friend) throw new NotFoundException('Friend not found');
  return friend;
}
