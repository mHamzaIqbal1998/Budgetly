// Global State Management with Zustand
import { FireflyCredentials, Account, Transaction } from "@/types/firefly";
import * as SecureStore from "expo-secure-store";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { cache } from "./cache";

interface AppState {
  credentials: FireflyCredentials | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  balanceVisible: boolean;

  // Cached data
  cachedAccounts: Account[] | null;
  cachedTransactions: Transaction[] | null;
  lastAccountsSync: number | null;
  lastTransactionsSync: number | null;

  // Sync queue for future offline support
  pendingTransactions: Transaction[];

  // Actions
  setCredentials: (credentials: FireflyCredentials) => Promise<void>;
  loadCredentials: () => Promise<void>;
  clearCredentials: () => Promise<void>;
  toggleBalanceVisibility: () => void;

  // Cache actions
  setCachedAccounts: (accounts: Account[]) => Promise<void>;
  getCachedAccounts: () => Promise<Account[] | null>;
  setCachedTransactions: (transactions: Transaction[]) => Promise<void>;
  getCachedTransactions: () => Promise<Transaction[] | null>;
  clearCache: () => Promise<void>;

  // Future: Sync queue actions (for offline transaction creation)
  addPendingTransaction: (transaction: Transaction) => void;
  clearPendingTransactions: () => void;
}

const CREDENTIALS_KEY = "firefly_credentials";

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      credentials: null,
      isAuthenticated: false,
      isLoading: true,
      balanceVisible: true,
      cachedAccounts: null,
      cachedTransactions: null,
      lastAccountsSync: null,
      lastTransactionsSync: null,
      pendingTransactions: [],

      setCredentials: async (credentials: FireflyCredentials) => {
        try {
          await SecureStore.setItemAsync(
            CREDENTIALS_KEY,
            JSON.stringify(credentials)
          );
          set({ credentials, isAuthenticated: true });
        } catch (error) {
          console.error("Failed to save credentials:", error);
          throw error;
        }
      },

      loadCredentials: async () => {
        try {
          set({ isLoading: true });
          const stored = await SecureStore.getItemAsync(CREDENTIALS_KEY);
          if (stored) {
            const credentials = JSON.parse(stored) as FireflyCredentials;
            set({ credentials, isAuthenticated: true, isLoading: false });
          } else {
            set({
              credentials: null,
              isAuthenticated: false,
              isLoading: false,
            });
          }
        } catch (error) {
          console.error("Failed to load credentials:", error);
          set({ credentials: null, isAuthenticated: false, isLoading: false });
        }
      },

      clearCredentials: async () => {
        try {
          await SecureStore.deleteItemAsync(CREDENTIALS_KEY);
          await cache.clear(); // Clear cache when logging out
          set({
            credentials: null,
            isAuthenticated: false,
            cachedAccounts: null,
            cachedTransactions: null,
            lastAccountsSync: null,
            lastTransactionsSync: null,
            pendingTransactions: [],
          });
        } catch (error) {
          console.error("Failed to clear credentials:", error);
          throw error;
        }
      },

      toggleBalanceVisibility: () => {
        set((state) => ({ balanceVisible: !state.balanceVisible }));
      },

      // Cache operations
      setCachedAccounts: async (accounts: Account[]) => {
        try {
          await cache.setAccounts(accounts);
          set({
            cachedAccounts: accounts,
            lastAccountsSync: Date.now(),
          });
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

      // Future: Sync queue for offline transactions
      addPendingTransaction: (transaction: Transaction) => {
        set((state) => ({
          pendingTransactions: [...state.pendingTransactions, transaction],
        }));
      },

      clearPendingTransactions: () => {
        set({ pendingTransactions: [] });
      },
    }),
    {
      name: "budgetly-storage",
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist non-sensitive data
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
