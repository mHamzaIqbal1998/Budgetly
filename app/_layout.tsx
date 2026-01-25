import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { PaperProvider, MD3DarkTheme, MD3LightTheme } from 'react-native-paper';
import { QueryClientProvider } from '@tanstack/react-query';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { useStore } from '@/lib/store';
import { queryClient } from '@/lib/query-client';
import { apiClient } from '@/lib/api-client';

export const unstable_settings = {
  initialRouteName: '(drawer)',
};

function RootLayoutNav() {
  const router = useRouter();
  const segments = useSegments();
  const { isAuthenticated, isLoading, loadCredentials, credentials } = useStore();

  // Load credentials on mount
  useEffect(() => {
    loadCredentials();
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

    const inAuthGroup = segments[0] === '(auth)';
    const inDrawerGroup = segments[0] === '(drawer)';

    if (!isAuthenticated && !inAuthGroup) {
      // Redirect to setup if not authenticated
      router.replace('/(auth)/setup');
    } else if (isAuthenticated && inAuthGroup) {
      // Redirect to dashboard if authenticated
      router.replace('/(drawer)/dashboard');
    }
  }, [isAuthenticated, isLoading, segments]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)/setup" options={{ headerShown: false }} />
      <Stack.Screen name="(drawer)" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const paperTheme = colorScheme === 'dark' ? MD3DarkTheme : MD3LightTheme;

  return (
    <QueryClientProvider client={queryClient}>
      <PaperProvider theme={paperTheme}>
        <RootLayoutNav />
        <StatusBar style="auto" />
      </PaperProvider>
    </QueryClientProvider>
  );
}
