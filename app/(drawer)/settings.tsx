// Settings Screen
import { GlassCard } from "@/components/glass-card";
import { apiClient } from "@/lib/api-client";
import { useStore } from "@/lib/store";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import { Alert, ScrollView, StyleSheet, View } from "react-native";
import {
  Button,
  Card,
  List,
  Modal,
  Portal,
  SegmentedButtons,
  Text,
  TextInput,
  useTheme,
} from "react-native-paper";

export default function SettingsScreen() {
  const theme = useTheme();
  const {
    credentials,
    clearCredentials,
    setCredentials,
    themeMode,
    setThemeMode,
  } = useStore();

  const [modalVisible, setModalVisible] = useState(false);
  const [instanceUrl, setInstanceUrl] = useState(
    credentials?.instanceUrl || ""
  );
  const [token, setToken] = useState("");
  const [isValidating, setIsValidating] = useState(false);

  const handleUpdateCredentials = async () => {
    if (!instanceUrl || !token) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    setIsValidating(true);

    try {
      // Format URL
      let formattedUrl = instanceUrl.trim();
      if (
        !formattedUrl.startsWith("http://") &&
        !formattedUrl.startsWith("https://")
      ) {
        formattedUrl = `https://${formattedUrl}`;
      }

      // Initialize and validate
      apiClient.initialize({
        instanceUrl: formattedUrl,
        personalAccessToken: token.trim(),
      });

      const version = await apiClient.validateConnection();

      // Save if successful
      await setCredentials({
        instanceUrl: formattedUrl,
        personalAccessToken: token.trim(),
      });

      Alert.alert(
        "Success",
        `Connected to Firefly III v${version.data.version}`
      );
      setModalVisible(false);
      setToken("");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to update credentials";
      Alert.alert("Error", errorMessage);
    } finally {
      setIsValidating(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert(
      "Sign Out",
      "Are you sure you want to sign out? Your credentials will be removed from this device.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sign Out",
          style: "destructive",
          onPress: async () => {
            await clearCredentials();
            router.replace("/(auth)/setup");
          },
        },
      ]
    );
  };

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <ScrollView style={styles.scrollView}>
        {/* Account Section */}
        <GlassCard variant="elevated" style={styles.card}>
          <Card.Title
            title="Account"
            left={(props) => (
              <MaterialCommunityIcons name="account" {...props} />
            )}
          />
          <Card.Content>
            <List.Item
              title="Firefly III Instance"
              description={credentials?.instanceUrl || "Not configured"}
              left={(props) => <List.Icon {...props} icon="server" />}
            />
            <List.Item
              title="Update Credentials"
              description="Change your instance URL or Personal Access Token"
              left={(props) => <List.Icon {...props} icon="key" />}
              onPress={() => setModalVisible(true)}
            />
          </Card.Content>
        </GlassCard>

        {/* App Settings */}
        <GlassCard variant="elevated" style={styles.card}>
          <Card.Title
            title="Appearance"
            left={(props) => (
              <MaterialCommunityIcons name="palette" {...props} />
            )}
          />
          <Card.Content>
            <List.Item
              title="Theme Mode"
              description={
                themeMode === "system"
                  ? "Following system"
                  : themeMode === "dark"
                    ? "Dark"
                    : "Light"
              }
              left={(props) => <List.Icon {...props} icon="theme-light-dark" />}
            />
            <View style={styles.themeSelector}>
              <SegmentedButtons
                value={themeMode}
                onValueChange={(value) =>
                  setThemeMode(value as "system" | "light" | "dark")
                }
                buttons={[
                  { value: "system", label: "System", icon: "cellphone" },
                  {
                    value: "light",
                    label: "Light",
                    icon: "white-balance-sunny",
                  },
                  {
                    value: "dark",
                    label: "Dark",
                    icon: "moon-waning-crescent",
                  },
                ]}
                style={styles.segmentedButtons}
              />
            </View>
          </Card.Content>
        </GlassCard>

        {/* Data & Privacy */}
        <GlassCard variant="elevated" style={styles.card}>
          <Card.Title
            title="Data & Privacy"
            left={(props) => (
              <MaterialCommunityIcons name="shield-check" {...props} />
            )}
          />
          <Card.Content>
            <List.Item
              title="Secure Storage"
              description="Credentials are stored securely on your device"
              left={(props) => <List.Icon {...props} icon="lock" />}
            />
            <List.Item
              title="Data Usage"
              description="All data is fetched directly from your Firefly III instance"
              left={(props) => <List.Icon {...props} icon="database" />}
            />
          </Card.Content>
        </GlassCard>

        {/* About */}
        <GlassCard variant="elevated" style={styles.card}>
          <Card.Title
            title="About"
            left={(props) => (
              <MaterialCommunityIcons name="information" {...props} />
            )}
          />
          <Card.Content>
            <List.Item
              title="Budgetly"
              description="Version 1.0.0"
              left={(props) => <List.Icon {...props} icon="cellphone" />}
            />
            <List.Item
              title="Firefly III"
              description="Personal finance manager"
              left={(props) => <List.Icon {...props} icon="fire" />}
            />
            <List.Item
              title="API Documentation"
              description="api-docs.firefly-iii.org"
              left={(props) => <List.Icon {...props} icon="book-open" />}
            />
          </Card.Content>
        </GlassCard>

        {/* Sign Out */}
        <View style={styles.dangerZone}>
          <Button
            mode="contained"
            onPress={handleSignOut}
            buttonColor={theme.colors.error}
            icon="logout"
            style={styles.signOutButton}
          >
            Sign Out
          </Button>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Update Credentials Modal */}
      <Portal>
        <Modal
          visible={modalVisible}
          onDismiss={() => {
            setModalVisible(false);
            setToken("");
          }}
          contentContainerStyle={[
            styles.modal,
            { backgroundColor: theme.colors.surface },
          ]}
        >
          <Text variant="headlineSmall" style={styles.modalTitle}>
            Update Credentials
          </Text>

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
            placeholder="Enter your new PAT"
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry
            mode="outlined"
            style={styles.input}
            disabled={isValidating}
          />

          <View style={styles.modalActions}>
            <Button
              mode="outlined"
              onPress={() => {
                setModalVisible(false);
                setToken("");
              }}
              style={{ flex: 1 }}
              disabled={isValidating}
            >
              Cancel
            </Button>
            <Button
              mode="contained"
              onPress={handleUpdateCredentials}
              loading={isValidating}
              disabled={isValidating}
              style={{ flex: 1 }}
            >
              Update
            </Button>
          </View>
        </Modal>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  card: {
    marginBottom: 16,
  },
  dangerZone: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  signOutButton: {
    paddingVertical: 4,
  },
  modal: {
    margin: 20,
    padding: 20,
    borderRadius: 28,
  },
  modalTitle: {
    marginBottom: 16,
    fontWeight: "bold",
  },
  input: {
    marginBottom: 12,
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  themeSelector: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  segmentedButtons: {
    borderRadius: 16,
  },
});
