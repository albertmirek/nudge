import { getLocales } from 'expo-localization';
import { type CountryCode, parsePhoneNumberFromString } from 'libphonenumber-js';

import type { ChannelType } from '@/api/types';

export type ChannelInputKind = 'phone' | 'username' | 'email' | 'phoneOrEmail' | 'other';

export type ChannelPlatform = {
  label: string;
  input: ChannelInputKind;
  /** One line telling the user where to copy a profile link from. */
  howTo?: string;
  /** Opens the app so the user can copy that link. */
  appUrl?: string;
};

export const CHANNEL_PLATFORMS: Record<ChannelType, ChannelPlatform> = {
  WHATSAPP: { label: 'WhatsApp', input: 'phone' },
  INSTAGRAM: {
    label: 'Instagram',
    input: 'username',
    howTo: 'In Instagram: their profile → ⋯ → Copy profile URL',
    appUrl: 'https://www.instagram.com/',
  },
  MESSENGER: {
    label: 'Messenger',
    input: 'username',
    howTo: 'In Facebook: their profile → ⋯ → Copy link',
    appUrl: 'https://www.facebook.com/',
  },
  TELEGRAM: {
    label: 'Telegram',
    input: 'username',
    howTo: 'In Telegram: their profile → Username',
    appUrl: 'https://t.me/',
  },
  SIGNAL: { label: 'Signal', input: 'phone' },
  IMESSAGE: { label: 'iMessage', input: 'phoneOrEmail' },
  SMS: { label: 'SMS', input: 'phone' },
  PHONE: { label: 'Phone', input: 'phone' },
  EMAIL: { label: 'Email', input: 'email' },
  OTHER: { label: 'Other', input: 'other' },
};

/** Display order of the platform grid. */
export const CHANNEL_TYPES = Object.keys(CHANNEL_PLATFORMS) as ChannelType[];

/** The device's region, used as the default country for numbers typed without +. */
export function deviceCountry(): CountryCode | undefined {
  return (getLocales()[0]?.regionCode ?? undefined) as CountryCode | undefined;
}

export function formatHandle(type: ChannelType, handle: string): string {
  const { input } = CHANNEL_PLATFORMS[type];
  if (input === 'username') return `@${handle}`;
  if (handle.startsWith('+')) {
    return parsePhoneNumberFromString(handle)?.formatInternational() ?? handle;
  }
  return handle;
}
