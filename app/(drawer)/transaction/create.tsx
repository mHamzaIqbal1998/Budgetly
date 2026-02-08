// Create Transaction Screen
import { GlassCard } from "@/components/glass-card";
import { apiClient } from "@/lib/api-client";
import { formatAmount } from "@/lib/format-currency";
import { queryClient } from "@/lib/query-client";
import type {
  Account,
  AutocompleteCategory,
  AutocompleteSubscription,
  Budget,
  CreateTransactionData,
  PiggyBank,
} from "@/types";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import {
  useFocusEffect,
  useNavigation,
  useRouter,
  type Href,
} from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
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
  Chip,
  Divider,
  IconButton,
  List,
  Searchbar,
  Text,
  TextInput,
  useTheme,
} from "react-native-paper";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TRANSACTIONS_ROUTE = "/(drawer)/transactions" as Href;

type TxType = "withdrawal" | "deposit" | "transfer";

const TX_TYPE_OPTIONS: { value: TxType; label: string; icon: string }[] = [
  { value: "withdrawal", label: "Expense", icon: "arrow-up-bold" },
  { value: "deposit", label: "Income", icon: "arrow-down-bold" },
  { value: "transfer", label: "Transfer", icon: "swap-horizontal" },
];

// ---------------------------------------------------------------------------
// Split state shape
// ---------------------------------------------------------------------------

interface SplitState {
  description: string;
  amount: string;
  sourceId: string | null;
  sourceName: string;
  destinationId: string | null;
  destinationName: string;
  categoryId: string | null;
  categoryName: string;
  budgetId: string | null;
  budgetName: string;
  billId: string | null;
  billName: string;
  piggyBankId: string | null;
  piggyBankName: string;
  notes: string;
  tagsText: string;
}

