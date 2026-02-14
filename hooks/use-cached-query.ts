// Custom hook to combine React Query with offline cache
import { useStore } from "@/lib/store";
import {
  Account,
  BudgetLimitsListResponse,
  ExpensesByExpenseAccount,
  Transaction,
} from "@/types";
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

  // Update cache when data is successfully fetched (store the array, not the response wrapper)
  useEffect(() => {
    if (query.isSuccess && query.data) {
      const list = Array.isArray(query.data)
        ? query.data
        : (query.data as { data?: Account[] })?.data;
      if (list?.length !== undefined) setCachedAccounts(list);
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
 * Enhanced useQuery hook for budget limits with offline cache support
 * Falls back to cached data when offline/error, and updates cache on successful fetch
 */
export function useCachedBudgetLimitsQuery(
  queryKey: string[],
  queryFn: () => Promise<BudgetLimitsListResponse>,
  options?: Omit<
    UseQueryOptions<BudgetLimitsListResponse>,
    "queryKey" | "queryFn"
  >
): UseQueryResult<BudgetLimitsListResponse, Error> {
  const { setCachedBudgetLimits, cachedBudgetLimits } = useStore();

  const query = useQuery<BudgetLimitsListResponse, Error>({
    queryKey,
    queryFn,
    ...options,
  });

  useEffect(() => {
    if (query.isSuccess && query.data) {
      setCachedBudgetLimits(query.data);
    }
  }, [query.isSuccess, query.data, setCachedBudgetLimits]);

  const dataToReturn =
    (query.isPending || query.isError) && cachedBudgetLimits !== null
      ? cachedBudgetLimits
      : query.data;

  return {
    ...query,
    data: dataToReturn,
  } as UseQueryResult<BudgetLimitsListResponse, Error>;
}

/**
 * Enhanced useQuery hook for expenses by expense account with offline cache support.
 * Caches per date range (start/end) so 7, 15, 30 day filters each have their own cache.
 */
export function useCachedExpensesByAccountQuery(
  queryKey: string[],
  start: string,
  end: string,
  queryFn: () => Promise<ExpensesByExpenseAccount[]>,
  options?: Omit<
    UseQueryOptions<ExpensesByExpenseAccount[]>,
    "queryKey" | "queryFn"
  >
): UseQueryResult<ExpensesByExpenseAccount[], Error> {
  const rangeKey = `${start}_${end}`;
  const { setCachedExpensesByRange, cachedExpensesByRange } = useStore();
  const cachedForRange = cachedExpensesByRange?.[rangeKey] ?? null;

  const query = useQuery<ExpensesByExpenseAccount[], Error>({
    queryKey,
    queryFn,
    placeholderData: cachedForRange ?? undefined,
    ...options,
  });

  useEffect(() => {
    if (query.isSuccess && query.data) {
      setCachedExpensesByRange(start, end, query.data);
    }
  }, [query.isSuccess, query.data, start, end, setCachedExpensesByRange]);

  const useCachedFallback =
    (query.isPending || query.isError) && cachedForRange !== null;
  const dataToReturn = useCachedFallback ? cachedForRange : query.data;

  return {
    ...query,
    data: dataToReturn,
    isLoading: useCachedFallback ? false : query.isLoading,
  } as UseQueryResult<ExpensesByExpenseAccount[], Error>;
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
