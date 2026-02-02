import type { BudgetLimitsListResponse, CacheMetadata } from "@/types";
import * as core from "./core";
import { CACHE_KEYS } from "./keys";

export async function getBudgetLimits(): Promise<{
  data: BudgetLimitsListResponse;
  metadata: CacheMetadata;
} | null> {
  return core.get<{
    data: BudgetLimitsListResponse;
    metadata: CacheMetadata;
  }>(CACHE_KEYS.BUDGET_LIMITS);
}

export async function setBudgetLimits(
  data: BudgetLimitsListResponse
): Promise<void> {
  const cacheData = {
    data,
    metadata: {
      lastSynced: Date.now(),
      version: "1.0.0",
    },
  };
  await core.set(CACHE_KEYS.BUDGET_LIMITS, cacheData);
}
