import type { Account, CacheMetadata } from "@/types";
import * as core from "./core";
import { CACHE_KEYS } from "./keys";

export async function getAccounts(): Promise<{
  data: Account[];
  metadata: CacheMetadata;
} | null> {
  return core.get<{ data: Account[]; metadata: CacheMetadata }>(
    CACHE_KEYS.ACCOUNTS
  );
}

export async function setAccounts(accounts: Account[]): Promise<void> {
  const cacheData = {
    data: accounts,
    metadata: {
      lastSynced: Date.now(),
      version: "1.0.0",
    },
  };
  await core.set(CACHE_KEYS.ACCOUNTS, cacheData);
}
