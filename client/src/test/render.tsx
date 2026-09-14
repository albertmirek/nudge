import { render, type RenderOptions } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import {
  type ColorScheme,
  ThemeProvider,
  type ThemeStorage,
  createMemoryThemeStorage,
} from '@/theme';

type Options = RenderOptions & { scheme?: ColorScheme; storage?: ThemeStorage };
export function renderWithTheme(
  ui: ReactElement,
  { scheme = 'light', storage = createMemoryThemeStorage(), ...options }: Options = {},
) {
  return render(ui, {
    wrapper: ({ children }) => (
      <ThemeProvider storage={storage} initialMode={scheme}>
        {children}
      </ThemeProvider>
    ),
    ...options,
  });
}
