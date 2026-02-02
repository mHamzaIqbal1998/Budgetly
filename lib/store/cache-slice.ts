import type { Account, BudgetLimitsListResponse, Transaction } from "@/types";
import type { StateCreator } from "zustand";
import { cache } from "../cache";
import type { AppState } from "./types";

export const createCacheSlice: StateCreator<
  AppState,
  [],
  [],
  Pick<
    AppState,
    | "cachedAccounts"
    | "cachedTransactions"
    | "cachedBudgetLimits"
    | "lastAccountsSync"
    | "lastTransactionsSync"
    | "lastBudgetLimitsSync"
    | "setCachedAccounts"
    | "getCachedAccounts"
    | "setCachedTransactions"
    | "getCachedTransactions"
    | "setCachedBudgetLimits"
    | "getCachedBudgetLimits"
    | "clearCache"
  >
> = (set) => ({
  cachedAccounts: null,
  cachedTransactions: null,
  cachedBudgetLimits: null,
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

  clearCache: async () => {
    try {
      await cache.clear();
      set({
        cachedAccounts: null,
        cachedTransactions: null,
        cachedBudgetLimits: null,
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
