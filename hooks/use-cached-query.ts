// Custom hook to combine React Query with offline cache
import { useStore } from "@/lib/store";
import { Account, Transaction } from "@/types/firefly";
import NetInfo from "@react-native-community/netinfo";
import {
  UseQueryOptions,
  UseQueryResult,
  useQuery,
} from "@tanstack/react-query";
import { useEffect, useState } from "react";

/**
 * Enhanced useQuery hook with offline cache support
 * Falls back to cache when offline, and updates cache on successful fetch
 */
export function useCachedAccountsQuery<TData = Account[]>(
  queryKey: string[],
  queryFn: () => Promise<TData>,
  options?: Omit<UseQueryOptions<TData>, "queryKey" | "queryFn">
): UseQueryResult<TData, Error> {
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
  const dataToReturn =
    query.isError && cachedAccounts !== null
      ? (cachedAccounts as TData)
      : query.data;

  return {
    ...query,
    data: dataToReturn,
  } as UseQueryResult<TData, Error>;
}

/**
 * Enhanced useQuery hook for transactions with offline cache support
 */
export function useCachedTransactionsQuery<TData = Transaction[]>(
  queryKey: string[],
  queryFn: () => Promise<TData>,
  options?: Omit<UseQueryOptions<TData>, "queryKey" | "queryFn">
): UseQueryResult<TData, Error> {
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
  const dataToReturn =
    query.isError && cachedTransactions !== null
      ? (cachedTransactions as TData)
      : query.data;

  return {
    ...query,
    data: dataToReturn,
  } as UseQueryResult<TData, Error>;
}

/**
 * Hook to check if device is online via NetInfo
 */
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState<boolean | null>(null);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsOnline(state.isConnected ?? false);
    });

    NetInfo.fetch().then((state) => {
      setIsOnline(state.isConnected ?? false);
    });

    return unsubscribe;
  }, []);

  return { isOnline: isOnline ?? true };
}
