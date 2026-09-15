import { Pressable, View } from 'react-native';

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

/** Figma "navbar": Overdue/Upcoming segmented control with an underline indicator. */
export function NudgeTabs({ value, onChange, overdueCount }: NudgeTabsProps) {
  const styles = useStyles(makeStyles);

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
            style={[styles.tab, selected && styles.tabSelected]}
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
    </View>
  );
}

const makeStyles = (theme: Theme) => ({
  row: {
    flexDirection: 'row' as const,
    borderBottomWidth: theme.sizes.border,
    borderBottomColor: theme.colors.text.primary,
  },
  tab: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: theme.spacing[1],
    flex: 1,
    paddingVertical: theme.spacing[3],
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabSelected: { borderBottomColor: theme.colors.text.primary },
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
