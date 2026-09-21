import { Image } from 'expo-image';
import type { ImageStyle, StyleProp } from 'react-native';

import bookIcon from '@/assets/icons/book.svg';
import cameraIcon from '@/assets/icons/camera.svg';
import chevronLeftIcon from '@/assets/icons/chevron-left.svg';
import gridIcon from '@/assets/icons/grid.svg';
import homeIcon from '@/assets/icons/home.svg';
import pencilIcon from '@/assets/icons/pencil.svg';
import listIcon from '@/assets/icons/list.svg';
import plusIcon from '@/assets/icons/plus.svg';
import { type SemanticColors, useTheme } from '@/theme';

const ICONS = {
  book: bookIcon,
  camera: cameraIcon,
  grid: gridIcon,
  'chevron-left': chevronLeftIcon,
  home: homeIcon,
  list: listIcon,
  pencil: pencilIcon,
  plus: plusIcon,
} as const;

export type IconName = keyof typeof ICONS;
export const ICON_NAMES = Object.keys(ICONS) as IconName[];

export type IconProps = {
  name: IconName;
  /** Square edge in px. Defaults to `theme.sizes.icon`. */
  size?: number;
  /** Semantic text colour used as the tint; the SVG assets are single-colour strokes. */
  color?: keyof SemanticColors['text'];
  style?: StyleProp<ImageStyle>;
};

/** Monochrome line icon from `assets/icons`, tinted so it follows the colour scheme. */
export function Icon({ name, size, color = 'primary', style }: IconProps) {
  const theme = useTheme();
  const edge = size ?? theme.sizes.icon;
  return (
    <Image
      testID={`icon-${name}`}
      source={ICONS[name]}
      tintColor={theme.colors.text[color]}
      contentFit="contain"
      style={[{ width: edge, height: edge }, style]}
    />
  );
}
