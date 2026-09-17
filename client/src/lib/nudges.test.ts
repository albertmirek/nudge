/// <reference types="jest" />

import { splitByNudge } from '@/lib/nudges';
import type { Friend } from '@/api/types';

const NOW = new Date('2026-09-14T12:00:00Z');

function friend(overrides: Partial<Friend> & { id: string }): Friend {
  return {
    name: 'Friend',
    periodicity: 'MONTHLY',
    lastContactAt: null,
    nudgeEnabled: true,
    metAt: null,
    livesIn: null,
    birthday: null,
    notes: null,
    createdAt: NOW.toISOString(),
    updatedAt: NOW.toISOString(),
    nudge: null,
    ...overrides,
  };
}

function nudge(scheduledFor: string) {
  return {
    id: `nudge-${scheduledFor}`,
    scheduledFor,
    status: 'PLANNED' as const,
    revision: 1,
    lastEditedAt: NOW.toISOString(),
  };
}

describe('splitByNudge', () => {
  it('buckets friends whose nudge is due in the past as overdue', () => {
    const overdueFriend = friend({ id: '1', nudge: nudge('2026-09-01T12:00:00Z') });
    const { overdue, upcoming } = splitByNudge([overdueFriend], NOW);
    expect(overdue).toEqual([overdueFriend]);
    expect(upcoming).toEqual([]);
  });

  it('buckets friends whose nudge is due in the future as upcoming', () => {
    const upcomingFriend = friend({ id: '1', nudge: nudge('2026-10-01T12:00:00Z') });
    const { overdue, upcoming } = splitByNudge([upcomingFriend], NOW);
    expect(upcoming).toEqual([upcomingFriend]);
    expect(overdue).toEqual([]);
  });

  it('treats a nudge scheduled for exactly now as overdue', () => {
    const dueNow = friend({ id: '1', nudge: nudge(NOW.toISOString()) });
    expect(splitByNudge([dueNow], NOW).overdue).toEqual([dueNow]);
  });

  it('excludes friends with no active nudge from both buckets', () => {
    const noNudge = friend({ id: '1', nudge: null });
    const { overdue, upcoming } = splitByNudge([noNudge], NOW);
    expect(overdue).toEqual([]);
    expect(upcoming).toEqual([]);
  });

  it('sorts each bucket by scheduledFor, soonest first', () => {
    const later = friend({ id: 'later', nudge: nudge('2026-09-10T12:00:00Z') });
    const earlier = friend({ id: 'earlier', nudge: nudge('2026-01-01T12:00:00Z') });
    const { overdue } = splitByNudge([later, earlier], NOW);
    expect(overdue.map((f) => f.id)).toEqual(['earlier', 'later']);
  });
});
