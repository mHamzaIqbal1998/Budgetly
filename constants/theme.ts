/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * Updated to match MD3 Indigo/Teal palette.
 */

const tintColorLight = "#3F51B5";
const tintColorDark = "#B0C6FF";

export const Colors = {
  light: {
    text: "#1C1B1F",
    background: "#FBF8FF",
    tint: tintColorLight,
    icon: "#49454F",
    tabIconDefault: "#7A757F",
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: "#E6E1E5",
    background: "#1C1B1F",
    tint: tintColorDark,
    icon: "#CAC4D0",
    tabIconDefault: "#938F99",
    tabIconSelected: tintColorDark,
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const FontSize = {
  // MD3 Type Scale
  displayLarge: 57,
  displayMedium: 45,
  displaySmall: 36,
  headlineLarge: 32,
  headlineMedium: 28,
  headlineSmall: 24,
  titleLarge: 22,
  titleMedium: 16,
  titleSmall: 14,
  bodyLarge: 16,
  bodyMedium: 14,
  bodySmall: 12,
  labelLarge: 14,
  labelMedium: 12,
  labelSmall: 11,
};
