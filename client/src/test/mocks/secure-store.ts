const store = new Map<string, string>();

export const AFTER_FIRST_UNLOCK = 'AFTER_FIRST_UNLOCK';
export const getItemAsync = jest.fn(async (key: string) => store.get(key) ?? null);
export const setItemAsync = jest.fn(async (key: string, value: string) => {
  store.set(key, value);
});
export const deleteItemAsync = jest.fn(async (key: string) => {
  store.delete(key);
});
export function __reset(): void {
  store.clear();
  getItemAsync.mockClear();
  setItemAsync.mockClear();
  deleteItemAsync.mockClear();
}
