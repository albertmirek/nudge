import { ActivityIndicator, Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { type Theme, useStyles, useTheme } from '@/theme';
import { Icon, type IconName, Text } from '@/ui';

/** Route names inside `app/(tabs)/`, in Figma order. */
export const TAB_ROUTES = ['friends', 'create-friend', 'index'] as const;
export type TabRoute = (typeof TAB_ROUTES)[number];

const TABS: Record<TabRoute, { icon: IconName; label: string }> = {
  friends: { icon: 'book', label: 'Friend book' },
  'create-friend': { icon: 'plus', label: 'Add a friend' },
  index: { icon: 'home', label: 'Home' },
};

export type BottomNavAction = {
  label: string;
  onPress: () => void;
  /** Shows a spinner and blocks presses while the action's request is in flight. */
  loading?: boolean;
};

export type BottomNavProps = {
  /** Omit on screens outside the tabs (e.g. a friend's profile) so no tab reads as selected. */
  active?: TabRoute;
  onNavigate: (route: TabRoute) => void;
  /** Replaces the middle "+" tab with the Figma lime disc, e.g. "Contact" on a friend's profile. */
  action?: BottomNavAction;
};

/** Figma bottom bar: book · plus · home. Navigation-agnostic; the tabs layout wires it up. */
export function BottomNav({ active, onNavigate, action }: BottomNavProps) {
  const theme = useTheme();
  const styles = useStyles(makeStyles);
  const routes = action ? TAB_ROUTES.filter((route) => route !== 'create-friend') : TAB_ROUTES;

  return (
    <SafeAreaView edges={['bottom', 'left', 'right']} style={styles.bar}>
      {routes.map((route) => {
        const selected = route === active;
        return (
          <Pressable
            key={route}
            accessibilityRole="tab"
            accessibilityLabel={TABS[route].label}
            accessibilityState={{ selected }}
            onPress={() => onNavigate(route)}
            style={styles.tab}
          >
            <Icon name={TABS[route].icon} color={selected ? 'primary' : 'secondary'} />
          </Pressable>
        );
      })}
      {action ? (
        <View pointerEvents="box-none" style={styles.actionSlot}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={action.label}
            accessibilityState={{ disabled: !!action.loading, busy: !!action.loading }}
            disabled={action.loading}
            onPress={action.onPress}
            style={({ pressed }) => [styles.action, pressed && styles.actionPressed]}
          >
            {action.loading ? (
              <ActivityIndicator color={theme.colors.onHighlight} />
            ) : (
              <Text variant="body" style={styles.actionLabel}>
                {action.label}
              </Text>
            )}
          </Pressable>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const makeStyles = (theme: Theme) => ({
  bar: {
    flexDirection: 'row' as const,
    justifyContent: 'space-evenly' as const,
    alignItems: 'center' as const,
    backgroundColor: theme.colors.background,
    borderTopWidth: theme.sizes.border,
    borderTopColor: theme.colors.border,
  },
  tab: {
    height: theme.sizes.tabBar,
    paddingHorizontal: theme.spacing[5],
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  // Centred over the bar's top edge so the disc floats above the content, as in Figma.
  actionSlot: {
    position: 'absolute' as const,
    left: 0,
    right: 0,
    top: -theme.sizes.fab / 2,
    alignItems: 'center' as const,
  },
  action: {
    width: theme.sizes.fab,
    height: theme.sizes.fab,
    borderRadius: theme.radii.full,
    backgroundColor: theme.colors.highlight,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  actionPressed: { opacity: 0.8 },
  actionLabel: {
    fontFamily: theme.typography.title.fontFamily,
    color: theme.colors.onHighlight,
  },
});
