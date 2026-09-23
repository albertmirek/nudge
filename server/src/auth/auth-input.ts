import { BadRequestException } from '@nestjs/common';
import { objectInput, textInput } from '../common/input.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_MIN = 8;
const PASSWORD_MAX = 128;
// Intl.supportedValuesOf('timeZone') enumerates IANA named zones but, per ECMA-402, omits 'UTC'
// even though it is a valid, constructible time zone identifier — add it back explicitly.
const TIMEZONES = new Set([...Intl.supportedValuesOf('timeZone'), 'UTC']);

function email(value: unknown): string {
  if (typeof value !== 'string') throw new BadRequestException('email must be a string');
  const normalised = value.trim().toLowerCase();
  if (normalised.length > 254 || !EMAIL_RE.test(normalised)) {
    throw new BadRequestException('email must be a valid email address');
  }
  return normalised;
}

function password(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.length < PASSWORD_MIN || value.length > PASSWORD_MAX) {
    throw new BadRequestException(
      `${field} must be between ${PASSWORD_MIN} and ${PASSWORD_MAX} characters`,
    );
  }
  return value;
}

function code(value: unknown): string {
  if (typeof value !== 'string' || !/^\d{6}$/.test(value)) {
    throw new BadRequestException('code must be six digits');
  }
  return value;
}

function timezone(value: unknown): string {
  if (typeof value !== 'string' || !TIMEZONES.has(value)) {
    throw new BadRequestException('timezone must be an IANA time zone name');
  }
  return value;
}

export function emailInput(value: unknown): { email: string } {
  const body = objectInput(value, ['email']);
  return { email: email(body.email) };
}

export function credentialsInput(value: unknown): { email: string; password: string } {
  const body = objectInput(value, ['email', 'password']);
  return { email: email(body.email), password: password(body.password, 'password') };
}

export function signUpInput(value: unknown): { email: string; password: string; timezone: string } {
  const body = objectInput(value, ['email', 'password', 'timezone']);
  return {
    email: email(body.email),
    password: password(body.password, 'password'),
    timezone: timezone(body.timezone),
  };
}

export function codeInput(value: unknown): { email: string; code: string } {
  const body = objectInput(value, ['email', 'code']);
  return { email: email(body.email), code: code(body.code) };
}

export function resetPasswordInput(value: unknown): {
  email: string;
  code: string;
  newPassword: string;
} {
  const body = objectInput(value, ['email', 'code', 'newPassword']);
  return {
    email: email(body.email),
    code: code(body.code),
    newPassword: password(body.newPassword, 'newPassword'),
  };
}

export function refreshTokenInput(value: unknown): { refreshToken: string } {
  const body = objectInput(value, ['refreshToken']);
  return { refreshToken: textInput(body.refreshToken, 'refreshToken', 512) };
}
