const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Whole days elapsed from `date` to `now`; never negative. */
export function daysBetween(date: Date, now: Date): number {
  return Math.max(0, Math.floor((now.getTime() - date.getTime()) / MS_PER_DAY));
}

/** "today" for the same day, otherwise "{n} d ago" — the label used in contact lists. */
export function formatDaysAgo(date: Date, now: Date = new Date()): string {
  const days = daysBetween(date, now);
  return days === 0 ? 'today' : `${days} d ago`;
}
