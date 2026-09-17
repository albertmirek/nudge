import { Pressable, type StyleProp, View, type ViewStyle } from 'react-native';

import { type Theme, useStyles } from '@/theme';
import { Text } from '@/ui/text/text';

export type ChoiceOption<T extends string> = { value: T; label: string };

export type ChoiceChipsProps<T extends string> = {
  /** Visible label above the chips; also the group's accessibility label. */
  label: string;
  options: readonly ChoiceOption<T>[];
  value: T | null;
  onChange: (value: T) => void;
  error?: string;
  style?: StyleProp<ViewStyle>;
};

/** Single-select pill row for small enums (e.g. contact frequency). Fully controlled. */
export function ChoiceChips<T extends string>({
  label,
  options,
  value,
  onChange,
  error,
  style,
}: ChoiceChipsProps<T>) {
  const styles = useStyles(makeStyles);

  return (
    <View style={[styles.wrapper, style]}>
      <Text variant="body">{label}</Text>
      <View accessibilityRole="radiogroup" accessibilityLabel={label} style={styles.row}>
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="radio"
              accessibilityLabel={option.label}
              accessibilityState={{ checked: selected }}
              onPress={() => onChange(option.value)}
              style={[styles.chip, selected && styles.chipSelected]}
            >
              <Text variant="body" style={selected ? styles.labelSelected : undefined}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {error ? (
        <Text variant="caption" style={styles.error}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const makeStyles = (theme: Theme) => ({
  wrapper: { gap: theme.spacing[2] },
  row: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: theme.spacing[2] },
  chip: {
    height: theme.sizes.chip,
    paddingHorizontal: theme.spacing[4],
    borderRadius: theme.radii.full,
    borderWidth: theme.sizes.border,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  chipSelected: {
    backgroundColor: theme.colors.text.primary,
    borderColor: theme.colors.text.primary,
  },
  labelSelected: { color: theme.colors.background },
  error: { color: theme.colors.danger },
});
