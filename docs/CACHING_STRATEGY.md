# Offline Caching Strategy

## Overview

Budgetly implements a multi-layered caching strategy for offline support and optimal performance:

1. **React Query** - Server state management with automatic caching
2. **Zustand + AsyncStorage** - Persistent offline cache
3. **Expo SecureStore** - Secure storage for sensitive data (credentials)

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Application                      │
├─────────────────────────────────────────────────────┤
│  React Query (Server State)                        │
│  ├─ In-memory cache (fast access)                  │
│  └─ Persisted to AsyncStorage (offline access)     │
├─────────────────────────────────────────────────────┤
│  Zustand Store (Global State)                      │
│  ├─ Cached accounts/transactions                   │
│  ├─ Last sync timestamps                           │
│  └─ Pending transactions queue (future)            │
├─────────────────────────────────────────────────────┤
│  AsyncStorage (Persistent Cache)                   │
│  ├─ React Query cache                              │
│  ├─ Zustand state (non-sensitive)                  │
│  └─ Custom cache (accounts, transactions)          │
├─────────────────────────────────────────────────────┤
│  Expo SecureStore (Encrypted Storage)              │
│  └─ Firefly III credentials                        │
└─────────────────────────────────────────────────────┘
```

## Usage Examples

### 1. Basic Usage with React Query (Automatic Caching)

```typescript
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

function MyComponent() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["accounts", "asset"],
    queryFn: () => apiClient.getAllAccounts("asset"),
    // Automatically cached by React Query
  });
}
```

### 2. Enhanced Usage with Custom Hook (Offline Fallback)

```typescript
import { useCachedAccountsQuery } from '@/hooks/use-cached-query';
import { apiClient } from '@/lib/api-client';
import { Account, FireflyApiResponse } from '@/types/firefly';

function Dashboard() {
  const {
    data,
    isLoading,
    isError,
    isCacheData // true if showing cached data
  } = useCachedAccountsQuery<FireflyApiResponse<Account[]>>(
    ['all-asset-accounts'],
    () => apiClient.getAllAccounts('asset')
  );

  return (
    <View>
      {isCacheData && (
        <Banner>Showing cached data (offline)</Banner>
      )}
      {/* Render accounts */}
    </View>
  );
}
```

### 3. Manual Cache Operations

```typescript
import { useStore } from '@/lib/store';

function SyncButton() {
  const {
    setCachedAccounts,
    getCachedAccounts,
    lastAccountsSync
  } = useStore();

  const handleManualSync = async () => {
    const accounts = await apiClient.getAllAccounts('asset');
    await setCachedAccounts(accounts.data);
  };

  const handleLoadCache = async () => {
    const cached = await getCachedAccounts();
    console.log('Cached accounts:', cached);
  };

  return (
    <View>
      <Button onPress={handleManualSync}>Sync Now</Button>
      <Text>Last synced: {new Date(lastAccountsSync).toLocaleString()}</Text>
    </View>
  );
}
```

## Cache Configuration

### React Query Settings (`lib/query-client.ts`)

- **gcTime**: 24 hours - How long to keep unused data in cache
- **staleTime**: 5 minutes - How long data is considered fresh
- **networkMode**: `offlineFirst` - Try cache first, then network
- **Persistence**: Automatic via `PersistQueryClientProvider`

### Cache Invalidation

```typescript
import { queryClient } from "@/lib/query-client";

// Invalidate specific query
queryClient.invalidateQueries({ queryKey: ["accounts"] });

// Refetch specific query
queryClient.refetchQueries({ queryKey: ["accounts"] });

// Clear all cache
queryClient.clear();
```

## Future: Offline Transaction Sync

The store is prepared for offline transaction creation and sync:

```typescript
// Store includes:
interface AppState {
  pendingTransactions: Transaction[];
  addPendingTransaction: (transaction: Transaction) => void;
  clearPendingTransactions: () => void;
}

// Usage (future implementation):
const { addPendingTransaction, pendingTransactions } = useStore();

// Create transaction offline
const createTransaction = async (data) => {
  try {
    // Try to create online
    const result = await apiClient.createTransaction(data);
    return result;
  } catch (error) {
    // If offline, queue for later
    addPendingTransaction(data);
    // Show "pending sync" indicator
  }
};

// Sync when back online
const syncPendingTransactions = async () => {
  for (const transaction of pendingTransactions) {
    await apiClient.createTransaction(transaction);
  }
  clearPendingTransactions();
};
```

## Cache Management

### Clear Cache on Logout

The store automatically clears cache when logging out:

```typescript
const { clearCredentials } = useStore();
await clearCredentials(); // Clears credentials + cache
```

### Manual Cache Clear

```typescript
import { cache } from "@/lib/cache";
import { useStore } from "@/lib/store";

const { clearCache } = useStore();
await clearCache(); // Clear all cached data

// Or clear specific items
await cache.remove(CACHE_KEYS.ACCOUNTS);
```

## Network Status Detection (Optional Enhancement)

Install `@react-native-community/netinfo` for better offline detection:

```bash
npm install @react-native-community/netinfo
```

```typescript
import NetInfo from "@react-native-community/netinfo";

// In useOnlineStatus hook
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsOnline(state.isConnected ?? true);
    });
    return unsubscribe;
  }, []);

  return { isOnline };
}
```

## Best Practices

1. **Use React Query for all API calls** - Automatic caching and deduplication
2. **Use custom hooks for offline fallback** - `useCachedAccountsQuery` when offline support is critical
3. **Set appropriate staleTime** - Balance freshness vs. unnecessary refetches
4. **Leverage cache metadata** - Use `lastAccountsSync` to show staleness indicators
5. **Test offline scenarios** - Use network throttling in dev tools

## Storage Locations

- **Credentials**: Expo SecureStore (encrypted, key: `firefly_credentials`)
- **React Query Cache**: AsyncStorage (key: `REACT_QUERY_OFFLINE_CACHE`)
- **Zustand State**: AsyncStorage (key: `budgetly-storage`)
- **Custom Cache**: AsyncStorage (keys: `cache_accounts`, `cache_transactions`)

## Performance Considerations

- **AsyncStorage is async** - All operations return promises
- **Large datasets** - Consider pagination for transactions
- **Cache size** - Monitor AsyncStorage size, implement cleanup if needed
- **Throttling** - Query client throttles writes to storage (1s)

## Troubleshooting

### Cache not persisting

```typescript
// Check AsyncStorage
import AsyncStorage from "@react-native-async-storage/async-storage";
const keys = await AsyncStorage.getAllKeys();
console.log("Storage keys:", keys);
```

### Stale data showing

```typescript
// Force refetch
const { refetch } = useQuery(...);
await refetch();
```

### Cache too large

```typescript
// Clear old data
await cache.clear();
await queryClient.clear();
```
