import { Image } from 'expo-image';
import { Pressable } from 'react-native';

import checkIcon from '@/assets/icons/checkbox-check.svg';
import { type Theme, useStyles, useTheme } from '@/theme';

export type CheckboxProps = {
  checked: boolean;
  /** Called with the next value; the component is fully controlled. */
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  accessibilityLabel?: string;
};

export function Checkbox({
  checked,
  onCheckedChange,
  disabled = false,
  accessibilityLabel,
}: CheckboxProps) {
  const { sizes } = useTheme();
  const styles = useStyles(makeStyles);

  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked, disabled }}
      accessibilityLabel={accessibilityLabel}
      disabled={disabled}
      // Figma's enlarged "touch area" — brings the target to 38×38.
      hitSlop={sizes.checkboxHitSlop}
      onPress={() => onCheckedChange(!checked)}
      style={[styles.box, checked && styles.checked, disabled && styles.disabled]}
    >
      {checked ? (
        <Image
          testID="checkbox-check"
          source={checkIcon}
          style={styles.icon}
          contentFit="contain"
        />
      ) : null}
    </Pressable>
  );
}

const makeStyles = (theme: Theme) => ({
  box: {
    width: theme.sizes.checkbox,
    height: theme.sizes.checkbox,
    borderRadius: theme.radii.sm,
    borderWidth: theme.sizes.border,
    borderColor: theme.colors.border,
  },
  // The exported asset already paints the filled box, so the border goes away.
  checked: { borderWidth: 0 },
  disabled: { opacity: 0.4 },
  icon: { width: theme.sizes.checkbox, height: theme.sizes.checkbox },
});
