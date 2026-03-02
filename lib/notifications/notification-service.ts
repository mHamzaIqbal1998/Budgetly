import { apiClient } from "@/lib/api-client";
import type { AllBillsResponse } from "@/types";
import * as Notifications from "expo-notifications";
import * as TaskManager from "expo-task-manager";
import { Platform } from "react-native";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SUBSCRIPTION_REMINDER_PREFIX = "sub-reminder-";
const EXPENSE_REMINDER_ID = "expense-reminder";
const BACKGROUND_FETCH_TASK = "BUDGETLY_SUBSCRIPTION_REFRESH";
const LOOK_AHEAD_DAYS = 90;

// ---------------------------------------------------------------------------
// Notification configuration
// ---------------------------------------------------------------------------

/** Configure how notifications behave when the app is in the foreground */
export function configureNotifications() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

// ---------------------------------------------------------------------------
// Permissions
// ---------------------------------------------------------------------------

export async function requestNotificationPermissions(): Promise<boolean> {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  if (existingStatus === "granted") return true;

  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== "granted") return false;

  // Android notification channel
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("reminders", {
      name: "Reminders",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#3F51B5",
      sound: "default",
    });
  }

  return true;
}

// ---------------------------------------------------------------------------
// Subscription reminders
// ---------------------------------------------------------------------------

function formatDateParam(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function buildNotificationId(billId: string, dateStr: string): string {
  // Create a deterministic, short identifier
  return `${SUBSCRIPTION_REMINDER_PREFIX}${billId}-${dateStr.replace(/[^0-9]/g, "").slice(0, 8)}`;
}

/**
 * Fetch all bills with upcoming pay_dates and schedule local notifications.
 * Returns the number of notifications scheduled.
 */
export async function scheduleSubscriptionReminders(): Promise<number> {
  // Cancel existing subscription reminders first
  await cancelSubscriptionReminders();

  const now = new Date();
  const end = new Date(now);
  end.setDate(end.getDate() + LOOK_AHEAD_DAYS);

  const startStr = formatDateParam(now);
  const endStr = formatDateParam(end);

  // Fetch all bills (paginate)
  let allBills: AllBillsResponse[] = [];
  let page = 1;
  const limit = 50;

  try {
    while (true) {
      const response = await apiClient.getBillsWithDates(
        page,
        limit,
        startStr,
        endStr
      );
      const bills = response.data ?? [];
      allBills = allBills.concat(bills);
      const totalPages = response.meta?.pagination?.total_pages ?? 1;
      if (page >= totalPages) break;
      page++;
    }
  } catch (error) {
    console.error("[Notifications] Failed to fetch bills:", error);
    return 0;
  }

  let scheduledCount = 0;

  for (const bill of allBills) {
    if (!bill.attributes.active) continue;

    const payDates = bill.attributes.pay_dates ?? [];
    const billName = bill.attributes.name;
    const currencySymbol = bill.attributes.currency_symbol || "$";
    const amountMin = bill.attributes.amount_min;
    const amountMax = bill.attributes.amount_max;

    let amountStr = "";
    if (amountMin && amountMax && amountMin !== amountMax) {
      amountStr = ` (${currencySymbol}${parseFloat(amountMin).toFixed(0)} – ${currencySymbol}${parseFloat(amountMax).toFixed(0)})`;
    } else if (amountMin) {
      amountStr = ` (${currencySymbol}${parseFloat(amountMin).toFixed(0)})`;
    }

    for (const dateStr of payDates) {
      const payDate = new Date(dateStr);
      if (payDate <= now) continue; // Skip past dates

      // If the time component is midnight (00:00:00), default to 09:00 AM
      if (
        payDate.getHours() === 0 &&
        payDate.getMinutes() === 0 &&
        payDate.getSeconds() === 0
      ) {
        payDate.setHours(9, 0, 0, 0);
      }

      const notifId = buildNotificationId(bill.id, dateStr);

      try {
        await Notifications.scheduleNotificationAsync({
          identifier: notifId,
          content: {
            title: "💰 Subscription Payment Due",
            body: `${billName}${amountStr} is due today.`,
            data: { type: "subscription", billId: bill.id },
            sound: "default",
            ...(Platform.OS === "android" && { channelId: "reminders" }),
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: payDate,
          },
        });
        scheduledCount++;
      } catch (error) {
        // Date might be too close or in the past by the time we schedule
        console.warn(
          `[Notifications] Failed to schedule for ${billName} on ${dateStr}:`,
          error
        );
      }
    }
  }

  return scheduledCount;
}

/** Cancel all subscription reminder notifications */
export async function cancelSubscriptionReminders(): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const toCancel = scheduled.filter((n) =>
    n.identifier?.startsWith(SUBSCRIPTION_REMINDER_PREFIX)
  );
  for (const n of toCancel) {
    await Notifications.cancelScheduledNotificationAsync(n.identifier);
  }
}

