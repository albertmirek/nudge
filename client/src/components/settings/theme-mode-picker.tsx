import { Pressable, View } from 'react-native';

import { THEME_MODES, type Theme, type ThemeMode, useStyles, useThemeMode } from '@/theme';
import { Text } from '@/ui';

const LABELS: Record<ThemeMode, string> = { system: 'System', light: 'Light', dark: 'Dark' };

export type ThemeModePickerProps = { label?: string };

/** Segmented control that sets (and persists) the app's theme mode. */
export function ThemeModePicker({ label = 'Appearance' }: ThemeModePickerProps) {
  const { mode, setMode } = useThemeMode();
  const styles = useStyles(makeStyles);

  return (
    <View style={styles.container}>
      <Text variant="caption" color="secondary">
        {label}
      </Text>
      <View accessibilityRole="radiogroup" style={styles.options}>
        {THEME_MODES.map((option) => {
          const selected = option === mode;
          return (
            <Pressable
              key={option}
              accessibilityRole="radio"
              accessibilityLabel={LABELS[option]}
              accessibilityState={{ selected }}
              onPress={() => setMode(option)}
              style={[styles.option, selected && styles.optionSelected]}
            >
              <Text variant="caption" color={selected ? 'primary' : 'secondary'}>
                {LABELS[option]}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const makeStyles = (theme: Theme) => ({
  container: { gap: theme.spacing[1] },
  options: {
    flexDirection: 'row' as const,
    gap: theme.spacing[1],
    padding: theme.spacing[1],
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.surface,
    alignSelf: 'flex-start' as const,
  },
  option: {
    paddingVertical: theme.spacing[1],
    paddingHorizontal: theme.spacing[3],
    borderRadius: theme.radii.md,
  },
  optionSelected: { backgroundColor: theme.colors.background },
});
