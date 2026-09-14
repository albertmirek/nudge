import { setProjectAnnotations } from '@storybook/react';

import preview from '@/storybook/preview';
import type { ColorScheme } from '@/theme/theme';
import { useSystemColorScheme } from '@/theme/use-system-color-scheme';

jest.mock('@/theme/use-system-color-scheme', () => ({
  useSystemColorScheme: jest.fn((): ColorScheme => 'light'),
}));

// Fonts never finish loading in Jest; the `withFonts` decorator would otherwise render null.
jest.mock('@expo-google-fonts/inter', () => ({
  Inter_300Light: 'Inter_300Light',
  Inter_400Regular: 'Inter_400Regular',
  Inter_600SemiBold: 'Inter_600SemiBold',
  useFonts: () => [true, null],
}));

export function mockSystemScheme(scheme: ColorScheme): void {
  jest.mocked(useSystemColorScheme).mockReturnValue(scheme);
}

beforeEach(() => mockSystemScheme('light'));

// Portable stories get the same decorators as Storybook (ThemeProvider, fonts).
setProjectAnnotations(preview);
