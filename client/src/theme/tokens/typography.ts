import { Platform, type TextStyle } from 'react-native';

function inter(nativeFamily: string, weight: NonNullable<TextStyle['fontWeight']>): TextStyle {
  return Platform.select<TextStyle>({
    web: { fontFamily: 'Inter', fontWeight: weight },
    default: { fontFamily: nativeFamily },
  });
}

export const fontFamilies = {
  light: 'Inter_300Light',
  regular: 'Inter_400Regular',
  semiBold: 'Inter_600SemiBold',
} as const;

export type TypographyVariant = 'title' | 'titleRegular' | 'body' | 'bodyLight' | 'caption';

export const typography: Record<TypographyVariant, TextStyle> = {
  title: { ...inter(fontFamilies.semiBold, '600'), fontSize: 28, lineHeight: 36 },
  // Same scale as `title`, regular weight — the Figma homepage greeting above the bold summary.
  titleRegular: { ...inter(fontFamilies.regular, '400'), fontSize: 28, lineHeight: 36 },
  body: { ...inter(fontFamilies.regular, '400'), fontSize: 15, lineHeight: 20 },
  bodyLight: { ...inter(fontFamilies.light, '300'), fontSize: 12, lineHeight: 16 },
  caption: { ...inter(fontFamilies.regular, '400'), fontSize: 12, lineHeight: 16 },
};
