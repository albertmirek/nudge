import { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import type { Theme } from './theme';
import { useTheme } from './theme-provider';

export function useStyles<T extends StyleSheet.NamedStyles<T>>(makeStyles: (theme: Theme) => T): T {
  const theme = useTheme();
  return useMemo(() => StyleSheet.create(makeStyles(theme)), [makeStyles, theme]);
}
