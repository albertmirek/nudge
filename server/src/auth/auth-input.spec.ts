import { BadRequestException } from '@nestjs/common';
import {
  codeInput,
  credentialsInput,
  emailInput,
  refreshTokenInput,
  resetPasswordInput,
  signUpInput,
} from './auth-input.js';

describe('auth input', () => {
  it('normalises email', () => {
    expect(emailInput({ email: '  Ada@Example.COM ' })).toEqual({ email: 'ada@example.com' });
    expect(() => emailInput({ email: 'nope' })).toThrow(BadRequestException);
    expect(() => emailInput({ email: 'a@b.c', extra: 1 })).toThrow(BadRequestException);
  });

  it('checks password length', () => {
    expect(credentialsInput({ email: 'a@b.co', password: '12345678' })).toEqual({
      email: 'a@b.co',
      password: '12345678',
    });
    expect(() => credentialsInput({ email: 'a@b.co', password: '1234567' })).toThrow(/8/);
    expect(() => credentialsInput({ email: 'a@b.co', password: 'x'.repeat(129) })).toThrow(/128/);
  });

  it('requires a valid IANA timezone on sign-up', () => {
    expect(
      signUpInput({ email: 'a@b.co', password: '12345678', timezone: 'Europe/Prague' }).timezone,
    ).toBe('Europe/Prague');
    expect(() =>
      signUpInput({ email: 'a@b.co', password: '12345678', timezone: 'Mars/Olympus' }),
    ).toThrow(/timezone/);
  });

  it('accepts exactly six digits as a code', () => {
    expect(codeInput({ email: 'a@b.co', code: '012345' })).toEqual({
      email: 'a@b.co',
      code: '012345',
    });
    expect(() => codeInput({ email: 'a@b.co', code: '12345' })).toThrow(/code/);
    expect(() => codeInput({ email: 'a@b.co', code: 12345 })).toThrow(/code/);
  });

  it('parses reset and refresh bodies', () => {
    expect(
      resetPasswordInput({ email: 'a@b.co', code: '123456', newPassword: 'longenough' }),
    ).toEqual({
      email: 'a@b.co',
      code: '123456',
      newPassword: 'longenough',
    });
    expect(refreshTokenInput({ refreshToken: 'abc' })).toEqual({ refreshToken: 'abc' });
    expect(() => refreshTokenInput({ refreshToken: '' })).toThrow(BadRequestException);
  });
});
