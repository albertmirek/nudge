import { BadRequestException } from '@nestjs/common';
import { enumInput, objectInput } from '../common/input.js';
import { ChannelType } from './entities/channel-type.enum.js';

const E164 = /^\+[1-9]\d{6,14}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAMES: Partial<Record<ChannelType, RegExp>> = {
  [ChannelType.TELEGRAM]: /^[A-Za-z0-9_]{5,32}$/,
  [ChannelType.INSTAGRAM]: /^[A-Za-z0-9._]{1,30}$/,
  [ChannelType.MESSENGER]: /^[A-Za-z0-9.]{5,50}$/,
};
const PHONE_TYPES: readonly ChannelType[] = [
  ChannelType.WHATSAPP,
  ChannelType.SIGNAL,
  ChannelType.SMS,
  ChannelType.PHONE,
];
const OTHER_LINK_SCHEMES = ['https:', 'tel:', 'sms:', 'mailto:'];

/** Normalizes a handle and checks it fits its channel type (phone, username or email). */
export function channelHandle(type: ChannelType, value: unknown): string {
  const raw = typeof value === 'string' ? value.trim() : '';
  const valid = (() => {
    if (PHONE_TYPES.includes(type)) return E164.test(raw);
    if (type === ChannelType.IMESSAGE) return E164.test(raw) || EMAIL.test(raw);
    if (type === ChannelType.EMAIL) return raw.length <= 254 && EMAIL.test(raw);
    if (type === ChannelType.OTHER) return raw.length > 0 && raw.length <= 100;
    return USERNAMES[type]?.test(raw.replace(/^@/, '')) ?? false;
  })();
  if (!valid) throw new BadRequestException(`Invalid handle for ${type}`);
  return USERNAMES[type] ? raw.replace(/^@/, '') : raw;
}

/** Only OTHER stores a link (with an allowed scheme); every other type derives it. */
export function channelDeepLink(type: ChannelType, value: unknown): string | null {
  if (type !== ChannelType.OTHER) {
    if (value !== undefined && value !== null) {
      throw new BadRequestException('deepLink is only allowed for OTHER');
    }
    return null;
  }
  if (typeof value !== 'string' || !value.trim() || value.length > 2000) {
    throw new BadRequestException('deepLink is required for OTHER');
  }
  const link = value.trim();
  let protocol: string;
  try {
    protocol = new URL(link).protocol;
  } catch {
    throw new BadRequestException('deepLink must be a URL');
  }
  if (!OTHER_LINK_SCHEMES.includes(protocol)) {
    throw new BadRequestException('deepLink must use https, tel, sms or mailto');
  }
  return link;
}

/** The URL that opens the conversation. Derived, so stored rows survive link-format changes. */
export function channelLink(type: ChannelType, handle: string, deepLink: string | null): string {
  switch (type) {
    case ChannelType.WHATSAPP:
      return `https://wa.me/${handle.slice(1)}`;
    case ChannelType.SIGNAL:
      return `https://signal.me/#p/${handle}`;
    case ChannelType.SMS:
    case ChannelType.IMESSAGE:
      return `sms:${handle}`;
    case ChannelType.PHONE:
      return `tel:${handle}`;
    case ChannelType.TELEGRAM:
      return `https://t.me/${handle}`;
    case ChannelType.INSTAGRAM:
      return `https://ig.me/m/${handle}`;
    case ChannelType.MESSENGER:
      return `https://m.me/${handle}`;
    case ChannelType.EMAIL:
      return `mailto:${handle}`;
    case ChannelType.OTHER:
      return deepLink ?? '';
  }
}

export interface CreateChannelInput {
  type: ChannelType;
  handle: string;
  deepLink: string | null;
}

/** Raw PATCH fields; the service validates them against the channel's stored type. */
export interface UpdateChannelInput {
  handle?: unknown;
  deepLink?: unknown;
}

export function createChannelInput(value: unknown): CreateChannelInput {
  const body = objectInput(value, ['type', 'handle', 'deepLink']);
  const type = enumInput(body.type, Object.values(ChannelType), 'type');
  return {
    type,
    handle: channelHandle(type, body.handle),
    deepLink: channelDeepLink(type, body.deepLink),
  };
}

export function updateChannelInput(value: unknown): UpdateChannelInput {
  const body = objectInput(value, ['handle', 'deepLink']);
  if (!Object.keys(body).length) throw new BadRequestException('At least one field is required');
  return body;
}
