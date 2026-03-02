// Reminders Screen
import { GlassCard } from "@/components/glass-card";
import {
  cancelExpenseReminders,
  cancelSubscriptionReminders,
  configureNotifications,
  getScheduledNotificationCount,
  requestNotificationPermissions,
  scheduleExpenseReminder,
  scheduleSubscriptionReminders,
} from "@/lib/notifications";
import { useStore } from "@/lib/store";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import {
  Button,
  Card,
  Divider,
  List,
  SegmentedButtons,
  Switch,
  Text,
  useTheme,
} from "react-native-paper";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const FREQ_OPTIONS = [
  { value: "daily", label: "Daily" },
  { value: "weekdays", label: "Weekdays" },
  { value: "weekly", label: "Weekly" },
] as const;

// ---------------------------------------------------------------------------
// Main Screen
// ---------------------------------------------------------------------------

export default function RemindersScreen() {
  const theme = useTheme();
  const {
    subscriptionRemindersEnabled,
    setSubscriptionRemindersEnabled,
    lastSubscriptionReminderSync,
    setLastSubscriptionReminderSync,
    expenseReminderEnabled,
    setExpenseReminderEnabled,
    expenseReminderFrequency,
    setExpenseReminderFrequency,
    expenseReminderTime,
    setExpenseReminderTime,
  } = useStore();

  const [subLoading, setSubLoading] = useState(false);
  const [expenseLoading, setExpenseLoading] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [notifCounts, setNotifCounts] = useState({
    subscription: 0,
    expense: 0,
  });

  // Configure notification handler
  useEffect(() => {
    configureNotifications();
  }, []);

  // Refresh notification counts on focus
  const refreshCounts = useCallback(async () => {
    try {
      const counts = await getScheduledNotificationCount();
      setNotifCounts(counts);
    } catch {
      // Ignore
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      refreshCounts();
    }, [refreshCounts])
  );

  // -----------------------------------------------------------------------
  // Subscription Reminders
  // -----------------------------------------------------------------------

  const handleSubscriptionToggle = useCallback(async () => {
    if (subLoading) return;
    setSubLoading(true);

    try {
      if (!subscriptionRemindersEnabled) {
        // Enabling – request permissions first
        const granted = await requestNotificationPermissions();
        if (!granted) {
          Alert.alert(
            "Permission Required",
            "Please enable notifications in your device settings to use reminders.",
            [{ text: "OK" }]
          );
          setSubLoading(false);
          return;
        }

        // Schedule reminders
        const count = await scheduleSubscriptionReminders();
        setSubscriptionRemindersEnabled(true);
        setLastSubscriptionReminderSync(Date.now());
        await refreshCounts();

        Alert.alert(
          "Reminders Enabled",
          count > 0
            ? `${count} subscription reminder${count > 1 ? "s" : ""} scheduled.`
            : "No upcoming subscription payments found to schedule."
        );
      } else {
        // Disabling – cancel all subscription reminders
        await cancelSubscriptionReminders();
        setSubscriptionRemindersEnabled(false);
        await refreshCounts();
      }
    } catch (error) {
      console.error(
        "[Reminders] Failed to toggle subscription reminders:",
        error
      );
      Alert.alert(
        "Error",
        "Failed to update subscription reminders. Please try again."
      );
    } finally {
      setSubLoading(false);
    }
  }, [
    subLoading,
    subscriptionRemindersEnabled,
    setSubscriptionRemindersEnabled,
    setLastSubscriptionReminderSync,
    refreshCounts,
  ]);

  const handleRefreshSubscriptions = useCallback(async () => {
    if (subLoading) return;
    setSubLoading(true);

    try {
      const count = await scheduleSubscriptionReminders();
      setLastSubscriptionReminderSync(Date.now());
      await refreshCounts();

      Alert.alert(
        "Reminders Updated",
        count > 0
          ? `${count} subscription reminder${count > 1 ? "s" : ""} scheduled.`
          : "No upcoming subscription payments found."
      );
    } catch (error) {
      console.error(
        "[Reminders] Failed to refresh subscription reminders:",
        error
      );
      Alert.alert("Error", "Failed to refresh reminders. Please try again.");
    } finally {
      setSubLoading(false);
    }
  }, [subLoading, setLastSubscriptionReminderSync, refreshCounts]);

  // -----------------------------------------------------------------------
  // Expense Reminders
  // -----------------------------------------------------------------------

  const handleExpenseToggle = useCallback(async () => {
    if (expenseLoading) return;
    setExpenseLoading(true);

    try {
      if (!expenseReminderEnabled) {
        // Enabling
        const granted = await requestNotificationPermissions();
        if (!granted) {
          Alert.alert(
            "Permission Required",
            "Please enable notifications in your device settings to use reminders.",
            [{ text: "OK" }]
          );
          setExpenseLoading(false);
          return;
        }

        await scheduleExpenseReminder(
          expenseReminderTime,
          expenseReminderFrequency
        );
        setExpenseReminderEnabled(true);
        await refreshCounts();
      } else {
        // Disabling
        await cancelExpenseReminders();
        setExpenseReminderEnabled(false);
        await refreshCounts();
      }
    } catch (error) {
      console.error("[Reminders] Failed to toggle expense reminders:", error);
      Alert.alert(
        "Error",
        "Failed to update expense reminders. Please try again."
      );
    } finally {
      setExpenseLoading(false);
    }
  }, [
    expenseLoading,
    expenseReminderEnabled,
    expenseReminderTime,
    expenseReminderFrequency,
    setExpenseReminderEnabled,
    refreshCounts,
  ]);

  const handleFrequencyChange = useCallback(
    async (value: string) => {
      const freq = value as "daily" | "weekdays" | "weekly";
      setExpenseReminderFrequency(freq);

      // Reschedule if enabled
      if (expenseReminderEnabled) {
        try {
          await scheduleExpenseReminder(expenseReminderTime, freq);
          await refreshCounts();
        } catch (error) {
          console.error(
            "[Reminders] Failed to reschedule expense reminder:",
            error
          );
        }
      }
    },
    [
      expenseReminderEnabled,
      expenseReminderTime,
      setExpenseReminderFrequency,
      refreshCounts,
    ]
  );

  const handleTimeChange = useCallback(
    async (_event: unknown, selectedDate?: Date) => {
      // On Android, dismiss the picker
      if (Platform.OS === "android") {
        setShowTimePicker(false);
      }

      if (selectedDate) {
        const hours = String(selectedDate.getHours()).padStart(2, "0");
        const mins = String(selectedDate.getMinutes()).padStart(2, "0");
        const newTime = `${hours}:${mins}`;
        setExpenseReminderTime(newTime);

        // Reschedule if enabled
        if (expenseReminderEnabled) {
          try {
            await scheduleExpenseReminder(newTime, expenseReminderFrequency);
            await refreshCounts();
          } catch (error) {
            console.error(
              "[Reminders] Failed to reschedule expense reminder:",
              error
            );
          }
        }
      }

      // On iOS, we keep the picker open - user dismisses manually
      if (Platform.OS === "ios") {
        setShowTimePicker(false);
      }
    },
    [
      expenseReminderEnabled,
      expenseReminderFrequency,
      setExpenseReminderTime,
      refreshCounts,
    ]
  );

  // -----------------------------------------------------------------------
  // Helpers
  // -----------------------------------------------------------------------

  const formatSyncTime = (ts: number | null) => {
    if (!ts) return "Never";
    const d = new Date(ts);
    return d.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatTime = (time: string) => {
    const [h, m] = time.split(":").map(Number);
    const period = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 || 12;
    return `${h12}:${String(m).padStart(2, "0")} ${period}`;
  };

  const timePickerValue = (() => {
    const [h, m] = expenseReminderTime.split(":").map(Number);
    const d = new Date();
    d.setHours(h, m, 0, 0);
    return d;
  })();

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Description */}
        <View style={styles.introSection}>
          <MaterialCommunityIcons
            name="bell-ring-outline"
            size={32}
            color={theme.colors.primary}
          />
          <Text
            variant="bodyMedium"
            style={[styles.introText, { color: theme.colors.onSurfaceVariant }]}
          >
            Set up reminders to stay on top of your finances. All notifications
            are local and never leave your device.
          </Text>
        </View>

        {/* ── Subscription Reminders ── */}
        <GlassCard variant="elevated" style={styles.card}>
          <Card.Title
            title="Subscription Reminders"
            titleStyle={styles.cardTitle}
            left={() => (
              <MaterialCommunityIcons
                name="repeat"
                size={24}
                color={theme.colors.primary}
              />
            )}
          />
          <Card.Content style={styles.cardContent}>
            <List.Item
              title="Payment Reminders"
              description="Get notified when subscriptions are due"
              left={() => (
                <MaterialCommunityIcons
                  name="calendar-alert"
                  size={24}
                  color={theme.colors.onSurfaceVariant}
                  style={styles.listIcon}
                />
              )}
              right={() =>
                subLoading ? (
                  <ActivityIndicator
                    size="small"
                    color={theme.colors.primary}
                    style={styles.switchPadding}
                  />
                ) : (
                  <Switch
                    value={subscriptionRemindersEnabled}
                    onValueChange={handleSubscriptionToggle}
                    color={theme.colors.primary}
                  />
                )
              }
              titleStyle={styles.listTitle}
              descriptionStyle={styles.listDescription}
            />

            {subscriptionRemindersEnabled && (
              <>
                <Divider style={styles.divider} />
                <List.Item
                  title="Scheduled Reminders"
                  description={`${notifCounts.subscription} notification${notifCounts.subscription !== 1 ? "s" : ""} pending`}
                  left={() => (
                    <MaterialCommunityIcons
                      name="bell-badge-outline"
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
                  title="Last Synced"
                  description={formatSyncTime(lastSubscriptionReminderSync)}
                  left={() => (
                    <MaterialCommunityIcons
                      name="sync"
                      size={24}
                      color={theme.colors.onSurfaceVariant}
                      style={styles.listIcon}
                    />
                  )}
                  titleStyle={styles.listTitle}
                  descriptionStyle={styles.listDescription}
                />

                <View style={styles.refreshButtonContainer}>
                  <Button
                    mode="outlined"
                    onPress={handleRefreshSubscriptions}
                    loading={subLoading}
                    disabled={subLoading}
                    icon="refresh"
                    compact
                    style={styles.refreshButton}
                  >
                    Refresh Now
                  </Button>
                </View>

                <View style={styles.infoBox}>
                  <MaterialCommunityIcons
                    name="information-outline"
                    size={16}
                    color={theme.colors.onSurfaceVariant}
                  />
                  <Text
                    variant="bodySmall"
                    style={[
                      styles.infoText,
                      { color: theme.colors.onSurfaceVariant },
                    ]}
                  >
                    Reminders are scheduled for the next 90 days. Notifications
                    fire at the payment time, or at 9:00 AM if no time is set.
                    Reminders are refreshed when you open the app or modify
                    subscriptions.
                  </Text>
                </View>
              </>
            )}
          </Card.Content>
        </GlassCard>

        {/* ── Expense Reminders ── */}
        <GlassCard variant="elevated" style={styles.card}>
          <Card.Title
            title="Expense Reminders"
            titleStyle={styles.cardTitle}
            left={() => (
              <MaterialCommunityIcons
                name="cash-register"
                size={24}
                color={theme.colors.primary}
              />
            )}
          />
          <Card.Content style={styles.cardContent}>
            <List.Item
              title="Logging Reminder"
              description="Get reminded to log your expenses"
              left={() => (
                <MaterialCommunityIcons
                  name="notebook-edit-outline"
                  size={24}
                  color={theme.colors.onSurfaceVariant}
                  style={styles.listIcon}
                />
              )}
              right={() =>
                expenseLoading ? (
                  <ActivityIndicator
                    size="small"
                    color={theme.colors.primary}
                    style={styles.switchPadding}
                  />
                ) : (
                  <Switch
                    value={expenseReminderEnabled}
                    onValueChange={handleExpenseToggle}
                    color={theme.colors.primary}
                  />
                )
              }
              titleStyle={styles.listTitle}
              descriptionStyle={styles.listDescription}
            />

            {expenseReminderEnabled && (
              <>
                <Divider style={styles.divider} />

                {/* Frequency */}
                <View style={styles.frequencySection}>
                  <View style={styles.frequencyHeader}>
                    <MaterialCommunityIcons
                      name="calendar-clock"
                      size={24}
                      color={theme.colors.onSurfaceVariant}
                      style={styles.listIcon}
                    />
                    <View style={styles.frequencyTextContainer}>
                      <Text variant="bodyLarge" style={styles.listTitle}>
                        Frequency
                      </Text>
                      <Text variant="bodySmall" style={styles.listDescription}>
                        How often to remind you
                      </Text>
                    </View>
                  </View>
                  <View style={styles.segmentedContainer}>
                    <SegmentedButtons
                      value={expenseReminderFrequency}
                      onValueChange={handleFrequencyChange}
                      buttons={FREQ_OPTIONS.map((opt) => ({
                        value: opt.value,
                        label: opt.label,
                      }))}
                      style={styles.segmentedButtons}
                    />
                  </View>
                </View>

                <Divider style={styles.divider} />

                {/* Time Picker */}
                <List.Item
                  title="Reminder Time"
                  description={formatTime(expenseReminderTime)}
                  left={() => (
                    <MaterialCommunityIcons
                      name="clock-outline"
                      size={24}
                      color={theme.colors.onSurfaceVariant}
                      style={styles.listIcon}
                    />
                  )}
                  right={() => (
                    <MaterialCommunityIcons
                      name="chevron-right"
                      size={24}
                      color={theme.colors.onSurfaceVariant}
                    />
                  )}
                  onPress={() => setShowTimePicker(true)}
                  titleStyle={styles.listTitle}
                  descriptionStyle={[
                    styles.listDescription,
                    { color: theme.colors.primary, fontWeight: "600" },
                  ]}
                  style={styles.pressableItem}
                />

                {showTimePicker && (
                  <DateTimePicker
                    value={timePickerValue}
                    mode="time"
                    display={Platform.OS === "ios" ? "spinner" : "default"}
                    onChange={handleTimeChange}
                    themeVariant={theme.dark ? "dark" : "light"}
                  />
                )}

                <View style={styles.infoBox}>
                  <MaterialCommunityIcons
                    name="information-outline"
                    size={16}
                    color={theme.colors.onSurfaceVariant}
                  />
                  <Text
                    variant="bodySmall"
                    style={[
                      styles.infoText,
                      { color: theme.colors.onSurfaceVariant },
                    ]}
                  >
                    {expenseReminderFrequency === "daily"
                      ? "You'll receive a reminder every day"
                      : expenseReminderFrequency === "weekdays"
                        ? "You'll receive a reminder Monday through Friday"
                        : "You'll receive a reminder every Sunday"}
                    {` at ${formatTime(expenseReminderTime)}.`}
                  </Text>
                </View>
              </>
            )}
          </Card.Content>
        </GlassCard>

        <View style={{ height: 40 }} />
      </ScrollView>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  introSection: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 4,
    gap: 12,
  },
  introText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
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
  switchPadding: {
    marginRight: 8,
  },
  refreshButtonContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  refreshButton: {
    borderRadius: 12,
  },
  infoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginTop: 12,
    marginHorizontal: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "rgba(120, 120, 120, 0.06)",
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
  },
  frequencySection: {
    paddingVertical: 8,
  },
  frequencyHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    paddingHorizontal: 8,
  },
  frequencyTextContainer: {
    marginLeft: 16,
    flex: 1,
  },
  segmentedContainer: {
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
  segmentedButtons: {
    borderRadius: 12,
  },
});
