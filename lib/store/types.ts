import type {
  Account,
  BudgetLimitsListResponse,
  FireflyCredentials,
  Transaction,
} from "@/types";

export interface AppState {
  credentials: FireflyCredentials | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  balanceVisible: boolean;

  cachedAccounts: Account[] | null;
  cachedTransactions: Transaction[] | null;
  cachedBudgetLimits: BudgetLimitsListResponse | null;
  lastAccountsSync: number | null;
  lastTransactionsSync: number | null;
  lastBudgetLimitsSync: number | null;

  pendingTransactions: Transaction[];

  setCredentials: (credentials: FireflyCredentials) => Promise<void>;
  loadCredentials: () => Promise<void>;
  clearCredentials: () => Promise<void>;
  toggleBalanceVisibility: () => void;

  setCachedAccounts: (accounts: Account[]) => Promise<void>;
  getCachedAccounts: () => Promise<Account[] | null>;
  setCachedTransactions: (transactions: Transaction[]) => Promise<void>;
  getCachedTransactions: () => Promise<Transaction[] | null>;
  setCachedBudgetLimits: (data: BudgetLimitsListResponse) => Promise<void>;
  getCachedBudgetLimits: () => Promise<BudgetLimitsListResponse | null>;
  clearCache: () => Promise<void>;

  addPendingTransaction: (transaction: Transaction) => void;
  clearPendingTransactions: () => void;

  dashboardVisibleSectionIds: string[];
  dashboardHiddenSectionIds: string[];
  setDashboardSections: (visible: string[], hidden: string[]) => void;
  moveDashboardSectionToHidden: (id: string) => void;
  moveDashboardSectionToVisible: (id: string) => void;
  reorderDashboardVisible: (fromIndex: number, toIndex: number) => void;
}