function createEmptySplit(): SplitState {
  return {
    description: "",
    amount: "",
    sourceId: null,
    sourceName: "",
    destinationId: null,
    destinationName: "",
    categoryId: null,
    categoryName: "",
    budgetId: null,
    budgetName: "",
    billId: null,
    billName: "",
    piggyBankId: null,
    piggyBankName: "",
    notes: "",
    tagsText: "",
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const toApiDateString = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}T00:00:00+00:00`;
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

// ---------------------------------------------------------------------------
// Selector Modal
// ---------------------------------------------------------------------------

interface SelectorItem {
  id: string;
  label: string;
  subtitle?: string;
}

interface SelectorModalProps {
  visible: boolean;
  title: string;
  items: SelectorItem[];
  selectedId: string | null;
  onSelect: (id: string, label: string) => void;
  onClose: () => void;
  allowClear?: boolean;
  surfaceColor: string;
  primaryColor: string;
  outlineVariantColor: string;
}

function SelectorModal({
  visible,
  title,
  items,
  selectedId,
  onSelect,
  onClose,
  allowClear = true,
  surfaceColor,
  primaryColor,
  outlineVariantColor,
}: SelectorModalProps) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.trim().toLowerCase();
    return items.filter((i) => i.label.toLowerCase().includes(q));
  }, [items, search]);

  useEffect(() => {
    if (visible) setSearch("");
  }, [visible]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.selectorOverlay} onPress={onClose}>
        <Pressable
          style={[styles.selectorContent, { backgroundColor: surfaceColor }]}
          onPress={(e) => e.stopPropagation()}
        >
          <View
            style={[
              styles.selectorHeader,
              { borderBottomColor: outlineVariantColor },
            ]}
          >
            <Text variant="titleMedium" style={styles.selectorTitle}>
              {title}
            </Text>
            <Button mode="text" compact onPress={onClose}>
              Done
            </Button>
          </View>

          {items.length > 3 && (
            <Searchbar
              placeholder="Search..."
              value={search}
              onChangeText={setSearch}
              style={styles.selectorSearch}
              inputStyle={styles.selectorSearchInput}
            />
          )}

          {allowClear && (
            <List.Item
              title="None"
              titleStyle={
                !selectedId
                  ? { fontWeight: "600", color: primaryColor }
                  : undefined
              }
              onPress={() => {
                onSelect("", "");
                onClose();
              }}
              left={(props) => (
                <List.Icon {...props} icon="close-circle-outline" />
              )}
              right={
                !selectedId
                  ? (props) => (
                      <List.Icon {...props} icon="check" color={primaryColor} />
                    )
                  : undefined
              }
            />
          )}

          {filtered.length === 0 ? (
            <View style={styles.selectorEmpty}>
              <Text variant="bodyMedium">No items found</Text>
            </View>
          ) : (
            <FlatList
              data={filtered}
              keyExtractor={(item) => item.id}
              style={styles.selectorList}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <List.Item
                  title={item.label}
                  description={item.subtitle}
                  descriptionStyle={styles.selectorItemDescription}
                  titleStyle={
                    selectedId === item.id ? { fontWeight: "600" } : undefined
                  }
                  onPress={() => {
                    onSelect(item.id, item.label);
                    onClose();
                  }}
                  right={
                    selectedId === item.id
                      ? (props) => (
                          <List.Icon
                            {...props}
                            icon="check"
                            color={primaryColor}
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
  );
}

// ---------------------------------------------------------------------------
// Main Screen
// ---------------------------------------------------------------------------

export default function CreateTransactionScreen() {
  const theme = useTheme();
  const router = useRouter();
  const navigation = useNavigation();

  // Loading states
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Reference data
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [categories, setCategories] = useState<AutocompleteCategory[]>([]);
  const [subscriptions, setSubscriptions] = useState<
    AutocompleteSubscription[]
  >([]);
  const [piggyBanks, setPiggyBanks] = useState<PiggyBank[]>([]);

  // Shared form state (applies to all splits)
  const [txType, setTxType] = useState<TxType>("withdrawal");
  const [dateStr, setDateStr] = useState(toApiDateString(new Date()));
  const [groupTitle, setGroupTitle] = useState("");

  // Split transactions
  const [splits, setSplits] = useState<SplitState[]>([createEmptySplit()]);

  // Reset form state every time the screen gains focus so that
  // navigating back after a successful create shows a clean form.
  useFocusEffect(
    useCallback(() => {
      setTxType("withdrawal");
      setDateStr(toApiDateString(new Date()));
      setGroupTitle("");
      setSplits([createEmptySplit()]);
      setIsSaving(false);
    }, [])
  );

  // Active selector -- tracks which split index + which field is being edited
  const [activeSelectorSplit, setActiveSelectorSplit] = useState(0);
  const [sourceModalVisible, setSourceModalVisible] = useState(false);
  const [destModalVisible, setDestModalVisible] = useState(false);
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [budgetModalVisible, setBudgetModalVisible] = useState(false);
  const [subscriptionModalVisible, setSubscriptionModalVisible] =
    useState(false);
  const [piggyBankModalVisible, setPiggyBankModalVisible] = useState(false);

  // Date picker
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [datePickerValue, setDatePickerValue] = useState(new Date());

  // ---------------------------------------------------------------------------
  // Derived selector data
  // ---------------------------------------------------------------------------

  const accountItems: SelectorItem[] = useMemo(
    () =>
      accounts.map((a) => {
        const label = `${a.attributes.name} (${a.attributes.currency_code})`;
        const isAsset =
          a.attributes.type?.toLowerCase() === "asset" ||
          a.attributes.type?.toLowerCase() === "cash";
        const subtitle = isAsset
          ? `${a.attributes.currency_symbol ?? ""} ${formatAmount(
              parseFloat(a.attributes.current_balance || "0"),
              a.attributes.currency_decimal_places ?? 2
            )}`
          : undefined;
        return { id: a.id, label, subtitle };
      }),
    [accounts]
  );

  const budgetItems: SelectorItem[] = useMemo(
    () =>
      budgets
        .filter((b) => b.attributes.active)
        .map((b) => ({ id: b.id, label: b.attributes.name })),
    [budgets]
  );

  const categoryItems: SelectorItem[] = useMemo(
    () => categories.map((c) => ({ id: c.id, label: c.name })),
    [categories]
  );

  const subscriptionItems: SelectorItem[] = useMemo(
    () => subscriptions.map((s) => ({ id: s.id, label: s.name })),
    [subscriptions]
  );

  const piggyBankItems: SelectorItem[] = useMemo(
    () =>
      piggyBanks
        .filter((p) => p.attributes.active)
        .map((p) => ({ id: p.id, label: p.attributes.name })),
    [piggyBanks]
  );

  // ---------------------------------------------------------------------------
  // Split helpers
  // ---------------------------------------------------------------------------

  const updateSplit = useCallback(
    (index: number, updates: Partial<SplitState>) => {
      setSplits((prev) =>
        prev.map((s, i) => (i === index ? { ...s, ...updates } : s))
      );
    },
    []
  );

  const addSplit = useCallback(() => {
    setSplits((prev) => [...prev, createEmptySplit()]);
  }, []);

  const removeSplit = useCallback((index: number) => {
    setSplits((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // ---------------------------------------------------------------------------
  // Fetch reference data
  // ---------------------------------------------------------------------------

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      try {
        const [
          accountsResponse,
          budgetsResponse,
          categoriesList,
          subsList,
          piggyBanksResponse,
        ] = await Promise.all([
          apiClient.getAllAccounts("all").catch(() => null),
          apiClient.getAllBudgets().catch(() => null),
          apiClient
            .getAutocompleteCategories()
            .catch(() => [] as AutocompleteCategory[]),
          apiClient
            .getAutocompleteSubscriptions()
            .catch(() => [] as AutocompleteSubscription[]),
          apiClient.getPiggyBanks(1).catch(() => null),
        ]);

        const accts = accountsResponse?.data;
        setAccounts(Array.isArray(accts) ? accts : []);
        const bdgts = budgetsResponse?.data;
        setBudgets(Array.isArray(bdgts) ? bdgts : []);
        setCategories(Array.isArray(categoriesList) ? categoriesList : []);
        setSubscriptions(Array.isArray(subsList) ? subsList : []);
        const pbs = piggyBanksResponse?.data;
        setPiggyBanks(Array.isArray(pbs) ? pbs : []);

        navigation.setOptions({ title: "Create Transaction" });
      } catch (error) {
        console.error("Failed to fetch reference data:", error);
        Alert.alert("Error", "Failed to load form data");
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, [navigation]);

  // ---------------------------------------------------------------------------
  // Navigation: back button
  // ---------------------------------------------------------------------------

  useEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <Pressable
          onPress={() => router.replace(TRANSACTIONS_ROUTE)}
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
      router.replace(TRANSACTIONS_ROUTE);
      return true;
    });
    return () => sub.remove();
  }, [router]);

  // ---------------------------------------------------------------------------
  // Save handler
  // ---------------------------------------------------------------------------

  const handleSave = useCallback(async () => {
    // Validate each split
    for (let i = 0; i < splits.length; i++) {
      const s = splits[i];
      if (!s.description.trim()) {
        Alert.alert(
          "Error",
          splits.length > 1
            ? `Description is required for Split ${i + 1}`
            : "Description is required"
        );
        return;
      }
      if (!s.amount.trim() || isNaN(parseFloat(s.amount))) {
        Alert.alert(
          "Error",
          splits.length > 1
            ? `A valid amount is required for Split ${i + 1}`
            : "A valid amount is required"
        );
        return;
      }
    }

    setIsSaving(true);
    try {
      const transactionSplits = splits.map((s) => {
        const tags = s.tagsText
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean);
        return {
          type: txType,
          date: dateStr || toApiDateString(new Date()),
          amount: s.amount.trim(),
          description: s.description.trim(),
          source_id: s.sourceId || undefined,
          destination_id: s.destinationId || undefined,
          category_id: s.categoryId || undefined,
          category_name: s.categoryName || undefined,
          budget_id: s.budgetId || undefined,
          bill_id: s.billId || undefined,
          piggy_bank_id: s.piggyBankId
            ? parseInt(s.piggyBankId, 10)
            : undefined,
          notes: s.notes.trim() || null,
          tags: tags.length > 0 ? tags : null,
        };
      });

      const body: CreateTransactionData = {
        apply_rules: true,
        fire_webhooks: true,
        group_title:
          splits.length > 1 ? groupTitle.trim() || undefined : undefined,
        transactions: transactionSplits,
      };

      await apiClient.createTransaction(body);

      // Remove cached transaction list pages so the list refetches fresh
      queryClient.removeQueries({ queryKey: ["transactions"] });

      Alert.alert("Success", "Transaction created successfully", [
        { text: "OK", onPress: () => router.replace(TRANSACTIONS_ROUTE) },
      ]);
    } catch (error) {
      console.error("Failed to create transaction:", error);
      const message =
        error instanceof Error ? error.message : "Failed to create transaction";
      Alert.alert("Error", message);
    } finally {
      setIsSaving(false);
    }
  }, [splits, txType, dateStr, groupTitle, router]);

  // Check if save is disabled
  const isSaveDisabled = useMemo(() => {
    if (isSaving) return true;
    return splits.some((s) => !s.description.trim() || !s.amount.trim());
  }, [isSaving, splits]);

  // ---------------------------------------------------------------------------
  // Loading state
  // ---------------------------------------------------------------------------

  if (isLoading) {
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
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ---- Transaction Type ---- */}
          <GlassCard variant="elevated" style={styles.card}>
            <Card.Title
              title="Transaction Type"
              left={() => (
                <MaterialCommunityIcons
                  name="swap-horizontal"
                  size={24}
                  color={theme.colors.primary}
                />
              )}
            />
            <Card.Content>
              <View style={styles.chipsContainer}>
                {TX_TYPE_OPTIONS.map((opt) => {
                  const selected = txType === opt.value;
                  const iconColor = selected
                    ? theme.colors.onPrimaryContainer
                    : theme.colors.onSurfaceVariant;
                  return (
                    <Chip
                      key={opt.value}
                      selected={selected}
                      showSelectedOverlay
                      onPress={() => setTxType(opt.value)}
                      icon={() => (
                        <MaterialCommunityIcons
                          name={
                            opt.icon as keyof typeof MaterialCommunityIcons.glyphMap
                          }
                          size={18}
                          color={iconColor}
                        />
                      )}
                      style={[
                        styles.chip,
                        selected && {
                          backgroundColor: theme.colors.primaryContainer,
                          borderColor: theme.colors.primary,
                        },
                      ]}
                      textStyle={[
                        styles.chipText,
                        {
                          color: selected
                            ? theme.colors.onPrimaryContainer
                            : theme.colors.onSurfaceVariant,
                        },
                      ]}
                    >
                      {opt.label}
                    </Chip>
                  );
                })}
              </View>
            </Card.Content>
          </GlassCard>

          {/* ---- Date ---- */}
          <GlassCard variant="elevated" style={styles.card}>
            <Card.Title
              title="Date"
              left={() => (
                <MaterialCommunityIcons
                  name="calendar"
                  size={24}
                  color={theme.colors.primary}
                />
              )}
            />
            <Card.Content>
              <Pressable
                onPress={() => {
                  const initial = parseApiDate(dateStr) ?? new Date();
                  setDatePickerValue(initial);
                  setDatePickerOpen(true);
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
                      styles.fieldText,
                      {
                        color: dateStr
                          ? theme.colors.onSurface
                          : theme.colors.onSurfaceVariant,
                      },
                    ]}
                  >
                    {dateStr ? formatDateDisplay(dateStr) : "Select date"}
                  </Text>
                </View>
                <MaterialCommunityIcons
                  name="chevron-down"
                  size={24}
                  color={theme.colors.onSurfaceVariant}
                />
              </Pressable>

              {datePickerOpen && Platform.OS === "android" && (
                <DateTimePicker
                  value={datePickerValue}
                  mode="date"
                  display="default"
                  onChange={(event, selectedDate) => {
                    setDatePickerOpen(false);
                    if (event.type === "set" && selectedDate) {
                      setDateStr(toApiDateString(selectedDate));
                    }
                  }}
                />
              )}
              {datePickerOpen && Platform.OS === "ios" && (
                <Modal
                  visible
                  transparent
                  animationType="slide"
                  onRequestClose={() => setDatePickerOpen(false)}
                >
                  <Pressable
                    style={styles.datePickerOverlay}
                    onPress={() => setDatePickerOpen(false)}
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
                          onPress={() => setDatePickerOpen(false)}
                        >
                          Cancel
                        </Button>
                        <Text
                          variant="titleMedium"
                          style={styles.datePickerTitle}
                        >
                          Transaction Date
                        </Text>
                        <Button
                          mode="text"
                          compact
                          onPress={() => {
                            setDateStr(toApiDateString(datePickerValue));
                            setDatePickerOpen(false);
                          }}
                        >
                          Done
                        </Button>
                      </View>
                      <DateTimePicker
                        value={datePickerValue}
                        mode="date"
                        display="spinner"
                        onChange={(_, selectedDate) => {
                          if (selectedDate) setDatePickerValue(selectedDate);
                        }}
                        style={styles.datePickerIOS}
                      />
                    </View>
                  </Pressable>
                </Modal>
              )}
            </Card.Content>
          </GlassCard>

          {/* ---- Group Title (only for split transactions) ---- */}
          {splits.length > 1 && (
            <GlassCard variant="elevated" style={styles.card}>
              <Card.Title
                title="Split Transaction"
                left={() => (
                  <MaterialCommunityIcons
                    name="call-split"
                    size={24}
                    color={theme.colors.primary}
                  />
                )}
              />
              <Card.Content>
                <TextInput
                  label="Group Title"
                  value={groupTitle}
                  onChangeText={setGroupTitle}
                  mode="outlined"
                  style={styles.input}
                  placeholder="e.g. Grocery shopping"
                />
              </Card.Content>
            </GlassCard>
          )}

          {/* ---- Transaction Splits ---- */}
          {splits.map((split, idx) => (
            <GlassCard
              key={`split-${idx}`}
              variant="elevated"
              style={styles.card}
            >
              <Card.Title
                title={
                  splits.length > 1
                    ? `Split ${idx + 1}${split.description ? ` — ${split.description}` : ""}`
                    : "Transaction Details"
                }
                left={() => (
                  <MaterialCommunityIcons
                    name={splits.length > 1 ? "numeric" : "information"}
                    size={24}
                    color={theme.colors.primary}
                  />
                )}
                right={
                  splits.length > 1
                    ? () => (
                        <IconButton
                          icon="close-circle"
                          size={20}
                          onPress={() => removeSplit(idx)}
                          iconColor={theme.colors.error}
                        />
                      )
                    : undefined
                }
              />
              <Card.Content>
                <TextInput
                  label="Description *"
                  value={split.description}
                  onChangeText={(v) => updateSplit(idx, { description: v })}
                  mode="outlined"
                  style={styles.input}
                />

                <TextInput
                  label="Amount *"
                  value={split.amount}
                  onChangeText={(v) => updateSplit(idx, { amount: v })}
                  mode="outlined"
                  style={styles.input}
                  keyboardType="decimal-pad"
                />

                <Divider style={styles.splitDivider} />

                {/* Source Account */}
                <Text
                  variant="bodySmall"
                  style={[
                    styles.fieldLabel,
                    { color: theme.colors.onSurfaceVariant },
                  ]}
                >
                  Source Account
                </Text>
                <Pressable
                  onPress={() => {
                    setActiveSelectorSplit(idx);
                    setSourceModalVisible(true);
                  }}
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
                    style={{
                      flex: 1,
                      color: split.sourceId
                        ? theme.colors.onSurface
                        : theme.colors.onSurfaceVariant,
                    }}
                    numberOfLines={1}
                  >
                    {split.sourceName || "Select source account"}
                  </Text>
                  <MaterialCommunityIcons
                    name="chevron-down"
                    size={24}
                    color={theme.colors.onSurfaceVariant}
                  />
                </Pressable>

                {/* Destination Account */}
                <Text
                  variant="bodySmall"
                  style={[
                    styles.fieldLabel,
                    { color: theme.colors.onSurfaceVariant },
                  ]}
                >
                  Destination Account
                </Text>
                <Pressable
                  onPress={() => {
                    setActiveSelectorSplit(idx);
                    setDestModalVisible(true);
                  }}
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
                    style={{
                      flex: 1,
                      color: split.destinationId
                        ? theme.colors.onSurface
                        : theme.colors.onSurfaceVariant,
                    }}
                    numberOfLines={1}
                  >
                    {split.destinationName || "Select destination account"}
                  </Text>
                  <MaterialCommunityIcons
                    name="chevron-down"
                    size={24}
                    color={theme.colors.onSurfaceVariant}
                  />
                </Pressable>

                <Divider style={styles.splitDivider} />

                {/* Category */}
                <Text
                  variant="bodySmall"
                  style={[
                    styles.fieldLabel,
                    { color: theme.colors.onSurfaceVariant },
                  ]}
                >
                  Category
                </Text>
                <Pressable
                  onPress={() => {
                    setActiveSelectorSplit(idx);
                    setCategoryModalVisible(true);
                  }}
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
                    style={{
                      flex: 1,
                      color: split.categoryId
                        ? theme.colors.onSurface
                        : theme.colors.onSurfaceVariant,
                    }}
                    numberOfLines={1}
                  >
                    {split.categoryName || "Select category"}
                  </Text>
                  <MaterialCommunityIcons
                    name="chevron-down"
                    size={24}
                    color={theme.colors.onSurfaceVariant}
                  />
                </Pressable>

                {/* Budget */}
                <Text
                  variant="bodySmall"
                  style={[
                    styles.fieldLabel,
                    { color: theme.colors.onSurfaceVariant },
                  ]}
                >
                  Budget
                </Text>
                <Pressable
                  onPress={() => {
                    setActiveSelectorSplit(idx);
                    setBudgetModalVisible(true);
                  }}
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
                    style={{
                      flex: 1,
                      color: split.budgetId
                        ? theme.colors.onSurface
                        : theme.colors.onSurfaceVariant,
                    }}
                    numberOfLines={1}
                  >
                    {split.budgetName || "Select budget"}
                  </Text>
                  <MaterialCommunityIcons
                    name="chevron-down"
                    size={24}
                    color={theme.colors.onSurfaceVariant}
                  />
                </Pressable>

                {/* Subscription / Bill */}
                {subscriptionItems.length > 0 && (
                  <>
                    <Text
                      variant="bodySmall"
                      style={[
                        styles.fieldLabel,
                        { color: theme.colors.onSurfaceVariant },
                      ]}
                    >
                      Subscription / Bill
                    </Text>
                    <Pressable
                      onPress={() => {
                        setActiveSelectorSplit(idx);
                        setSubscriptionModalVisible(true);
                      }}
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
                        style={{
                          flex: 1,
                          color: split.billId
                            ? theme.colors.onSurface
                            : theme.colors.onSurfaceVariant,
                        }}
                        numberOfLines={1}
                      >
                        {split.billName || "Select subscription"}
                      </Text>
                      <MaterialCommunityIcons
                        name="chevron-down"
                        size={24}
                        color={theme.colors.onSurfaceVariant}
                      />
                    </Pressable>
                  </>
                )}

                {/* Piggy Bank (only for withdrawals) */}
                {txType === "withdrawal" && piggyBankItems.length > 0 && (
                  <>
                    <Text
                      variant="bodySmall"
                      style={[
                        styles.fieldLabel,
                        { color: theme.colors.onSurfaceVariant },
                      ]}
                    >
                      Piggy Bank
                    </Text>
                    <Pressable
                      onPress={() => {
                        setActiveSelectorSplit(idx);
                        setPiggyBankModalVisible(true);
                      }}
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
                        style={{
                          flex: 1,
                          color: split.piggyBankId
                            ? theme.colors.onSurface
                            : theme.colors.onSurfaceVariant,
                        }}
                        numberOfLines={1}
                      >
                        {split.piggyBankName || "Select piggy bank"}
                      </Text>
                      <MaterialCommunityIcons
                        name="chevron-down"
                        size={24}
                        color={theme.colors.onSurfaceVariant}
                      />
                    </Pressable>
                  </>
                )}

                {/* Tags */}
                <TextInput
                  label="Tags (comma-separated)"
                  value={split.tagsText}
                  onChangeText={(v) => updateSplit(idx, { tagsText: v })}
                  mode="outlined"
                  style={styles.input}
                  placeholder="e.g. groceries, weekly"
                />

                {/* Notes */}
                <TextInput
                  label="Notes"
                  value={split.notes}
                  onChangeText={(v) => updateSplit(idx, { notes: v })}
                  mode="outlined"
                  style={styles.input}
                  multiline
                  numberOfLines={3}
                  placeholder="Add any notes..."
                />
              </Card.Content>
            </GlassCard>
          ))}

          {/* ---- Add Split Button ---- */}
          <Button
            mode="outlined"
            onPress={addSplit}
            icon="plus"
            style={styles.addSplitButton}
          >
            Add Split
          </Button>

          {/* ---- Save / Cancel Buttons ---- */}
          <View style={styles.buttonContainer}>
            <Button
              mode="contained"
              onPress={handleSave}
              loading={isSaving}
              disabled={isSaveDisabled}
              style={styles.saveButton}
              contentStyle={styles.saveButtonContent}
              icon="plus-circle"
            >
              Create Transaction
            </Button>

            <Button
              mode="outlined"
              onPress={() => router.replace(TRANSACTIONS_ROUTE)}
              disabled={isSaving}
              style={styles.cancelButton}
            >
              Cancel
            </Button>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ---- Selector Modals ---- */}
      <SelectorModal
        visible={sourceModalVisible}
        title="Select Source Account"
        items={accountItems}
        selectedId={splits[activeSelectorSplit]?.sourceId ?? null}
        onSelect={(selId, label) => {
          updateSplit(activeSelectorSplit, {
            sourceId: selId || null,
            sourceName: label,
          });
        }}
        onClose={() => setSourceModalVisible(false)}
        surfaceColor={theme.colors.surface}
        primaryColor={theme.colors.primary}
        outlineVariantColor={theme.colors.outlineVariant}
      />

      <SelectorModal
        visible={destModalVisible}
        title="Select Destination Account"
        items={accountItems}
        selectedId={splits[activeSelectorSplit]?.destinationId ?? null}
        onSelect={(selId, label) => {
          updateSplit(activeSelectorSplit, {
            destinationId: selId || null,
            destinationName: label,
          });
        }}
        onClose={() => setDestModalVisible(false)}
        surfaceColor={theme.colors.surface}
        primaryColor={theme.colors.primary}
        outlineVariantColor={theme.colors.outlineVariant}
      />

      <SelectorModal
        visible={categoryModalVisible}
        title="Select Category"
        items={categoryItems}
        selectedId={splits[activeSelectorSplit]?.categoryId ?? null}
        onSelect={(selId, label) => {
          updateSplit(activeSelectorSplit, {
            categoryId: selId || null,
            categoryName: label,
          });
        }}
        onClose={() => setCategoryModalVisible(false)}
        surfaceColor={theme.colors.surface}
        primaryColor={theme.colors.primary}
        outlineVariantColor={theme.colors.outlineVariant}
      />

      <SelectorModal
        visible={budgetModalVisible}
        title="Select Budget"
        items={budgetItems}
        selectedId={splits[activeSelectorSplit]?.budgetId ?? null}
        onSelect={(selId, label) => {
          updateSplit(activeSelectorSplit, {
            budgetId: selId || null,
            budgetName: label,
          });
        }}
        onClose={() => setBudgetModalVisible(false)}
        surfaceColor={theme.colors.surface}
        primaryColor={theme.colors.primary}
        outlineVariantColor={theme.colors.outlineVariant}
      />

      <SelectorModal
        visible={subscriptionModalVisible}
        title="Select Subscription"
        items={subscriptionItems}
        selectedId={splits[activeSelectorSplit]?.billId ?? null}
        onSelect={(selId, label) => {
          updateSplit(activeSelectorSplit, {
            billId: selId || null,
            billName: label,
          });
        }}
        onClose={() => setSubscriptionModalVisible(false)}
        surfaceColor={theme.colors.surface}
        primaryColor={theme.colors.primary}
        outlineVariantColor={theme.colors.outlineVariant}
      />

      <SelectorModal
        visible={piggyBankModalVisible}
        title="Select Piggy Bank"
        items={piggyBankItems}
        selectedId={splits[activeSelectorSplit]?.piggyBankId ?? null}
        onSelect={(selId, label) => {
          updateSplit(activeSelectorSplit, {
            piggyBankId: selId || null,
            piggyBankName: label,
          });
        }}
        onClose={() => setPiggyBankModalVisible(false)}
        surfaceColor={theme.colors.surface}
        primaryColor={theme.colors.primary}
        outlineVariantColor={theme.colors.outlineVariant}
      />
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
  card: {
    marginBottom: 16,
  },
  input: {
    marginBottom: 12,
  },
  chipsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 8,
  },
  chip: {
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    backgroundColor: "transparent",
  },
  chipText: {
    fontSize: 13,
    fontWeight: "500",
    letterSpacing: 0.15,
  },
  fieldLabel: {
    marginTop: 4,
    marginBottom: 8,
    letterSpacing: 0.2,
  },
  fieldTouchable: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderRadius: 4,
  },
  fieldContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 12,
  },
  fieldText: {
    flex: 1,
  },
  splitDivider: {
    marginVertical: 12,
  },
  addSplitButton: {
    marginBottom: 16,
    borderRadius: 12,
  },
  buttonContainer: {
    gap: 12,
    marginTop: 8,
  },
  saveButton: {
    borderRadius: 12,
  },
  saveButtonContent: {
    paddingVertical: 8,
  },
  cancelButton: {
    borderRadius: 12,
  },
  // Selector Modal styles
  selectorOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  selectorContent: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: "70%",
    minHeight: 200,
  },
  selectorHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  selectorTitle: {
    fontWeight: "600",
  },
  selectorSearch: {
    marginHorizontal: 12,
    marginTop: 8,
    elevation: 0,
  },
  selectorSearchInput: {
    fontSize: 14,
  },
  selectorEmpty: {
    padding: 24,
    alignItems: "center",
  },
  selectorItemDescription: {
    fontSize: 12,
    opacity: 0.7,
  },
  selectorList: {
    maxHeight: 350,
  },
  // Date picker modal styles
  datePickerOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  datePickerContent: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 34,
  },
  datePickerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  datePickerTitle: {
    flex: 1,
    textAlign: "center",
  },
  datePickerIOS: {
    alignSelf: "center",
  },
});
