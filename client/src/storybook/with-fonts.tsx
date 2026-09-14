import {
  Inter_300Light,
  Inter_400Regular,
  Inter_600SemiBold,
  useFonts,
} from '@expo-google-fonts/inter';
import type { Decorator } from '@storybook/react';
import type { ReactNode } from 'react';

function FontGate({ children }: { children: ReactNode }) {
  const [loaded, error] = useFonts({ Inter_300Light, Inter_400Regular, Inter_600SemiBold });
  if (!loaded && !error) return null;
  return children;
}

/** Loads Inter before rendering stories so type matches the app. */
export const withFonts: Decorator = (Story) => (
  <FontGate>
    <Story />
  </FontGate>
);
