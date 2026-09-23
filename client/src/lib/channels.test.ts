import { CHANNEL_PLATFORMS, CHANNEL_TYPES, formatHandle } from '@/lib/channels';

it('lists every platform once', () => {
  expect(new Set(CHANNEL_TYPES).size).toBe(Object.keys(CHANNEL_PLATFORMS).length);
});

it('formats handles for display', () => {
  expect(formatHandle('INSTAGRAM', 'jan.novak')).toBe('@jan.novak');
  expect(formatHandle('TELEGRAM', 'jan_novak')).toBe('@jan_novak');
  expect(formatHandle('WHATSAPP', '+420777123456')).toBe('+420 777 123 456');
  expect(formatHandle('EMAIL', 'jan@example.com')).toBe('jan@example.com');
  expect(formatHandle('OTHER', 'Discord')).toBe('Discord');
});
