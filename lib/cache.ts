// Offline Cache Management with AsyncStorage
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Account, Transaction } from "@/types/firefly";

// Cache keys
export const CACHE_KEYS = {
  ACCOUNTS: "cache_accounts",
  TRANSACTIONS: "cache_transactions",
  LAST_SYNC: "cache_last_sync",
} as const;

// Cache metadata
export interface CacheMetadata {
  lastSynced: number;
  version: string;
}

// Typed cache operations
export const cache = {
  // Generic get/set operations
  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await AsyncStorage.getItem(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  },

  async set<T>(key: string, value: T): Promise<void> {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(`Cache set error for key ${key}:`, error);
      throw error;
    }
  },

  async remove(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error(`Cache remove error for key ${key}:`, error);
      throw error;
    }
  },

  async clear(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter((key) => key.startsWith("cache_"));
      await AsyncStorage.multiRemove(cacheKeys);
    } catch (error) {
      console.error("Cache clear error:", error);
      throw error;
    }
  },

  // Specific cache operations with metadata
  async getAccounts(): Promise<{
    data: Account[];
    metadata: CacheMetadata;
  } | null> {
    return this.get<{ data: Account[]; metadata: CacheMetadata }>(
      CACHE_KEYS.ACCOUNTS
    );
  },

  async setAccounts(accounts: Account[]): Promise<void> {
    const cacheData = {
      data: accounts,
      metadata: {
        lastSynced: Date.now(),
        version: "1.0.0",
      },
    };
    await this.set(CACHE_KEYS.ACCOUNTS, cacheData);
  },

  async getTransactions(): Promise<{
    data: Transaction[];
    metadata: CacheMetadata;
  } | null> {
    return this.get<{ data: Transaction[]; metadata: CacheMetadata }>(
      CACHE_KEYS.TRANSACTIONS
    );
  },

  async setTransactions(transactions: Transaction[]): Promise<void> {
    const cacheData = {
      data: transactions,
      metadata: {
        lastSynced: Date.now(),
        version: "1.0.0",
      },
    };
    await this.set(CACHE_KEYS.TRANSACTIONS, cacheData);
  },

  // Check if cache is stale (older than specified hours)
  isCacheStale(metadata: CacheMetadata, maxAgeHours: number = 24): boolean {
    const now = Date.now();
    const ageInHours = (now - metadata.lastSynced) / (1000 * 60 * 60);
    return ageInHours > maxAgeHours;
  },
};
