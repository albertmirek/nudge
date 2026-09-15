import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, View } from 'react-native';

import { type Theme, useStyles } from '@/theme';
import { Text } from '@/ui';

export type NudgeTab = 'overdue' | 'upcoming';

export type NudgeTabsProps = {
  value: NudgeTab;
  onChange: (tab: NudgeTab) => void;
  /** Shown as a badge on the Overdue tab; hidden when zero. */
  overdueCount: number;
};

const TABS: { key: NudgeTab; label: string }[] = [
  { key: 'overdue', label: 'Overdue' },
  { key: 'upcoming', label: 'Upcoming' },
];

const TAB_INDEX: Record<NudgeTab, number> = { overdue: 0, upcoming: 1 };

/** Figma "navbar": Overdue/Upcoming segmented control with a sliding underline indicator. */
export function NudgeTabs({ value, onChange, overdueCount }: NudgeTabsProps) {
  const styles = useStyles(makeStyles);
  const [indicatorPosition] = useState(() => new Animated.Value(TAB_INDEX[value]));
  const isFirstRender = useRef(true);

  useEffect(() => {
    // Skip the animation on mount: the indicator already starts at the right position.
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    Animated.timing(indicatorPosition, {
      toValue: TAB_INDEX[value],
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [value, indicatorPosition]);

  return (
    <View style={styles.row}>
      {TABS.map(({ key, label }) => {
        const selected = key === value;
        return (
          <Pressable
            key={key}
            accessibilityRole="tab"
            accessibilityLabel={label}
            accessibilityState={{ selected }}
            onPress={() => onChange(key)}
            style={styles.tab}
          >
            <Text variant="body" color={selected ? 'primary' : 'secondary'}>
              {label}
            </Text>
            {key === 'overdue' && overdueCount > 0 ? (
              <View style={styles.badge}>
                <Text variant="caption" style={styles.badgeText}>
                  {overdueCount}
                </Text>
              </View>
            ) : null}
          </Pressable>
        );
      })}
      <Animated.View
        testID="nudge-tabs-indicator"
        style={[
          styles.indicator,
          {
            left: indicatorPosition.interpolate({ inputRange: [0, 1], outputRange: ['0%', '50%'] }),
          },
        ]}
      />
    </View>
  );
}

const makeStyles = (theme: Theme) => ({
  row: {
    flexDirection: 'row' as const,
    borderBottomWidth: theme.sizes.border,
    borderBottomColor: theme.colors.text.primary,
    position: 'relative' as const,
  },
  tab: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: theme.spacing[1],
    flex: 1,
    paddingVertical: theme.spacing[3],
  },
  indicator: {
    position: 'absolute' as const,
    bottom: -theme.sizes.border,
    width: '50%' as const,
    height: 2,
    backgroundColor: theme.colors.text.primary,
  },
  badge: {
    minWidth: theme.sizes.badge,
    height: theme.sizes.badge,
    paddingHorizontal: theme.spacing[1],
    borderRadius: theme.radii.full,
    backgroundColor: theme.colors.highlight,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  badgeText: { color: theme.colors.onHighlight },
});
