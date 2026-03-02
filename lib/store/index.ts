import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { createBiometricSlice } from "./biometric";
import { createCacheSlice } from "./cache-slice";
import { createCredentialsSlice } from "./credentials";
import { createDashboardSlice } from "./dashboard-slice";
import { createPendingSlice } from "./pending";
import { createReminderSlice } from "./reminders";
import type { AppState } from "./types";
import { createUiSlice } from "./ui";

export const useStore = create<AppState>()(
  persist(
    (...a) => ({
      ...createCredentialsSlice(...a),
      ...createUiSlice(...a),
      ...createBiometricSlice(...a),
      ...createCacheSlice(...a),
      ...createPendingSlice(...a),
      ...createDashboardSlice(...a),
      ...createReminderSlice(...a),
    }),
    {
      name: "budgetly-storage",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        balanceVisible: state.balanceVisible,
        cachedAccounts: state.cachedAccounts,
        cachedTransactions: state.cachedTransactions,
        cachedBudgetLimits: state.cachedBudgetLimits,
        cachedExpensesByRange: state.cachedExpensesByRange,
        lastAccountsSync: state.lastAccountsSync,
        lastTransactionsSync: state.lastTransactionsSync,
        lastBudgetLimitsSync: state.lastBudgetLimitsSync,
        pendingTransactions: state.pendingTransactions,
        dashboardVisibleSectionIds: state.dashboardVisibleSectionIds,
        dashboardHiddenSectionIds: state.dashboardHiddenSectionIds,
        themeMode: state.themeMode,
        biometricEnabled: state.biometricEnabled,
        subscriptionRemindersEnabled: state.subscriptionRemindersEnabled,
        subscriptionReminderTime: state.subscriptionReminderTime,
        lastSubscriptionReminderSync: state.lastSubscriptionReminderSync,
        expenseReminderEnabled: state.expenseReminderEnabled,
        expenseReminderFrequency: state.expenseReminderFrequency,
        expenseReminderTime: state.expenseReminderTime,
      }),
    }
  )
);

export type { AppState } from "./types";
