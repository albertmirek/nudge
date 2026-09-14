import { useColorScheme } from 'react-native';
import type { ColorScheme } from './theme';

export function useSystemColorScheme(): ColorScheme {
  return useColorScheme() === 'dark' ? 'dark' : 'light';
}
