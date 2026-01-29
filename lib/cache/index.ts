import type { Account, CacheMetadata, Transaction } from "@/types";
import * as accountsModule from "./accounts";
import * as core from "./core";
import * as transactionsModule from "./transactions";

export { clear, get, isCacheStale, remove, set } from "./core";
export { CACHE_KEYS } from "./keys";

export const cache = {
  get: core.get,
  set: core.set,
  remove: core.remove,
  clear: core.clear,

  async getAccounts() {
    return accountsModule.getAccounts();
  },

  async setAccounts(accounts: Account[]) {
    return accountsModule.setAccounts(accounts);
  },

  async getTransactions() {
    return transactionsModule.getTransactions();
  },

  async setTransactions(transactions: Transaction[]) {
    return transactionsModule.setTransactions(transactions);
  },

  isCacheStale(metadata: CacheMetadata, maxAgeHours: number = 24): boolean {
    return core.isCacheStale(metadata.lastSynced, maxAgeHours);
  },
};
