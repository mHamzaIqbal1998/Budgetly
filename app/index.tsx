import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useStore } from '@/lib/store';
import { useTheme } from 'react-native-paper';

export default function Index() {
  const router = useRouter();
  const { isAuthenticated, isLoading, loadCredentials } = useStore();
  const theme = useTheme();

  useEffect(() => {
    // Ensure credentials are loaded
    loadCredentials();
  }, []);

  useEffect(() => {
    if (isLoading) return;

    // Redirect based on authentication state
    if (isAuthenticated) {
      router.replace('/(drawer)/dashboard');
    } else {
      router.replace('/(auth)/setup');
    }
  }, [isAuthenticated, isLoading, router]);

  // Show loading screen while checking authentication
  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ActivityIndicator size="large" color={theme.colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#191414',
  },
});

