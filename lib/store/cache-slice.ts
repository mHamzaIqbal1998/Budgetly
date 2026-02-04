import type {
  Account,
  BudgetLimitsListResponse,
  ExpensesByExpenseAccount,
  Transaction,
} from "@/types";
import type { StateCreator } from "zustand";
import { cache } from "../cache";
import type { AppState } from "./types";

function expensesRangeKey(start: string, end: string): string {
  return `${start}_${end}`;
}

export const createCacheSlice: StateCreator<
  AppState,
  [],
  [],
  Pick<
    AppState,
    | "cachedAccounts"
    | "cachedTransactions"
    | "cachedBudgetLimits"
    | "cachedExpensesByRange"
    | "lastAccountsSync"
    | "lastTransactionsSync"
    | "lastBudgetLimitsSync"
    | "setCachedAccounts"
    | "getCachedAccounts"
    | "setCachedTransactions"
    | "getCachedTransactions"
    | "setCachedBudgetLimits"
    | "getCachedBudgetLimits"
    | "setCachedExpensesByRange"
    | "getCachedExpensesByRange"
    | "clearCache"
  >
> = (set, get) => ({
  cachedAccounts: null,
  cachedTransactions: null,
  cachedBudgetLimits: null,
  cachedExpensesByRange: null,
  lastAccountsSync: null,
  lastTransactionsSync: null,
  lastBudgetLimitsSync: null,

  setCachedAccounts: async (accounts: Account[]) => {
    try {
      await cache.setAccounts(accounts);
      set({ cachedAccounts: accounts, lastAccountsSync: Date.now() });
    } catch (error) {
      console.error("Failed to cache accounts:", error);
    }
  },

  getCachedAccounts: async () => {
    try {
      const cached = await cache.getAccounts();
      if (cached) {
        set({
          cachedAccounts: cached.data,
          lastAccountsSync: cached.metadata.lastSynced,
        });
        return cached.data;
      }
      return null;
    } catch (error) {
      console.error("Failed to get cached accounts:", error);
      return null;
    }
  },

  setCachedTransactions: async (transactions: Transaction[]) => {
    try {
      await cache.setTransactions(transactions);
      set({
        cachedTransactions: transactions,
        lastTransactionsSync: Date.now(),
      });
    } catch (error) {
      console.error("Failed to cache transactions:", error);
    }
  },

  getCachedTransactions: async () => {
    try {
      const cached = await cache.getTransactions();
      if (cached) {
        set({
          cachedTransactions: cached.data,
          lastTransactionsSync: cached.metadata.lastSynced,
        });
        return cached.data;
      }
      return null;
    } catch (error) {
      console.error("Failed to get cached transactions:", error);
      return null;
    }
  },

  setCachedBudgetLimits: async (data: BudgetLimitsListResponse) => {
    try {
      await cache.setBudgetLimits(data);
      set({ cachedBudgetLimits: data, lastBudgetLimitsSync: Date.now() });
    } catch (error) {
      console.error("Failed to cache budget limits:", error);
    }
  },

  getCachedBudgetLimits: async () => {
    try {
      const cached = await cache.getBudgetLimits();
      if (cached) {
        set({
          cachedBudgetLimits: cached.data,
          lastBudgetLimitsSync: cached.metadata.lastSynced,
        });
        return cached.data;
      }
      return null;
    } catch (error) {
      console.error("Failed to get cached budget limits:", error);
      return null;
    }
  },

  setCachedExpensesByRange: async (
    start: string,
    end: string,
    data: ExpensesByExpenseAccount[]
  ) => {
    try {
      await cache.setExpensesByRange(start, end, data);
      const key = expensesRangeKey(start, end);
      set((state) => ({
        cachedExpensesByRange: {
          ...(state.cachedExpensesByRange ?? {}),
          [key]: data,
        },
      }));
    } catch (error) {
      console.error("Failed to cache expenses by range:", error);
    }
  },

  getCachedExpensesByRange: async (start: string, end: string) => {
    try {
      const cached = await cache.getExpensesByRange(start, end);
      if (cached) {
        const key = expensesRangeKey(start, end);
        set((state) => ({
          cachedExpensesByRange: {
            ...(state.cachedExpensesByRange ?? {}),
            [key]: cached.data,
          },
        }));
        return cached.data;
      }
      const inMemory =
        get().cachedExpensesByRange?.[expensesRangeKey(start, end)];
      return inMemory ?? null;
    } catch (error) {
      console.error("Failed to get cached expenses by range:", error);
      return (
        get().cachedExpensesByRange?.[expensesRangeKey(start, end)] ?? null
      );
    }
  },

  clearCache: async () => {
    try {
      await cache.clear();
      set({
        cachedAccounts: null,
        cachedTransactions: null,
        cachedBudgetLimits: null,
        cachedExpensesByRange: null,
        lastAccountsSync: null,
        lastTransactionsSync: null,
        lastBudgetLimitsSync: null,
      });
    } catch (error) {
      console.error("Failed to clear cache:", error);
      throw error;
    }
  },
});
