import type { ExpensesByExpenseAccount } from "@/types";
import * as core from "./core";
import { getExpensesByRangeCacheKey } from "./keys";

const CACHED_SHAPE = {
  data: [] as ExpensesByExpenseAccount[],
  metadata: { lastSynced: 0, version: "1.0.0" },
};

export async function getExpensesByRange(
  start: string,
  end: string
): Promise<{
  data: ExpensesByExpenseAccount[];
  metadata: { lastSynced: number; version: string };
} | null> {
  return core.get<typeof CACHED_SHAPE>(getExpensesByRangeCacheKey(start, end));
}

export async function setExpensesByRange(
  start: string,
  end: string,
  data: ExpensesByExpenseAccount[]
): Promise<void> {
  await core.set(getExpensesByRangeCacheKey(start, end), {
    data,
    metadata: {
      lastSynced: Date.now(),
      version: "1.0.0",
    },
  });
}
