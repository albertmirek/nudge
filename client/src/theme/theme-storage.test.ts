import Storage from 'expo-sqlite/kv-store';

import { THEME_MODE_STORAGE_KEY } from '@/theme/theme-mode';
import { createDefaultThemeStorage } from '@/theme/theme-storage';

beforeEach(() => Storage.clearSync());

describe('createDefaultThemeStorage', () => {
  it('reads and writes a valid persisted mode', () => {
    const storage = createDefaultThemeStorage();
    expect(storage.get()).toBeNull();
    storage.set('dark');
    expect(Storage.getItemSync(THEME_MODE_STORAGE_KEY)).toBe('dark');
    expect(storage.get()).toBe('dark');
  });
  it('ignores corrupt persisted values', () => {
    Storage.setItemSync(THEME_MODE_STORAGE_KEY, 'purple');
    expect(createDefaultThemeStorage().get()).toBeNull();
  });
});
