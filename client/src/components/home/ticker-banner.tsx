import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, type LayoutChangeEvent, View } from 'react-native';

import { type Theme, useStyles } from '@/theme';
import { Text } from '@/ui';

export type TickerBannerProps = {
  text: string;
  /** One full pass, left edge to left edge; matches the Figma keyframe (~12.14s). */
  durationMs?: number;
};

/** Figma "ticker": a looping marquee banner. Decorative — hidden from screen readers. */
export function TickerBanner({ text, durationMs = 12137 }: TickerBannerProps) {
  const styles = useStyles(makeStyles);
  // Lazy useState instead of useRef().current: reading `.current` during render is disallowed.
  const [translateX] = useState(() => new Animated.Value(0));
  const loopRef = useRef<Animated.CompositeAnimation | null>(null);
  const [segmentWidth, setSegmentWidth] = useState(0);

  // Measures a single copy of the text (not the full duplicated content) so the loop travels
  // exactly one segment: the second copy seamlessly fills in as the first slides out, and the
  // reset back to translateX 0 is visually identical to the mid-loop frame it replaces.
  const onSegmentLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const width = event.nativeEvent.layout.width;
      if (width === segmentWidth) return;
      setSegmentWidth(width);
      translateX.setValue(0);
      loopRef.current?.stop();
      loopRef.current = Animated.loop(
        Animated.timing(translateX, {
          toValue: -width,
          duration: durationMs,
          easing: (t) => t,
          useNativeDriver: false,
        }),
      );
      loopRef.current.start();
    },
    [segmentWidth, durationMs, translateX],
  );

  // Stop the loop on unmount so no animation keeps ticking (and no timer keeps a test process alive).
  useEffect(() => () => loopRef.current?.stop(), []);

  return (
    <View testID="ticker-banner" style={styles.track} accessibilityElementsHidden>
      <Animated.View style={[styles.content, { transform: [{ translateX }] }]}>
        <Text style={styles.text} onLayout={onSegmentLayout}>
          {text}
        </Text>
        <Text style={styles.text}>{text}</Text>
      </Animated.View>
    </View>
  );
}

const makeStyles = (theme: Theme) => ({
  track: {
    height: 25,
    overflow: 'hidden' as const,
    backgroundColor: theme.colors.highlight,
    justifyContent: 'center' as const,
  },
  content: { flexDirection: 'row' as const },
  text: {
    color: theme.colors.onHighlight,
    fontSize: 16,
    paddingRight: theme.spacing[5],
  },
});
