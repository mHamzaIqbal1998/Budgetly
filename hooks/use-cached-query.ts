// Custom hook to combine React Query with offline cache
import { useStore } from "@/lib/store";
import { Account, Transaction } from "@/types/firefly";
import {
  UseQueryOptions,
  UseQueryResult,
  useQuery,
} from "@tanstack/react-query";
import { useEffect } from "react";

/**
 * Enhanced useQuery hook with offline cache support
 * Falls back to cache when offline, and updates cache on successful fetch
 */
export function useCachedAccountsQuery<TData = Account[]>(
  queryKey: string[],
  queryFn: () => Promise<TData>,
  options?: Omit<UseQueryOptions<TData>, "queryKey" | "queryFn">
): UseQueryResult<TData, Error> & { isCacheData: boolean } {
  const { setCachedAccounts, cachedAccounts } = useStore();

  const query = useQuery<TData, Error>({
    queryKey,
    queryFn,
    ...options,
  });

  // Update cache when data is successfully fetched
  useEffect(() => {
    if (query.isSuccess && query.data) {
      setCachedAccounts(query.data as Account[]);
    }
  }, [query.isSuccess, query.data, setCachedAccounts]);

  // If query fails and we have cached data, use that
  const isCacheData = query.isError && cachedAccounts !== null;
  const dataToReturn = isCacheData ? (cachedAccounts as TData) : query.data;

  return {
    ...query,
    data: dataToReturn,
    isCacheData,
  } as UseQueryResult<TData, Error> & { isCacheData: boolean };
}

/**
 * Enhanced useQuery hook for transactions with offline cache support
 */
export function useCachedTransactionsQuery<TData = Transaction[]>(
  queryKey: string[],
  queryFn: () => Promise<TData>,
  options?: Omit<UseQueryOptions<TData>, "queryKey" | "queryFn">
): UseQueryResult<TData, Error> & { isCacheData: boolean } {
  const { setCachedTransactions, cachedTransactions } = useStore();

  const query = useQuery<TData, Error>({
    queryKey,
    queryFn,
    ...options,
  });

  // Update cache when data is successfully fetched
  useEffect(() => {
    if (query.isSuccess && query.data) {
      setCachedTransactions(query.data as Transaction[]);
    }
  }, [query.isSuccess, query.data, setCachedTransactions]);

  // If query fails and we have cached data, use that
  const isCacheData = query.isError && cachedTransactions !== null;
  const dataToReturn = isCacheData ? (cachedTransactions as TData) : query.data;

  return {
    ...query,
    data: dataToReturn,
    isCacheData,
  } as UseQueryResult<TData, Error> & { isCacheData: boolean };
}

/**
 * Hook to check if device is online
 * Can be extended with NetInfo for better offline detection
 */
export function useOnlineStatus() {
  // For now, return true. Can integrate @react-native-community/netinfo
  // to detect actual network status
  return { isOnline: true };
}
