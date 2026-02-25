// Settings Screen
import { GlassCard } from "@/components/glass-card";
import { apiClient } from "@/lib/api-client";
import { useStore } from "@/lib/store";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Constants from "expo-constants";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import {
  Button,
  Card,
  Divider,
  List,
  Modal,
  Portal,
  SegmentedButtons,
  Text,
  TextInput,
  useTheme,
} from "react-native-paper";

// Get version from package.json via expo-constants
const APP_VERSION = Constants.expoConfig?.version ?? "1.0.0";

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
      let formattedUrl = instanceUrl.trim();
      if (
        !formattedUrl.startsWith("http://") &&
        !formattedUrl.startsWith("https://")
      ) {
        formattedUrl = `https://${formattedUrl}`;
      }

      apiClient.initialize({
        instanceUrl: formattedUrl,
        personalAccessToken: token.trim(),
      });

      const version = await apiClient.validateConnection();

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

  const openApiDocs = () => {
    Linking.openURL("https://api-docs.firefly-iii.org");
  };

  const getThemeIcon = () => {
    switch (themeMode) {
      case "dark":
        return "moon-waning-crescent";
      case "light":
        return "white-balance-sunny";
      default:
        return "theme-light-dark";
    }
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
            titleStyle={styles.cardTitle}
            left={(props) => (
              <MaterialCommunityIcons
                name="account-circle"
                size={24}
                color={theme.colors.primary}
              />
            )}
          />
          <Card.Content style={styles.cardContent}>
            <List.Item
              title="Firefly III Instance"
              description={credentials?.instanceUrl || "Not configured"}
              descriptionNumberOfLines={2}
              left={(props) => (
                <MaterialCommunityIcons
                  name="server"
                  size={24}
                  color={theme.colors.onSurfaceVariant}
                  style={styles.listIcon}
                />
              )}
              titleStyle={styles.listTitle}
              descriptionStyle={styles.listDescription}
            />
            <Divider style={styles.divider} />
            <List.Item
              title="Update Credentials"
              description="Change instance URL or token"
              left={(props) => (
                <MaterialCommunityIcons
                  name="key-variant"
                  size={24}
                  color={theme.colors.primary}
                  style={styles.listIcon}
                />
              )}
              right={(props) => (
                <MaterialCommunityIcons
                  name="chevron-right"
                  size={24}
                  color={theme.colors.onSurfaceVariant}
                />
              )}
              onPress={() => setModalVisible(true)}
              titleStyle={styles.listTitle}
              descriptionStyle={styles.listDescription}
              style={styles.pressableItem}
            />
          </Card.Content>
        </GlassCard>

        {/* Appearance Section */}
        <GlassCard variant="elevated" style={styles.card}>
          <Card.Title
            title="Appearance"
            titleStyle={styles.cardTitle}
            left={(props) => (
              <MaterialCommunityIcons
                name="palette"
                size={24}
                color={theme.colors.primary}
              />
            )}
          />
          <Card.Content style={styles.cardContent}>
            <View style={styles.themeHeader}>
              <MaterialCommunityIcons
                name={getThemeIcon()}
                size={24}
                color={theme.colors.onSurfaceVariant}
                style={styles.listIcon}
              />
              <View style={styles.themeTextContainer}>
                <Text variant="bodyLarge" style={styles.listTitle}>
                  Theme Mode
                </Text>
                <Text variant="bodySmall" style={styles.listDescription}>
                  {themeMode === "system"
                    ? "Following system"
                    : themeMode === "dark"
                      ? "Dark mode enabled"
                      : "Light mode enabled"}
                </Text>
              </View>
            </View>
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

        {/* Data & Privacy Section */}
        <GlassCard variant="elevated" style={styles.card}>
          <Card.Title
            title="Data & Privacy"
            titleStyle={styles.cardTitle}
            left={(props) => (
              <MaterialCommunityIcons
                name="shield-check"
                size={24}
                color={theme.colors.primary}
              />
            )}
          />
          <Card.Content style={styles.cardContent}>
            <List.Item
              title="Secure Storage"
              description="Credentials stored securely on device"
              left={(props) => (
                <MaterialCommunityIcons
                  name="lock-outline"
                  size={24}
                  color={theme.colors.onSurfaceVariant}
                  style={styles.listIcon}
                />
              )}
              titleStyle={styles.listTitle}
              descriptionStyle={styles.listDescription}
            />
            <Divider style={styles.divider} />
            <List.Item
              title="Local Data Only"
              description="Data fetched directly from your instance"
              left={(props) => (
                <MaterialCommunityIcons
                  name="database-outline"
                  size={24}
                  color={theme.colors.onSurfaceVariant}
                  style={styles.listIcon}
                />
              )}
              titleStyle={styles.listTitle}
              descriptionStyle={styles.listDescription}
            />
          </Card.Content>
        </GlassCard>

        {/* About Section */}
        <GlassCard variant="elevated" style={styles.card}>
          <Card.Title
            title="About"
            titleStyle={styles.cardTitle}
            left={(props) => (
              <MaterialCommunityIcons
                name="information-slab-circle"
                size={24}
                color={theme.colors.primary}
              />
            )}
          />
          <Card.Content style={styles.cardContent}>
            <List.Item
              title="Budgetly"
              description={`Version ${APP_VERSION}`}
              left={(props) => (
                <MaterialCommunityIcons
                  name="cellphone-cog"
                  size={24}
                  color={theme.colors.onSurfaceVariant}
                  style={styles.listIcon}
                />
              )}
              titleStyle={styles.listTitle}
              descriptionStyle={styles.listDescription}
            />
            <Divider style={styles.divider} />
            <List.Item
              title="Firefly III"
              description="Personal finance manager"
              left={(props) => (
                <MaterialCommunityIcons
                  name="fire"
                  size={24}
                  color={theme.colors.onSurfaceVariant}
                  style={styles.listIcon}
                />
              )}
              titleStyle={styles.listTitle}
              descriptionStyle={styles.listDescription}
            />
            <Divider style={styles.divider} />
            <Pressable onPress={openApiDocs}>
              <List.Item
                title="API Documentation"
                description="api-docs.firefly-iii.org"
                left={(props) => (
                  <MaterialCommunityIcons
                    name="book-open-variant"
                    size={24}
                    color={theme.colors.primary}
                    style={styles.listIcon}
                  />
                )}
                right={(props) => (
                  <MaterialCommunityIcons
                    name="open-in-new"
                    size={20}
                    color={theme.colors.onSurfaceVariant}
                  />
                )}
                titleStyle={styles.listTitle}
                descriptionStyle={styles.listDescription}
                style={styles.pressableItem}
              />
            </Pressable>
          </Card.Content>
        </GlassCard>

        {/* Sign Out */}
        <View style={styles.dangerZone}>
          <Button
            mode="contained"
            onPress={handleSignOut}
            textColor={theme.colors.onError}
            icon="logout"
            style={[
              styles.signOutButton,
              { backgroundColor: theme.colors.error },
            ]}
            contentStyle={styles.signOutButtonContent}
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
          <Text variant="bodyMedium" style={styles.modalSubtitle}>
            Enter your new Firefly III instance details
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
            outlineColor={theme.colors.outline}
            activeOutlineColor={theme.colors.primary}
            left={
              <TextInput.Icon
                icon="server"
                color={theme.colors.onSurfaceVariant}
              />
            }
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
            outlineColor={theme.colors.outline}
            activeOutlineColor={theme.colors.primary}
            left={
              <TextInput.Icon
                icon="key"
                color={theme.colors.onSurfaceVariant}
              />
            }
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
  },
  card: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
  },
  cardTitle: {
    fontWeight: "600",
    fontSize: 18,
  },
  cardContent: {
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
  listIcon: {
    marginLeft: 8,
    alignSelf: "center",
  },
  listTitle: {
    fontWeight: "500",
  },
  listDescription: {
    opacity: 0.7,
  },
  divider: {
    marginHorizontal: 16,
  },
  pressableItem: {
    borderRadius: 8,
  },
  themeHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    paddingHorizontal: 8,
  },
  themeTextContainer: {
    marginLeft: 16,
    flex: 1,
  },
  themeSelector: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  segmentedButtons: {
    borderRadius: 12,
  },
  dangerZone: {
    marginTop: 24,
    marginHorizontal: 16,
  },
  signOutButton: {
    borderRadius: 12,
    borderWidth: 1.5,
  },
  signOutButtonContent: {
    paddingVertical: 8,
  },
  modal: {
    margin: 20,
    padding: 24,
    borderRadius: 24,
  },
  modalTitle: {
    marginBottom: 4,
    fontWeight: "600",
  },
  modalSubtitle: {
    marginBottom: 20,
    opacity: 0.7,
  },
  input: {
    marginBottom: 16,
    backgroundColor: "transparent",
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
});
