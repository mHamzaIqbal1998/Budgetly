// First Launch Setup Screen
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, StatusBar as RNStatusBar, ScrollView, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Button, Text, TextInput, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SuccessModal } from '@/components/success-modal';
import { apiClient } from '@/lib/api-client';
import { useStore } from '@/lib/store';
import { router } from 'expo-router';

export default function SetupScreen() {
  const [instanceUrl, setInstanceUrl] = useState('');
  const [token, setToken] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState('');
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [versionInfo, setVersionInfo] = useState('');
  
  const theme = useTheme();
  const setCredentials = useStore((state) => state.setCredentials);

  useEffect(() => {
    RNStatusBar.setHidden(true);
  }, []);

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

      setVersionInfo(version.data.version);
      setSuccessModalVisible(true);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to connect to Firefly III';
      setError(errorMessage);
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['bottom']}>
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <StatusBar style="auto" hidden={true} />
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { backgroundColor: theme.colors.background }]}
          keyboardShouldPersistTaps="handled"
          style={{ backgroundColor: theme.colors.background }}
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
            <Text variant="bodyMedium" style={[styles.errorText, { color: '#FF5252' }]}>
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

      <SuccessModal
        // visible={successModalVisible}
        visible={true}
        onDismiss={() => {
          setSuccessModalVisible(false);
          router.replace('/(drawer)/dashboard');
        }}
        message={`Connected to Firefly III v${versionInfo}`}
        onButtonPress={() => {
          setSuccessModalVisible(false);
          router.replace('/(drawer)/dashboard');
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#191414',
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

