import { useStore } from "@/lib/store";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as LocalAuthentication from "expo-local-authentication";
import { useCallback, useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Button, Text, useTheme } from "react-native-paper";

export function BiometricLockScreen() {
  const theme = useTheme();
  const setBiometricUnlocked = useStore((s) => s.setBiometricUnlocked);
  const [authFailed, setAuthFailed] = useState(false);

  const authenticate = useCallback(async () => {
    setAuthFailed(false);
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "Unlock Budgetly",
        fallbackLabel: "Use Passcode",
        cancelLabel: "Cancel",
        disableDeviceFallback: false,
      });

      if (result.success) {
        setBiometricUnlocked(true);
      } else {
        setAuthFailed(true);
      }
    } catch {
      setAuthFailed(true);
    }
  }, [setBiometricUnlocked]);

  // Auto-trigger on mount
  useEffect(() => {
    authenticate();
  }, [authenticate]);

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <View style={styles.content}>
        {/* Lock Icon */}
        <View
          style={[
            styles.iconContainer,
            {
              backgroundColor: theme.dark
                ? theme.colors.elevation.level3
                : theme.colors.elevation.level2,
              borderColor: theme.colors.outlineVariant,
            },
          ]}
        >
          <MaterialCommunityIcons
            name="shield-lock"
            size={64}
            color={theme.colors.primary}
          />
        </View>

        {/* Title */}
        <Text
          variant="headlineMedium"
          style={[styles.title, { color: theme.colors.onBackground }]}
        >
          Budgetly
        </Text>

        {/* Subtitle */}
        <Text
          variant="bodyLarge"
          style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}
        >
          {authFailed
            ? "Authentication failed. Tap to try again."
            : "Unlock to access your finances"}
        </Text>

        {/* Retry Button (visible after failure) */}
        {authFailed && (
          <Button
            mode="contained"
            onPress={authenticate}
            icon="fingerprint"
            style={styles.retryButton}
            contentStyle={styles.retryButtonContent}
          >
            Tap to Unlock
          </Button>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    alignItems: "center",
    paddingHorizontal: 40,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
    borderWidth: 1,
  },
  title: {
    fontWeight: "700",
    marginBottom: 8,
  },
  subtitle: {
    textAlign: "center",
    opacity: 0.7,
    marginBottom: 32,
  },
  retryButton: {
    borderRadius: 12,
    minWidth: 200,
  },
  retryButtonContent: {
    paddingVertical: 8,
  },
});
