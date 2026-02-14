// Create Budget Screen
import { GlassCard } from "@/components/glass-card";
import { apiClient } from "@/lib/api-client";
import { queryClient } from "@/lib/query-client";
import type { CreateBudgetData, UserCurrenciesList } from "@/types";
import { MaterialCommunityIcons } from "@expo/vector-icons";
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
  Switch,
  Text,
  TextInput,
  useTheme,
} from "react-native-paper";

const BUDGETS_ROUTE = "/(drawer)/budgets" as Href;

// ---------------------------------------------------------------------------
// Auto-budget type options
// ---------------------------------------------------------------------------

interface AutoBudgetOption {
  value: "none" | "reset" | "rollover" | "adjusted";
  label: string;
  description: string;
  /** Actual API value sent */
  apiValue: "none" | "reset" | "rollover" | "adjusted";
}

const AUTO_BUDGET_TYPE_OPTIONS: AutoBudgetOption[] = [
  {
    value: "none",
    label: "No auto-budget",
    description: "No automatic budget management",
    apiValue: "none",
  },
  {
    value: "reset",
    label: "Set a fixed amount every period",
    description: "Budget resets to the configured amount each period",
    apiValue: "reset",
  },
  {
    value: "rollover",
    label: "Add an amount every period",
    description: "Adds the configured amount to the budget each period",
    apiValue: "rollover",
  },
  {
    value: "adjusted",
    label: "Add an amount every period and correct for overspending",
    description: "Carries over unspent or overspent amounts to the next period",
    apiValue: "adjusted",
  },
];

// ---------------------------------------------------------------------------
// Period options
// ---------------------------------------------------------------------------

const PERIOD_OPTIONS: { value: string; label: string }[] = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "half-year", label: "Half Year" },
  { value: "yearly", label: "Yearly" },
];

// ---------------------------------------------------------------------------
// Main Screen
// ---------------------------------------------------------------------------

