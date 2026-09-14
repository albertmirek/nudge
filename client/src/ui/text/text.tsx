import { Text as RNText, type TextProps as RNTextProps } from 'react-native';

import { type SemanticColors, type TypographyVariant, useTheme } from '@/theme';

export type TextColor = keyof SemanticColors['text'];

export type TextProps = RNTextProps & {
  /** Typography preset from the theme. */
  variant?: TypographyVariant;
  /** Semantic text colour from the theme. */
  color?: TextColor;
};

export function Text({ variant = 'body', color = 'primary', style, ...rest }: TextProps) {
  const theme = useTheme();
  return (
    <RNText
      style={[theme.typography[variant], { color: theme.colors.text[color] }, style]}
      {...rest}
    />
  );
}
