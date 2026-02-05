import type { Budget, BudgetLimit } from "@/types";

/** Build a Map of budget id -> Budget for O(1) lookup from included array. */
export function createBudgetByIdMap(
  included: Budget[] | undefined
): Map<string, Budget> {
  const map = new Map<string, Budget>();
  if (!included?.length) return map;
  for (let i = 0; i < included.length; i++) {
    const budget = included[i];
    if (budget?.id) map.set(budget.id, budget);
  }
  return map;
}

export interface BudgetInfo {
  name: string;
  active: boolean;
  period: string;
}

/**
 * Resolve budget name and active status for a limit using a pre-built lookup map.
 * Use with createBudgetByIdMap(included) so lookups are O(1) per row.
 */
export function getBudgetInfoFromMap(
  limit: BudgetLimit,
  map: Map<string, Budget>
): BudgetInfo {
  const budgetId = limit.attributes.budget_id;
  const budget = budgetId ? map.get(budgetId) : undefined;
  return {
    name: budget?.attributes?.name ?? budgetId ?? "Budget",
    active: budget?.attributes?.active ?? true,
    period: budget?.attributes?.auto_budget_period ?? "monthly",
  };
}
