// First Launch Setup Screen
import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Alert } from 'react-native';
import { TextInput, Button, Text, ActivityIndicator, useTheme } from 'react-native-paper';
import { useStore } from '@/lib/store';
import { apiClient } from '@/lib/api-client';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function SetupScreen() {
  const [instanceUrl, setInstanceUrl] = useState('');
  const [token, setToken] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState('');
  
  const theme = useTheme();
  const setCredentials = useStore((state) => state.setCredentials);

  const handleSetup = async () => {
    setError('');
    
    // Basic validation
    if (!instanceUrl.trim()) {
      setError('Please enter your Firefly III instance URL');
      return;
    }
    
    if (!token.trim()) {
      setError('Please enter your Personal Access Token');
      return;
    }

    // Ensure URL has protocol
    let formattedUrl = instanceUrl.trim();
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = `https://${formattedUrl}`;
    }

    setIsValidating(true);

    try {
      // Initialize API client with credentials
      apiClient.initialize({
        instanceUrl: formattedUrl,
        personalAccessToken: token.trim(),
      });

      // Validate connection
      const version = await apiClient.validateConnection();
      
      // If successful, save credentials
      await setCredentials({
        instanceUrl: formattedUrl,
        personalAccessToken: token.trim(),
      });

      Alert.alert(
        'Success!',
        `Connected to Firefly III v${version.version}`,
        [
          {
            text: 'Continue',
            onPress: () => router.replace('/(drawer)/dashboard'),
          },
        ]
      );
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to connect to Firefly III';
      setError(errorMessage);
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar style="auto" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text variant="displaySmall" style={styles.title}>
            Welcome to Budgetly
          </Text>
          <Text variant="bodyLarge" style={styles.subtitle}>
            Connect to your Firefly III instance to get started
          </Text>
        </View>

        <View style={styles.form}>
          <TextInput
            label="Instance URL"
            value={instanceUrl}
            onChangeText={setInstanceUrl}
            placeholder="https://firefly.example.com"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            mode="outlined"
            style={styles.input}
            disabled={isValidating}
          />

          <TextInput
            label="Personal Access Token"
            value={token}
            onChangeText={setToken}
            placeholder="Enter your PAT"
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry
            mode="outlined"
            style={styles.input}
            disabled={isValidating}
          />

          {error ? (
            <Text variant="bodyMedium" style={styles.errorText}>
              {error}
            </Text>
          ) : null}

          <Button
            mode="contained"
            onPress={handleSetup}
            disabled={isValidating}
            style={styles.button}
            contentStyle={styles.buttonContent}
          >
            {isValidating ? 'Validating...' : 'Connect'}
          </Button>

          {isValidating && (
            <ActivityIndicator animating={true} size="large" style={styles.loader} />
          )}
        </View>

        <View style={styles.footer}>
          <Text variant="bodySmall" style={styles.helpText}>
            Need help finding your Personal Access Token?
          </Text>
          <Text variant="bodySmall" style={styles.helpText}>
            Go to your Firefly III instance → Profile → OAuth → Personal Access Tokens → Create New Token
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    marginBottom: 32,
    alignItems: 'center',
  },
  title: {
    marginBottom: 8,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  subtitle: {
    textAlign: 'center',
    opacity: 0.7,
  },
  form: {
    marginBottom: 32,
  },
  input: {
    marginBottom: 16,
  },
  button: {
    marginTop: 8,
  },
  buttonContent: {
    paddingVertical: 8,
  },
  errorText: {
    color: '#d32f2f',
    marginBottom: 16,
    textAlign: 'center',
  },
  loader: {
    marginTop: 16,
  },
  footer: {
    alignItems: 'center',
  },
  helpText: {
    textAlign: 'center',
    opacity: 0.6,
    marginBottom: 4,
  },
});