export default function CreateBudgetScreen() {
  const theme = useTheme();
  const router = useRouter();
  const navigation = useNavigation();

  // Loading
  const [isInitializing, setIsInitializing] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // User currencies
  const [userCurrencies, setUserCurrencies] = useState<UserCurrenciesList[]>(
    []
  );
  const [currencyMenuVisible, setCurrencyMenuVisible] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [active, setActive] = useState(true);
  const [notes, setNotes] = useState("");
  const [autoBudgetType, setAutoBudgetType] = useState<string>("none");
  const [autoBudgetCurrencyCode, setAutoBudgetCurrencyCode] = useState("");
  const [autoBudgetAmount, setAutoBudgetAmount] = useState("");
  const [autoBudgetPeriod, setAutoBudgetPeriod] = useState("monthly");

  // Type/period selector modals
  const [typeModalVisible, setTypeModalVisible] = useState(false);
  const [periodModalVisible, setPeriodModalVisible] = useState(false);

  // Derived
  const showAutoBudgetFields =
    autoBudgetType !== "none" && autoBudgetType !== "";
  const selectedTypeOption = AUTO_BUDGET_TYPE_OPTIONS.find(
    (o) => o.value === autoBudgetType
  );

  const selectedCurrencyLabel = useMemo(() => {
    const c = userCurrencies.find((cur) => cur.code === autoBudgetCurrencyCode);
    return c
      ? `${c.name} (${c.code})`
      : autoBudgetCurrencyCode || "Select currency";
  }, [userCurrencies, autoBudgetCurrencyCode]);

  const selectedPeriodLabel = useMemo(() => {
    const p = PERIOD_OPTIONS.find((o) => o.value === autoBudgetPeriod);
    return p?.label || autoBudgetPeriod || "Select period";
  }, [autoBudgetPeriod]);

  // ---------------------------------------------------------------------------
  // Fetch currencies
  // ---------------------------------------------------------------------------

  useEffect(() => {
    async function fetchCurrencies() {
      setIsInitializing(true);
      try {
        const currenciesList = await apiClient
          .getUserCurrencies()
          .catch(() => [] as UserCurrenciesList[]);
        setUserCurrencies(Array.isArray(currenciesList) ? currenciesList : []);
      } catch (error) {
        console.error("Failed to fetch currencies:", error);
      } finally {
        setIsInitializing(false);
      }
    }
    fetchCurrencies();
  }, []);

  // Reset form on screen focus
  useFocusEffect(
    useCallback(() => {
      setName("");
      setActive(true);
      setNotes("");
      setAutoBudgetType("none");
      setAutoBudgetCurrencyCode("");
      setAutoBudgetAmount("");
      setAutoBudgetPeriod("monthly");
    }, [])
  );

  // Navigation: header
  useEffect(() => {
    navigation.setOptions({
      title: "Create Budget",
      headerLeft: () => (
        <Pressable
          onPress={() => router.replace(BUDGETS_ROUTE)}
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
    });
  }, [navigation, router, theme.colors.onSurface]);

  useEffect(() => {
    if (Platform.OS !== "android") return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      router.replace(BUDGETS_ROUTE);
      return true;
    });
    return () => sub.remove();
  }, [router]);

  // ---------------------------------------------------------------------------
  // Save handler
  // ---------------------------------------------------------------------------

  const handleSave = useCallback(async () => {
    if (!name.trim()) {
      Alert.alert("Error", "Budget name is required");
      return;
    }

    setIsSaving(true);
    try {
      const selectedOption = AUTO_BUDGET_TYPE_OPTIONS.find(
        (o) => o.value === autoBudgetType
      );
      const apiAutoBudgetType = selectedOption?.apiValue || "none";

      const body: CreateBudgetData = {
        name: name.trim(),
        active,
        notes: notes.trim() || null,
        auto_budget_type:
          apiAutoBudgetType === "none" ? null : apiAutoBudgetType,
        fire_webhooks: true,
      };

      if (apiAutoBudgetType !== "none") {
        body.auto_budget_amount = autoBudgetAmount.trim() || null;
        body.auto_budget_period =
          (autoBudgetPeriod as CreateBudgetData["auto_budget_period"]) || null;
        if (autoBudgetCurrencyCode.trim()) {
          body.auto_budget_currency_code = autoBudgetCurrencyCode.trim();
        }
      } else {
        body.auto_budget_amount = null;
        body.auto_budget_period = null;
        body.auto_budget_currency_code = null;
      }

      await apiClient.createBudget(body);

      // Invalidate budget caches so list refreshes
      queryClient.removeQueries({ queryKey: ["budgets-list"] });
      queryClient.removeQueries({ queryKey: ["all-budgets"] });
      queryClient.removeQueries({ queryKey: ["all-budget-limits"] });
      queryClient.invalidateQueries({ queryKey: ["budgets-list"] });
      queryClient.invalidateQueries({ queryKey: ["all-budgets"] });

      Alert.alert("Success", "Budget created successfully", [
        { text: "OK", onPress: () => router.replace(BUDGETS_ROUTE) },
      ]);
    } catch (error) {
      console.error("Failed to create budget:", error);

      let errorMessage = "Failed to create budget";
      if (
        error &&
        typeof error === "object" &&
        "response" in error &&
        (error as any).response?.data?.message
      ) {
        errorMessage = (error as any).response.data.message;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      Alert.alert("Error", errorMessage);
    } finally {
      setIsSaving(false);
    }
  }, [
    name,
    active,
    notes,
    autoBudgetType,
    autoBudgetAmount,
    autoBudgetPeriod,
    autoBudgetCurrencyCode,
    router,
  ]);

  // ---------------------------------------------------------------------------
  // Loading
  // ---------------------------------------------------------------------------

  if (isInitializing) {
    return (
      <View
        style={[
          styles.loadingContainer,
          { backgroundColor: theme.colors.background },
        ]}
      >
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={{ marginTop: 16 }}>Loading...</Text>
      </View>
    );
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          style={[
            styles.scrollView,
            { backgroundColor: theme.colors.background },
          ]}
          contentContainerStyle={[
            styles.scrollContent,
            { backgroundColor: theme.colors.background },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Basic Information */}
          <GlassCard variant="elevated" style={styles.card}>
            <Card.Title
              title="Basic Information"
              left={() => (
                <MaterialCommunityIcons
                  name="information"
                  size={24}
                  color={theme.colors.primary}
                />
              )}
            />
            <Card.Content>
              <TextInput
                label="Budget Name *"
                value={name}
                onChangeText={setName}
                mode="outlined"
                style={styles.input}
                error={!name.trim()}
                placeholder="e.g., Groceries, Entertainment"
              />

              <View style={styles.switchRow}>
                <View style={styles.switchLabel}>
                  <MaterialCommunityIcons
                    name={active ? "check-circle" : "pause-circle"}
                    size={20}
                    color={active ? theme.colors.primary : theme.colors.outline}
                  />
                  <Text variant="bodyLarge" style={{ marginLeft: 8 }}>
                    Active
                  </Text>
                </View>
                <Switch value={active} onValueChange={setActive} />
              </View>

              <TextInput
                label="Notes"
                value={notes}
                onChangeText={setNotes}
                mode="outlined"
                style={styles.input}
                multiline
                numberOfLines={3}
              />
            </Card.Content>
          </GlassCard>

          {/* Auto Budget Configuration */}
          <GlassCard variant="elevated" style={styles.card}>
            <Card.Title
              title="Auto Budget"
              left={() => (
                <MaterialCommunityIcons
                  name="autorenew"
                  size={24}
                  color={theme.colors.primary}
                />
              )}
            />
            <Card.Content>
              {/* Auto Budget Type */}
              <Text
                variant="bodySmall"
                style={[
                  styles.fieldLabel,
                  { color: theme.colors.onSurfaceVariant },
                ]}
              >
                Auto Budget Type
              </Text>
              <Pressable
                onPress={() => setTypeModalVisible(true)}
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
                      color: selectedTypeOption
                        ? theme.colors.onSurface
                        : theme.colors.onSurfaceVariant,
                    },
                  ]}
                  numberOfLines={2}
                >
                  {selectedTypeOption?.label || "Select type"}
                </Text>
                <MaterialCommunityIcons
                  name="chevron-down"
                  size={24}
                  color={theme.colors.onSurfaceVariant}
                />
              </Pressable>

              {/* Type Selector Modal */}
              <Modal
                visible={typeModalVisible}
                transparent
                animationType="slide"
                onRequestClose={() => setTypeModalVisible(false)}
              >
                <Pressable
                  style={styles.modalOverlay}
                  onPress={() => setTypeModalVisible(false)}
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
                        Auto Budget Type
                      </Text>
                      <Button
                        mode="text"
                        compact
                        onPress={() => setTypeModalVisible(false)}
                      >
                        Done
                      </Button>
                    </View>
                    <FlatList
                      data={AUTO_BUDGET_TYPE_OPTIONS}
                      keyExtractor={(item) => item.value}
                      style={styles.modalList}
                      keyboardShouldPersistTaps="handled"
                      renderItem={({ item }) => (
                        <List.Item
                          title={item.label}
                          description={item.description}
                          descriptionNumberOfLines={2}
                          titleStyle={
                            autoBudgetType === item.value
                              ? { fontWeight: "600" }
                              : undefined
                          }
                          onPress={() => {
                            setAutoBudgetType(item.value);
                            setTypeModalVisible(false);
                          }}
                          right={
                            autoBudgetType === item.value
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
                  </Pressable>
                </Pressable>
              </Modal>

              {/* Conditional auto-budget fields */}
              {showAutoBudgetFields && (
                <>
                  {/* Currency */}
                  <Text
                    variant="bodySmall"
                    style={[
                      styles.fieldLabel,
                      { color: theme.colors.onSurfaceVariant },
                    ]}
                  >
                    Currency
                  </Text>
                  <Pressable
                    onPress={() => setCurrencyMenuVisible(true)}
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
                          color: autoBudgetCurrencyCode
                            ? theme.colors.onSurface
                            : theme.colors.onSurfaceVariant,
                        },
                      ]}
                    >
                      {selectedCurrencyLabel}
                    </Text>
                    <MaterialCommunityIcons
                      name="chevron-down"
                      size={24}
                      color={theme.colors.onSurfaceVariant}
                    />
                  </Pressable>

                  {/* Currency Selector Modal */}
                  <Modal
                    visible={currencyMenuVisible}
                    transparent
                    animationType="slide"
                    onRequestClose={() => setCurrencyMenuVisible(false)}
                  >
                    <Pressable
                      style={styles.modalOverlay}
                      onPress={() => setCurrencyMenuVisible(false)}
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
                            Select Currency
                          </Text>
                          <Button
                            mode="text"
                            compact
                            onPress={() => setCurrencyMenuVisible(false)}
                          >
                            Done
                          </Button>
                        </View>
                        {userCurrencies.length === 0 ? (
                          <View style={styles.modalEmpty}>
                            <Text variant="bodyMedium">
                              No currencies available
                            </Text>
                          </View>
                        ) : (
                          <FlatList
                            data={userCurrencies}
                            keyExtractor={(item) => item.id}
                            style={styles.modalList}
                            keyboardShouldPersistTaps="handled"
                            renderItem={({ item: cur }) => (
                              <List.Item
                                title={`${cur.name} (${cur.code})`}
                                titleStyle={
                                  autoBudgetCurrencyCode === cur.code
                                    ? { fontWeight: "600" }
                                    : undefined
                                }
                                onPress={() => {
                                  setAutoBudgetCurrencyCode(cur.code);
                                  setCurrencyMenuVisible(false);
                                }}
                                right={
                                  autoBudgetCurrencyCode === cur.code
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

                  {/* Amount */}
                  <TextInput
                    label="Auto Budget Amount"
                    value={autoBudgetAmount}
                    onChangeText={setAutoBudgetAmount}
                    mode="outlined"
                    style={styles.input}
                    keyboardType="decimal-pad"
                    left={
                      <TextInput.Affix text={autoBudgetCurrencyCode || "$"} />
                    }
                  />

                  {/* Period */}
                  <Text
                    variant="bodySmall"
                    style={[
                      styles.fieldLabel,
                      { color: theme.colors.onSurfaceVariant },
                    ]}
                  >
                    Period
                  </Text>
                  <Pressable
                    onPress={() => setPeriodModalVisible(true)}
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
                        { color: theme.colors.onSurface },
                      ]}
                    >
                      {selectedPeriodLabel}
                    </Text>
                    <MaterialCommunityIcons
                      name="chevron-down"
                      size={24}
                      color={theme.colors.onSurfaceVariant}
                    />
                  </Pressable>

                  {/* Period Selector Modal */}
                  <Modal
                    visible={periodModalVisible}
                    transparent
                    animationType="slide"
                    onRequestClose={() => setPeriodModalVisible(false)}
                  >
                    <Pressable
                      style={styles.modalOverlay}
                      onPress={() => setPeriodModalVisible(false)}
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
                            Auto Budget Period
                          </Text>
                          <Button
                            mode="text"
                            compact
                            onPress={() => setPeriodModalVisible(false)}
                          >
                            Done
                          </Button>
                        </View>
                        <FlatList
                          data={PERIOD_OPTIONS}
                          keyExtractor={(item) => item.value}
                          style={styles.modalList}
                          keyboardShouldPersistTaps="handled"
                          renderItem={({ item }) => (
                            <List.Item
                              title={item.label}
                              titleStyle={
                                autoBudgetPeriod === item.value
                                  ? { fontWeight: "600" }
                                  : undefined
                              }
                              onPress={() => {
                                setAutoBudgetPeriod(item.value);
                                setPeriodModalVisible(false);
                              }}
                              right={
                                autoBudgetPeriod === item.value
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
                      </Pressable>
                    </Pressable>
                  </Modal>
                </>
              )}
            </Card.Content>
          </GlassCard>

          {/* Create Button */}
          <Button
            mode="contained"
            onPress={handleSave}
            loading={isSaving}
            disabled={isSaving || !name.trim()}
            style={styles.saveButton}
            contentStyle={styles.saveButtonContent}
            labelStyle={styles.saveButtonLabel}
            icon="plus-circle"
          >
            {isSaving ? "Creating..." : "Create Budget"}
          </Button>

          <View style={{ height: 48 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },

  // Cards
  card: {
    marginBottom: 16,
    borderRadius: 16,
  },
  input: {
    marginBottom: 12,
  },

  // Switch
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    marginBottom: 4,
  },
  switchLabel: {
    flexDirection: "row",
    alignItems: "center",
  },

  // Field Touchable (selectors)
  fieldLabel: {
    marginBottom: 6,
    marginTop: 4,
    fontWeight: "500",
  },
  fieldTouchable: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 14,
    marginBottom: 12,
  },
  fieldTouchableText: {
    flex: 1,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContent: {
    maxHeight: "60%",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: "hidden",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontWeight: "600",
  },
  modalList: {
    maxHeight: 300,
  },
  modalEmpty: {
    padding: 24,
    alignItems: "center",
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
    fontWeight: "700",
  },
});