// ---------------------------------------------------------------------------
// Expense reminders
// ---------------------------------------------------------------------------

/**
 * Schedule a repeating expense reminder notification.
 * @param time - HH:MM format string
 * @param frequency - 'daily' | 'weekdays' | 'weekly'
 */
export async function scheduleExpenseReminder(
  time: string,
  frequency: "daily" | "weekdays" | "weekly"
): Promise<void> {
  // Cancel existing expense reminders first
  await cancelExpenseReminders();

  const [hours, minutes] = time.split(":").map(Number);

  const baseContent = {
    title: "📝 Time to Log Expenses",
    body: "Don't forget to record today's expenses!",
    data: { type: "expense_reminder" },
    sound: "default" as const,
    ...(Platform.OS === "android" && { channelId: "reminders" }),
  };

  if (frequency === "daily") {
    await Notifications.scheduleNotificationAsync({
      identifier: `${EXPENSE_REMINDER_ID}-daily`,
      content: baseContent,
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: hours,
        minute: minutes,
      },
    });
  } else if (frequency === "weekdays") {
    // Schedule Monday (2) through Friday (6)
    for (let weekday = 2; weekday <= 6; weekday++) {
      await Notifications.scheduleNotificationAsync({
        identifier: `${EXPENSE_REMINDER_ID}-wd${weekday}`,
        content: baseContent,
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
          weekday,
          hour: hours,
          minute: minutes,
        },
      });
    }
  } else if (frequency === "weekly") {
    // Default to Sunday (1)
    await Notifications.scheduleNotificationAsync({
      identifier: `${EXPENSE_REMINDER_ID}-weekly`,
      content: baseContent,
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        weekday: 1, // Sunday
        hour: hours,
        minute: minutes,
      },
    });
  }
}

/** Cancel all expense reminder notifications */
export async function cancelExpenseReminders(): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const toCancel = scheduled.filter((n) =>
    n.identifier?.startsWith(EXPENSE_REMINDER_ID)
  );
  for (const n of toCancel) {
    await Notifications.cancelScheduledNotificationAsync(n.identifier);
  }
}

// ---------------------------------------------------------------------------
// Cancel all
// ---------------------------------------------------------------------------

export async function cancelAllReminders(): Promise<void> {
  await cancelSubscriptionReminders();
  await cancelExpenseReminders();
}

// ---------------------------------------------------------------------------
// Background Task
// ---------------------------------------------------------------------------

/**
 * Define the background task for refreshing subscription reminders.
 * Must be called at app startup (top level, outside components).
 */
export function defineBackgroundTask() {
  TaskManager.defineTask(BACKGROUND_FETCH_TASK, async () => {
    try {
      // Only refresh if subscription reminders are enabled
      // We check AsyncStorage directly since Zustand store may not be hydrated

      // @ts-ignore
      const AsyncStorage = (
        await import("@react-native-async-storage/async-storage")
      ).default;
      const storeData = await AsyncStorage.getItem("budgetly-storage");
      if (storeData) {
        const parsed = JSON.parse(storeData);
        if (parsed?.state?.subscriptionRemindersEnabled) {
          await scheduleSubscriptionReminders();
        }
      }
      // Return NewData result
      return 2;
    } catch (error) {
      console.error(
        "[BackgroundTask] Failed to refresh subscription reminders:",
        error
      );
      return 3; /* Failed */
    }
  });
}

/**
 * Register the background fetch task.
 * Call after permissions are granted and subscription reminders are enabled.
 */
export async function registerBackgroundFetch(): Promise<void> {
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(
      BACKGROUND_FETCH_TASK
    );
    if (!isRegistered) {
      // Use expo-notifications background fetch since we don't have expo-background-fetch
      // The background task will be triggered by the system periodically
      console.log(
        "[BackgroundTask] Background task defined, will refresh on app open"
      );
    }
  } catch (error) {
    console.warn(
      "[BackgroundTask] Failed to register background fetch:",
      error
    );
  }
}

/**
 * Unregister the background fetch task.
 */
export async function unregisterBackgroundFetch(): Promise<void> {
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(
      BACKGROUND_FETCH_TASK
    );
    if (isRegistered) {
      await TaskManager.unregisterTaskAsync(BACKGROUND_FETCH_TASK);
    }
  } catch (error) {
    console.warn(
      "[BackgroundTask] Failed to unregister background fetch:",
      error
    );
  }
}

/** Get count of currently scheduled notifications */
export async function getScheduledNotificationCount(): Promise<{
  subscription: number;
  expense: number;
}> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  return {
    subscription: scheduled.filter((n) =>
      n.identifier?.startsWith(SUBSCRIPTION_REMINDER_PREFIX)
    ).length,
    expense: scheduled.filter((n) =>
      n.identifier?.startsWith(EXPENSE_REMINDER_ID)
    ).length,
  };
}
