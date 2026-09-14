import { darkColors, lightColors, type SemanticColors } from './tokens/colors';
import { radii } from './tokens/radii';
import { sizes } from './tokens/sizes';
import { spacing } from './tokens/spacing';
import { typography } from './tokens/typography';

export type ColorScheme = 'light' | 'dark';

export type Theme = {
  scheme: ColorScheme;
  colors: SemanticColors;
  spacing: typeof spacing;
  typography: typeof typography;
  radii: typeof radii;
  sizes: typeof sizes;
};

export const lightTheme: Theme = {
  scheme: 'light',
  colors: lightColors,
  spacing,
  typography,
  radii,
  sizes,
};
export const darkTheme: Theme = {
  scheme: 'dark',
  colors: darkColors,
  spacing,
  typography,
  radii,
  sizes,
};
export const themes: Record<ColorScheme, Theme> = { light: lightTheme, dark: darkTheme };
