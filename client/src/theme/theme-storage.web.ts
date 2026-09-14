import { THEME_MODE_STORAGE_KEY, parseThemeMode, type ThemeStorage } from './theme-mode';

/** Web storage that tolerates SSR and browser privacy modes. */
export function createDefaultThemeStorage(): ThemeStorage {
  return {
    get: () => {
      try {
        return parseThemeMode(globalThis.localStorage?.getItem(THEME_MODE_STORAGE_KEY));
      } catch {
        return null;
      }
    },
    set: (mode) => {
      try {
        globalThis.localStorage?.setItem(THEME_MODE_STORAGE_KEY, mode);
      } catch {
        /* Best effort. */
      }
    },
  };
}
