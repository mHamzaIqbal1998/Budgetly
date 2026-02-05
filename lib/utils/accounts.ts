import type { Account } from "@/types";

export type AccountTypeFilter = "asset" | "expense" | "revenue" | "liabilities";

/**
 * Returns whether an account's type matches the given filter.
 * Used for client-side filtering when using a single "all accounts" response.
 */
export function matchesAccountType(
  accountType: string,
  selected: AccountTypeFilter
): boolean {
  const t = accountType.toLowerCase();
  switch (selected) {
    case "asset":
      return t === "asset" || t === "cash";
    case "expense":
      return t.includes("expense");
    case "revenue":
      return t.includes("revenue");
    case "liabilities":
      return t.includes("liability") || t.includes("liabilities");
    default:
      return false;
  }
}

/** Filter accounts by type. Uses a single pass. */
export function filterAccountsByType(
  accounts: Account[],
  type: AccountTypeFilter
): Account[] {
  if (!accounts.length) return [];
  const result: Account[] = [];
  for (let i = 0; i < accounts.length; i++) {
    if (matchesAccountType(accounts[i].attributes.type, type)) {
      result.push(accounts[i]);
    }
  }
  return result;
}
