// Edit Transaction Screen
import { GlassCard } from "@/components/glass-card";
import { apiClient } from "@/lib/api-client";
import { formatAmount } from "@/lib/format-currency";
import { queryClient } from "@/lib/query-client";
import type {
  Account,
  AccountTransaction,
  AccountTransactionGroup,
  AutocompleteCategory,
  AutocompleteSubscription,
  Budget,
  FireflyApiResponse,
  TransactionUpdateData,
} from "@/types";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import {
  useLocalSearchParams,
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
// Helpers
// ---------------------------------------------------------------------------

/** Convert a Date to API format YYYY-MM-DDT00:00:00+00:00 */
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
// Selector Modal (accounts, budgets, categories, subscriptions)
// ---------------------------------------------------------------------------

interface SelectorItem {
  id: string;
  label: string;
  /** Optional subtitle (e.g. balance for accounts) */
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

  // Reset search when opening
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

export default function EditTransactionScreen() {
  const theme = useTheme();
  const router = useRouter();
  const navigation = useNavigation();
  const { id, accountId, accountName } = useLocalSearchParams<{
    id: string;
    accountId?: string;
    accountName?: string;
  }>();

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

  // Original transaction
  const [originalTx, setOriginalTx] = useState<AccountTransaction | null>(null);
  const [journalId, setJournalId] = useState("");

  // Form state
  const [txType, setTxType] = useState<TxType>("withdrawal");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [dateStr, setDateStr] = useState("");
  const [sourceId, setSourceId] = useState<string | null>(null);
  const [sourceName, setSourceName] = useState("");
  const [destinationId, setDestinationId] = useState<string | null>(null);
  const [destinationName, setDestinationName] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [categoryName, setCategoryName] = useState("");
  const [budgetId, setBudgetId] = useState<string | null>(null);
  const [budgetName, setBudgetName] = useState("");
  const [subscriptionId, setSubscriptionId] = useState<string | null>(null);
  const [subscriptionName, setSubscriptionName] = useState("");
  const [notes, setNotes] = useState("");
  const [tagsText, setTagsText] = useState("");

  // Selector modals
  const [sourceModalVisible, setSourceModalVisible] = useState(false);
  const [destModalVisible, setDestModalVisible] = useState(false);
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [budgetModalVisible, setBudgetModalVisible] = useState(false);
  const [subscriptionModalVisible, setSubscriptionModalVisible] =
    useState(false);

  // Date picker
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [datePickerValue, setDatePickerValue] = useState(new Date());

  // ---------------------------------------------------------------------------
  // Dynamic route for navigation based on account context
  // ---------------------------------------------------------------------------

  const backRoute = useMemo(() => {
    if (accountId && accountName) {
      return `${TRANSACTIONS_ROUTE}?accountId=${accountId}&accountName=${accountName}` as Href;
    }
    return TRANSACTIONS_ROUTE;
  }, [accountId, accountName]);

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

  // ---------------------------------------------------------------------------
  // Fetch data
  // ---------------------------------------------------------------------------

  useEffect(() => {
    async function fetchData() {
      if (!id) return;
      setIsLoading(true);
      try {
        const [
          txResponse,
          accountsResponse,
          budgetsResponse,
          categoriesList,
          subsList,
        ] = await Promise.all([
          apiClient.getTransaction(id),
          apiClient.getAllAccounts("all").catch(() => null),
          apiClient.getAllBudgets().catch(() => null),
          apiClient
            .getAutocompleteCategories()
            .catch(() => [] as AutocompleteCategory[]),
          apiClient
            .getAutocompleteSubscriptions()
            .catch(() => [] as AutocompleteSubscription[]),
        ]);

        // Set reference data — getAllAccounts / getAllBudgets return
        // FireflyApiResponse wrappers ({ data: [...] }), not flat arrays.
        const accts = accountsResponse?.data;
        setAccounts(Array.isArray(accts) ? accts : []);
        const bdgts = budgetsResponse?.data;
        setBudgets(Array.isArray(bdgts) ? bdgts : []);
        setCategories(Array.isArray(categoriesList) ? categoriesList : []);
        setSubscriptions(Array.isArray(subsList) ? subsList : []);

        // Parse transaction
        const group = (txResponse as FireflyApiResponse<any>).data;
        const tx: AccountTransaction | undefined =
          group?.attributes?.transactions?.[0];

        if (!tx) {
          Alert.alert("Error", "Transaction not found");
          router.replace(backRoute);
          return;
        }

        setOriginalTx(tx);
        setJournalId(tx.transaction_journal_id || "");

        // Populate form
        const typeLower = tx.type?.toLowerCase();
        if (
          typeLower === "withdrawal" ||
          typeLower === "deposit" ||
          typeLower === "transfer"
        ) {
          setTxType(typeLower as TxType);
        }
        setDescription(tx.description || "");
        setAmount(tx.amount ? String(Math.abs(parseFloat(tx.amount))) : "");
        setDateStr(tx.date || "");
        setSourceId(tx.source_id || null);
        setSourceName(tx.source_name || "");
        setDestinationId(tx.destination_id || null);
        setDestinationName(tx.destination_name || "");
        setCategoryId(tx.category_id || null);
        setCategoryName(tx.category_name || "");
        setBudgetId(tx.budget_id || null);
        setBudgetName(tx.budget_name || "");
        setSubscriptionId(tx.bill_id || tx.subscription_id || null);
        setSubscriptionName(tx.bill_name || tx.subscription_name || "");
        setNotes(tx.notes || "");
        setTagsText(tx.tags && tx.tags.length > 0 ? tx.tags.join(", ") : "");

        navigation.setOptions({
          title: `Edit: ${tx.description || "Transaction"}`,
        });
      } catch (error) {
        console.error("Failed to fetch transaction:", error);
        Alert.alert("Error", "Failed to load transaction details");
        router.replace(backRoute);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, [id, navigation, router, backRoute]);

  // ---------------------------------------------------------------------------
  // Navigation: back button
  // ---------------------------------------------------------------------------

  useEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <Pressable
          onPress={() => router.replace(backRoute)}
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
  }, [navigation, router, theme.colors.onSurface, backRoute]);

  useEffect(() => {
    if (Platform.OS !== "android") return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      router.replace(backRoute);
      return true;
    });
    return () => sub.remove();
  }, [router, backRoute]);

  // ---------------------------------------------------------------------------
  // Save handler
  // ---------------------------------------------------------------------------

  const handleSave = useCallback(async () => {
    if (!id) return;

    if (!description.trim()) {
      Alert.alert("Error", "Description is required");
      return;
    }
    if (!amount.trim() || isNaN(parseFloat(amount))) {
      Alert.alert("Error", "A valid amount is required");
      return;
    }

    setIsSaving(true);
    try {
      const tags =
        tagsText
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean) || null;

      const body: TransactionUpdateData = {
        apply_rules: true,
        fire_webhooks: true,
        transactions: [
          {
            transaction_journal_id: journalId || undefined,
            type: txType,
            date: dateStr || toApiDateString(new Date()),
            amount: amount.trim(),
            description: description.trim(),
            source_id: sourceId || undefined,
            destination_id: destinationId || undefined,
            category_id: categoryId || undefined,
            category_name: categoryName || undefined,
            budget_id: budgetId || undefined,
            bill_id: subscriptionId || undefined,
            notes: notes.trim() || null,
            tags: tags.length > 0 ? tags : null,
          },
        ],
      };

      const response = await apiClient.updateTransaction(id, body);
      const updatedGroup = response.data;

      // Update the single-transaction detail cache immediately
      queryClient.setQueryData<FireflyApiResponse<AccountTransactionGroup>>(
        ["transaction", id],
        (old) => {
          if (!old) return old;
          return { ...old, data: updatedGroup };
        }
      );

      // Remove all cached infinite-query pages for transactions list.
      // This forces useInfiniteQuery to do a fresh fetch when list
      // screen becomes active again, guaranteeing fresh data is displayed.
      queryClient.removeQueries({ queryKey: ["transactions"] });

      // Also remove account transactions cache if we're coming from account context
      if (accountId) {
        queryClient.removeQueries({
          queryKey: ["accountTransactions", accountId],
        });
      }

      Alert.alert("Success", "Transaction updated successfully", [
        {
          text: "OK",
          onPress: () => router.replace(backRoute),
        },
      ]);
    } catch (error) {
      console.error("Failed to update transaction:", error);
      const message =
        error instanceof Error ? error.message : "Failed to update transaction";
      Alert.alert("Error", message);
    } finally {
      setIsSaving(false);
    }
  }, [
    id,
    description,
    amount,
    txType,
    dateStr,
    sourceId,
    destinationId,
    categoryId,
    categoryName,
    budgetId,
    subscriptionId,
    notes,
    tagsText,
    journalId,
    router,
    backRoute,
    accountId,
  ]);

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
        <Text style={{ marginTop: 16 }}>Loading transaction...</Text>
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

          {/* ---- Basic Details ---- */}
          <GlassCard variant="elevated" style={styles.card}>
            <Card.Title
              title="Details"
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
                label="Description *"
                value={description}
                onChangeText={setDescription}
                mode="outlined"
                style={styles.input}
                error={!description.trim()}
              />

              <TextInput
                label="Amount *"
                value={amount}
                onChangeText={setAmount}
                mode="outlined"
                style={styles.input}
                keyboardType="decimal-pad"
                left={
                  <TextInput.Affix text={originalTx?.currency_symbol || "$"} />
                }
                error={!amount.trim() || isNaN(parseFloat(amount))}
              />

              {/* Date picker field */}
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

              {/* Android native date picker */}
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
              {/* iOS modal date picker */}
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

          {/* ---- Accounts ---- */}
          <GlassCard variant="elevated" style={styles.card}>
            <Card.Title
              title="Accounts"
              left={() => (
                <MaterialCommunityIcons
                  name="bank-transfer"
                  size={24}
                  color={theme.colors.primary}
                />
              )}
            />
            <Card.Content>
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
                onPress={() => setSourceModalVisible(true)}
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
                    color: sourceId
                      ? theme.colors.onSurface
                      : theme.colors.onSurfaceVariant,
                  }}
                  numberOfLines={1}
                >
                  {sourceName || "Select source account"}
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
                onPress={() => setDestModalVisible(true)}
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
                    color: destinationId
                      ? theme.colors.onSurface
                      : theme.colors.onSurfaceVariant,
                  }}
                  numberOfLines={1}
                >
                  {destinationName || "Select destination account"}
                </Text>
                <MaterialCommunityIcons
                  name="chevron-down"
                  size={24}
                  color={theme.colors.onSurfaceVariant}
                />
              </Pressable>
            </Card.Content>
          </GlassCard>

          {/* ---- Categorization ---- */}
          <GlassCard variant="elevated" style={styles.card}>
            <Card.Title
              title="Categorization"
              left={() => (
                <MaterialCommunityIcons
                  name="tag-outline"
                  size={24}
                  color={theme.colors.primary}
                />
              )}
            />
            <Card.Content>
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
                onPress={() => setCategoryModalVisible(true)}
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
                    color: categoryId
                      ? theme.colors.onSurface
                      : theme.colors.onSurfaceVariant,
                  }}
                  numberOfLines={1}
                >
                  {categoryName || "Select category"}
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
                onPress={() => setBudgetModalVisible(true)}
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
                    color: budgetId
                      ? theme.colors.onSurface
                      : theme.colors.onSurfaceVariant,
                  }}
                  numberOfLines={1}
                >
                  {budgetName || "Select budget"}
                </Text>
                <MaterialCommunityIcons
                  name="chevron-down"
                  size={24}
                  color={theme.colors.onSurfaceVariant}
                />
              </Pressable>

              {/* Subscription (only shown if subscriptions exist) */}
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
                    onPress={() => setSubscriptionModalVisible(true)}
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
                        color: subscriptionId
                          ? theme.colors.onSurface
                          : theme.colors.onSurfaceVariant,
                      }}
                      numberOfLines={1}
                    >
                      {subscriptionName || "Select subscription"}
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
                value={tagsText}
                onChangeText={setTagsText}
                mode="outlined"
                style={styles.input}
                placeholder="e.g. groceries, weekly"
              />
            </Card.Content>
          </GlassCard>

          {/* ---- Notes ---- */}
          <GlassCard variant="elevated" style={styles.card}>
            <Card.Title
              title="Notes"
              left={() => (
                <MaterialCommunityIcons
                  name="note-text"
                  size={24}
                  color={theme.colors.primary}
                />
              )}
            />
            <Card.Content>
              <TextInput
                label="Notes"
                value={notes}
                onChangeText={setNotes}
                mode="outlined"
                style={styles.input}
                multiline
                numberOfLines={4}
                placeholder="Add any notes..."
              />
            </Card.Content>
          </GlassCard>

          {/* ---- Save / Cancel Buttons ---- */}
          <View style={styles.buttonContainer}>
            <Button
              mode="contained"
              onPress={handleSave}
              loading={isSaving}
              disabled={isSaving || !description.trim() || !amount.trim()}
              style={styles.saveButton}
              contentStyle={styles.saveButtonContent}
              icon="content-save"
            >
              Save Changes
            </Button>

            <Button
              mode="outlined"
              onPress={() => router.replace(backRoute)}
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
        selectedId={sourceId}
        onSelect={(selId, label) => {
          setSourceId(selId || null);
          setSourceName(label);
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
        selectedId={destinationId}
        onSelect={(selId, label) => {
          setDestinationId(selId || null);
          setDestinationName(label);
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
        selectedId={categoryId}
        onSelect={(selId, label) => {
          setCategoryId(selId || null);
          setCategoryName(label);
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
        selectedId={budgetId}
        onSelect={(selId, label) => {
          setBudgetId(selId || null);
          setBudgetName(label);
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
        selectedId={subscriptionId}
        onSelect={(selId, label) => {
          setSubscriptionId(selId || null);
          setSubscriptionName(label);
        }}
        onClose={() => setSubscriptionModalVisible(false)}
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
