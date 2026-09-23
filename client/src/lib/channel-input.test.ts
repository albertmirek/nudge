import { parseChannelInput } from '@/lib/channel-input';

describe('parseChannelInput', () => {
  it.each([
    ['https://www.instagram.com/jan.novak?igsh=abc123', { type: 'INSTAGRAM', handle: 'jan.novak' }],
    ['instagram.com/jan.novak/', { type: 'INSTAGRAM', handle: 'jan.novak' }],
    ['https://ig.me/m/jan.novak', { type: 'INSTAGRAM', handle: 'jan.novak' }],
    ['https://www.facebook.com/jan.novak.5', { type: 'MESSENGER', handle: 'jan.novak.5' }],
    [
      'https://www.facebook.com/profile.php?id=100012345678',
      { type: 'MESSENGER', handle: '100012345678' },
    ],
    ['https://m.me/jan.novak', { type: 'MESSENGER', handle: 'jan.novak' }],
    ['https://t.me/jan_novak', { type: 'TELEGRAM', handle: 'jan_novak' }],
    ['https://wa.me/420777123456', { type: 'WHATSAPP', handle: '+420777123456' }],
    ['https://signal.me/#p/+420777123456', { type: 'SIGNAL', handle: '+420777123456' }],
    ['jan@example.com', { type: 'EMAIL', handle: 'jan@example.com' }],
  ] as const)('parses %s without a hint', (text, expected) => {
    expect(parseChannelInput(text)).toEqual(expected);
  });

  it('returns null for ambiguous or unknown text without a hint', () => {
    expect(parseChannelInput('+420 777 123 456')).toBeNull();
    expect(parseChannelInput('@jan.novak')).toBeNull();
    expect(parseChannelInput('hello world')).toBeNull();
    expect(parseChannelInput('https://example.com/jan')).toBeNull();
  });

  it('uses the hint for phones, normalizing to E.164 with the default country', () => {
    expect(parseChannelInput('777 123 456', 'WHATSAPP', 'CZ')).toEqual({
      type: 'WHATSAPP',
      handle: '+420777123456',
    });
    expect(parseChannelInput('+420 777 123 456', 'SIGNAL')).toEqual({
      type: 'SIGNAL',
      handle: '+420777123456',
    });
    expect(parseChannelInput('12', 'SMS', 'CZ')).toBeNull();
  });

  it('uses the hint for bare usernames and validates them per platform', () => {
    expect(parseChannelInput('@jan.novak', 'INSTAGRAM')).toEqual({
      type: 'INSTAGRAM',
      handle: 'jan.novak',
    });
    expect(parseChannelInput('jan', 'TELEGRAM')).toBeNull();
    expect(parseChannelInput('jan novak', 'INSTAGRAM')).toBeNull();
  });

  it('accepts a phone or an email for iMessage and an email for EMAIL', () => {
    expect(parseChannelInput('jan@example.com', 'IMESSAGE')).toEqual({
      type: 'IMESSAGE',
      handle: 'jan@example.com',
    });
    expect(parseChannelInput('777123456', 'IMESSAGE', 'CZ')).toEqual({
      type: 'IMESSAGE',
      handle: '+420777123456',
    });
    expect(parseChannelInput('777123456', 'EMAIL', 'CZ')).toBeNull();
  });

  it('lets a recognized link win over the hint', () => {
    expect(parseChannelInput('https://t.me/jan_novak', 'INSTAGRAM')).toEqual({
      type: 'TELEGRAM',
      handle: 'jan_novak',
    });
  });

  it('never parses OTHER', () => {
    expect(parseChannelInput('https://discord.com/users/1', 'OTHER')).toBeNull();
  });
});
