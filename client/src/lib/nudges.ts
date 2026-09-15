import type { Friend } from '@/api/types';

export type NudgeBuckets = { overdue: Friend[]; upcoming: Friend[] };

/** Splits friends by their nudge's due time; friends without an active nudge are excluded. */
export function splitByNudge(friends: readonly Friend[], now: Date = new Date()): NudgeBuckets {
  const overdue: Friend[] = [];
  const upcoming: Friend[] = [];

  for (const friend of friends) {
    if (!friend.nudge) continue;
    (new Date(friend.nudge.scheduledFor) <= now ? overdue : upcoming).push(friend);
  }

  const byScheduledFor = (a: Friend, b: Friend) =>
    new Date(a.nudge!.scheduledFor).getTime() - new Date(b.nudge!.scheduledFor).getTime();

  return { overdue: overdue.sort(byScheduledFor), upcoming: upcoming.sort(byScheduledFor) };
}
