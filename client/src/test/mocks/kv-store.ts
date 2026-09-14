const store = new Map<string, string>();

const Storage = {
  getItemSync: (key: string): string | null => store.get(key) ?? null,
  setItemSync: (key: string, value: string): void => {
    store.set(key, value);
  },
  removeItemSync: (key: string): boolean => store.delete(key),
  clearSync: (): boolean => {
    store.clear();
    return true;
  },
  getItemAsync: async (key: string): Promise<string | null> => store.get(key) ?? null,
  setItemAsync: async (key: string, value: string): Promise<void> => {
    store.set(key, value);
  },
};

export default Storage;
