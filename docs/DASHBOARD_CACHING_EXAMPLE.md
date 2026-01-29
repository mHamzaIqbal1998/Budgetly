# Dashboard Caching Implementation Examples

## Current Implementation (Automatic Caching)

Your current dashboard already benefits from React Query's automatic caching:

```typescript
// app/(drawer)/dashboard.tsx (current)
const {
  data: accountsData,
  isLoading: accountsLoading,
  refetch: refetchAccounts,
} = useQuery({
  queryKey: ["all-asset-accounts"],
  queryFn: () => apiClient.getAllAccounts("asset"),
  // ✅ Automatically cached by React Query
  // ✅ Persisted to AsyncStorage
  // ✅ Works offline with cached data
});
```

**What this gives you:**

- ✅ In-memory cache (instant on revisit)
- ✅ Persisted to AsyncStorage (survives app restart)
- ✅ Automatic refetch on reconnect
- ✅ Background updates when stale

## Enhanced Implementation (With Offline Indicator)

For critical data where you want to show users when they're viewing cached data:

```typescript
// app/(drawer)/dashboard.tsx (enhanced)
import { useCachedAccountsQuery } from '@/hooks/use-cached-query';
import { Account, FireflyApiResponse } from '@/types/firefly';

export default function DashboardScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { balanceVisible } = useStore();

  // Enhanced query with offline fallback
  const {
    data: accountsData,
    isLoading: accountsLoading,
    isError: accountsError,
    refetch: refetchAccounts,
    isCacheData, // ✨ New: true if showing cached data
  } = useCachedAccountsQuery<FireflyApiResponse<Account[]>>(
    ["all-asset-accounts"],
    () => apiClient.getAllAccounts("asset")
  );

  // Calculate balances (same as before)
  const balancesByCurrency = accountsData?.data.reduce(
    (acc, account) => {
      const currencySymbol = account.attributes.currency_symbol;
      const currencyCode = account.attributes.currency_code;
      const balance = parseFloat(account.attributes.current_balance);

      if (!acc[currencyCode]) {
        acc[currencyCode] = {
          symbol: currencySymbol,
          code: currencyCode,
          total: 0,
        };
      }

      acc[currencyCode].total += balance;
      return acc;
    },
    {} as Record<string, { symbol: string; code: string; total: number }>
  ) || {};

  const currencyBalances = Object.values(balancesByCurrency);

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={accountsLoading}
            onRefresh={refetchAccounts}
          />
        }
      >
        {/* Offline indicator */}
        {isCacheData && (
          <Card style={styles.offlineBanner}>
            <Card.Content>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <MaterialCommunityIcons
                  name="cloud-off-outline"
                  size={20}
                  color={theme.colors.onSurfaceVariant}
                />
                <Text
                  variant="bodySmall"
                  style={{ marginLeft: 8, color: theme.colors.onSurfaceVariant }}
                >
                  Showing cached data (offline)
                </Text>
              </View>
            </Card.Content>
          </Card>
        )}

        {/* Balance cards (same as before) */}
        <GlassCard variant="elevated" style={styles.balanceCard}>
          <Card.Title title="Total Balance" />
          <Card.Content>
            {currencyBalances.map((currency) => (
              <View key={currency.code} style={styles.balanceRow}>
                <Text variant="headlineMedium" style={styles.balanceText}>
                  {balanceVisible
                    ? `${currency.symbol} ${currency.total.toFixed(2)}`
                    : '••••••'}
                </Text>
                <Text variant="bodySmall">{currency.code}</Text>
              </View>
            ))}
          </Card.Content>
        </GlassCard>

        {/* Rest of your dashboard */}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  // ... your existing styles
  offlineBanner: {
    margin: 16,
    marginBottom: 8,
    backgroundColor: 'rgba(255, 152, 0, 0.1)',
  },
});
```

## Option 3: Manual Cache Management

For more control over caching:

