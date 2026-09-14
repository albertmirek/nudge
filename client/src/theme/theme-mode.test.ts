import { createMemoryThemeStorage, parseThemeMode } from '@/theme/theme-mode';

describe('parseThemeMode', () => {
  it.each(['system', 'light', 'dark'] as const)('accepts %s', (mode) =>
    expect(parseThemeMode(mode)).toBe(mode),
  );
  it('rejects invalid values', () => {
    expect(parseThemeMode('blue')).toBeNull();
    expect(parseThemeMode(null)).toBeNull();
  });
});

describe('createMemoryThemeStorage', () => {
  it('stores a mode in memory', () => {
    const storage = createMemoryThemeStorage();
    expect(storage.get()).toBeNull();
    storage.set('dark');
    expect(storage.get()).toBe('dark');
  });
});
