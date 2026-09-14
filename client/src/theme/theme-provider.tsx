import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

import { type ColorScheme, type Theme, themes } from './theme';
import { type ThemeMode, type ThemeStorage } from './theme-mode';
import { createDefaultThemeStorage } from './theme-storage';
import { useSystemColorScheme } from './use-system-color-scheme';

type ThemeContextValue = {
  theme: Theme;
  mode: ThemeMode;
  scheme: ColorScheme;
  setMode: (mode: ThemeMode) => void;
};
const ThemeContext = createContext<ThemeContextValue | null>(null);

export type ThemeProviderProps = {
  children: ReactNode;
  storage?: ThemeStorage;
  initialMode?: ThemeMode;
};

export function ThemeProvider({ children, storage, initialMode }: ThemeProviderProps) {
  const [store] = useState(() => storage ?? createDefaultThemeStorage());
  const [mode, setModeState] = useState<ThemeMode>(() => initialMode ?? store.get() ?? 'system');
  const systemScheme = useSystemColorScheme();
  const scheme = mode === 'system' ? systemScheme : mode;
  const setMode = useCallback(
    (next: ThemeMode) => {
      store.set(next);
      setModeState(next);
    },
    [store],
  );
  const value = useMemo(
    () => ({ theme: themes[scheme], mode, scheme, setMode }),
    [mode, scheme, setMode],
  );
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

function useThemeContext(): ThemeContextValue {
  const value = useContext(ThemeContext);
  if (!value) throw new Error('useTheme/useThemeMode must be used inside a ThemeProvider');
  return value;
}

export function useTheme(): Theme {
  return useThemeContext().theme;
}
export function useThemeMode(): Pick<ThemeContextValue, 'mode' | 'scheme' | 'setMode'> {
  const { mode, scheme, setMode } = useThemeContext();
  return { mode, scheme, setMode };
}
