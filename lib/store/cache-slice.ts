import type { Account, Transaction } from "@/types";
import type { StateCreator } from "zustand";
import type { AppState } from "./types";
import { cache } from "../cache";

export const createCacheSlice: StateCreator<
  AppState,
  [],
  [],
  Pick<
    AppState,
    | "cachedAccounts"
    | "cachedTransactions"
    | "lastAccountsSync"
    | "lastTransactionsSync"
    | "setCachedAccounts"
    | "getCachedAccounts"
    | "setCachedTransactions"
    | "getCachedTransactions"
    | "clearCache"
  >
> = (set) => ({
  cachedAccounts: null,
  cachedTransactions: null,
  lastAccountsSync: null,
  lastTransactionsSync: null,

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

  clearCache: async () => {
    try {
      await cache.clear();
      set({
        cachedAccounts: null,
        cachedTransactions: null,
        lastAccountsSync: null,
        lastTransactionsSync: null,
      });
    } catch (error) {
      console.error("Failed to clear cache:", error);
      throw error;
    }
  },
});
