// Edit Account Screen
import { GlassCard } from "@/components/glass-card";
import { apiClient } from "@/lib/api-client";
import { queryClient } from "@/lib/query-client";
import { useStore } from "@/lib/store";
import type {
  Account,
  AccountRole,
  AccountUpdateRequestBody,
  CreditCardType,
  FireflyApiResponse,
  LiabilityType,
  UserCurrenciesList,
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
  Divider,
  List,
  Switch,
  Text,
  TextInput,
  useTheme,
} from "react-native-paper";

const ACCOUNTS_ROUTE = "/(drawer)/accounts" as Href;

// Account role options for asset accounts
const ACCOUNT_ROLE_OPTIONS: { value: AccountRole; label: string }[] = [
  { value: "defaultAsset", label: "Default Asset" },
  { value: "sharedAsset", label: "Shared Asset" },
  { value: "savingAsset", label: "Savings" },
  { value: "ccAsset", label: "Credit Card" },
  { value: "cashWalletAsset", label: "Cash Wallet" },
];

// Credit card type options
const CREDIT_CARD_TYPE_OPTIONS: { value: CreditCardType; label: string }[] = [
  { value: "monthlyFull", label: "Monthly Full" },
];

// Liability type options
const LIABILITY_TYPE_OPTIONS: { value: LiabilityType; label: string }[] = [
  { value: "loan", label: "Loan" },
  { value: "debt", label: "Debt" },
  { value: "mortgage", label: "Mortgage" },
];

// Interest period options
const INTEREST_PERIOD_OPTIONS = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "half-year", label: "Half Year" },
  { value: "yearly", label: "Yearly" },
];

type AccountType =
  | "asset"
  | "expense"
  | "revenue"
  | "liability"
  | "liabilities";

/** API expects ISO 8601 date-time e.g. 2026-01-01T00:00:00+00:00 */
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

