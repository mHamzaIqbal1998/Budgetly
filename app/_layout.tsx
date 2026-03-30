import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { PaperProvider } from "react-native-paper";
import "react-native-reanimated";

import { BiometricLockScreen } from "@/components/biometric-lock-screen";

import { PixelDarkTheme, PixelLightTheme } from "@/constants/spotify-theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { apiClient } from "@/lib/api-client";
import { persistOptions, queryClient } from "@/lib/query-client";
import { useStore } from "@/lib/store";
import { initNotificationChannel } from "@/lib/utils/notification-service";

export const unstable_settings = {
  initialRouteName: "index",
};

function RootLayoutNav() {
  const router = useRouter();
  const segments = useSegments();
  const {
    isAuthenticated,
    isLoading,
    loadCredentials,
    credentials,
    biometricEnabled,
    biometricUnlocked,
  } = useStore();

  // Load credentials on mount
  useEffect(() => {
    loadCredentials();
    // Initialize Android notification channel at startup so scheduled
    // notifications are delivered even after the app is killed and restarted.
    initNotificationChannel();
  }, []);

  // Initialize API client when credentials are available
  useEffect(() => {
    if (credentials) {
      apiClient.initialize(credentials);
    }
  }, [credentials]);

  // Handle routing based on authentication
  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === "(auth)";
    const inDrawerGroup = segments[0] === "(drawer)";

    if (!isAuthenticated && !inAuthGroup) {
      // Redirect to setup if not authenticated
      router.replace("/(auth)/setup");
    } else if (isAuthenticated && inAuthGroup) {
      // Redirect to dashboard if authenticated
      router.replace("/(drawer)/dashboard");
    }
  }, [isAuthenticated, isLoading, segments]);

  // Show biometric lock screen when required
  if (!isLoading && isAuthenticated && biometricEnabled && !biometricUnlocked) {
    return <BiometricLockScreen />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)/setup" options={{ headerShown: false }} />
      <Stack.Screen name="(drawer)" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  const systemScheme = useColorScheme();
  const themeMode = useStore((s) => s.themeMode);

  // Resolve effective color scheme
  const effectiveScheme =
    themeMode === "system" ? (systemScheme ?? "light") : themeMode;

  const paperTheme =
    effectiveScheme === "dark" ? PixelDarkTheme : PixelLightTheme;

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={persistOptions}
    >
      <PaperProvider theme={paperTheme}>
        <RootLayoutNav />
        <StatusBar hidden />
      </PaperProvider>
    </PersistQueryClientProvider>
  );
}
