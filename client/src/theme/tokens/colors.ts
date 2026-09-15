/** Raw palette. Components use the semantic colours below instead. */
export const palette = {
  white: '#ffffff',
  offWhite: '#f8f8f8',
  gray100: '#f0f0f3',
  gray300: '#cfcfcf',
  gray500: '#8a8a8f',
  gray700: '#3a3a3f',
  gray800: '#212225',
  ink900: '#151518',
  indigo400: '#6a74b8',
  indigo600: '#3a448a',
  lime: '#76ff2c',
} as const;

export type SemanticColors = {
  text: { primary: string; secondary: string };
  background: string;
  surface: string;
  border: string;
  accent: string;
  onAccent: string;
  /** Figma's ticker/badge green — bright enough to stay the same in both schemes. */
  highlight: string;
  onHighlight: string;
};

export const lightColors: SemanticColors = {
  text: { primary: palette.ink900, secondary: palette.gray500 },
  background: palette.white,
  surface: palette.gray100,
  border: palette.gray300,
  accent: palette.indigo600,
  onAccent: palette.offWhite,
  highlight: palette.lime,
  onHighlight: palette.ink900,
};

export const darkColors: SemanticColors = {
  text: { primary: palette.offWhite, secondary: palette.gray300 },
  background: palette.ink900,
  surface: palette.gray800,
  border: palette.gray700,
  accent: palette.indigo400,
  onAccent: palette.offWhite,
  highlight: palette.lime,
  onHighlight: palette.ink900,
};
