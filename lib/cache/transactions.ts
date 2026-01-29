import type { CacheMetadata, Transaction } from "@/types";
import * as core from "./core";
import { CACHE_KEYS } from "./keys";

export async function getTransactions(): Promise<{
  data: Transaction[];
  metadata: CacheMetadata;
} | null> {
  return core.get<{ data: Transaction[]; metadata: CacheMetadata }>(
    CACHE_KEYS.TRANSACTIONS
  );
}

export async function setTransactions(
  transactions: Transaction[]
): Promise<void> {
  const cacheData = {
    data: transactions,
    metadata: {
      lastSynced: Date.now(),
      version: "1.0.0",
    },
  };
  await core.set(CACHE_KEYS.TRANSACTIONS, cacheData);
}
