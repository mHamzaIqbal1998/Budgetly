/** Default order of dashboard sections (all visible on first load) */
export const DEFAULT_DASHBOARD_VISIBLE_ORDER = [
  "netWorth",
  "topAccounts",
  "expensesByAccount",
  "summaryCards",
  "accountsOverview",
  "budgetStatus",
  "quickInsights",
] as const;

export type DashboardSectionId =
  (typeof DEFAULT_DASHBOARD_VISIBLE_ORDER)[number];

export const DASHBOARD_SECTION_LABELS: Record<DashboardSectionId, string> = {
  netWorth: "Net Worth",
  topAccounts: "Top Accounts",
  expensesByAccount: "Expenses by Account",
  summaryCards: "Summary Cards",
  accountsOverview: "Accounts Overview",
  budgetStatus: "Budget Status",
  quickInsights: "Quick Insights",
};
