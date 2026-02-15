// Material Design 3 – Indigo/Teal "Pixel" Theme
import type { MD3Theme } from "react-native-paper";
import { MD3DarkTheme, MD3LightTheme } from "react-native-paper";

// ─── MD3 Tonal Palette (Indigo seed + Teal secondary) ─────────────────────
export const MD3Colors = {
  // Primary tonal range (Indigo)
  primary: "#3F51B5",
  primaryLight: "#B0C6FF",
  primaryContainer: "#DBE1FF",
  primaryContainerDark: "#00306F",
  onPrimary: "#FFFFFF",
  onPrimaryDark: "#002159",
  onPrimaryContainer: "#001A41",
  onPrimaryContainerDark: "#DBE1FF",

  // Secondary tonal range (Teal)
  secondary: "#009688",
  secondaryLight: "#80CBC4",
  secondaryContainer: "#CCEEEA",
  secondaryContainerDark: "#004D46",
  onSecondary: "#FFFFFF",
  onSecondaryDark: "#00382F",
  onSecondaryContainer: "#003D37",
  onSecondaryContainerDark: "#70F7E7",

  // Tertiary (Amber)
  tertiary: "#7C5800",
  tertiaryLight: "#FFB960",
  tertiaryContainer: "#FFDEA6",
  tertiaryContainerDark: "#5A3F00",

  // Error / Danger
  error: "#BA1A1A",
  errorDark: "#FFB4AB",
  errorContainer: "#FFDAD6",
  errorContainerDark: "#93000A",

  // Neutral surfaces
  surfaceLight: "#FBF8FF",
  surfaceDark: "#1C1B1F",
  surfaceVariantLight: "#E4E1EC",
  surfaceVariantDark: "#49454F",

  // On-surface
  onSurfaceLight: "#1C1B1F",
  onSurfaceDark: "#E6E1E5",
  onSurfaceVariantLight: "#49454F",
  onSurfaceVariantDark: "#CAC4D0",

  // Outline
  outlineLight: "#7A757F",
  outlineDark: "#938F99",
  outlineVariantLight: "#CAC4D0",
  outlineVariantDark: "#49454F",

  // Success (kept for budget progress)
  success: "#2E7D32",
  successDark: "#81C784",
  warning: "#E65100",
  warningDark: "#FFB74D",
  danger: "#BA1A1A",
  dangerDark: "#FFB4AB",

  // Inverse
  inverseSurfaceLight: "#313033",
  inverseSurfaceDark: "#E6E1E5",
  inverseOnSurfaceLight: "#F4EFF4",
  inverseOnSurfaceDark: "#313033",
};

// ─── Chart Palette (MD3-derived) ──────────────────────────────────────────
export const MD3ChartColors = [
  "#5C6BC0", // Indigo 400
  "#26A69A", // Teal 400
  "#FFA726", // Amber 400
  "#7E57C2", // Deep Purple 400
  "#78909C", // Blue Grey 400
] as const;

// ─── Light Theme ──────────────────────────────────────────────────────────
export const PixelLightTheme: MD3Theme = {
  ...MD3LightTheme,
  dark: false,
  colors: {
    ...MD3LightTheme.colors,
    primary: MD3Colors.primary,
    primaryContainer: MD3Colors.primaryContainer,
    onPrimary: MD3Colors.onPrimary,
    onPrimaryContainer: MD3Colors.onPrimaryContainer,

    secondary: MD3Colors.secondary,
    secondaryContainer: MD3Colors.secondaryContainer,
    onSecondary: MD3Colors.onSecondary,
    onSecondaryContainer: MD3Colors.onSecondaryContainer,

    tertiary: MD3Colors.tertiary,
    tertiaryContainer: MD3Colors.tertiaryContainer,
    onTertiary: "#FFFFFF",
    onTertiaryContainer: "#261A00",

    background: MD3Colors.surfaceLight,
    onBackground: MD3Colors.onSurfaceLight,

    surface: MD3Colors.surfaceLight,
    surfaceVariant: MD3Colors.surfaceVariantLight,
    onSurface: MD3Colors.onSurfaceLight,
    onSurfaceVariant: MD3Colors.onSurfaceVariantLight,

    surfaceDisabled: "rgba(28, 27, 31, 0.12)",
    onSurfaceDisabled: "rgba(28, 27, 31, 0.38)",

    elevation: {
      level0: MD3Colors.surfaceLight,
      level1: "#F3EEFF",
      level2: "#EDE7F9",
      level3: "#E7E0F4",
      level4: "#E5DEF3",
      level5: "#E1D9EF",
    },

    outline: MD3Colors.outlineLight,
    outlineVariant: MD3Colors.outlineVariantLight,

    error: MD3Colors.error,
    errorContainer: MD3Colors.errorContainer,
    onError: "#FFFFFF",
    onErrorContainer: "#410002",

    inverseSurface: MD3Colors.inverseSurfaceLight,
    inverseOnSurface: MD3Colors.inverseOnSurfaceLight,
    inversePrimary: MD3Colors.primaryLight,

    shadow: "#000000",
    scrim: "#000000",
    backdrop: "rgba(50, 47, 55, 0.4)",
  },
};

