import { type CountryCode, parsePhoneNumberFromString } from 'libphonenumber-js';

import type { ChannelType } from '@/api/types';
import { CHANNEL_PLATFORMS } from '@/lib/channels';

export type ParsedChannel = { type: ChannelType; handle: string };

// Mirrors the server's rules; the server stays authoritative.
const USERNAMES: Partial<Record<ChannelType, RegExp>> = {
  TELEGRAM: /^[A-Za-z0-9_]{5,32}$/,
  INSTAGRAM: /^[A-Za-z0-9._]{1,30}$/,
  MESSENGER: /^[A-Za-z0-9.]{5,50}$/,
};
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const HOST = String.raw`^(?:https?:\/\/)?(?:www\.|m\.)?`;
const TAIL = String.raw`\/?(?:[?#].*)?$`;

/** Profile/chat URLs people copy from each app, in match order. */
const LINKS: { type: ChannelType; pattern: RegExp; phone?: boolean }[] = [
  {
    type: 'INSTAGRAM',
    pattern: new RegExp(`${HOST}instagram\\.com\\/([A-Za-z0-9._]{1,30})${TAIL}`),
  },
  { type: 'INSTAGRAM', pattern: new RegExp(`${HOST}ig\\.me\\/m\\/([A-Za-z0-9._]{1,30})${TAIL}`) },
  {
    type: 'MESSENGER',
    pattern: new RegExp(`${HOST}facebook\\.com\\/profile\\.php\\?(?:.*&)?id=(\\d{5,50})`),
  },
  { type: 'MESSENGER', pattern: new RegExp(`${HOST}facebook\\.com\\/([A-Za-z0-9.]{5,50})${TAIL}`) },
  { type: 'MESSENGER', pattern: new RegExp(`${HOST}m\\.me\\/([A-Za-z0-9.]{5,50})${TAIL}`) },
  { type: 'TELEGRAM', pattern: new RegExp(`${HOST}t\\.me\\/([A-Za-z0-9_]{5,32})${TAIL}`) },
  { type: 'WHATSAPP', pattern: new RegExp(`${HOST}wa\\.me\\/(\\d{7,15})${TAIL}`), phone: true },
  { type: 'SIGNAL', pattern: /^(?:https?:\/\/)?signal\.me\/#p\/(\+\d{7,15})$/, phone: true },
];

function e164(text: string, country?: CountryCode): string | null {
  const parsed = parsePhoneNumberFromString(text, country);
  return parsed?.isValid() ? parsed.number : null;
}

/**
 * Turns pasted or typed text into a channel. A recognized link decides the platform by
 * itself; bare phones, usernames and emails need `hint` (the platform the user picked),
 * except an email, which defaults to EMAIL.
 */
export function parseChannelInput(
  text: string,
  hint?: ChannelType,
  defaultCountry?: CountryCode,
): ParsedChannel | null {
  const trimmed = text.trim();
  if (!trimmed || hint === 'OTHER') return null;

  for (const { type, pattern, phone } of LINKS) {
    const match = pattern.exec(trimmed);
    if (!match?.[1]) continue;
    if (!phone) return { type, handle: match[1] };
    const handle = e164(match[1].startsWith('+') ? match[1] : `+${match[1]}`);
    return handle ? { type, handle } : null;
  }
  if (/^https?:\/\//i.test(trimmed)) return null;

  const input = hint ? CHANNEL_PLATFORMS[hint].input : undefined;
  if (EMAIL.test(trimmed)) {
    if (!hint) return { type: 'EMAIL', handle: trimmed };
    return input === 'email' || input === 'phoneOrEmail' ? { type: hint, handle: trimmed } : null;
  }
  if (!hint) return null;

  if (input === 'phone' || input === 'phoneOrEmail') {
    const handle = e164(trimmed, defaultCountry);
    return handle ? { type: hint, handle } : null;
  }
  if (input === 'username') {
    const handle = trimmed.replace(/^@/, '');
    return USERNAMES[hint]?.test(handle) ? { type: hint, handle } : null;
  }
  return null;
}
