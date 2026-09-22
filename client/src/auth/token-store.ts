import * as SecureStore from 'expo-secure-store';

export const REFRESH_TOKEN_KEY = 'nudge.refreshToken';

// AFTER_FIRST_UNLOCK: background refreshes after a reboot work once the device was unlocked.
const OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
};

/** The only credential persisted on the device; lives in the Keychain / Keystore. */
export async function getRefreshToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(REFRESH_TOKEN_KEY, OPTIONS);
  } catch {
    return null;
  }
}

export function setRefreshToken(token: string): Promise<void> {
  return SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token, OPTIONS);
}

export function clearRefreshToken(): Promise<void> {
  return SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY, OPTIONS);
}
