import { Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { type Theme, useStyles } from '@/theme';
import { Icon, type IconName } from '@/ui';

/** Route names inside `app/(tabs)/`, in Figma order. */
export const TAB_ROUTES = ['friends', 'create-friend', 'index'] as const;
export type TabRoute = (typeof TAB_ROUTES)[number];

const TABS: Record<TabRoute, { icon: IconName; label: string }> = {
  friends: { icon: 'book', label: 'Friend book' },
  'create-friend': { icon: 'plus', label: 'Add a friend' },
  index: { icon: 'home', label: 'Home' },
};

export type BottomNavProps = {
  active: TabRoute;
  onNavigate: (route: TabRoute) => void;
};

/** Figma bottom bar: book · plus · home. Navigation-agnostic; the tabs layout wires it up. */
export function BottomNav({ active, onNavigate }: BottomNavProps) {
  const styles = useStyles(makeStyles);

  return (
    <SafeAreaView edges={['bottom', 'left', 'right']} style={styles.bar}>
      {TAB_ROUTES.map((route) => {
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
});
