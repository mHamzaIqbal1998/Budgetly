import type { StateCreator } from "zustand";

// ---------------------------------------------------------------------------
// Default notification content
// ---------------------------------------------------------------------------

export const DEFAULT_EXPENSE_REMINDER_TITLE = "📝 Time to Log Expenses";
export const DEFAULT_EXPENSE_REMINDER_BODY =
  "Don't forget to record today's expenses!";
export const DEFAULT_SUBSCRIPTION_REMINDER_TITLE =
  "💰 Subscription Payment Due";
export const DEFAULT_SUBSCRIPTION_REMINDER_BODY =
  "{{name}}{{amount}} is due today.";

// ---------------------------------------------------------------------------
// Slice
// ---------------------------------------------------------------------------

export interface ReminderSlice {
  // Subscription reminders
  subscriptionRemindersEnabled: boolean;
  subscriptionReminderTime: string; // HH:MM format
  lastSubscriptionReminderSync: number | null;
  subscriptionReminderTitle: string;
  subscriptionReminderBody: string;

  // Expense reminders
  expenseReminderEnabled: boolean;
  expenseReminderFrequency: "daily" | "weekdays" | "weekly";
  expenseReminderTime: string; // HH:MM format
  expenseReminderTitle: string;
  expenseReminderBody: string;

  // Actions
  setSubscriptionRemindersEnabled: (enabled: boolean) => void;
  setSubscriptionReminderTime: (time: string) => void;
  setLastSubscriptionReminderSync: (ts: number) => void;
  setSubscriptionReminderTitle: (title: string) => void;
  setSubscriptionReminderBody: (body: string) => void;
  setExpenseReminderEnabled: (enabled: boolean) => void;
  setExpenseReminderFrequency: (freq: "daily" | "weekdays" | "weekly") => void;
  setExpenseReminderTime: (time: string) => void;
  setExpenseReminderTitle: (title: string) => void;
  setExpenseReminderBody: (body: string) => void;
}

export const createReminderSlice: StateCreator<ReminderSlice> = (set) => ({
  subscriptionRemindersEnabled: false,
  subscriptionReminderTime: "09:00",
  lastSubscriptionReminderSync: null,
  subscriptionReminderTitle: DEFAULT_SUBSCRIPTION_REMINDER_TITLE,
  subscriptionReminderBody: DEFAULT_SUBSCRIPTION_REMINDER_BODY,

  expenseReminderEnabled: false,
  expenseReminderFrequency: "daily",
  expenseReminderTime: "20:00",
  expenseReminderTitle: DEFAULT_EXPENSE_REMINDER_TITLE,
  expenseReminderBody: DEFAULT_EXPENSE_REMINDER_BODY,

  setSubscriptionRemindersEnabled: (enabled) =>
    set({ subscriptionRemindersEnabled: enabled }),
  setSubscriptionReminderTime: (time) =>
    set({ subscriptionReminderTime: time }),
  setLastSubscriptionReminderSync: (ts) =>
    set({ lastSubscriptionReminderSync: ts }),
  setSubscriptionReminderTitle: (title) =>
    set({ subscriptionReminderTitle: title }),
  setSubscriptionReminderBody: (body) =>
    set({ subscriptionReminderBody: body }),
  setExpenseReminderEnabled: (enabled) =>
    set({ expenseReminderEnabled: enabled }),
  setExpenseReminderFrequency: (freq) =>
    set({ expenseReminderFrequency: freq }),
  setExpenseReminderTime: (time) => set({ expenseReminderTime: time }),
  setExpenseReminderTitle: (title) => set({ expenseReminderTitle: title }),
  setExpenseReminderBody: (body) => set({ expenseReminderBody: body }),
});
