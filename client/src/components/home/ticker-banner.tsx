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
  const [trackWidth, setTrackWidth] = useState(0);

  const onTrackLayout = useCallback((event: LayoutChangeEvent) => {
    setTrackWidth(event.nativeEvent.layout.width);
  }, []);

  // Measures a single copy of the text (not the full duplicated content) so the loop travels
  // exactly one segment: the next copy seamlessly fills in as the first slides out, and the
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

  // Enough copies to cover the whole track, plus one so the tail is still covered once a full
  // segment has slid out (right before the loop resets). Two copies alone leave the right edge
  // blank whenever a single segment is narrower than the track.
  const copies =
    segmentWidth > 0 && trackWidth > 0 ? Math.max(2, Math.ceil(trackWidth / segmentWidth) + 1) : 2;

  return (
    <View
      testID="ticker-banner"
      style={styles.track}
      accessibilityElementsHidden
      onLayout={onTrackLayout}
    >
      <Animated.View style={[styles.content, { transform: [{ translateX }] }]}>
        {Array.from({ length: copies }, (_, index) => (
          <Text
            key={index}
            style={styles.text}
            onLayout={index === 0 ? onSegmentLayout : undefined}
          >
            {text}
          </Text>
        ))}
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
