/// <reference types="jest" />

import { apiFetch } from '@/api/http';
import {
  forgotPassword,
  resendVerification,
  resetPassword,
  signIn,
  signOut,
  signUp,
  verifyEmail,
} from '@/api/auth';

jest.mock('@/api/http', () => ({ apiFetch: jest.fn() }));

beforeEach(() => jest.mocked(apiFetch).mockResolvedValue(undefined));

it.each([
  ['sign-up', () => signUp({ email: 'a@b.co', password: 'password1', timezone: 'UTC' })],
  ['verify-email', () => verifyEmail({ email: 'a@b.co', code: '123456' })],
  ['resend-verification', () => resendVerification({ email: 'a@b.co' })],
  ['sign-in', () => signIn({ email: 'a@b.co', password: 'password1' })],
  ['sign-out', () => signOut({ refreshToken: 'r' })],
  ['forgot-password', () => forgotPassword({ email: 'a@b.co' })],
  [
    'reset-password',
    () => resetPassword({ email: 'a@b.co', code: '123456', newPassword: 'password2' }),
  ],
])('%s posts JSON to the public endpoint', async (path, call) => {
  await call();
  expect(apiFetch).toHaveBeenCalledWith(
    `/v1/auth/${path}`,
    expect.objectContaining({ method: 'POST', body: expect.any(String) }),
    { auth: false },
  );
});
