import { apiClient } from "@/lib/api-client";
import type { AllBillsResponse } from "@/types";
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import * as TaskManager from "expo-task-manager";
import { Linking, Platform } from "react-native";

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
// Android exact-alarm special permission (Android 12+ / API 31+)
// ---------------------------------------------------------------------------

/**
 * On Android 12+ (API 31+) the system requires the special "Alarms & Reminders"
 * permission (SCHEDULE_EXACT_ALARM / USE_EXACT_ALARM) for exact alarms to fire.
 * This permission is controlled by the user in Settings → Apps → Special App Access
 * → Alarms & Reminders. Without it, scheduled notifications are silently dropped.
 *
 * Returns `true` if exact alarms are allowed (or on iOS / older Android).
 */
export async function checkExactAlarmPermission(): Promise<boolean> {
  if (Platform.OS !== "android") return true;

  try {
    // expo-notifications exposes this on SDK 50+
    const result = await (
      Notifications as unknown as {
        canScheduleExactNotificationsAsync?: () => Promise<boolean>;
      }
    ).canScheduleExactNotificationsAsync?.();
    // If the API isn't available (SDK < 50 or older Android), assume ok
    if (result === undefined || result === null) return true;
    return result;
  } catch {
    return true;
  }
}

/**
 * Open the system Alarms & Reminders special-app-access settings screen so the
 * user can grant SCHEDULE_EXACT_ALARM for this app.
 *
 * Passes the app package as a URI so Samsung One UI / OEM builds open the
 * per-app toggle directly, rather than the global list of all apps.
 */
export async function openAlarmPermissionSettings(): Promise<void> {
  if (Platform.OS !== "android") return;

  // Read package name from Expo config (expo-constants is a project dependency)
  const packageName: string =
    (Constants.expoConfig?.android?.package as string | undefined) ??
    "com.budgetly.app";

  try {
    // Package URI form — forces Samsung One UI / OEM builds to the per-app toggle
    await Linking.openURL(
      `android.settings.REQUEST_SCHEDULE_EXACT_ALARM:package:${packageName}`
    );
  } catch {
    try {
      // Fallback 1: plain action intent (standard Android 12+)
      await Linking.sendIntent("android.settings.REQUEST_SCHEDULE_EXACT_ALARM");
    } catch {
      // Fallback 2: open the app's own settings page
      await Linking.openSettings();
    }
  }
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
 * @param reminderTime - HH:MM format string for time-of-day notifications fire (default: "09:00")
 * Returns the number of notifications scheduled.
 */
export async function scheduleSubscriptionReminders(
  reminderTime: string = "09:00"
): Promise<number> {
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

      // Set the user-configured reminder time BEFORE checking if it's past
      const parts = reminderTime.split(":").map(Number);
      const rHours = !isNaN(parts[0]) ? parts[0] : 9;
      const rMinutes = !isNaN(parts[1]) ? parts[1] : 0;
      payDate.setHours(rHours, rMinutes, 0, 0);

      if (payDate <= now) continue; // Skip dates+times already past

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
          const reminderTime =
            parsed?.state?.subscriptionReminderTime || "09:00";
          await scheduleSubscriptionReminders(reminderTime);
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
 * Note: expo-background-fetch is not installed, so this project relies on
 * app-open refreshes (via scheduleSubscriptionReminders on focus) instead of
 * true background wakeups. This function is a no-op kept for API symmetry.
 */
export async function registerBackgroundFetch(): Promise<void> {
  // No-op: background fetch requires expo-background-fetch which is not a
  // dependency. Subscription reminders are refreshed on app open instead.
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

export interface ScheduledNotificationInfo {
  id: string;
  type: "subscription" | "expense";
  title: string;
  body: string;
  triggerInfo: string;
}

const MONTH_ABBR = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function formatTime12h(hours: number, minutes: number): string {
  const period = hours >= 12 ? "PM" : "AM";
  const h12 = hours % 12 || 12;
  return `${h12}:${String(minutes).padStart(2, "0")} ${period}`;
}

/**
 * Get detailed list of currently scheduled notifications.
 * @param subReminderTime - subscription reminder time in HH:MM (used to display time on date entries)
 * @param expReminderTime - expense reminder time in HH:MM
 */
export async function getScheduledNotificationsList(
  subReminderTime: string = "09:00",
  expReminderTime: string = "09:00"
): Promise<ScheduledNotificationInfo[]> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();

  const subTimeParts = subReminderTime.split(":").map(Number);
  const subH = !isNaN(subTimeParts[0]) ? subTimeParts[0] : 9;
  const subM = !isNaN(subTimeParts[1]) ? subTimeParts[1] : 0;

  const expTimeParts = expReminderTime.split(":").map(Number);
  const expH = !isNaN(expTimeParts[0]) ? expTimeParts[0] : 9;
  const expM = !isNaN(expTimeParts[1]) ? expTimeParts[1] : 0;

  return scheduled.map((n) => {
    let type: "subscription" | "expense" = "expense";
    let triggerInfo = "Unknown";

    if (n.identifier?.startsWith(SUBSCRIPTION_REMINDER_PREFIX)) {
      type = "subscription";
      const parts = n.identifier.split("-");
      const lastPart = parts[parts.length - 1]; // "YYYYMMDD"
      if (lastPart && lastPart.length === 8 && !isNaN(Number(lastPart))) {
        const dd = lastPart.slice(6, 8);
        const mmIdx = parseInt(lastPart.slice(4, 6), 10) - 1;
        const yyyy = lastPart.slice(0, 4);
        const month = MONTH_ABBR[mmIdx] || lastPart.slice(4, 6);
        triggerInfo = `${dd}-${month}-${yyyy}  ${formatTime12h(subH, subM)}`;
      }
    } else if (n.identifier?.startsWith(EXPENSE_REMINDER_ID)) {
      type = "expense";
      let freq = "Repeating";
      const wdMatch = n.identifier.match(/-wd(\d)$/);

      if (n.identifier.includes("daily")) {
        freq = "Daily";
      } else if (wdMatch) {
        const wdMap: Record<number, string> = {
          1: "Every Sunday",
          2: "Every Monday",
          3: "Every Tuesday",
          4: "Every Wednesday",
          5: "Every Thursday",
          6: "Every Friday",
          7: "Every Saturday",
        };
        freq = wdMap[parseInt(wdMatch[1], 10)] ?? "Weekdays";
      } else if (n.identifier.includes("weekly")) {
        freq = "Every Sunday";
      }
      triggerInfo = `${freq}  ·  ${formatTime12h(expH, expM)}`;
    }

    return {
      id: n.identifier || "unknown",
      type,
      title: n.content.title || "Reminder",
      body: n.content.body || "",
      triggerInfo,
    };
  });
}
