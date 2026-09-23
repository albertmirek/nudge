import type { Friend } from '@/api/types';

import { firstName, groupByInitial } from './friends';

function friend(id: string, name: string): Friend {
  return {
    id,
    name,
    periodicity: 'MONTHLY',
    lastContactAt: null,
    nudgeEnabled: true,
    metAt: null,
    livesIn: null,
    birthday: null,
    notes: null,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    nudge: null,
    channels: [],
  };
}

describe('firstName', () => {
  it('returns the first whitespace-separated word', () => {
    expect(firstName('Anastasia Kleisioni')).toBe('Anastasia');
  });

  it('returns a single-word name unchanged', () => {
    expect(firstName('Joni')).toBe('Joni');
  });

  it('ignores surrounding whitespace', () => {
    expect(firstName('  Bef Özgür ')).toBe('Bef');
  });
});

describe('groupByInitial', () => {
  it('groups friends by the first letter of their name, sections and names A→Z', () => {
    const sections = groupByInitial([
      friend('1', 'Joni Trevo'),
      friend('2', 'Anastasia Kleisioni'),
      friend('3', 'Bef Özgür'),
      friend('4', 'Aku Koskien'),
    ]);

    expect(sections.map((section) => section.title)).toEqual(['A', 'B', 'J']);
    expect(sections[0]!.data.map((f) => f.name)).toEqual(['Aku Koskien', 'Anastasia Kleisioni']);
    expect(sections[1]!.data.map((f) => f.name)).toEqual(['Bef Özgür']);
  });

  it('upper-cases the initial so lower-case names join the same section', () => {
    const sections = groupByInitial([friend('1', 'aku'), friend('2', 'Anastasia')]);
    expect(sections).toHaveLength(1);
    expect(sections[0]!.title).toBe('A');
  });

  it('returns no sections for no friends', () => {
    expect(groupByInitial([])).toEqual([]);
  });

  it('does not mutate the input', () => {
    const input = [friend('1', 'Joni'), friend('2', 'Aku')];
    groupByInitial(input);
    expect(input.map((f) => f.name)).toEqual(['Joni', 'Aku']);
  });
});
