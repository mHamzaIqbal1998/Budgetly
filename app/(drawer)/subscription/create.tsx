// Create Subscription Screen
import { GlassCard } from "@/components/glass-card";
import { apiClient } from "@/lib/api-client";
import { queryClient } from "@/lib/query-client";
import type { UserCurrenciesList } from "@/types";
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
  Switch,
  Text,
  TextInput,
  useTheme,
} from "react-native-paper";

const SUBSCRIPTIONS_ROUTE = "/(drawer)/subscriptions" as Href;

// ---------------------------------------------------------------------------
// Repeat frequency options
// ---------------------------------------------------------------------------

const FREQ_OPTIONS: { value: string; label: string }[] = [
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "half-year", label: "Half Year" },
  { value: "yearly", label: "Yearly" },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toApiDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}T00:00:00+00:00`;
}

function formatDateDisplay(date: Date): string {
  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

// ---------------------------------------------------------------------------
// Main Screen
// ---------------------------------------------------------------------------

export default function CreateSubscriptionScreen() {
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
  const [amountMin, setAmountMin] = useState("");
  const [amountMax, setAmountMax] = useState("");
  const [currencyCode, setCurrencyCode] = useState("");
  const [date, setDate] = useState(new Date());
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [extensionDate, setExtensionDate] = useState<Date | null>(null);
  const [repeatFreq, setRepeatFreq] = useState("monthly");
  const [skip, setSkip] = useState("0");
  const [active, setActive] = useState(true);
  const [notes, setNotes] = useState("");

  // Date pickers
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [showExtensionDatePicker, setShowExtensionDatePicker] = useState(false);

  // Modals
  const [freqModalVisible, setFreqModalVisible] = useState(false);

  // Derived
  const selectedCurrencyLabel = useMemo(() => {
    const c = userCurrencies.find((cur) => cur.code === currencyCode);
    return c ? `${c.name} (${c.code})` : currencyCode || "Select currency";
  }, [userCurrencies, currencyCode]);

  const selectedFreqLabel = useMemo(() => {
    const f = FREQ_OPTIONS.find((o) => o.value === repeatFreq);
    return f?.label || repeatFreq || "Select frequency";
  }, [repeatFreq]);

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
      setAmountMin("");
      setAmountMax("");
      setCurrencyCode("");
      setDate(new Date());
      setEndDate(null);
      setExtensionDate(null);
      setRepeatFreq("monthly");
      setSkip("0");
      setActive(true);
      setNotes("");
    }, [])
  );

  // Navigation: header
  useEffect(() => {
    navigation.setOptions({
      title: "Create Subscription",
      headerLeft: () => (
        <Pressable
          onPress={() => router.replace(SUBSCRIPTIONS_ROUTE)}
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
      router.replace(SUBSCRIPTIONS_ROUTE);
      return true;
    });
    return () => sub.remove();
  }, [router]);

  // ---------------------------------------------------------------------------
  // Save handler
  // ---------------------------------------------------------------------------

  const handleSave = useCallback(async () => {
    if (!name.trim()) {
      Alert.alert("Error", "Subscription name is required");
      return;
    }
    if (!amountMin.trim()) {
      Alert.alert("Error", "Minimum amount is required");
      return;
    }
    if (!amountMax.trim()) {
      Alert.alert("Error", "Maximum amount is required");
      return;
    }

    setIsSaving(true);
    try {
      const body: Record<string, unknown> = {
        name: name.trim(),
        amount_min: amountMin.trim(),
        amount_max: amountMax.trim(),
        date: toApiDateString(date),
        repeat_freq: repeatFreq,
        active,
      };

      if (currencyCode.trim()) {
        body.currency_code = currencyCode.trim();
      }
      if (endDate) {
        body.end_date = toApiDateString(endDate);
      }
      if (extensionDate) {
        body.extension_date = toApiDateString(extensionDate);
      }
      const skipNum = parseInt(skip, 10);
      if (!isNaN(skipNum) && skipNum > 0) {
        body.skip = skipNum;
      }
      if (notes.trim()) {
        body.notes = notes.trim();
      }

      await apiClient.createBill(body);

      // Invalidate subscription caches
      queryClient.removeQueries({ queryKey: ["subscriptions"] });
      queryClient.invalidateQueries({ queryKey: ["subscriptions"] });
      queryClient.invalidateQueries({ queryKey: ["subscriptionsBills"] });

      Alert.alert("Success", "Subscription created successfully", [
        { text: "OK", onPress: () => router.replace(SUBSCRIPTIONS_ROUTE) },
      ]);
    } catch (error) {
      console.error("Failed to create subscription:", error);
      let errorMessage = "Failed to create subscription";
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
    amountMin,
    amountMax,
    date,
    repeatFreq,
    active,
    currencyCode,
    endDate,
    extensionDate,
    skip,
    notes,
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
                label="Subscription Name *"
                value={name}
                onChangeText={setName}
                mode="outlined"
                style={styles.input}
                error={!name.trim()}
                placeholder="e.g., Netflix, Rent, Insurance"
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

          {/* Amount */}
          <GlassCard variant="elevated" style={styles.card}>
            <Card.Title
              title="Amount"
              left={() => (
                <MaterialCommunityIcons
                  name="cash"
                  size={24}
                  color={theme.colors.primary}
                />
              )}
            />
            <Card.Content>
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

              <TextInput
                label="Minimum Amount *"
                value={amountMin}
                onChangeText={setAmountMin}
                mode="outlined"
                style={styles.input}
                keyboardType="decimal-pad"
                left={<TextInput.Affix text={currencyCode || "$"} />}
              />

              <TextInput
                label="Maximum Amount *"
                value={amountMax}
                onChangeText={setAmountMax}
                mode="outlined"
                style={styles.input}
                keyboardType="decimal-pad"
                left={<TextInput.Affix text={currencyCode || "$"} />}
              />
            </Card.Content>
          </GlassCard>

          {/* Schedule */}
          <GlassCard variant="elevated" style={styles.card}>
            <Card.Title
              title="Schedule"
              left={() => (
                <MaterialCommunityIcons
                  name="calendar-clock"
                  size={24}
                  color={theme.colors.primary}
                />
              )}
            />
            <Card.Content>
              {/* Start Date */}
              <Text
                variant="bodySmall"
                style={[
                  styles.fieldLabel,
                  { color: theme.colors.onSurfaceVariant },
                ]}
              >
                Start Date *
              </Text>
              <Pressable
                onPress={() => setShowDatePicker(true)}
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
                  {formatDateDisplay(date)}
                </Text>
                <MaterialCommunityIcons
                  name="calendar"
                  size={24}
                  color={theme.colors.onSurfaceVariant}
                />
              </Pressable>
              {showDatePicker && (
                <DateTimePicker
                  value={date}
                  mode="date"
                  display={Platform.OS === "ios" ? "spinner" : "default"}
                  onChange={(_, selectedDate) => {
                    setShowDatePicker(Platform.OS === "ios");
                    if (selectedDate) setDate(selectedDate);
                  }}
                />
              )}

              {/* Repeat Frequency */}
              <Text
                variant="bodySmall"
                style={[
                  styles.fieldLabel,
                  { color: theme.colors.onSurfaceVariant },
                ]}
              >
                Repeat Frequency *
              </Text>
              <Pressable
                onPress={() => setFreqModalVisible(true)}
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
                  {selectedFreqLabel}
                </Text>
                <MaterialCommunityIcons
                  name="chevron-down"
                  size={24}
                  color={theme.colors.onSurfaceVariant}
                />
              </Pressable>

              {/* Frequency Selector Modal */}
              <Modal
                visible={freqModalVisible}
                transparent
                animationType="slide"
                onRequestClose={() => setFreqModalVisible(false)}
              >
                <Pressable
                  style={styles.modalOverlay}
                  onPress={() => setFreqModalVisible(false)}
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
                        Repeat Frequency
                      </Text>
                      <Button
                        mode="text"
                        compact
                        onPress={() => setFreqModalVisible(false)}
                      >
                        Done
                      </Button>
                    </View>
                    <FlatList
                      data={FREQ_OPTIONS}
                      keyExtractor={(item) => item.value}
                      style={styles.modalList}
                      keyboardShouldPersistTaps="handled"
                      renderItem={({ item }) => (
                        <List.Item
                          title={item.label}
                          titleStyle={
                            repeatFreq === item.value
                              ? { fontWeight: "600" }
                              : undefined
                          }
                          onPress={() => {
                            setRepeatFreq(item.value);
                            setFreqModalVisible(false);
                          }}
                          right={
                            repeatFreq === item.value
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

              {/* Skip */}
              <TextInput
                label="Skip (0 = no skip, 1 = bi-monthly)"
                value={skip}
                onChangeText={setSkip}
                mode="outlined"
                style={styles.input}
                keyboardType="number-pad"
              />

              {/* End Date */}
              <Text
                variant="bodySmall"
                style={[
                  styles.fieldLabel,
                  { color: theme.colors.onSurfaceVariant },
                ]}
              >
                End Date (optional)
              </Text>
              <Pressable
                onPress={() => setShowEndDatePicker(true)}
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
                      color: endDate
                        ? theme.colors.onSurface
                        : theme.colors.onSurfaceVariant,
                    },
                  ]}
                >
                  {endDate ? formatDateDisplay(endDate) : "No end date"}
                </Text>
                <View style={styles.dateActions}>
                  {endDate && (
                    <Pressable
                      onPress={() => setEndDate(null)}
                      hitSlop={8}
                      style={{ marginRight: 8 }}
                    >
                      <MaterialCommunityIcons
                        name="close-circle"
                        size={20}
                        color={theme.colors.onSurfaceVariant}
                      />
                    </Pressable>
                  )}
                  <MaterialCommunityIcons
                    name="calendar"
                    size={24}
                    color={theme.colors.onSurfaceVariant}
                  />
                </View>
              </Pressable>
              {showEndDatePicker && (
                <DateTimePicker
                  value={endDate || new Date()}
                  mode="date"
                  display={Platform.OS === "ios" ? "spinner" : "default"}
                  onChange={(_, selectedDate) => {
                    setShowEndDatePicker(Platform.OS === "ios");
                    if (selectedDate) setEndDate(selectedDate);
                  }}
                />
              )}

              {/* Extension Date */}
              <Text
                variant="bodySmall"
                style={[
                  styles.fieldLabel,
                  { color: theme.colors.onSurfaceVariant },
                ]}
              >
                Extension Date (optional)
              </Text>
              <Pressable
                onPress={() => setShowExtensionDatePicker(true)}
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
                      color: extensionDate
                        ? theme.colors.onSurface
                        : theme.colors.onSurfaceVariant,
                    },
                  ]}
                >
                  {extensionDate
                    ? formatDateDisplay(extensionDate)
                    : "No extension date"}
                </Text>
                <View style={styles.dateActions}>
                  {extensionDate && (
                    <Pressable
                      onPress={() => setExtensionDate(null)}
                      hitSlop={8}
                      style={{ marginRight: 8 }}
                    >
                      <MaterialCommunityIcons
                        name="close-circle"
                        size={20}
                        color={theme.colors.onSurfaceVariant}
                      />
                    </Pressable>
                  )}
                  <MaterialCommunityIcons
                    name="calendar"
                    size={24}
                    color={theme.colors.onSurfaceVariant}
                  />
                </View>
              </Pressable>
              {showExtensionDatePicker && (
                <DateTimePicker
                  value={extensionDate || new Date()}
                  mode="date"
                  display={Platform.OS === "ios" ? "spinner" : "default"}
                  onChange={(_, selectedDate) => {
                    setShowExtensionDatePicker(Platform.OS === "ios");
                    if (selectedDate) setExtensionDate(selectedDate);
                  }}
                />
              )}
            </Card.Content>
          </GlassCard>

          {/* Create Button */}
          <Button
            mode="contained"
            onPress={handleSave}
            loading={isSaving}
            disabled={
              isSaving || !name.trim() || !amountMin.trim() || !amountMax.trim()
            }
            style={styles.saveButton}
            contentStyle={styles.saveButtonContent}
            labelStyle={styles.saveButtonLabel}
            icon="plus-circle"
          >
            {isSaving ? "Creating..." : "Create Subscription"}
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
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    marginBottom: 12,
  },
  switchLabel: {
    flexDirection: "row",
    alignItems: "center",
  },

  // Field touchable
  fieldLabel: {
    fontWeight: "600",
    marginBottom: 6,
    marginTop: 4,
  },
  fieldTouchable: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderRadius: 4,
    marginBottom: 12,
  },
  fieldTouchableText: {
    flex: 1,
    marginRight: 8,
  },
  dateActions: {
    flexDirection: "row",
    alignItems: "center",
  },

  // Modals
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: "70%",
    minHeight: 200,
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
