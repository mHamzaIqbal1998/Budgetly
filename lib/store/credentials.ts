import type { FireflyCredentials } from "@/types";
import * as SecureStore from "expo-secure-store";
import type { StateCreator } from "zustand";
import type { AppState } from "./types";
import { cache } from "../cache";

const CREDENTIALS_KEY = "firefly_credentials";

export const createCredentialsSlice: StateCreator<
  AppState,
  [],
  [],
  Pick<
    AppState,
    | "credentials"
    | "isAuthenticated"
    | "isLoading"
    | "setCredentials"
    | "loadCredentials"
    | "clearCredentials"
  >
> = (set) => ({
  credentials: null,
  isAuthenticated: false,
  isLoading: true,

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
      await cache.clear();
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
});