```typescript
import { useStore } from '@/lib/store';
import { useQuery } from '@tanstack/react-query';

export default function DashboardScreen() {
  const {
    setCachedAccounts,
    getCachedAccounts,
    lastAccountsSync
  } = useStore();

  const {
    data: accountsData,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["all-asset-accounts"],
    queryFn: async () => {
      const result = await apiClient.getAllAccounts("asset");
      // Manually cache the result
      await setCachedAccounts(result.data);
      return result;
    },
  });

  // Load cached data on mount (for instant display)
  React.useEffect(() => {
    const loadCache = async () => {
      const cached = await getCachedAccounts();
      if (cached && !accountsData) {
        // Show cached data immediately while fetching
        // (implement using local state if needed)
      }
    };
    loadCache();
  }, []);

  // Show sync status
  const syncAgeMinutes = lastAccountsSync
    ? Math.floor((Date.now() - lastAccountsSync) / (1000 * 60))
    : null;

  return (
    <View>
      {syncAgeMinutes !== null && (
        <Text variant="bodySmall">
          Last synced: {syncAgeMinutes} minutes ago
        </Text>
      )}
      {/* Rest of dashboard */}
    </View>
  );
}
```

## Recommendation

**For your use case**, I recommend:

### Current Implementation ✅ (Already Good!)

Your current implementation with plain `useQuery` is already excellent because:

- React Query automatically caches data
- Data is persisted to AsyncStorage
- Works offline automatically
- Refetches on reconnect

### When to Upgrade

Only upgrade to the enhanced version if you need:

1. **Offline indicator** - Show users they're viewing cached data
2. **Sync timestamps** - Display when data was last updated
3. **Manual cache control** - Fine-grained cache management

## Testing Offline Behavior

### Simulator/Emulator

1. Disable network in system settings
2. Or use Expo Dev Tools → Shake device → Toggle "Pause network requests"

### Real Device

1. Enable airplane mode
2. Reload app
3. Data should load from cache instantly

### Check Cache Status

```typescript
import AsyncStorage from "@react-native-async-storage/async-storage";

// In a dev screen
const debugCache = async () => {
  const keys = await AsyncStorage.getAllKeys();
  console.log("All keys:", keys);

  const queryCache = await AsyncStorage.getItem("REACT_QUERY_OFFLINE_CACHE");
  console.log("Query cache size:", queryCache?.length);

  const zustandCache = await AsyncStorage.getItem("budgetly-storage");
  console.log("Zustand cache:", zustandCache);
};
```

## Cache Behavior Summary

| Scenario             | Behavior                                             |
| -------------------- | ---------------------------------------------------- |
| First load           | Fetches from API, saves to cache                     |
| Second load (online) | Shows cached data instantly, refetches in background |
| Load while offline   | Shows cached data (no network call)                  |
| Reconnect            | Automatically refetches fresh data                   |
| App restart          | Loads from AsyncStorage cache                        |
| Pull to refresh      | Forces new fetch, updates cache                      |

## Future Enhancements

### 1. Network Status Detection

```bash
npm install @react-native-community/netinfo
```

```typescript
import NetInfo from "@react-native-community/netinfo";

const [isOnline, setIsOnline] = useState(true);

useEffect(() => {
  const unsubscribe = NetInfo.addEventListener((state) => {
    setIsOnline(state.isConnected ?? true);
  });
  return unsubscribe;
}, []);
```

### 2. Optimistic Updates

```typescript
const mutation = useMutation({
  mutationFn: apiClient.createTransaction,
  onMutate: async (newTransaction) => {
    // Optimistically update UI
    await queryClient.cancelQueries({ queryKey: ["transactions"] });
    const previousData = queryClient.getQueryData(["transactions"]);
    queryClient.setQueryData(["transactions"], (old) => [
      ...old,
      newTransaction,
    ]);
    return { previousData };
  },
  onError: (err, newTransaction, context) => {
    // Rollback on error
    queryClient.setQueryData(["transactions"], context.previousData);
  },
});
```

### 3. Background Sync

```typescript
// When back online
useEffect(() => {
  if (isOnline && pendingTransactions.length > 0) {
    syncPendingTransactions();
  }
}, [isOnline]);
```
