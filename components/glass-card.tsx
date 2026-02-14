// MD3 Tonal Elevation Card Component
import React from "react";
import { StyleSheet, View, ViewStyle } from "react-native";
import { Card, useTheme } from "react-native-paper";

// Helper function to convert hex to rgba
const hexToRgba = (hex: string, alpha: number): string => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

interface GlassCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  variant?: "default" | "primary" | "elevated" | "blue" | "orange";
  mode?: "elevated" | "contained" | "outlined";
}

export function GlassCard({
  children,
  style,
  variant = "default",
  mode = "elevated",
}: GlassCardProps) {
  const theme = useTheme();

  const getCardStyle = () => {
    switch (variant) {
      case "primary":
        return {
          backgroundColor: hexToRgba(
            theme.colors.primary,
            theme.dark ? 0.15 : 0.08
          ),
          borderColor: hexToRgba(theme.colors.primary, theme.dark ? 0.3 : 0.15),
          borderWidth: 1,
        };
      case "blue":
        return {
          backgroundColor: hexToRgba(
            theme.colors.secondary,
            theme.dark ? 0.15 : 0.08
          ),
          borderColor: hexToRgba(
            theme.colors.secondary,
            theme.dark ? 0.3 : 0.15
          ),
          borderWidth: 1,
        };
      case "orange":
        return {
          backgroundColor: hexToRgba(
            theme.colors.tertiary,
            theme.dark ? 0.15 : 0.08
          ),
          borderColor: hexToRgba(
            theme.colors.tertiary,
            theme.dark ? 0.3 : 0.15
          ),
          borderWidth: 1,
        };
      case "elevated":
        return {
          backgroundColor: theme.dark
            ? theme.colors.elevation.level2
            : theme.colors.elevation.level1,
          borderColor: theme.colors.outlineVariant,
          borderWidth: 1,
        };
      default:
        return {
          backgroundColor: theme.dark
            ? theme.colors.elevation.level1
            : theme.colors.elevation.level0,
          borderColor: theme.colors.outlineVariant,
          borderWidth: 1,
        };
    }
  };

  return (
    <Card style={[styles.glassCard, getCardStyle(), style]} mode={mode}>
      {children}
    </Card>
  );
}

// Tonal Container for sections
interface GlassContainerProps {
  children: React.ReactNode;
  style?: ViewStyle;
  variant?: "default" | "primary" | "blue" | "orange";
}

export function GlassContainer({
  children,
  style,
  variant = "default",
}: GlassContainerProps) {
  const theme = useTheme();

  const backgroundColor =
    variant === "primary"
      ? hexToRgba(theme.colors.primary, theme.dark ? 0.12 : 0.06)
      : variant === "blue"
        ? hexToRgba(theme.colors.secondary, theme.dark ? 0.12 : 0.06)
        : variant === "orange"
          ? hexToRgba(theme.colors.tertiary, theme.dark ? 0.12 : 0.06)
          : theme.dark
            ? theme.colors.elevation.level1
            : theme.colors.elevation.level0;

  const borderColor =
    variant === "primary"
      ? hexToRgba(theme.colors.primary, 0.3)
      : variant === "blue"
        ? hexToRgba(theme.colors.secondary, 0.3)
        : variant === "orange"
          ? hexToRgba(theme.colors.tertiary, 0.3)
          : theme.colors.outlineVariant;

  return (
    <View
      style={[
        styles.glassContainer,
        {
          backgroundColor,
          borderColor,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  glassCard: {
    overflow: "hidden",
    borderRadius: 28,
    elevation: 0,
  },
  glassContainer: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    overflow: "hidden",
  },
});
