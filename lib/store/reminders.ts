import type { StateCreator } from "zustand";

export interface ReminderSlice {
  // Subscription reminders
  subscriptionRemindersEnabled: boolean;
  lastSubscriptionReminderSync: number | null;

  // Expense reminders
  expenseReminderEnabled: boolean;
  expenseReminderFrequency: "daily" | "weekdays" | "weekly";
  expenseReminderTime: string; // HH:MM format

  // Actions
  setSubscriptionRemindersEnabled: (enabled: boolean) => void;
  setLastSubscriptionReminderSync: (ts: number) => void;
  setExpenseReminderEnabled: (enabled: boolean) => void;
  setExpenseReminderFrequency: (freq: "daily" | "weekdays" | "weekly") => void;
  setExpenseReminderTime: (time: string) => void;
}

export const createReminderSlice: StateCreator<ReminderSlice> = (set) => ({
  subscriptionRemindersEnabled: false,
  lastSubscriptionReminderSync: null,

  expenseReminderEnabled: false,
  expenseReminderFrequency: "daily",
  expenseReminderTime: "20:00",

  setSubscriptionRemindersEnabled: (enabled) =>
    set({ subscriptionRemindersEnabled: enabled }),
  setLastSubscriptionReminderSync: (ts) =>
    set({ lastSubscriptionReminderSync: ts }),
  setExpenseReminderEnabled: (enabled) =>
    set({ expenseReminderEnabled: enabled }),
  setExpenseReminderFrequency: (freq) =>
    set({ expenseReminderFrequency: freq }),
  setExpenseReminderTime: (time) => set({ expenseReminderTime: time }),
});
