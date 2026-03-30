import type { ReminderFrequency } from "@/lib/store/reminder";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

// Configure how notifications are handled when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const REMINDER_CATEGORY = "expense-reminder";

/**
 * Request notification permissions from the user.
 * Returns true if permissions were granted.
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  return finalStatus === "granted";
}

/**
 * Initialize the Android notification channel (no-op on iOS).
 */
export async function initNotificationChannel(): Promise<void> {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("reminders", {
      name: "Expense Reminders",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      sound: "default",
    });
    await Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  }
}

/**
 * Cancel all previously scheduled reminder notifications.
 */
export async function cancelAllReminders(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

/**
 * Schedule reminder notifications based on the selected frequency and time.
 */
export async function scheduleReminder(
  frequency: ReminderFrequency,
  hour: number,
  minute: number
): Promise<void> {
  // Cancel any existing reminders first
  await cancelAllReminders();

  const notificationContent: Notifications.NotificationContentInput = {
    title: "💰 Log Your Expenses",
    body: "Don't forget to record today's expenses in Budgetly!",
    sound: "default",
    categoryIdentifier: REMINDER_CATEGORY,
    ...(Platform.OS === "android" && {
      channelId: "reminders",
      priority: Notifications.AndroidNotificationPriority.MAX,
    }),
  };

  switch (frequency) {
    case "daily":
      await Notifications.scheduleNotificationAsync({
        content: notificationContent,
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour,
          minute,
        },
      });
      break;

    case "weekday":
      // Schedule for Monday (2) through Friday (6)
      for (let weekday = 2; weekday <= 6; weekday++) {
        await Notifications.scheduleNotificationAsync({
          content: notificationContent,
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
            weekday,
            hour,
            minute,
          },
        });
      }
      break;

    case "weekly":
      // Schedule for Sunday (1)
      await Notifications.scheduleNotificationAsync({
        content: notificationContent,
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
          weekday: 1,
          hour,
          minute,
        },
      });
      break;
  }
}
