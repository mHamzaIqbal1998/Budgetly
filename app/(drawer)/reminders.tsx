// Reminders Screen
import { GlassCard } from "@/components/glass-card";
import { useStore } from "@/lib/store";
import type { ReminderFrequency } from "@/lib/store/reminder";
import {
  cancelAllReminders,
  initNotificationChannel,
  requestNotificationPermissions,
  scheduleReminder,
} from "@/lib/utils/notification-service";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import DateTimePicker, {
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Platform, ScrollView, StyleSheet, View } from "react-native";
import {
  Card,
  Divider,
  List,
  SegmentedButtons,
  Switch,
  Text,
  useTheme,
} from "react-native-paper";

export default function RemindersScreen() {
  const theme = useTheme();
  const {
    reminderEnabled,
    reminderFrequency,
    reminderHour,
    reminderMinute,
    setReminderEnabled,
    setReminderFrequency,
    setReminderTime,
  } = useStore();

  const [showTimePicker, setShowTimePicker] = useState(false);

  // Initialize notification channel on mount
  useEffect(() => {
    initNotificationChannel();
  }, []);

  // Build a Date object for the time picker
  const timeValue = useMemo(() => {
    const d = new Date();
    d.setHours(reminderHour, reminderMinute, 0, 0);
    return d;
  }, [reminderHour, reminderMinute]);

  // Format time for display
  const formattedTime = useMemo(() => {
    const h = reminderHour % 12 || 12;
    const ampm = reminderHour >= 12 ? "PM" : "AM";
    const m = reminderMinute.toString().padStart(2, "0");
    return `${h}:${m} ${ampm}`;
  }, [reminderHour, reminderMinute]);

  // Human-readable schedule summary
  const scheduleSummary = useMemo(() => {
    if (!reminderEnabled) return "Reminders are disabled";
    const freqLabel =
      reminderFrequency === "daily"
        ? "Every day"
        : reminderFrequency === "weekday"
          ? "Weekdays (Mon–Fri)"
          : "Every Sunday";
    return `${freqLabel} at ${formattedTime}`;
  }, [reminderEnabled, reminderFrequency, formattedTime]);

  const handleToggle = useCallback(async () => {
    if (!reminderEnabled) {
      // Turning ON — request permissions first
      const granted = await requestNotificationPermissions();
      if (!granted) {
        Alert.alert(
          "Permission Required",
          "Please enable notifications in your device settings to use reminders."
        );
        return;
      }
      setReminderEnabled(true);
      await scheduleReminder(reminderFrequency, reminderHour, reminderMinute);
    } else {
      // Turning OFF
      setReminderEnabled(false);
      await cancelAllReminders();
    }
  }, [
    reminderEnabled,
    reminderFrequency,
    reminderHour,
    reminderMinute,
    setReminderEnabled,
  ]);

  const handleFrequencyChange = useCallback(
    async (value: string) => {
      const freq = value as ReminderFrequency;
      setReminderFrequency(freq);
      if (reminderEnabled) {
        await scheduleReminder(freq, reminderHour, reminderMinute);
      }
    },
    [reminderEnabled, reminderHour, reminderMinute, setReminderFrequency]
  );

  const handleTimeChange = useCallback(
    async (_event: DateTimePickerEvent, selectedDate?: Date) => {
      if (Platform.OS === "android") {
        setShowTimePicker(false);
      }
      if (selectedDate) {
        const h = selectedDate.getHours();
        const m = selectedDate.getMinutes();
        setReminderTime(h, m);
        if (reminderEnabled) {
          await scheduleReminder(reminderFrequency, h, m);
        }
      }
    },
    [reminderEnabled, reminderFrequency, setReminderTime]
  );

  const frequencyIcon = useMemo(() => {
    switch (reminderFrequency) {
      case "daily":
        return "calendar-today";
      case "weekday":
        return "briefcase-outline";
      case "weekly":
        return "calendar-week";
      default:
        return "calendar-today";
    }
  }, [reminderFrequency]);

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <ScrollView style={styles.scrollView}>
        {/* Reminder Toggle Section */}
        <GlassCard variant="elevated" style={styles.card}>
          <Card.Title
            title="Expense Reminders"
            titleStyle={styles.cardTitle}
            left={() => (
              <MaterialCommunityIcons
                name="bell-ring"
                size={24}
                color={theme.colors.primary}
              />
            )}
          />
          <Card.Content style={styles.cardContent}>
            <List.Item
              title="Enable Reminders"
              description="Get notified to log your expenses"
              left={() => (
                <MaterialCommunityIcons
                  name="bell-outline"
                  size={24}
                  color={theme.colors.onSurfaceVariant}
                  style={styles.listIcon}
                />
              )}
              right={() => (
                <Switch
                  value={reminderEnabled}
                  onValueChange={handleToggle}
                  color={theme.colors.primary}
                />
              )}
              titleStyle={styles.listTitle}
              descriptionStyle={styles.listDescription}
            />
          </Card.Content>
        </GlassCard>

        {/* Frequency Section — only visible when enabled */}
        {reminderEnabled && (
          <GlassCard variant="elevated" style={styles.card}>
            <Card.Title
              title="Frequency"
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
              <View style={styles.frequencyHeader}>
                <MaterialCommunityIcons
                  name={frequencyIcon as "calendar-today"}
                  size={24}
                  color={theme.colors.onSurfaceVariant}
                  style={styles.listIcon}
                />
                <View style={styles.frequencyTextContainer}>
                  <Text variant="bodyLarge" style={styles.listTitle}>
                    Repeat
                  </Text>
                  <Text variant="bodySmall" style={styles.listDescription}>
                    {reminderFrequency === "daily"
                      ? "Every day"
                      : reminderFrequency === "weekday"
                        ? "Monday through Friday"
                        : "Once a week (Sunday)"}
                  </Text>
                </View>
              </View>
              <View style={styles.frequencySelector}>
                <SegmentedButtons
                  value={reminderFrequency}
                  onValueChange={handleFrequencyChange}
                  buttons={[
                    {
                      value: "daily",
                      label: "Daily",
                      icon: "calendar-today",
                    },
                    {
                      value: "weekday",
                      label: "Weekdays",
                      icon: "briefcase-outline",
                    },
                    {
                      value: "weekly",
                      label: "Weekly",
                      icon: "calendar-week",
                    },
                  ]}
                  style={styles.segmentedButtons}
                />
              </View>
            </Card.Content>
          </GlassCard>
        )}

        {/* Time Section — only visible when enabled */}
        {reminderEnabled && (
          <GlassCard variant="elevated" style={styles.card}>
            <Card.Title
              title="Reminder Time"
              titleStyle={styles.cardTitle}
              left={() => (
                <MaterialCommunityIcons
                  name="clock-outline"
                  size={24}
                  color={theme.colors.primary}
                />
              )}
            />
            <Card.Content style={styles.cardContent}>
              <List.Item
                title="Time"
                description={formattedTime}
                left={() => (
                  <MaterialCommunityIcons
                    name="clock-time-eight-outline"
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
                descriptionStyle={styles.listDescription}
                style={styles.pressableItem}
              />

              {/* Inline time picker for iOS, modal for Android */}
              {showTimePicker && Platform.OS === "android" && (
                <DateTimePicker
                  value={timeValue}
                  mode="time"
                  is24Hour={false}
                  onChange={handleTimeChange}
                />
              )}
              {Platform.OS === "ios" && (
                <>
                  <Divider style={styles.divider} />
                  <View style={styles.iosPickerContainer}>
                    <DateTimePicker
                      value={timeValue}
                      mode="time"
                      is24Hour={false}
                      display="spinner"
                      onChange={handleTimeChange}
                      textColor={theme.colors.onSurface}
                      style={styles.iosPicker}
                    />
                  </View>
                </>
              )}
            </Card.Content>
          </GlassCard>
        )}

        {/* Schedule Summary */}
        <GlassCard variant="elevated" style={styles.card}>
          <Card.Title
            title="Status"
            titleStyle={styles.cardTitle}
            left={() => (
              <MaterialCommunityIcons
                name="information-outline"
                size={24}
                color={theme.colors.primary}
              />
            )}
          />
          <Card.Content style={styles.cardContent}>
            <List.Item
              title="Current Schedule"
              description={scheduleSummary}
              left={() => (
                <MaterialCommunityIcons
                  name={reminderEnabled ? "bell-check" : "bell-off-outline"}
                  size={24}
                  color={
                    reminderEnabled
                      ? theme.colors.primary
                      : theme.colors.onSurfaceVariant
                  }
                  style={styles.listIcon}
                />
              )}
              titleStyle={styles.listTitle}
              descriptionStyle={styles.listDescription}
            />
          </Card.Content>
        </GlassCard>

        <View style={{ height: 40 }} />
      </ScrollView>
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
  frequencySelector: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  segmentedButtons: {
    borderRadius: 12,
  },
  iosPickerContainer: {
    alignItems: "center",
    paddingVertical: 8,
  },
  iosPicker: {
    width: "100%",
    height: 180,
  },
});
