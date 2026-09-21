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

/** Whole days remaining from `now` to `date`; never negative. */
export function daysUntil(date: Date, now: Date): number {
  return Math.max(0, Math.floor((date.getTime() - now.getTime()) / MS_PER_DAY));
}

/** "today" for the same day, otherwise "in {n} d" — the label used for upcoming nudges. */
export function formatDaysUntil(date: Date, now: Date = new Date()): string {
  const days = daysUntil(date, now);
  return days === 0 ? 'today' : `in ${days} d`;
}

const pad = (value: number) => String(value).padStart(2, '0');

/** "03/01/2025" — the DD/MM/YYYY form used on the friend profile, in local time. */
export function formatDate(date: Date): string {
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
}

/** DD/MM/YYYY for a YYYY-MM-DD calendar date (no time zone, so no Date parsing). */
export function formatCalendarDate(date: string): string {
  const [year, month, day] = date.split('-');
  return `${day}/${month}/${year}`;
}
