/// <reference types="jest" />

import * as SecureStore from 'expo-secure-store';

import {
  REFRESH_TOKEN_KEY,
  clearRefreshToken,
  getRefreshToken,
  setRefreshToken,
} from '@/auth/token-store';
import { __reset } from '@/test/mocks/secure-store';

beforeEach(() => __reset());

it('round-trips the refresh token through SecureStore with AFTER_FIRST_UNLOCK', async () => {
  await expect(getRefreshToken()).resolves.toBeNull();
  await setRefreshToken('abc');
  expect(SecureStore.setItemAsync).toHaveBeenCalledWith(REFRESH_TOKEN_KEY, 'abc', {
    keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
  });
  await expect(getRefreshToken()).resolves.toBe('abc');
  await clearRefreshToken();
  await expect(getRefreshToken()).resolves.toBeNull();
});

it('treats a SecureStore read failure as signed out', async () => {
  jest.mocked(SecureStore.getItemAsync).mockRejectedValueOnce(new Error('keychain locked'));
  await expect(getRefreshToken()).resolves.toBeNull();
});
