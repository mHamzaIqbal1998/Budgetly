// Edit Piggy Bank Screen
import { GlassCard } from "@/components/glass-card";
import { SpotifyColors } from "@/constants/spotify-theme";
import { apiClient } from "@/lib/api-client";
import { queryClient } from "@/lib/query-client";
import type { PiggyBank, UpdatePiggyBankData } from "@/types";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
  useLocalSearchParams,
  useNavigation,
  useRouter,
  type Href,
} from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import {
  ActivityIndicator,
  Button,
  Card,
  Switch,
  Text,
  TextInput,
  useTheme,
} from "react-native-paper";

const PIGGY_BANKS_ROUTE = "/(drawer)/piggy-banks" as Href;

export default function EditPiggyBankScreen() {
  const theme = useTheme();
  const router = useRouter();
  const navigation = useNavigation();
  const { id } = useLocalSearchParams<{ id: string }>();

  // Loading states
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Original piggy bank
  const [piggyBank, setPiggyBank] = useState<PiggyBank | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [startDate, setStartDate] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [notes, setNotes] = useState("");
  const [active, setActive] = useState(true);

  // Fetch piggy bank data
  useEffect(() => {
    let mounted = true;

    async function fetchPiggyBank() {
      if (!id) return;
      try {
        setIsLoading(true);
        const response = await apiClient.getPiggyBank(id);
        if (!mounted) return;

        const data = response.data;
        setPiggyBank(data);

        // Initialize form state
        setName(data.attributes.name || "");
        setTargetAmount(data.attributes.target_amount || "");
        setStartDate(data.attributes.start_date || "");
        setTargetDate(data.attributes.target_date || "");
        setNotes(data.attributes.notes || "");
        setActive(data.attributes.active ?? true);
      } catch (error: any) {
        Alert.alert("Error", error?.message || "Failed to load piggy bank");
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    fetchPiggyBank();

    return () => {
      mounted = false;
    };
  }, [id]);

  // Update header title
  useEffect(() => {
    navigation.setOptions({
      title: isLoading ? "Edit Piggy Bank" : `Edit: ${name || "Piggy Bank"}`,
    });
  }, [navigation, name, isLoading]);

  // Handle save
  const handleSave = useCallback(async () => {
    if (!id || !piggyBank) return;

    if (!name.trim()) {
      Alert.alert("Validation Error", "Name is required");
      return;
    }

    try {
      setIsSaving(true);

      // Build accounts array - preserve existing accounts with updated current amounts
      const accounts = piggyBank.attributes.accounts.map(
        (acc: {
          account_id: string;
          name: string;
          current_amount: string;
        }) => ({
          account_id: acc.account_id,
          name: acc.name,
          current_amount: acc.current_amount,
        })
      );

      const updateData: UpdatePiggyBankData = {
        name: name.trim(),
        accounts,
        target_amount: targetAmount.trim() || null,
        start_date: startDate.trim() || undefined,
        target_date: targetDate.trim() || null,
        notes: notes.trim() || null,
      };

      await apiClient.updatePiggyBank(id, updateData);

      // Invalidate queries to refresh data
      queryClient.refetchQueries({
        queryKey: ["piggy-banks-list"],
        type: "active",
      });
      queryClient.invalidateQueries({ queryKey: ["piggy-bank", id] });

      Alert.alert("Success", "Piggy bank updated successfully", [
        {
          text: "OK",
          onPress: () => router.push(PIGGY_BANKS_ROUTE),
        },
      ]);
    } catch (error: unknown) {
      Alert.alert(
        "Error",
        error instanceof Error ? error.message : "Failed to update piggy bank"
      );
    } finally {
      setIsSaving(false);
    }
  }, [id, piggyBank, name, targetAmount, startDate, targetDate, notes, router]);

  // Handle cancel
  const handleCancel = useCallback(() => {
    router.back();
  }, [router]);

  if (isLoading) {
    return (
      <View
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text variant="bodyMedium" style={styles.loadingText}>
            Loading piggy bank...
          </Text>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <GlassCard variant="elevated" style={styles.headerCard}>
          <Card.Content style={styles.headerContent}>
            <MaterialCommunityIcons
              name="piggy-bank"
              size={48}
              color={theme.colors.primary}
            />
            <Text variant="headlineSmall" style={styles.headerTitle}>
              Edit Piggy Bank
            </Text>
            <Text variant="bodyMedium" style={styles.headerSubtitle}>
              Update your savings goal details
            </Text>
          </Card.Content>
        </GlassCard>

        {/* Form */}
        <GlassCard variant="elevated" style={styles.formCard}>
          <Card.Content style={styles.formContent}>
            {/* Name */}
            <View style={styles.inputGroup}>
              <Text variant="labelLarge" style={styles.label}>
                Name *
              </Text>
              <TextInput
                mode="outlined"
                value={name}
                onChangeText={setName}
                placeholder="e.g., New Car, Vacation Fund"
                style={styles.input}
                outlineColor={theme.colors.outline}
                activeOutlineColor={theme.colors.primary}
              />
            </View>

            {/* Target Amount */}
            <View style={styles.inputGroup}>
              <Text variant="labelLarge" style={styles.label}>
                Target Amount
              </Text>
              <TextInput
                mode="outlined"
                value={targetAmount}
                onChangeText={setTargetAmount}
                placeholder="0.00"
                keyboardType="decimal-pad"
                style={styles.input}
                outlineColor={theme.colors.outline}
                activeOutlineColor={theme.colors.primary}
                left={
                  <TextInput.Affix
                    text={piggyBank?.attributes.currency_symbol || "$"}
                  />
                }
              />
            </View>

            {/* Start Date */}
            <View style={styles.inputGroup}>
              <Text variant="labelLarge" style={styles.label}>
                Start Date
              </Text>
              <TextInput
                mode="outlined"
                value={startDate}
                onChangeText={setStartDate}
                placeholder="YYYY-MM-DD"
                style={styles.input}
                outlineColor={theme.colors.outline}
                activeOutlineColor={theme.colors.primary}
              />
            </View>

            {/* Target Date */}
            <View style={styles.inputGroup}>
              <Text variant="labelLarge" style={styles.label}>
                Target Date
              </Text>
              <TextInput
                mode="outlined"
                value={targetDate}
                onChangeText={setTargetDate}
                placeholder="YYYY-MM-DD (optional)"
                style={styles.input}
                outlineColor={theme.colors.outline}
                activeOutlineColor={theme.colors.primary}
              />
            </View>

            {/* Notes */}
            <View style={styles.inputGroup}>
              <Text variant="labelLarge" style={styles.label}>
                Notes
              </Text>
              <TextInput
                mode="outlined"
                value={notes}
                onChangeText={setNotes}
                placeholder="Additional notes (optional)"
                multiline
                numberOfLines={3}
                style={[styles.input, styles.textArea]}
                outlineColor={theme.colors.outline}
                activeOutlineColor={theme.colors.primary}
              />
            </View>

            {/* Active Toggle */}
            <View style={styles.switchRow}>
              <View style={styles.switchLabel}>
                <MaterialCommunityIcons
                  name="power"
                  size={20}
                  color={theme.colors.onSurface}
                />
                <Text variant="bodyLarge" style={styles.switchText}>
                  Active
                </Text>
              </View>
              <Switch
                value={active}
                onValueChange={setActive}
                color={theme.colors.primary}
              />
            </View>
          </Card.Content>
        </GlassCard>

        {/* Linked Accounts Info */}
        {piggyBank && piggyBank.attributes.accounts.length > 0 && (
          <GlassCard variant="elevated" style={styles.accountsCard}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.accountsTitle}>
                Linked Accounts
              </Text>
              {piggyBank.attributes.accounts.map(
                (
                  acc: {
                    account_id: string;
                    name: string;
                    current_amount: string;
                  },
                  index: number
                ) => (
                  <View key={acc.account_id} style={styles.accountItem}>
                    <MaterialCommunityIcons
                      name="bank"
                      size={20}
                      color={theme.colors.onSurfaceVariant}
                    />
                    <View style={styles.accountInfo}>
                      <Text variant="bodyMedium">{acc.name}</Text>
                      <Text variant="bodySmall" style={{ opacity: 0.6 }}>
                        Current: {piggyBank.attributes.currency_symbol}{" "}
                        {acc.current_amount}
                      </Text>
                    </View>
                  </View>
                )
              )}
            </Card.Content>
          </GlassCard>
        )}

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <Button
            mode="outlined"
            onPress={handleCancel}
            style={styles.cancelButton}
            textColor={theme.colors.onSurface}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            mode="contained"
            onPress={handleSave}
            loading={isSaving}
            disabled={isSaving || !name.trim()}
            style={styles.saveButton}
            buttonColor={SpotifyColors.green}
            textColor="#FFFFFF"
          >
            Save Changes
          </Button>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 80,
  },
  loadingText: {
    marginTop: 12,
    opacity: 0.7,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  headerCard: {
    marginBottom: 16,
    borderRadius: 16,
  },
  headerContent: {
    alignItems: "center",
    paddingVertical: 24,
  },
  headerTitle: {
    fontWeight: "700",
    marginTop: 12,
  },
  headerSubtitle: {
    opacity: 0.6,
    marginTop: 4,
  },
  formCard: {
    marginBottom: 16,
    borderRadius: 16,
  },
  formContent: {
    gap: 16,
  },
  inputGroup: {
    gap: 6,
  },
  label: {
    fontWeight: "600",
  },
  input: {
    backgroundColor: "transparent",
  },
  textArea: {
    minHeight: 80,
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 8,
  },
  switchLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  switchText: {
    fontWeight: "500",
  },
  accountsCard: {
    marginBottom: 16,
    borderRadius: 16,
  },
  accountsTitle: {
    fontWeight: "700",
    marginBottom: 12,
  },
  accountItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(120, 120, 120, 0.1)",
  },
  accountInfo: {
    flex: 1,
  },
  buttonContainer: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    borderRadius: 8,
  },
  saveButton: {
    flex: 2,
    borderRadius: 8,
  },
});
