import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { AppState } from "./types";
import { createCredentialsSlice } from "./credentials";
import { createUiSlice } from "./ui";
import { createCacheSlice } from "./cache-slice";
import { createPendingSlice } from "./pending";

export const useStore = create<AppState>()(
  persist(
    (...a) => ({
      ...createCredentialsSlice(...a),
      ...createUiSlice(...a),
      ...createCacheSlice(...a),
      ...createPendingSlice(...a),
    }),
    {
      name: "budgetly-storage",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        balanceVisible: state.balanceVisible,
        cachedAccounts: state.cachedAccounts,
        cachedTransactions: state.cachedTransactions,
        lastAccountsSync: state.lastAccountsSync,
        lastTransactionsSync: state.lastTransactionsSync,
        pendingTransactions: state.pendingTransactions,
      }),
    }
  )
);

export type { AppState } from "./types";
