import type {
  Account,
  BudgetLimitsListResponse,
  ExpensesByExpenseAccount,
  FireflyCredentials,
  Transaction,
} from "@/types";

export interface AppState {
  credentials: FireflyCredentials | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  balanceVisible: boolean;
  themeMode: "system" | "light" | "dark";

  cachedAccounts: Account[] | null;
  cachedTransactions: Transaction[] | null;
  cachedBudgetLimits: BudgetLimitsListResponse | null;
  /** Key: `${start}_${end}` */
  cachedExpensesByRange: Record<string, ExpensesByExpenseAccount[]> | null;
  lastAccountsSync: number | null;
  lastTransactionsSync: number | null;
  lastBudgetLimitsSync: number | null;

  pendingTransactions: Transaction[];

  setCredentials: (credentials: FireflyCredentials) => Promise<void>;
  loadCredentials: () => Promise<void>;
  clearCredentials: () => Promise<void>;
  toggleBalanceVisibility: () => void;
  setThemeMode: (mode: "system" | "light" | "dark") => void;

  setCachedAccounts: (accounts: Account[]) => Promise<void>;
  /** Replace a single account in cache by id (e.g. after update). */
  updateCachedAccount: (account: Account) => Promise<void>;
  getCachedAccounts: () => Promise<Account[] | null>;
  setCachedTransactions: (transactions: Transaction[]) => Promise<void>;
  getCachedTransactions: () => Promise<Transaction[] | null>;
  setCachedBudgetLimits: (data: BudgetLimitsListResponse) => Promise<void>;
  getCachedBudgetLimits: () => Promise<BudgetLimitsListResponse | null>;
  setCachedExpensesByRange: (
    start: string,
    end: string,
    data: ExpensesByExpenseAccount[]
  ) => Promise<void>;
  getCachedExpensesByRange: (
    start: string,
    end: string
  ) => Promise<ExpensesByExpenseAccount[] | null>;
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
