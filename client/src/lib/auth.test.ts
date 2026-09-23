/// <reference types="jest" />

import {
  deviceTimezone,
  validateCode,
  validateCredentials,
  validateEmailOnly,
  validateResetPassword,
} from '@/lib/auth';

describe('validateCredentials', () => {
  it('requires a plausible email and an 8–128 char password', () => {
    expect(validateCredentials({ email: '', password: '' })).toEqual({
      email: 'Enter your email',
      password: 'Enter your password',
    });
    expect(validateCredentials({ email: 'nope', password: 'short' })).toEqual({
      email: 'Enter a valid email',
      password: 'Use at least 8 characters',
    });
    expect(validateCredentials({ email: ' Ada@Example.com ', password: 'x'.repeat(129) })).toEqual({
      password: 'Use at most 128 characters',
    });
    expect(validateCredentials({ email: 'ada@example.com', password: 'longenough' })).toEqual({});
  });
});

it('validateEmailOnly checks just the email', () => {
  expect(validateEmailOnly({ email: '' })).toEqual({ email: 'Enter your email' });
  expect(validateEmailOnly({ email: 'a@b.co' })).toEqual({});
});

it('validateCode wants six digits', () => {
  expect(validateCode({ code: '' })).toEqual({ code: 'Enter the 6-digit code' });
  expect(validateCode({ code: '12a456' })).toEqual({ code: 'Enter the 6-digit code' });
  expect(validateCode({ code: '123456' })).toEqual({});
});

it('validateResetPassword combines code and password rules', () => {
  expect(validateResetPassword({ code: '1', newPassword: 'short' })).toEqual({
    code: 'Enter the 6-digit code',
    newPassword: 'Use at least 8 characters',
  });
});

it('deviceTimezone falls back to UTC', () => {
  expect(typeof deviceTimezone()).toBe('string');
  const spy = jest.spyOn(Intl, 'DateTimeFormat').mockImplementation(() => {
    throw new Error('no Intl');
  });
  expect(deviceTimezone()).toBe('UTC');
  spy.mockRestore();
});
