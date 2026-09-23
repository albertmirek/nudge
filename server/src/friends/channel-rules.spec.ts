import { BadRequestException } from '@nestjs/common';
import {
  channelDeepLink,
  channelHandle,
  channelLink,
  createChannelInput,
  updateChannelInput,
} from './channel-rules.js';
import { ChannelType } from './entities/channel-type.enum.js';

describe('channelLink', () => {
  it.each([
    [ChannelType.WHATSAPP, '+420777123456', 'https://wa.me/420777123456'],
    [ChannelType.SIGNAL, '+420777123456', 'https://signal.me/#p/+420777123456'],
    [ChannelType.SMS, '+420777123456', 'sms:+420777123456'],
    [ChannelType.PHONE, '+420777123456', 'tel:+420777123456'],
    [ChannelType.IMESSAGE, '+420777123456', 'sms:+420777123456'],
    [ChannelType.IMESSAGE, 'jan@example.com', 'sms:jan@example.com'],
    [ChannelType.TELEGRAM, 'jan_novak', 'https://t.me/jan_novak'],
    [ChannelType.INSTAGRAM, 'jan.novak', 'https://ig.me/m/jan.novak'],
    [ChannelType.MESSENGER, 'jan.novak', 'https://m.me/jan.novak'],
    [ChannelType.EMAIL, 'jan@example.com', 'mailto:jan@example.com'],
  ])('%s %s -> %s', (type, handle, link) => {
    expect(channelLink(type, handle, null)).toBe(link);
  });

  it('uses the stored link for OTHER', () => {
    expect(channelLink(ChannelType.OTHER, 'Discord', 'https://discord.com/users/1')).toBe(
      'https://discord.com/users/1',
    );
  });
});

describe('channelHandle', () => {
  it('trims and strips a leading @ from usernames', () => {
    expect(channelHandle(ChannelType.INSTAGRAM, ' @jan.novak ')).toBe('jan.novak');
  });

  it('accepts E.164 phones for phone types', () => {
    expect(channelHandle(ChannelType.WHATSAPP, '+420777123456')).toBe('+420777123456');
  });

  it('accepts a phone or an email for iMessage', () => {
    expect(channelHandle(ChannelType.IMESSAGE, 'jan@example.com')).toBe('jan@example.com');
    expect(channelHandle(ChannelType.IMESSAGE, '+420777123456')).toBe('+420777123456');
  });

  it.each([
    [ChannelType.WHATSAPP, '777 123 456'],
    [ChannelType.SIGNAL, '420777123456'],
    [ChannelType.TELEGRAM, 'abc'],
    [ChannelType.INSTAGRAM, 'jan novak'],
    [ChannelType.MESSENGER, 'jan'],
    [ChannelType.EMAIL, 'not-an-email'],
    [ChannelType.OTHER, ''],
    [ChannelType.OTHER, 'x'.repeat(101)],
    [ChannelType.INSTAGRAM, 42],
  ])('rejects %s %j', (type, value) => {
    expect(() => channelHandle(type, value)).toThrow(BadRequestException);
  });
});

describe('channelDeepLink', () => {
  it('is null for derived types and rejects a supplied link', () => {
    expect(channelDeepLink(ChannelType.WHATSAPP, undefined)).toBeNull();
    expect(channelDeepLink(ChannelType.WHATSAPP, null)).toBeNull();
    expect(() => channelDeepLink(ChannelType.WHATSAPP, 'https://wa.me/1')).toThrow(
      BadRequestException,
    );
  });

  it('requires an allowed scheme for OTHER', () => {
    expect(channelDeepLink(ChannelType.OTHER, ' https://discord.com/users/1 ')).toBe(
      'https://discord.com/users/1',
    );
    expect(channelDeepLink(ChannelType.OTHER, 'tel:+420777123456')).toBe('tel:+420777123456');
    expect(() => channelDeepLink(ChannelType.OTHER, undefined)).toThrow(BadRequestException);
    expect(() => channelDeepLink(ChannelType.OTHER, 'javascript:alert(1)')).toThrow(
      BadRequestException,
    );
    expect(() => channelDeepLink(ChannelType.OTHER, 'not a url')).toThrow(BadRequestException);
  });
});

describe('createChannelInput / updateChannelInput', () => {
  it('parses a create body', () => {
    expect(createChannelInput({ type: 'INSTAGRAM', handle: '@jan.novak' })).toEqual({
      type: ChannelType.INSTAGRAM,
      handle: 'jan.novak',
      deepLink: null,
    });
  });

  it('rejects unknown fields, bad types and missing handles', () => {
    expect(() =>
      createChannelInput({ type: 'WHATSAPP', handle: '+420777123456', friendId: 'x' }),
    ).toThrow(BadRequestException);
    expect(() => createChannelInput({ type: 'FAX', handle: '+420777123456' })).toThrow(
      BadRequestException,
    );
    expect(() => createChannelInput({ type: 'WHATSAPP' })).toThrow(BadRequestException);
  });

  it('requires a nonempty update body with known fields only', () => {
    expect(updateChannelInput({ handle: 'x' })).toEqual({ handle: 'x' });
    expect(() => updateChannelInput({})).toThrow(BadRequestException);
    expect(() => updateChannelInput({ type: 'SMS' })).toThrow(BadRequestException);
  });
});
