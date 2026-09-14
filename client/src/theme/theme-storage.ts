import Storage from 'expo-sqlite/kv-store';

import { THEME_MODE_STORAGE_KEY, parseThemeMode, type ThemeStorage } from './theme-mode';

/** Persists the mode in Expo SQLite's synchronous key-value store. */
export function createDefaultThemeStorage(): ThemeStorage {
  return {
    get: () => parseThemeMode(Storage.getItemSync(THEME_MODE_STORAGE_KEY)),
    set: (mode) => Storage.setItemSync(THEME_MODE_STORAGE_KEY, mode),
  };
}
