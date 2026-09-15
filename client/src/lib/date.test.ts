/// <reference types="jest" />

import { daysBetween, daysUntil, formatDaysAgo, formatDaysUntil } from '@/lib/date';

const NOW = new Date('2026-09-14T12:00:00Z');

function daysAgo(days: number): Date {
  return new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000);
}

describe('daysBetween', () => {
  it('counts whole days elapsed', () => {
    expect(daysBetween(daysAgo(288), NOW)).toBe(288);
  });

  it('floors partial days', () => {
    expect(daysBetween(new Date(NOW.getTime() - 36 * 60 * 60 * 1000), NOW)).toBe(1);
  });

  it('never goes negative for future dates', () => {
    expect(daysBetween(daysAgo(-3), NOW)).toBe(0);
  });
});

describe('formatDaysAgo', () => {
  it('renders "today" for the same day', () => {
    expect(formatDaysAgo(NOW, NOW)).toBe('today');
  });

  it('renders "{n} d ago" otherwise', () => {
    expect(formatDaysAgo(daysAgo(1), NOW)).toBe('1 d ago');
    expect(formatDaysAgo(daysAgo(288), NOW)).toBe('288 d ago');
  });

  it('defaults `now` to the current time', () => {
    expect(formatDaysAgo(new Date())).toBe('today');
  });
});

function daysFromNow(days: number): Date {
  return new Date(NOW.getTime() + days * 24 * 60 * 60 * 1000);
}

describe('daysUntil', () => {
  it('counts whole days remaining', () => {
    expect(daysUntil(daysFromNow(2), NOW)).toBe(2);
  });

  it('floors partial days', () => {
    expect(daysUntil(new Date(NOW.getTime() + 36 * 60 * 60 * 1000), NOW)).toBe(1);
  });

  it('never goes negative for past dates', () => {
    expect(daysUntil(daysFromNow(-3), NOW)).toBe(0);
  });
});

describe('formatDaysUntil', () => {
  it('renders "today" for the same day', () => {
    expect(formatDaysUntil(NOW, NOW)).toBe('today');
  });

  it('renders "in {n} d" otherwise', () => {
    expect(formatDaysUntil(daysFromNow(1), NOW)).toBe('in 1 d');
    expect(formatDaysUntil(daysFromNow(5), NOW)).toBe('in 5 d');
  });

  it('defaults `now` to the current time', () => {
    expect(formatDaysUntil(new Date())).toBe('today');
  });
});
