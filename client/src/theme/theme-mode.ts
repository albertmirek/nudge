export const THEME_MODES = ['system', 'light', 'dark'] as const;
export type ThemeMode = (typeof THEME_MODES)[number];
export const THEME_MODE_STORAGE_KEY = 'nudge.theme.mode';

export function parseThemeMode(value: string | null | undefined): ThemeMode | null {
  return THEME_MODES.find((mode) => mode === value) ?? null;
}

export interface ThemeStorage {
  get(): ThemeMode | null;
  set(mode: ThemeMode): void;
}

/** Non-persistent storage for tests and Storybook. */
export function createMemoryThemeStorage(initial: ThemeMode | null = null): ThemeStorage {
  let current = initial;
  return {
    get: () => current,
    set: (mode) => {
      current = mode;
    },
  };
}
