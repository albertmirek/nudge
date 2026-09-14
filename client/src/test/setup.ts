import { useSystemColorScheme } from '@/theme/use-system-color-scheme';
import type { ColorScheme } from '@/theme/theme';

jest.mock('@/theme/use-system-color-scheme', () => ({
  useSystemColorScheme: jest.fn((): ColorScheme => 'light'),
}));
export function mockSystemScheme(scheme: ColorScheme): void {
  jest.mocked(useSystemColorScheme).mockReturnValue(scheme);
}
beforeEach(() => mockSystemScheme('light'));
