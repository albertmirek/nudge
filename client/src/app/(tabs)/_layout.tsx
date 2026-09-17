import { Tabs } from 'expo-router/js-tabs';

import { BottomNav, type TabRoute } from '@/components/navigation/bottom-nav';

/** Bottom-tab shell for the main screens; `BottomNav` replaces the default tab bar. */
export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: 'transparent' } }}
      tabBar={({ state, navigation }) => (
        <BottomNav
          active={state.routes[state.index]?.name as TabRoute}
          onNavigate={(route) => navigation.navigate(route)}
        />
      )}
    >
      <Tabs.Screen name="friends" />
      <Tabs.Screen name="create-friend" />
      <Tabs.Screen name="index" />
    </Tabs>
  );
}
