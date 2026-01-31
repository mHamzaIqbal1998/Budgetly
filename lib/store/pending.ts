import type { Transaction } from "@/types";
import type { StateCreator } from "zustand";
import type { AppState } from "./types";

export const createPendingSlice: StateCreator<
  AppState,
  [],
  [],
  Pick<
    AppState,
    "pendingTransactions" | "addPendingTransaction" | "clearPendingTransactions"
  >
> = (set) => ({
  pendingTransactions: [],

  addPendingTransaction: (transaction: Transaction) => {
    set((state) => ({
      pendingTransactions: [...state.pendingTransactions, transaction],
    }));
  },

  clearPendingTransactions: () => {
    set({ pendingTransactions: [] });
  },
});
