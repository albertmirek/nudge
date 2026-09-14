import { darkTheme, lightTheme, themes } from '@/theme/theme';

function keyPaths(value: unknown, prefix = ''): string[] {
  if (typeof value !== 'object' || value === null) return [prefix];
  return Object.entries(value)
    .flatMap(([key, child]) => keyPaths(child, prefix ? `${prefix}.${key}` : key))
    .sort();
}

const HEX = /^#[0-9a-f]{6}$/;

describe('themes', () => {
  it('light and dark expose the same semantic colour keys', () => {
    expect(keyPaths(darkTheme.colors)).toEqual(keyPaths(lightTheme.colors));
  });
  it('every colour is a lowercase 6-digit hex', () => {
    for (const theme of [lightTheme, darkTheme]) {
      for (const path of keyPaths(theme.colors)) {
        const value = path
          .split('.')
          .reduce<unknown>((acc, key) => (acc as Record<string, unknown>)[key], theme.colors);
        expect(value).toMatch(HEX);
      }
    }
  });
  it('is keyed by scheme', () => {
    expect(themes.light).toBe(lightTheme);
    expect(themes.dark).toBe(darkTheme);
  });
  it('uses the Figma light colours', () => {
    expect(lightTheme.colors.text.primary).toBe('#151518');
    expect(lightTheme.colors.accent).toBe('#3a448a');
    expect(lightTheme.colors.border).toBe('#cfcfcf');
  });
});
