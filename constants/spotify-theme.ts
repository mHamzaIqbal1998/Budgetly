// Spotify-inspired Black and Green Theme
import { MD3DarkTheme, MD3LightTheme } from 'react-native-paper';
import type { MD3Theme } from 'react-native-paper';

// Spotify color palette
const SpotifyColors = {
  green: '#1DB954',      // Spotify Green (primary)
  darkGreen: '#1AA34A',  // Darker green for pressed states
  black: '#191414',      // Spotify Black (background)
  darkGray: '#121212',   // Darker black
  gray: '#282828',       // Card background
  lightGray: '#3E3E3E',  // Elevated surfaces
  white: '#FFFFFF',      // Text on dark
  textSecondary: '#B3B3B3', // Secondary text
};

export const SpotifyDarkTheme: MD3Theme = {
  ...MD3DarkTheme,
  dark: true,
  colors: {
    ...MD3DarkTheme.colors,
    // Primary colors
    primary: SpotifyColors.green,
    primaryContainer: SpotifyColors.darkGreen,
    onPrimary: SpotifyColors.black,
    onPrimaryContainer: SpotifyColors.white,
    
    // Secondary colors
    secondary: SpotifyColors.green,
    secondaryContainer: SpotifyColors.gray,
    onSecondary: SpotifyColors.black,
    onSecondaryContainer: SpotifyColors.white,
    
    // Tertiary colors (for variety)
    tertiary: '#1DB954',
    tertiaryContainer: '#2E7D32',
    onTertiary: SpotifyColors.white,
    onTertiaryContainer: SpotifyColors.white,
    
    // Background colors
    background: SpotifyColors.black,
    onBackground: SpotifyColors.white,
    
    // Surface colors
    surface: SpotifyColors.gray,
    surfaceVariant: SpotifyColors.lightGray,
    onSurface: SpotifyColors.white,
    onSurfaceVariant: SpotifyColors.textSecondary,
    
    // Surface tints
    surfaceDisabled: 'rgba(255, 255, 255, 0.12)',
    onSurfaceDisabled: 'rgba(255, 255, 255, 0.38)',
    
    // Elevation surfaces
    elevation: {
      level0: SpotifyColors.black,
      level1: SpotifyColors.darkGray,
      level2: SpotifyColors.gray,
      level3: SpotifyColors.lightGray,
      level4: '#404040',
      level5: '#4A4A4A',
    },
    
    // Outline colors
    outline: 'rgba(255, 255, 255, 0.12)',
    outlineVariant: 'rgba(255, 255, 255, 0.08)',
    
    // Error colors
    error: '#CF6679',
    errorContainer: '#B00020',
    onError: SpotifyColors.white,
    onErrorContainer: SpotifyColors.white,
    
    // Inverse colors
    inverseSurface: SpotifyColors.white,
    inverseOnSurface: SpotifyColors.black,
    inversePrimary: SpotifyColors.darkGreen,
    
    // Shadow
    shadow: '#000000',
    scrim: '#000000',
    
    // Backdrop
    backdrop: 'rgba(0, 0, 0, 0.4)',
  },
};

export const SpotifyLightTheme: MD3Theme = {
  ...MD3LightTheme,
  dark: false,
  colors: {
    ...MD3LightTheme.colors,
    // Primary colors
    primary: SpotifyColors.green,
    primaryContainer: '#E8F5E9',
    onPrimary: SpotifyColors.white,
    onPrimaryContainer: SpotifyColors.darkGreen,
    
    // Secondary colors
    secondary: SpotifyColors.darkGreen,
    secondaryContainer: '#E8F5E9',
    onSecondary: SpotifyColors.white,
    onSecondaryContainer: SpotifyColors.darkGreen,
    
    // Tertiary colors
    tertiary: '#1DB954',
    tertiaryContainer: '#C8E6C9',
    onTertiary: SpotifyColors.white,
    onTertiaryContainer: '#2E7D32',
    
    // Background colors
    background: '#FFFFFF',
    onBackground: SpotifyColors.black,
    
    // Surface colors
    surface: '#FFFFFF',
    surfaceVariant: '#F5F5F5',
    onSurface: SpotifyColors.black,
    onSurfaceVariant: '#424242',
    
    // Surface tints
    surfaceDisabled: 'rgba(0, 0, 0, 0.12)',
    onSurfaceDisabled: 'rgba(0, 0, 0, 0.38)',
    
    // Elevation surfaces
    elevation: {
      level0: '#FFFFFF',
      level1: '#F5F5F5',
      level2: '#EEEEEE',
      level3: '#E0E0E0',
      level4: '#BDBDBD',
      level5: '#9E9E9E',
    },
    
    // Outline colors
    outline: 'rgba(0, 0, 0, 0.12)',
    outlineVariant: 'rgba(0, 0, 0, 0.08)',
    
    // Error colors
    error: '#B00020',
    errorContainer: '#FDECEA',
    onError: SpotifyColors.white,
    onErrorContainer: '#B00020',
    
    // Inverse colors
    inverseSurface: SpotifyColors.black,
    inverseOnSurface: SpotifyColors.white,
    inversePrimary: SpotifyColors.green,
    
    // Shadow
    shadow: '#000000',
    scrim: '#000000',
    
    // Backdrop
    backdrop: 'rgba(0, 0, 0, 0.4)',
  },
};

// Helper to get theme based on color scheme
export const getSpotifyTheme = (isDark: boolean): MD3Theme => {
  return isDark ? SpotifyDarkTheme : SpotifyLightTheme;
};

