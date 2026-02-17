// Create Piggy Bank Screen
import { GlassCard } from "@/components/glass-card";
import { apiClient } from "@/lib/api-client";
import { queryClient } from "@/lib/query-client";
import type { Account, CreatePiggyBankData } from "@/types";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useFocusEffect } from "@react-navigation/native";
import { useNavigation, useRouter, type Href } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  BackHandler,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import {
  ActivityIndicator,
  Button,
  Card,
  List,
  Text,
  TextInput,
  useTheme,
} from "react-native-paper";

const PIGGY_BANKS_ROUTE = "/(drawer)/piggy-banks" as Href;

// Date helpers
const toApiDateString = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const parseApiDate = (iso: string): Date | null => {
  if (!iso || !iso.trim()) return null;
  const date = new Date(iso);
  return isNaN(date.getTime()) ? null : date;
};

const formatDateDisplay = (iso: string): string => {
  const date = parseApiDate(iso);
  return date
    ? date.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "";
};

export default function CreatePiggyBankScreen() {
  const theme = useTheme();
  const router = useRouter();
  const navigation = useNavigation();

  // Loading states
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Reference data
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountModalVisible, setAccountModalVisible] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [currentAmount, setCurrentAmount] = useState("");
  const [startDate, setStartDate] = useState(toApiDateString(new Date()));
  const [targetDate, setTargetDate] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(
    null
  );

  // Date picker state
  const [startDatePickerOpen, setStartDatePickerOpen] = useState(false);
  const [startDatePickerValue, setStartDatePickerValue] = useState(new Date());
  const [targetDatePickerOpen, setTargetDatePickerOpen] = useState(false);
  const [targetDatePickerValue, setTargetDatePickerValue] = useState(
    new Date()
  );

  // Derived
  const selectedAccountLabel = useMemo(() => {
    const acc = accounts.find((a) => a.id === selectedAccountId);
    return acc
      ? `${acc.attributes.name} (${acc.attributes.currency_code})`
      : "Select asset account";
  }, [accounts, selectedAccountId]);

  const assetAccountItems = useMemo(() => {
    return accounts
      .filter((a) => {
        const type = a.attributes.type?.toLowerCase();
        return type === "asset" || type === "cash";
      })
      .map((a) => ({
        id: a.id,
        label: `${a.attributes.name} (${a.attributes.currency_code})`,
        subtitle: `${a.attributes.currency_symbol ?? ""} ${a.attributes.current_balance ?? "0"}`,
      }));
  }, [accounts]);

  // Reset form on screen focus
  useFocusEffect(
    useCallback(() => {
      setName("");
      setTargetAmount("");
      setCurrentAmount("");
      setStartDate(toApiDateString(new Date()));
      setTargetDate("");
      setNotes("");
      setSelectedAccountId(null);
      setIsSaving(false);
    }, [])
  );

  // Fetch accounts
  useEffect(() => {
    async function fetchData() {
      try {
        setIsLoading(true);
        const accountsResponse = await apiClient
          .getAllAccounts("all")
          .catch(() => null);

        const accts = accountsResponse?.data;
        setAccounts(Array.isArray(accts) ? accts : []);
      } catch (error) {
        console.error("Failed to fetch accounts:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, []);

  // Update header title
  useEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <Pressable
          onPress={() => router.replace(PIGGY_BANKS_ROUTE)}
          hitSlop={16}
          style={({ pressed }) => [
            { padding: 8, marginLeft: 8, opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <MaterialCommunityIcons
            name="arrow-left"
            size={24}
            color={theme.colors.onSurface}
          />
        </Pressable>
      ),
      title: "Create Piggy Bank",
    });
  }, [navigation, router, theme.colors.onSurface]);

  // Handle back button on Android
  useEffect(() => {
    if (Platform.OS !== "android") return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      router.replace(PIGGY_BANKS_ROUTE);
      return true;
    });
    return () => sub.remove();
  }, [router]);

  // Handle save
  const handleSave = useCallback(async () => {
    if (!name.trim()) {
      Alert.alert("Validation Error", "Name is required");
      return;
    }

    if (!selectedAccountId) {
      Alert.alert("Validation Error", "Linked Asset Account is required");
      return;
    }

    try {
      setIsSaving(true);

      const selectedAcc = accounts.find((a) => a.id === selectedAccountId);

      // Build accounts array for create
      const createAccounts = selectedAccountId
        ? [
            {
              account_id: selectedAccountId,
              name: selectedAcc?.attributes.name || "Account",
              current_amount: currentAmount.trim() || "0",
            },
          ]
        : [];

      const createData: CreatePiggyBankData = {
        name: name.trim(),
        accounts: createAccounts,
        transaction_currency_id: selectedAcc?.attributes.currency_id || "",
        transaction_currency_code: selectedAcc?.attributes.currency_code || "",
        target_amount: targetAmount.trim() || null,
        current_amount: currentAmount.trim() || "0",
        start_date: startDate.trim(),
        target_date: targetDate.trim() || null,
        notes: notes.trim() || null,
      };

      await apiClient.createPiggyBank(createData);

      // Invalidate queries to refresh data (same as update/delete)
      queryClient.removeQueries({ queryKey: ["piggy-banks-list"] });
      queryClient.removeQueries({ queryKey: ["all-accounts-piggy-banks"] });
      queryClient.refetchQueries({
        queryKey: ["piggy-banks-list"],
        type: "active",
      });
      queryClient.refetchQueries({ queryKey: ["all-accounts-piggy-banks"] });

      Alert.alert("Success", "Piggy bank created successfully", [
        {
          text: "OK",
          onPress: () => router.push(PIGGY_BANKS_ROUTE),
        },
      ]);
    } catch (error: unknown) {
      Alert.alert(
        "Error",
        error instanceof Error ? error.message : "Failed to create piggy bank"
      );
    } finally {
      setIsSaving(false);
    }
  }, [
    name,
    targetAmount,
    currentAmount,
    startDate,
    targetDate,
    notes,
    selectedAccountId,
    accounts,
    router,
  ]);

  if (isLoading) {
    return (
      <View
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text variant="bodyMedium" style={styles.loadingText}>
            Loading...
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
              Create Piggy Bank
            </Text>
            <Text variant="bodyMedium" style={styles.headerSubtitle}>
              Set up a new savings goal
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

            {/* Linked Asset Account */}
            <View style={styles.inputGroup}>
              <Text variant="labelLarge" style={styles.label}>
                Linked Asset Account *
              </Text>
              <Pressable
                onPress={() => setAccountModalVisible(true)}
                style={[
                  styles.fieldTouchable,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.outline,
                  },
                ]}
              >
                <Text
                  variant="bodyLarge"
                  style={[
                    styles.fieldTouchableText,
                    {
                      color: selectedAccountId
                        ? theme.colors.onSurface
                        : theme.colors.onSurfaceVariant,
                    },
                  ]}
                >
                  {selectedAccountLabel}
                </Text>
                <MaterialCommunityIcons
                  name="chevron-down"
                  size={24}
                  color={theme.colors.onSurfaceVariant}
                />
              </Pressable>

              {/* Account Selector Modal */}
              <Modal
                visible={accountModalVisible}
                transparent
                animationType="slide"
                onRequestClose={() => setAccountModalVisible(false)}
              >
                <Pressable
                  style={styles.modalOverlay}
                  onPress={() => setAccountModalVisible(false)}
                >
                  <Pressable
                    style={[
                      styles.modalContent,
                      { backgroundColor: theme.colors.surface },
                    ]}
                    onPress={(e) => e.stopPropagation()}
                  >
                    <View
                      style={[
                        styles.modalHeader,
                        {
                          borderBottomColor: theme.colors.outlineVariant,
                        },
                      ]}
                    >
                      <Text variant="titleMedium" style={styles.modalTitle}>
                        Select Asset Account
                      </Text>
                      <Button
                        mode="text"
                        compact
                        onPress={() => setAccountModalVisible(false)}
                      >
                        Done
                      </Button>
                    </View>
                    {assetAccountItems.length === 0 ? (
                      <View style={styles.modalEmpty}>
                        <Text variant="bodyMedium">
                          No asset accounts available
                        </Text>
                      </View>
                    ) : (
                      <FlatList
                        data={assetAccountItems}
                        keyExtractor={(item) => item.id}
                        style={styles.modalList}
                        keyboardShouldPersistTaps="handled"
                        renderItem={({ item }) => (
                          <List.Item
                            title={item.label}
                            description={item.subtitle}
                            descriptionStyle={styles.modalItemDescription}
                            titleStyle={
                              selectedAccountId === item.id
                                ? { fontWeight: "600" }
                                : undefined
                            }
                            onPress={() => {
                              setSelectedAccountId(item.id);
                              setAccountModalVisible(false);
                            }}
                            right={
                              selectedAccountId === item.id
                                ? (props) => (
                                    <List.Icon
                                      {...props}
                                      icon="check"
                                      color={theme.colors.primary}
                                    />
                                  )
                                : undefined
                            }
                          />
                        )}
                      />
                    )}
                  </Pressable>
                </Pressable>
              </Modal>
            </View>

            {/* Target Amount */}
            <View style={styles.inputGroup}>
              <Text variant="labelLarge" style={styles.label}>
                Target Amount *
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
              />
            </View>

            {/* Current Amount */}
            <View style={styles.inputGroup}>
              <Text variant="labelLarge" style={styles.label}>
                Current Amount (optional)
              </Text>
              <TextInput
                mode="outlined"
                value={currentAmount}
                onChangeText={setCurrentAmount}
                placeholder="0.00"
                keyboardType="decimal-pad"
                style={styles.input}
                outlineColor={theme.colors.outline}
                activeOutlineColor={theme.colors.primary}
              />
            </View>

            {/* Start Date */}
            <View style={styles.inputGroup}>
              <Text variant="labelLarge" style={styles.label}>
                Start Date *
              </Text>
              <Pressable
                onPress={() => {
                  const initial = parseApiDate(startDate) ?? new Date();
                  setStartDatePickerValue(initial);
                  setStartDatePickerOpen(true);
                }}
                style={[
                  styles.fieldTouchable,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.outline,
                  },
                ]}
              >
                <View style={styles.fieldContent}>
                  <MaterialCommunityIcons
                    name="calendar"
                    size={20}
                    color={theme.colors.onSurfaceVariant}
                  />
                  <Text
                    variant="bodyLarge"
                    style={[
                      styles.fieldTouchableText,
                      {
                        color: startDate
                          ? theme.colors.onSurface
                          : theme.colors.onSurfaceVariant,
                      },
                    ]}
                  >
                    {startDate
                      ? formatDateDisplay(startDate)
                      : "Select start date"}
                  </Text>
                </View>
                <MaterialCommunityIcons
                  name="chevron-down"
                  size={24}
                  color={theme.colors.onSurfaceVariant}
                />
              </Pressable>

              {/* Android native date picker */}
              {startDatePickerOpen && Platform.OS === "android" && (
                <DateTimePicker
                  value={startDatePickerValue}
                  mode="date"
                  display="default"
                  onChange={(event, selectedDate) => {
                    setStartDatePickerOpen(false);
                    if (event.type === "set" && selectedDate) {
                      setStartDate(toApiDateString(selectedDate));
                    }
                  }}
                />
              )}
              {/* iOS modal date picker */}
              {startDatePickerOpen && Platform.OS === "ios" && (
                <Modal
                  visible
                  transparent
                  animationType="slide"
                  onRequestClose={() => setStartDatePickerOpen(false)}
                >
                  <Pressable
                    style={styles.datePickerOverlay}
                    onPress={() => setStartDatePickerOpen(false)}
                  >
                    <View
                      style={[
                        styles.datePickerContent,
                        { backgroundColor: theme.colors.surface },
                      ]}
                      onStartShouldSetResponder={() => true}
                    >
                      <View
                        style={[
                          styles.datePickerHeader,
                          {
                            borderBottomColor: theme.colors.outlineVariant,
                          },
                        ]}
                      >
                        <Button
                          mode="text"
                          compact
                          onPress={() => setStartDatePickerOpen(false)}
                        >
                          Cancel
                        </Button>
                        <Text
                          variant="titleMedium"
                          style={styles.datePickerTitle}
                        >
                          Start Date
                        </Text>
                        <Button
                          mode="text"
                          compact
                          onPress={() => {
                            setStartDate(toApiDateString(startDatePickerValue));
                            setStartDatePickerOpen(false);
                          }}
                        >
                          Done
                        </Button>
                      </View>
                      <DateTimePicker
                        value={startDatePickerValue}
                        mode="date"
                        display="spinner"
                        onChange={(_, selectedDate) => {
                          if (selectedDate)
                            setStartDatePickerValue(selectedDate);
                        }}
                        style={styles.datePickerIOS}
                      />
                    </View>
                  </Pressable>
                </Modal>
              )}
            </View>

            {/* Target Date */}
            <View style={styles.inputGroup}>
              <Text variant="labelLarge" style={styles.label}>
                Target Date (optional)
              </Text>
              <Pressable
                onPress={() => {
                  const initial = parseApiDate(targetDate) ?? new Date();
                  setTargetDatePickerValue(initial);
                  setTargetDatePickerOpen(true);
                }}
                style={[
                  styles.fieldTouchable,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.outline,
                  },
                ]}
              >
                <View style={styles.fieldContent}>
                  <MaterialCommunityIcons
                    name="calendar"
                    size={20}
                    color={theme.colors.onSurfaceVariant}
                  />
                  <Text
                    variant="bodyLarge"
                    style={[
                      styles.fieldTouchableText,
                      {
                        color: targetDate
                          ? theme.colors.onSurface
                          : theme.colors.onSurfaceVariant,
                      },
                    ]}
                  >
                    {targetDate
                      ? formatDateDisplay(targetDate)
                      : "Select target date"}
                  </Text>
                </View>
                <MaterialCommunityIcons
                  name="chevron-down"
                  size={24}
                  color={theme.colors.onSurfaceVariant}
                />
              </Pressable>

              {/* Android native date picker */}
              {targetDatePickerOpen && Platform.OS === "android" && (
                <DateTimePicker
                  value={targetDatePickerValue}
                  mode="date"
                  display="default"
                  onChange={(event, selectedDate) => {
                    setTargetDatePickerOpen(false);
                    if (event.type === "set" && selectedDate) {
                      setTargetDate(toApiDateString(selectedDate));
                    }
                  }}
                />
              )}
              {/* iOS modal date picker */}
              {targetDatePickerOpen && Platform.OS === "ios" && (
                <Modal
                  visible
                  transparent
                  animationType="slide"
                  onRequestClose={() => setTargetDatePickerOpen(false)}
                >
                  <Pressable
                    style={styles.datePickerOverlay}
                    onPress={() => setTargetDatePickerOpen(false)}
                  >
                    <View
                      style={[
                        styles.datePickerContent,
                        { backgroundColor: theme.colors.surface },
                      ]}
                      onStartShouldSetResponder={() => true}
                    >
                      <View
                        style={[
                          styles.datePickerHeader,
                          {
                            borderBottomColor: theme.colors.outlineVariant,
                          },
                        ]}
                      >
                        <Button
                          mode="text"
                          compact
                          onPress={() => setTargetDatePickerOpen(false)}
                        >
                          Cancel
                        </Button>
                        <Text
                          variant="titleMedium"
                          style={styles.datePickerTitle}
                        >
                          Target Date
                        </Text>
                        <Button
                          mode="text"
                          compact
                          onPress={() => {
                            setTargetDate(
                              toApiDateString(targetDatePickerValue)
                            );
                            setTargetDatePickerOpen(false);
                          }}
                        >
                          Done
                        </Button>
                      </View>
                      <DateTimePicker
                        value={targetDatePickerValue}
                        mode="date"
                        display="spinner"
                        onChange={(_, selectedDate) => {
                          if (selectedDate)
                            setTargetDatePickerValue(selectedDate);
                        }}
                        style={styles.datePickerIOS}
                      />
                    </View>
                  </Pressable>
                </Modal>
              )}
            </View>

            {/* Notes */}
            <View style={styles.inputGroup}>
              <Text variant="labelLarge" style={styles.label}>
                Notes (optional)
              </Text>
              <TextInput
                mode="outlined"
                value={notes}
                onChangeText={setNotes}
                placeholder="Additional notes"
                multiline
                numberOfLines={3}
                style={[styles.input, styles.textArea]}
                outlineColor={theme.colors.outline}
                activeOutlineColor={theme.colors.primary}
              />
            </View>
          </Card.Content>
        </GlassCard>

        {/* Save Button */}
        <Button
          mode="contained"
          onPress={handleSave}
          loading={isSaving}
          disabled={isSaving || !name.trim() || !selectedAccountId}
          style={styles.saveButton}
          contentStyle={styles.saveButtonContent}
          labelStyle={styles.saveButtonLabel}
          icon="content-save"
        >
          {isSaving ? "Creating..." : "Create Piggy Bank"}
        </Button>

        <View style={{ height: 48 }} />
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
    paddingTop: 12,
  },
  fieldTouchable: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 4,
    borderWidth: 1,
    marginBottom: 4,
  },
  fieldTouchableText: {
    flex: 1,
    marginRight: 8,
  },
  fieldContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    maxHeight: "60%",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: "hidden",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontWeight: "600",
  },
  modalList: {
    maxHeight: 400,
  },
  modalItemDescription: {
    opacity: 0.7,
  },
  modalEmpty: {
    padding: 32,
    alignItems: "center",
  },

  // Date Picker styles
  datePickerOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  datePickerContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20,
  },
  datePickerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  datePickerTitle: {
    fontWeight: "600",
  },
  datePickerIOS: {
    height: 200,
  },

  // Save Button
  saveButton: {
    marginTop: 8,
    borderRadius: 12,
  },
  saveButtonContent: {
    paddingVertical: 8,
  },
  saveButtonLabel: {
    fontSize: 16,
    fontWeight: "600",
  },
});