export default function EditAccountScreen() {
  const theme = useTheme();
  const router = useRouter();
  const navigation = useNavigation();
  const { id } = useLocalSearchParams<{ id: string }>();

  // Loading states
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Original account data
  const [account, setAccount] = useState<Account | null>(null);

  // User currencies for dropdown (from getUserCurrencies)
  const [userCurrencies, setUserCurrencies] = useState<UserCurrenciesList[]>(
    []
  );
  const [currencyMenuVisible, setCurrencyMenuVisible] = useState(false);
  const [creditCardTypeMenuVisible, setCreditCardTypeMenuVisible] =
    useState(false);

  // Form state
  const [name, setName] = useState("");
  const [iban, setIban] = useState("");
  const [bic, setBic] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [openingBalance, setOpeningBalance] = useState("");
  const [openingBalanceDate, setOpeningBalanceDate] = useState("");
  const [virtualBalance, setVirtualBalance] = useState("");
  const [currencyCode, setCurrencyCode] = useState("");
  const [active, setActive] = useState(true);
  const [includeNetWorth, setIncludeNetWorth] = useState(true);
  const [notes, setNotes] = useState("");

  // Asset-specific fields
  const [accountRole, setAccountRole] = useState<AccountRole>("defaultAsset");

  // Credit card fields
  const [creditCardType, setCreditCardType] =
    useState<CreditCardType>("monthlyFull");
  const [monthlyPaymentDate, setMonthlyPaymentDate] = useState("");

  // Date picker: which field is open (null = closed)
  const [datePickerOpen, setDatePickerOpen] = useState<
    "openingBalance" | "monthlyPayment" | null
  >(null);
  const [datePickerValue, setDatePickerValue] = useState(new Date());

  // Liability fields
  const [liabilityType, setLiabilityType] = useState<LiabilityType>("loan");
  const [interest, setInterest] = useState("");
  const [interestPeriod, setInterestPeriod] = useState("monthly");

  // Determine account type
  const accountType = useMemo((): AccountType => {
    if (!account) return "asset";
    const type = account.attributes.type?.toLowerCase();
    if (type === "asset") return "asset";
    if (type === "expense") return "expense";
    if (type === "revenue") return "revenue";
    if (type === "liability" || type === "liabilities") return "liability";
    return "asset";
  }, [account]);

  // Selected currency display label for dropdown
  const selectedCurrencyLabel = useMemo(() => {
    const c = userCurrencies.find((cur) => cur.code === currencyCode);
    return c ? `${c.name} (${c.code})` : currencyCode || "Select currency";
  }, [userCurrencies, currencyCode]);

  // Fetch account and user currencies in parallel
  useEffect(() => {
    async function fetchData() {
      if (!id) return;
      setIsLoading(true);
      try {
        const [accountResponse, currenciesList] = await Promise.all([
          apiClient.getAccount(id),
          apiClient.getUserCurrencies().catch(() => [] as UserCurrenciesList[]),
        ]);

        const acc = (accountResponse as FireflyApiResponse<Account>).data;
        setAccount(acc);
        setUserCurrencies(Array.isArray(currenciesList) ? currenciesList : []);

        // Populate form fields
        const attrs = acc.attributes;
        setName(attrs.name || "");
        setIban(attrs.iban || "");
        setBic(attrs.bic || "");
        setAccountNumber(attrs.account_number || "");
        setOpeningBalance(attrs.opening_balance || "");
        setOpeningBalanceDate(attrs.opening_balance_date || "");
        setMonthlyPaymentDate(
          attrs.cc_monthly_payment_date || attrs.monthly_payment_date || ""
        );
        setVirtualBalance(attrs.virtual_balance || "");
        setCurrencyCode(attrs.currency_code || "");
        setActive(attrs.active);
        setIncludeNetWorth(attrs.include_net_worth);
        setNotes(attrs.notes || "");

        // Asset-specific
        if (attrs.account_role) {
          setAccountRole(attrs.account_role as AccountRole);
        }
        if (attrs.credit_card_type) {
          setCreditCardType(attrs.credit_card_type as CreditCardType);
        }

        // Liability-specific
        if (attrs.liability_type) {
          setLiabilityType(attrs.liability_type as LiabilityType);
        }
        if (attrs.interest) {
          setInterest(attrs.interest);
        }
        if (attrs.interest_period) {
          setInterestPeriod(attrs.interest_period);
        }

        // Set header title
        navigation.setOptions({
          title: `Edit ${attrs.name}`,
        });
      } catch (error) {
        console.error("Failed to fetch account:", error);
        Alert.alert("Error", "Failed to load account details");
        router.replace(ACCOUNTS_ROUTE);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, [id, navigation, router]);

  // Header back button and Android hardware back: go to accounts list
  useEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <Pressable
          onPress={() => router.replace(ACCOUNTS_ROUTE)}
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
      router.replace(ACCOUNTS_ROUTE);
      return true;
    });
    return () => sub.remove();
  }, [router]);

  // Save handler
  const handleSave = useCallback(async () => {
    if (!id || !name.trim()) {
      Alert.alert("Error", "Account name is required");
      return;
    }

    setIsSaving(true);
    try {
      const body: AccountUpdateRequestBody = {
        name: name.trim(),
        active,
        include_net_worth: includeNetWorth,
        notes: notes.trim() || null,
      };

      // Nullable optional fields: always send value or null so clearing a field updates the API
      body.iban = iban.trim() || null;
      body.bic = bic.trim() || null;
      body.account_number = accountNumber.trim() || null;
      body.virtual_balance = virtualBalance.trim() || undefined;
      if (currencyCode.trim()) body.currency_code = currencyCode.trim();

      // Opening balance: Firefly III rejects opening_balance/opening_balance_date for liability
      // accounts via this endpoint — liabilities manage debt through a separate mechanism.
      // Only send for non-liability types. Always use UTC for dates.
      const isLiability =
        accountType === "liability" || accountType === "liabilities";
      if (!isLiability) {
        if (openingBalance.trim()) {
          body.opening_balance = openingBalance.trim();
          body.opening_balance_date = toApiDateString(
            parseApiDate(openingBalanceDate) ?? new Date()
          );
        } else {
          body.opening_balance = "0";
          body.opening_balance_date = null;
        }
      }

      // Account type-specific fields
      if (accountType === "asset") {
        body.account_role = accountRole;

        if (accountRole === "ccAsset") {
          body.credit_card_type = creditCardType;
          const parsed = parseApiDate(monthlyPaymentDate);
          body.monthly_payment_date = parsed
            ? toApiDateString(parsed)
            : new Date().toISOString();
        } else {
          body.credit_card_type = null;
          body.monthly_payment_date = null;
        }
      }

      if (accountType === "liability") {
        body.liability_type = liabilityType;
        body.interest = interest.trim() || null;
        body.interest_period = interestPeriod.trim() || undefined;
        body.opening_balance = undefined;
        body.opening_balance_date = undefined;
      }

      const response = await apiClient.updateAccount(id, body);
      const updatedAccount = response.data;

      // Update Zustand cache immediately for instant UI update
      const { cachedAccounts, setCachedAccounts } = useStore.getState();
      const accountsArray = Array.isArray(cachedAccounts)
        ? cachedAccounts
        : cachedAccounts &&
            typeof cachedAccounts === "object" &&
            "data" in cachedAccounts
          ? (cachedAccounts as { data: Account[] }).data
          : [];

      if (accountsArray.length > 0) {
        const updatedAccounts = accountsArray.map((acc) =>
          acc.id === updatedAccount.id ? updatedAccount : acc
        );
        setCachedAccounts(updatedAccounts);
      }

      // Update React Query cache immediately
      queryClient.setQueryData<FireflyApiResponse<Account[]>>(
        ["all-accounts"],
        (old) => {
          if (!old?.data) return old;
          return {
            ...old,
            data: old.data.map((acc) =>
              acc.id === updatedAccount.id ? updatedAccount : acc
            ),
          };
        }
      );

      Alert.alert("Success", "Account updated successfully", [
        { text: "OK", onPress: () => router.replace(ACCOUNTS_ROUTE) },
      ]);
    } catch (error) {
      console.error("Failed to update account:", error);
      const message =
        error instanceof Error ? error.message : "Failed to update account";
      Alert.alert("Error", message);
    } finally {
      setIsSaving(false);
    }
  }, [
    id,
    name,
    active,
    includeNetWorth,
    notes,
    iban,
    bic,
    accountNumber,
    openingBalance,
    openingBalanceDate,
    virtualBalance,
    currencyCode,
    accountType,
    accountRole,
    creditCardType,
    monthlyPaymentDate,
    liabilityType,
    interest,
    interestPeriod,
    router,
  ]);

  if (isLoading) {
    return (
      <View
        style={[
          styles.loadingContainer,
          { backgroundColor: theme.colors.background },
        ]}
      >
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={{ marginTop: 16 }}>Loading account...</Text>
      </View>
    );
  }

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
              left={(props) => (
                <MaterialCommunityIcons
                  name="information"
                  size={24}
                  color={theme.colors.primary}
                />
              )}
            />
            <Card.Content>
              <TextInput
                label="Account Name *"
                value={name}
                onChangeText={setName}
                mode="outlined"
                style={styles.input}
                error={!name.trim()}
              />

              <Pressable
                onPress={() => setCurrencyMenuVisible(true)}
                style={[
                  styles.currencySelectTouchable,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.outline,
                  },
                ]}
              >
                <Text
                  variant="bodyLarge"
                  style={[
                    styles.currencySelectLabel,
                    {
                      color: currencyCode
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

              <Modal
                visible={currencyMenuVisible}
                transparent
                animationType="slide"
                onRequestClose={() => setCurrencyMenuVisible(false)}
              >
                <Pressable
                  style={styles.currencyModalOverlay}
                  onPress={() => setCurrencyMenuVisible(false)}
                >
                  <Pressable
                    style={[
                      styles.currencyModalContent,
                      { backgroundColor: theme.colors.surface },
                    ]}
                    onPress={(e) => e.stopPropagation()}
                  >
                    <View
                      style={[
                        styles.currencyModalHeader,
                        { borderBottomColor: theme.colors.outlineVariant },
                      ]}
                    >
                      <Text
                        variant="titleMedium"
                        style={styles.currencyModalTitle}
                      >
                        Select currency
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
                      <View style={styles.currencyModalEmpty}>
                        <Text variant="bodyMedium">
                          No currencies available
                        </Text>
                      </View>
                    ) : (
                      <FlatList
                        data={userCurrencies}
                        keyExtractor={(item) => item.id}
                        style={styles.currencyModalList}
                        keyboardShouldPersistTaps="handled"
                        renderItem={({ item: cur }) => (
                          <List.Item
                            title={`${cur.name} (${cur.code})`}
                            titleStyle={
                              currencyCode === cur.code
                                ? { fontWeight: "600" }
                                : undefined
                            }
                            onPress={() => {
                              setCurrencyCode(cur.code);
                              setCurrencyMenuVisible(false);
                            }}
                            right={
                              currencyCode === cur.code
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

              {/* Date picker: native on Android (dialog), in Modal on iOS */}
              {datePickerOpen !== null && Platform.OS === "android" && (
                <DateTimePicker
                  value={datePickerValue}
                  mode="date"
                  display="default"
                  onChange={(event, selectedDate) => {
                    setDatePickerOpen(null);
                    if (event.type === "set" && selectedDate) {
                      const apiStr = toApiDateString(selectedDate);
                      if (datePickerOpen === "openingBalance") {
                        setOpeningBalanceDate(apiStr);
                      } else {
                        setMonthlyPaymentDate(apiStr);
                      }
                    }
                  }}
                />
              )}
              {datePickerOpen !== null && Platform.OS === "ios" && (
                <Modal
                  visible
                  transparent
                  animationType="slide"
                  onRequestClose={() => setDatePickerOpen(null)}
                >
                  <Pressable
                    style={styles.datePickerModalOverlay}
                    onPress={() => setDatePickerOpen(null)}
                  >
                    <View
                      style={[
                        styles.datePickerModalContent,
                        { backgroundColor: theme.colors.surface },
                      ]}
                      onStartShouldSetResponder={() => true}
                    >
                      <View
                        style={[
                          styles.datePickerModalHeader,
                          { borderBottomColor: theme.colors.outlineVariant },
                        ]}
                      >
                        <Button
                          mode="text"
                          compact
                          onPress={() => setDatePickerOpen(null)}
                        >
                          Cancel
                        </Button>
                        <Text
                          variant="titleMedium"
                          style={styles.datePickerModalTitle}
                        >
                          {datePickerOpen === "openingBalance"
                            ? "Opening balance date"
                            : "Monthly payment date"}
                        </Text>
                        <Button
                          mode="text"
                          compact
                          onPress={() => {
                            const apiStr = toApiDateString(datePickerValue);
                            if (datePickerOpen === "openingBalance") {
                              setOpeningBalanceDate(apiStr);
                            } else {
                              setMonthlyPaymentDate(apiStr);
                            }
                            setDatePickerOpen(null);
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

              <View style={styles.switchRow}>
                <View style={styles.switchLabel}>
                  <MaterialCommunityIcons
                    name="chart-line"
                    size={20}
                    color={
                      includeNetWorth
                        ? theme.colors.primary
                        : theme.colors.outline
                    }
                  />
                  <Text variant="bodyLarge" style={{ marginLeft: 8 }}>
                    Include in Net Worth
                  </Text>
                </View>
                <Switch
                  value={includeNetWorth}
                  onValueChange={setIncludeNetWorth}
                />
              </View>
            </Card.Content>
          </GlassCard>

          {/* Account Details - For Asset & Liability */}
          {(accountType === "asset" || accountType === "liability") && (
            <GlassCard variant="elevated" style={styles.card}>
              <Card.Title
                title="Account Details"
                left={(props) => (
                  <MaterialCommunityIcons
                    name="bank"
                    size={24}
                    color={theme.colors.primary}
                  />
                )}
              />
              <Card.Content>
                <TextInput
                  label="IBAN"
                  value={iban}
                  onChangeText={setIban}
                  mode="outlined"
                  style={styles.input}
                  placeholder="GB98MIDL07009312345678"
                  autoCapitalize="characters"
                />

                <TextInput
                  label="BIC/SWIFT"
                  value={bic}
                  onChangeText={setBic}
                  mode="outlined"
                  style={styles.input}
                  placeholder="BOFAUS3N"
                  autoCapitalize="characters"
                />

                <TextInput
                  label="Account Number"
                  value={accountNumber}
                  onChangeText={setAccountNumber}
                  mode="outlined"
                  style={styles.input}
                  placeholder="7009312345678"
                  keyboardType="numeric"
                />
              </Card.Content>
            </GlassCard>
          )}

          {/* Balance Information */}
          <GlassCard variant="elevated" style={styles.card}>
            <Card.Title
              title="Balance"
              left={(props) => (
                <MaterialCommunityIcons
                  name="wallet"
                  size={24}
                  color={theme.colors.primary}
                />
              )}
            />
            <Card.Content>
              <TextInput
                label="Opening Balance"
                value={openingBalance}
                onChangeText={setOpeningBalance}
                mode="outlined"
                style={styles.input}
                placeholder="0.00"
                keyboardType="decimal-pad"
                left={<TextInput.Affix text={currencyCode || "$"} />}
              />

              <Pressable
                onPress={() => {
                  const initial =
                    parseApiDate(openingBalanceDate) ?? new Date();
                  setDatePickerValue(initial);
                  setDatePickerOpen("openingBalance");
                }}
                style={[
                  styles.dateFieldTouchable,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.outline,
                  },
                ]}
              >
                <View style={styles.dateFieldContent}>
                  <MaterialCommunityIcons
                    name="calendar"
                    size={20}
                    color={theme.colors.onSurfaceVariant}
                  />
                  <Text
                    variant="bodyLarge"
                    style={[
                      styles.dateFieldText,
                      {
                        color: openingBalanceDate
                          ? theme.colors.onSurface
                          : theme.colors.onSurfaceVariant,
                      },
                    ]}
                  >
                    {openingBalanceDate
                      ? formatDateDisplay(openingBalanceDate)
                      : "Select opening balance date"}
                  </Text>
                </View>
                <MaterialCommunityIcons
                  name="chevron-down"
                  size={24}
                  color={theme.colors.onSurfaceVariant}
                />
              </Pressable>

              <TextInput
                label="Virtual Balance"
                value={virtualBalance}
                onChangeText={setVirtualBalance}
                mode="outlined"
                style={styles.input}
                placeholder="0.00"
                keyboardType="decimal-pad"
                left={<TextInput.Affix text={currencyCode || "$"} />}
              />
            </Card.Content>
          </GlassCard>

          {/* Asset-Specific: Account Role */}
          {accountType === "asset" && (
            <GlassCard variant="elevated" style={styles.card}>
              <Card.Title
                title="Account Role"
                left={(props) => (
                  <MaterialCommunityIcons
                    name="account-cog"
                    size={24}
                    color={theme.colors.primary}
                  />
                )}
              />
              <Card.Content style={styles.cardContentTight}>
                <Text
                  variant="bodySmall"
                  style={[
                    styles.chipSectionLabel,
                    { color: theme.colors.onSurfaceVariant },
                  ]}
                >
                  Select the role for this asset account
                </Text>
                <View style={styles.chipsContainer}>
                  {ACCOUNT_ROLE_OPTIONS.map((option) => {
                    const selected = accountRole === option.value;
                    return (
                      <Chip
                        key={option.value}
                        selected={selected}
                        showSelectedOverlay
                        onPress={() => setAccountRole(option.value)}
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
                        {option.label}
                      </Chip>
                    );
                  })}
                </View>

                {/* Credit Card Fields */}
                {accountRole === "ccAsset" && (
                  <>
                    <Divider style={styles.divider} />
                    <Text variant="titleSmall" style={styles.sectionSubtitle}>
                      Credit Card Settings
                    </Text>

                    <Text
                      variant="bodySmall"
                      style={[
                        styles.chipSectionLabel,
                        { color: theme.colors.onSurfaceVariant },
                      ]}
                    >
                      Credit Card Type
                    </Text>
                    <Pressable
                      onPress={() => setCreditCardTypeMenuVisible(true)}
                      style={[
                        styles.currencySelectTouchable,
                        {
                          backgroundColor: theme.colors.surface,
                          borderColor: theme.colors.outline,
                        },
                      ]}
                    >
                      <Text
                        variant="bodyLarge"
                        style={[
                          styles.currencySelectLabel,
                          {
                            color: theme.colors.onSurface,
                          },
                        ]}
                      >
                        {CREDIT_CARD_TYPE_OPTIONS.find(
                          (o) => o.value === creditCardType
                        )?.label ?? "Select credit card type"}
                      </Text>
                      <MaterialCommunityIcons
                        name="chevron-down"
                        size={24}
                        color={theme.colors.onSurfaceVariant}
                      />
                    </Pressable>

                    <Modal
                      visible={creditCardTypeMenuVisible}
                      transparent
                      animationType="slide"
                      onRequestClose={() => setCreditCardTypeMenuVisible(false)}
                    >
                      <Pressable
                        style={styles.currencyModalOverlay}
                        onPress={() => setCreditCardTypeMenuVisible(false)}
                      >
                        <Pressable
                          style={[
                            styles.currencyModalContent,
                            { backgroundColor: theme.colors.surface },
                          ]}
                          onPress={(e) => e.stopPropagation()}
                        >
                          <View
                            style={[
                              styles.currencyModalHeader,
                              {
                                borderBottomColor: theme.colors.outlineVariant,
                              },
                            ]}
                          >
                            <Text
                              variant="titleMedium"
                              style={styles.currencyModalTitle}
                            >
                              Select credit card type
                            </Text>
                            <Button
                              mode="text"
                              compact
                              onPress={() =>
                                setCreditCardTypeMenuVisible(false)
                              }
                            >
                              Done
                            </Button>
                          </View>
                          <View style={styles.currencyModalList}>
                            {CREDIT_CARD_TYPE_OPTIONS.map((opt) => (
                              <List.Item
                                key={opt.value}
                                title={opt.label}
                                titleStyle={
                                  creditCardType === opt.value
                                    ? { fontWeight: "600" }
                                    : undefined
                                }
                                onPress={() => {
                                  setCreditCardType(opt.value);
                                  setCreditCardTypeMenuVisible(false);
                                }}
                                right={
                                  creditCardType === opt.value
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
                            ))}
                          </View>
                        </Pressable>
                      </Pressable>
                    </Modal>

                    <Pressable
                      onPress={() => {
                        const initial =
                          parseApiDate(monthlyPaymentDate) ?? new Date();
                        setDatePickerValue(initial);
                        setDatePickerOpen("monthlyPayment");
                      }}
                      style={[
                        styles.dateFieldTouchable,
                        {
                          backgroundColor: theme.colors.surface,
                          borderColor: theme.colors.outline,
                        },
                      ]}
                    >
                      <View style={styles.dateFieldContent}>
                        <MaterialCommunityIcons
                          name="calendar"
                          size={20}
                          color={theme.colors.onSurfaceVariant}
                        />
                        <Text
                          variant="bodyLarge"
                          style={[
                            styles.dateFieldText,
                            {
                              color: monthlyPaymentDate
                                ? theme.colors.onSurface
                                : theme.colors.onSurfaceVariant,
                            },
                          ]}
                        >
                          {monthlyPaymentDate
                            ? formatDateDisplay(monthlyPaymentDate)
                            : "Select monthly payment date"}
                        </Text>
                      </View>
                      <MaterialCommunityIcons
                        name="chevron-down"
                        size={24}
                        color={theme.colors.onSurfaceVariant}
                      />
                    </Pressable>
                  </>
                )}
              </Card.Content>
            </GlassCard>
          )}

          {/* Liability-Specific Fields */}
          {accountType === "liability" && (
            <GlassCard variant="elevated" style={styles.card}>
              <Card.Title
                title="Liability Details"
                left={(props) => (
                  <MaterialCommunityIcons
                    name="credit-card"
                    size={24}
                    color={theme.colors.primary}
                  />
                )}
              />
              <Card.Content style={styles.cardContentTight}>
                <Text
                  variant="bodySmall"
                  style={[
                    styles.chipSectionLabel,
                    { color: theme.colors.onSurfaceVariant },
                  ]}
                >
                  Liability Type
                </Text>
                <View style={styles.chipsContainer}>
                  {LIABILITY_TYPE_OPTIONS.map((option) => {
                    const selected = liabilityType === option.value;
                    return (
                      <Chip
                        key={option.value}
                        selected={selected}
                        showSelectedOverlay
                        onPress={() => setLiabilityType(option.value)}
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
                        {option.label}
                      </Chip>
                    );
                  })}
                </View>

                <Divider style={styles.divider} />

                <TextInput
                  label="Interest Rate (%)"
                  value={interest}
                  onChangeText={setInterest}
                  mode="outlined"
                  style={styles.input}
                  placeholder="5.3"
                  keyboardType="decimal-pad"
                  right={<TextInput.Affix text="%" />}
                />

                <Text
                  variant="bodySmall"
                  style={[
                    styles.chipSectionLabel,
                    { color: theme.colors.onSurfaceVariant },
                  ]}
                >
                  Interest Period
                </Text>
                <View style={styles.chipsContainer}>
                  {INTEREST_PERIOD_OPTIONS.map((option) => {
                    const selected = interestPeriod === option.value;
                    return (
                      <Chip
                        key={option.value}
                        selected={selected}
                        showSelectedOverlay
                        onPress={() => setInterestPeriod(option.value)}
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
                        {option.label}
                      </Chip>
                    );
                  })}
                </View>
              </Card.Content>
            </GlassCard>
          )}

          {/* Notes */}
          <GlassCard variant="elevated" style={styles.card}>
            <Card.Title
              title="Notes"
              left={(props) => (
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
                placeholder="Add any notes about this account..."
              />
            </Card.Content>
          </GlassCard>

          {/* Save Button */}
          <View style={styles.buttonContainer}>
            <Button
              mode="contained"
              onPress={handleSave}
              loading={isSaving}
              disabled={isSaving || !name.trim()}
              style={styles.saveButton}
              contentStyle={styles.saveButtonContent}
              icon="content-save"
            >
              Save Changes
            </Button>

            <Button
              mode="outlined"
              onPress={() => router.replace(ACCOUNTS_ROUTE)}
              disabled={isSaving}
              style={styles.cancelButton}
            >
              Cancel
            </Button>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  keyboardAvoid: {
    flex: 1,
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
  currencySelectTouchable: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderRadius: 4,
  },
  currencySelectLabel: {
    flex: 1,
  },
  currencyModalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  currencyModalContent: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: "70%",
    minHeight: 200,
  },
  currencyModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  currencyModalTitle: {
    fontWeight: "600",
  },
  currencyModalEmpty: {
    padding: 24,
    alignItems: "center",
  },
  currencyModalList: {
    maxHeight: 320,
  },
  dateFieldTouchable: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderRadius: 4,
  },
  dateFieldContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 12,
  },
  dateFieldText: {
    flex: 1,
  },
  datePickerModalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  datePickerModalContent: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 34,
  },
  datePickerModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  datePickerModalTitle: {
    flex: 1,
    textAlign: "center",
  },
  datePickerIOS: {
    alignSelf: "center",
  },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  switchLabel: {
    flexDirection: "row",
    alignItems: "center",
  },
  cardContentTight: {
    paddingTop: 0,
  },
  chipSectionLabel: {
    marginTop: 4,
    marginBottom: 10,
    letterSpacing: 0.2,
  },
  chipsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 16,
  },
  chip: {
    borderWidth: 1,
    borderColor: "rgba(120, 120, 120, 0.2)",
    backgroundColor: "transparent",
  },
  chipText: {
    fontSize: 13,
    fontWeight: "500",
    letterSpacing: 0.15,
  },
  divider: {
    marginVertical: 16,
  },
  sectionSubtitle: {
    marginBottom: 12,
    fontWeight: "600",
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
});
