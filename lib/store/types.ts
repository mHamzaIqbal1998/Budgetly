import type { Account, FireflyCredentials, Transaction } from "@/types";

export interface AppState {
  credentials: FireflyCredentials | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  balanceVisible: boolean;

  cachedAccounts: Account[] | null;
  cachedTransactions: Transaction[] | null;
  lastAccountsSync: number | null;
  lastTransactionsSync: number | null;

  pendingTransactions: Transaction[];

  setCredentials: (credentials: FireflyCredentials) => Promise<void>;
  loadCredentials: () => Promise<void>;
  clearCredentials: () => Promise<void>;
  toggleBalanceVisibility: () => void;

  setCachedAccounts: (accounts: Account[]) => Promise<void>;
  getCachedAccounts: () => Promise<Account[] | null>;
  setCachedTransactions: (transactions: Transaction[]) => Promise<void>;
  getCachedTransactions: () => Promise<Transaction[] | null>;
  clearCache: () => Promise<void>;

  addPendingTransaction: (transaction: Transaction) => void;
  clearPendingTransactions: () => void;
}
