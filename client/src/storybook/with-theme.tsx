import type { Decorator } from '@storybook/react';
import type { ReactNode } from 'react';
import { View } from 'react-native';

import { ThemeProvider, createMemoryThemeStorage, parseThemeMode, useTheme } from '@/theme';

// Shared across stories on purpose: Storybook must never touch the app's persisted mode.
const storage = createMemoryThemeStorage();

function Canvas({ children }: { children: ReactNode }) {
  const theme = useTheme();
  return (
    <View style={{ flex: 1, padding: theme.spacing[4], backgroundColor: theme.colors.background }}>
      {children}
    </View>
  );
}

/**
 * Wraps every story in the app ThemeProvider. The `scheme` global (web toolbar) picks
 * light/dark/system; on device there is no toolbar, so `system` follows the simulator's
 * appearance setting. `key` remounts the provider so a toolbar change applies immediately.
 */
export const withTheme: Decorator = (Story, context) => {
  const mode = parseThemeMode(context.globals.scheme) ?? 'system';
  return (
    <ThemeProvider key={mode} storage={storage} initialMode={mode}>
      <Canvas>
        <Story />
      </Canvas>
    </ThemeProvider>
  );
};
