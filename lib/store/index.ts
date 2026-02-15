import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { createCacheSlice } from "./cache-slice";
import { createCredentialsSlice } from "./credentials";
import { createDashboardSlice } from "./dashboard-slice";
import { createPendingSlice } from "./pending";
import type { AppState } from "./types";
import { createUiSlice } from "./ui";

export const useStore = create<AppState>()(
  persist(
    (...a) => ({
      ...createCredentialsSlice(...a),
      ...createUiSlice(...a),
      ...createCacheSlice(...a),
      ...createPendingSlice(...a),
      ...createDashboardSlice(...a),
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
      }),
    }
  )
);

export type { AppState } from "./types";
