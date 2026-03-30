import type { StateCreator } from "zustand";
import type { AppState } from "./types";

export type ReminderFrequency = "daily" | "weekday" | "weekly";

export interface ReminderSlice {
  reminderEnabled: boolean;
  reminderFrequency: ReminderFrequency;
  reminderHour: number;
  reminderMinute: number;
  setReminderEnabled: (enabled: boolean) => void;
  setReminderFrequency: (frequency: ReminderFrequency) => void;
  setReminderTime: (hour: number, minute: number) => void;
}

export const createReminderSlice: StateCreator<
  AppState,
  [],
  [],
  ReminderSlice
> = (set) => ({
  reminderEnabled: false,
  reminderFrequency: "daily",
  reminderHour: 20,
  reminderMinute: 0,

  setReminderEnabled: (enabled: boolean) => {
    set({ reminderEnabled: enabled });
  },

  setReminderFrequency: (frequency: ReminderFrequency) => {
    set({ reminderFrequency: frequency });
  },

  setReminderTime: (hour: number, minute: number) => {
    set({ reminderHour: hour, reminderMinute: minute });
  },
});
