// Reminders Screen
import { GlassCard } from "@/components/glass-card";
import {
  cancelExpenseReminders,
  cancelSubscriptionReminders,
  checkExactAlarmPermission,
  configureNotifications,
  getScheduledNotificationCount,
  getScheduledNotificationsList,
  openAlarmPermissionSettings,
  requestNotificationPermissions,
  scheduleExpenseReminder,
  scheduleSubscriptionReminders,
  type ScheduledNotificationInfo,
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
  TouchableOpacity,
  View,
} from "react-native";
import {
  Button,
  Card,
  Dialog,
  Divider,
  List,
  Portal,
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
    subscriptionReminderTime,
    setSubscriptionReminderTime,
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
  const [showSubTimePicker, setShowSubTimePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [notifCounts, setNotifCounts] = useState({
    subscription: 0,
    expense: 0,
  });
  // Android 12+: track whether the Alarms & Reminders special permission is granted
  const [exactAlarmGranted, setExactAlarmGranted] = useState(true);

  const [showActiveReminders, setShowActiveReminders] = useState(false);
  const [activeRemindersList, setActiveRemindersList] = useState<
    ScheduledNotificationInfo[]
  >([]);

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
      // Re-check every time we come back from Settings
      if (Platform.OS === "android") {
        checkExactAlarmPermission().then(setExactAlarmGranted);
      }
    }, [refreshCounts])
  );

  // View active reminders handler
  const handleViewReminders = useCallback(async () => {
    try {
      const list = await getScheduledNotificationsList(
        subscriptionReminderTime,
        expenseReminderTime
      );
      setActiveRemindersList(list);
      setShowActiveReminders(true);
    } catch (error) {
      console.error("[Reminders] Failed to load reminders list:", error);
    }
  }, [subscriptionReminderTime, expenseReminderTime]);

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
        const count = await scheduleSubscriptionReminders(
          subscriptionReminderTime
        );
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
    subscriptionReminderTime,
    setSubscriptionRemindersEnabled,
    setLastSubscriptionReminderSync,
    refreshCounts,
  ]);

  const handleRefreshSubscriptions = useCallback(async () => {
    if (subLoading) return;
    setSubLoading(true);

    try {
      const count = await scheduleSubscriptionReminders(
        subscriptionReminderTime
      );
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
  }, [
    subLoading,
    subscriptionReminderTime,
    setLastSubscriptionReminderSync,
    refreshCounts,
  ]);

  const handleSubTimeChange = useCallback(
    async (_event: unknown, selectedDate?: Date) => {
      if (Platform.OS === "android") {
        setShowSubTimePicker(false);
      }

      if (selectedDate) {
        const hours = String(selectedDate.getHours()).padStart(2, "0");
        const mins = String(selectedDate.getMinutes()).padStart(2, "0");
        const newTime = `${hours}:${mins}`;
        setSubscriptionReminderTime(newTime);

        // Reschedule if enabled
        if (subscriptionRemindersEnabled) {
          try {
            await scheduleSubscriptionReminders(newTime);
            setLastSubscriptionReminderSync(Date.now());
            await refreshCounts();
          } catch (error) {
            console.error(
              "[Reminders] Failed to reschedule subscription reminders:",
              error
            );
          }
        }
      }

      if (Platform.OS === "ios") {
        setShowSubTimePicker(false);
      }
    },
    [
      subscriptionRemindersEnabled,
      setSubscriptionReminderTime,
      setLastSubscriptionReminderSync,
      refreshCounts,
    ]
  );

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

      // On iOS, dismiss the picker
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

  const subTimePickerValue = (() => {
    const [h, m] = subscriptionReminderTime.split(":").map(Number);
    const d = new Date();
    d.setHours(h, m, 0, 0);
    return d;
  })();

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

        <View
          style={{
            alignItems: "flex-start",
            paddingHorizontal: 20,
            marginBottom: 8,
          }}
        >
          <Button
            mode="text"
            onPress={handleViewReminders}
            compact
            icon="format-list-bulleted"
          >
            View active reminders
          </Button>
        </View>

        {/* ── Android: Alarms & Reminders permission banner ── */}
        {Platform.OS === "android" && !exactAlarmGranted && (
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={openAlarmPermissionSettings}
            style={[styles.alarmBanner, { borderColor: theme.colors.error }]}
          >
            <View style={styles.alarmBannerRow}>
              <MaterialCommunityIcons
                name="alarm-light-outline"
                size={22}
                color={theme.colors.error}
                style={{ marginRight: 10, marginTop: 1 }}
              />
              <View style={{ flex: 1 }}>
                <Text
                  variant="titleSmall"
                  style={[
                    styles.alarmBannerTitle,
                    { color: theme.colors.error },
                  ]}
                >
                  Alarms &amp; Reminders Permission Required
                </Text>
                <Text
                  variant="bodySmall"
                  style={[
                    styles.alarmBannerBody,
                    { color: theme.colors.onSurfaceVariant },
                  ]}
                >
                  Android 12+ requires a special permission for exact alarms to
                  fire. Your reminders may be silently skipped until you enable
                  it.
                </Text>
              </View>
            </View>
            <View style={styles.alarmBannerFooter}>
              <MaterialCommunityIcons
                name="open-in-new"
                size={14}
                color={theme.colors.error}
              />
              <Text
                variant="labelMedium"
                style={[styles.alarmBannerLink, { color: theme.colors.error }]}
              >
                Tap to open Alarms &amp; Reminders settings
              </Text>
            </View>
          </TouchableOpacity>
        )}

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

                <Divider style={styles.divider} />
                <List.Item
                  title="Reminder Time"
                  description={formatTime(subscriptionReminderTime)}
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
                  onPress={() => setShowSubTimePicker(true)}
                  titleStyle={styles.listTitle}
                  descriptionStyle={[
                    styles.listDescription,
                    { color: theme.colors.primary, fontWeight: "600" },
                  ]}
                  style={styles.pressableItem}
                />

                {showSubTimePicker && (
                  <DateTimePicker
                    value={subTimePickerValue}
                    mode="time"
                    display={Platform.OS === "ios" ? "spinner" : "default"}
                    onChange={handleSubTimeChange}
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
                    Reminders are scheduled for the next 90 days. Notifications
                    fire at {formatTime(subscriptionReminderTime)} on the day
                    subscriptions are due. Reminders are refreshed when you open
                    the app or modify subscriptions.
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

      <Portal>
        <Dialog
          visible={showActiveReminders}
          onDismiss={() => setShowActiveReminders(false)}
          style={styles.dialog}
        >
          <Dialog.Title style={styles.dialogTitle}>
            Active Reminders
          </Dialog.Title>
          <Dialog.ScrollArea style={styles.dialogScrollArea}>
            <ScrollView contentContainerStyle={styles.dialogContent}>
              {activeRemindersList.length === 0 ? (
                <View style={styles.emptyState}>
                  <MaterialCommunityIcons
                    name="bell-off-outline"
                    size={36}
                    color={theme.colors.onSurfaceVariant}
                    style={{ opacity: 0.5, marginBottom: 8 }}
                  />
                  <Text
                    variant="bodyMedium"
                    style={{
                      color: theme.colors.onSurfaceVariant,
                      opacity: 0.7,
                    }}
                  >
                    No reminders scheduled
                  </Text>
                </View>
              ) : (
                <>
                  {/* Subscription section */}
                  {activeRemindersList.some(
                    (i) => i.type === "subscription"
                  ) && (
                    <>
                      <Text
                        variant="labelSmall"
                        style={[
                          styles.sectionLabel,
                          { color: theme.colors.onSurfaceVariant },
                        ]}
                      >
                        SUBSCRIPTIONS
                      </Text>
                      {activeRemindersList
                        .filter((i) => i.type === "subscription")
                        .map((item) => (
                          <View key={item.id} style={styles.reminderRow}>
                            <View style={styles.reminderRowLeft}>
                              <Text
                                variant="bodyMedium"
                                numberOfLines={1}
                                style={styles.reminderRowTitle}
                              >
                                {item.body || item.title}
                              </Text>
                              <Text
                                variant="bodySmall"
                                style={[
                                  styles.reminderRowSub,
                                  { color: theme.colors.onSurfaceVariant },
                                ]}
                              >
                                {item.triggerInfo}
                              </Text>
                            </View>
                          </View>
                        ))}
                    </>
                  )}

                  {/* Expense section */}
                  {activeRemindersList.some((i) => i.type === "expense") && (
                    <>
                      <Text
                        variant="labelSmall"
                        style={[
                          styles.sectionLabel,
                          { color: theme.colors.onSurfaceVariant },
                          activeRemindersList.some(
                            (i) => i.type === "subscription"
                          ) && { marginTop: 16 },
                        ]}
                      >
                        EXPENSE REMINDERS
                      </Text>
                      {activeRemindersList
                        .filter((i) => i.type === "expense")
                        .map((item) => (
                          <View key={item.id} style={styles.reminderRow}>
                            <View style={styles.reminderRowLeft}>
                              <Text
                                variant="bodyMedium"
                                numberOfLines={1}
                                style={styles.reminderRowTitle}
                              >
                                {item.body || item.title}
                              </Text>
                              <Text
                                variant="bodySmall"
                                style={[
                                  styles.reminderRowSub,
                                  { color: theme.colors.onSurfaceVariant },
                                ]}
                              >
                                {item.triggerInfo}
                              </Text>
                            </View>
                          </View>
                        ))}
                    </>
                  )}
                </>
              )}
            </ScrollView>
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <Button onPress={() => setShowActiveReminders(false)}>Close</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  alarmBanner: {
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    backgroundColor: "rgba(255, 82, 82, 0.07)",
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 10,
  },
  alarmBannerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  alarmBannerTitle: {
    fontWeight: "700",
    marginBottom: 3,
  },
  alarmBannerBody: {
    lineHeight: 17,
    opacity: 0.85,
  },
  alarmBannerFooter: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    gap: 4,
  },
  alarmBannerLink: {
    fontWeight: "600",
    textDecorationLine: "underline",
  },
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
  dialog: {
    maxHeight: "80%",
    borderRadius: 20,
  },
  dialogTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  dialogScrollArea: {
    paddingHorizontal: 0,
    borderTopWidth: 0,
    borderBottomWidth: 0,
  },
  dialogContent: {
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 32,
  },
  sectionLabel: {
    fontWeight: "700",
    letterSpacing: 0.8,
    marginBottom: 8,
    opacity: 0.6,
  },
  reminderRow: {
    paddingVertical: 8,
  },
  reminderRowLeft: {
    flex: 1,
  },
  reminderRowTitle: {
    fontWeight: "500",
    marginBottom: 2,
  },
  reminderRowSub: {
    opacity: 0.7,
    fontSize: 12,
  },
});
