import { Image } from 'expo-image';
import { type StyleProp, StyleSheet, View, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme';

export type AvatarProps = {
  /** Who the picture shows; used as the accessibility label. */
  label: string;
  /** Diameter in px. Figma contact row uses 49. */
  size?: number;
  /** Remote image URL. Without it the avatar is a solid accent disc (Figma placeholder). */
  source?: string;
  style?: StyleProp<ViewStyle>;
};

export function Avatar({ label, size = 49, source, style }: AvatarProps) {
  const theme = useTheme();
  const shape: ViewStyle = {
    width: size,
    height: size,
    borderRadius: theme.radii.full,
    backgroundColor: theme.colors.accent,
    overflow: 'hidden',
  };

  return (
    <View accessible accessibilityRole="image" accessibilityLabel={label} style={[shape, style]}>
      {source ? (
        <Image
          testID="avatar-image"
          source={{ uri: source }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
        />
      ) : null}
    </View>
  );
}