// ─── Dark Theme ───────────────────────────────────────────────────────────
export const PixelDarkTheme: MD3Theme = {
  ...MD3DarkTheme,
  dark: true,
  colors: {
    ...MD3DarkTheme.colors,
    primary: MD3Colors.primaryLight,
    primaryContainer: MD3Colors.primaryContainerDark,
    onPrimary: MD3Colors.onPrimaryDark,
    onPrimaryContainer: MD3Colors.onPrimaryContainerDark,

    secondary: MD3Colors.secondaryLight,
    secondaryContainer: MD3Colors.secondaryContainerDark,
    onSecondary: MD3Colors.onSecondaryDark,
    onSecondaryContainer: MD3Colors.onSecondaryContainerDark,

    tertiary: MD3Colors.tertiaryLight,
    tertiaryContainer: MD3Colors.tertiaryContainerDark,
    onTertiary: "#3F2E00",
    onTertiaryContainer: "#FFDEA6",

    background: MD3Colors.surfaceDark,
    onBackground: MD3Colors.onSurfaceDark,

    surface: MD3Colors.surfaceDark,
    surfaceVariant: MD3Colors.surfaceVariantDark,
    onSurface: MD3Colors.onSurfaceDark,
    onSurfaceVariant: MD3Colors.onSurfaceVariantDark,

    surfaceDisabled: "rgba(230, 225, 229, 0.12)",
    onSurfaceDisabled: "rgba(230, 225, 229, 0.38)",

    elevation: {
      level0: MD3Colors.surfaceDark,
      level1: "#25232A",
      level2: "#2B2930",
      level3: "#312F37",
      level4: "#333139",
      level5: "#37343D",
    },

    outline: MD3Colors.outlineDark,
    outlineVariant: MD3Colors.outlineVariantDark,

    error: MD3Colors.errorDark,
    errorContainer: MD3Colors.errorContainerDark,
    onError: "#690005",
    onErrorContainer: "#FFDAD6",

    inverseSurface: MD3Colors.inverseSurfaceDark,
    inverseOnSurface: MD3Colors.inverseOnSurfaceDark,
    inversePrimary: MD3Colors.primary,

    shadow: "#000000",
    scrim: "#000000",
    backdrop: "rgba(50, 47, 55, 0.4)",
  },
};

// ─── Helper ───────────────────────────────────────────────────────────────

/** Kept for backward-compat – old name `SpotifyColors` maps to MD3 semantic tokens */
export const SpotifyColors = {
  green: MD3Colors.success,
  darkGreen: "#1B5E20",
  blue: MD3Colors.primary,
  darkBlue: MD3Colors.primaryContainerDark,
  orange: MD3Colors.warning,
  lightOrange: MD3Colors.warningDark,
  black: MD3Colors.surfaceDark,
  darkGray: "#121212",
  gray: "#2B2930",
  lightGray: "#49454F",
  white: "#FFFFFF",
  textSecondary: MD3Colors.onSurfaceVariantDark,
  danger: MD3Colors.danger,
};

export const getSpotifyTheme = (isDark: boolean): MD3Theme => {
  return isDark ? PixelDarkTheme : PixelLightTheme;
};

// New preferred helpers
export const getPixelTheme = (mode: "light" | "dark"): MD3Theme => {
  return mode === "dark" ? PixelDarkTheme : PixelLightTheme;
};

// Helper function to convert hex to rgba (used by components)
export const hexToRgba = (hex: string, alpha: number): string => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};
