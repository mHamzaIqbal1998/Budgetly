// React Query Client Configuration with Persistence
import AsyncStorage from "@react-native-async-storage/async-storage";
import { QueryClient } from "@tanstack/react-query";
import type { Persister } from "@tanstack/react-query-persist-client";

// Create custom async persister for React Query cache
export const asyncStoragePersister: Persister = {
  persistClient: async (client) => {
    await AsyncStorage.setItem(
      "REACT_QUERY_OFFLINE_CACHE",
      JSON.stringify(client)
    );
  },
  restoreClient: async () => {
    const value = await AsyncStorage.getItem("REACT_QUERY_OFFLINE_CACHE");
    return value ? JSON.parse(value) : undefined;
  },
  removeClient: async () => {
    await AsyncStorage.removeItem("REACT_QUERY_OFFLINE_CACHE");
  },
};

// Configure query client with sensible defaults for offline support
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache data for 24 hours
      gcTime: 1000 * 60 * 60 * 24, // 24 hours (formerly cacheTime)

      // Consider data stale after 5 minutes
      staleTime: 1000 * 60 * 30, // 30 minutes

      // Retry failed queries
      retry: 2,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),

      // Refetch on various events
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      refetchOnMount: true,
    },
    mutations: {
      retry: 2,
    },
  },
});

// Persist configuration
export const persistOptions = {
  persister: asyncStoragePersister,
};
