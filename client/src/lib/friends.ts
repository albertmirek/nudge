import type { Friend } from '@/api/types';

export type FriendSection = { title: string; data: Friend[] };

/** The first whitespace-separated word of a name — the grid tile label. */
export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? '';
}

const byName = (a: Friend, b: Friend) => a.name.localeCompare(b.name);

/** Alphabetical `SectionList` sections keyed by the upper-cased first letter of the name. */
export function groupByInitial(friends: readonly Friend[]): FriendSection[] {
  const sections = new Map<string, Friend[]>();
  for (const friend of [...friends].sort(byName)) {
    const initial = friend.name.trim().charAt(0).toLocaleUpperCase();
    const section = sections.get(initial);
    if (section) section.push(friend);
    else sections.set(initial, [friend]);
  }
  return [...sections].map(([title, data]) => ({ title, data }));
}
