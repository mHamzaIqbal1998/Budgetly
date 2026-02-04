export const CACHE_KEYS = {
  ACCOUNTS: "cache_accounts",
  TRANSACTIONS: "cache_transactions",
  BUDGET_LIMITS: "cache_budget_limits",
  EXPENSES_BY_RANGE: "cache_expenses_by_range",
  LAST_SYNC: "cache_last_sync",
} as const;

export function getExpensesByRangeCacheKey(start: string, end: string): string {
  return `${CACHE_KEYS.EXPENSES_BY_RANGE}_${start}_${end}`;
}
