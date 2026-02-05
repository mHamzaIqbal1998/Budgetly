// Account Transactions Screen – shows all transactions for a single account (paginated)
import { GlassCard } from "@/components/glass-card";
import { apiClient } from "@/lib/api-client";
import { formatAmount } from "@/lib/format-currency";
import { useStore } from "@/lib/store";
import type { AccountTransaction, AccountTransactionGroup } from "@/types";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  BackHandler,
  FlatList,
  InteractionManager,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { Chip, Searchbar, Text, useTheme } from "react-native-paper";

type TransactionTypeFilter = "all" | "withdrawal" | "deposit" | "transfer";

const TRANSACTION_TYPE_TABS: { key: TransactionTypeFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "withdrawal", label: "Withdrawal" },
  { key: "deposit", label: "Deposit" },
  { key: "transfer", label: "Transfer" },
];

type FlatTransaction = AccountTransaction & {
  _groupId: string;
  _groupTitle: string;
  _flatKey: string;
};

// Memoized constants for item layout calculation
const ITEM_HEIGHT = 82; // Approximate height of transaction card + margin
const ITEM_MARGIN = 12;

function flattenGroups(groups: AccountTransactionGroup[]): FlatTransaction[] {
  const out: FlatTransaction[] = [];
  let globalIndex = 0;
  for (const group of groups) {
    const groupId = group.id;
    const groupTitle = group.attributes.group_title || "";
    for (let i = 0; i < group.attributes.transactions.length; i++) {
      const tx = group.attributes.transactions[i];
      out.push({
        ...tx,
        _groupId: groupId,
        _groupTitle: groupTitle,
        _flatKey: `${groupId}-${tx.transaction_journal_id}-${globalIndex++}`,
      });
    }
  }
  return out;
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function getTransactionTypeColor(
  type: string,
  primary: string,
  error: string
): string {
  const t = type?.toLowerCase();
  if (t === "deposit" || t === "revenue") return primary;
  if (t === "withdrawal" || t === "expense") return error;
  return primary;
}

// Memoized Transaction Item Component - prevents re-renders of unchanged items
interface TransactionItemProps {
  item: FlatTransaction;
  primaryColor: string;
  errorColor: string;
  surfaceVariantColor: string;
  balanceVisible: boolean;
}

const TransactionItem = memo(
  function TransactionItem({
    item,
    primaryColor,
    errorColor,
    surfaceVariantColor,
    balanceVisible,
  }: TransactionItemProps) {
    const amount = parseFloat(item.amount);
    const isIncoming =
      item.type?.toLowerCase() === "deposit" ||
      item.type?.toLowerCase() === "revenue";
    const amountColor = getTransactionTypeColor(
      item.type,
      primaryColor,
      errorColor
    );
    const subtitle = [item.category_name, item.budget_name]
      .filter(Boolean)
      .join(" · ");

    return (
      <GlassCard variant="default" style={styles.txCard}>
        <View style={styles.txCardInner}>
          <View style={styles.txRow}>
            <View style={styles.txLeft}>
              <View
                style={[
                  styles.txIconWrap,
                  { backgroundColor: surfaceVariantColor },
                ]}
              >
                <MaterialCommunityIcons
                  name={
                    isIncoming
                      ? "arrow-down-bold"
                      : ("arrow-up-bold" as keyof typeof MaterialCommunityIcons.glyphMap)
                  }
                  size={20}
                  color={amountColor}
                />
              </View>
              <View style={styles.txBody}>
                <Text
                  variant="titleSmall"
                  numberOfLines={1}
                  style={styles.txDescription}
                >
                  {item.description || "—"}
                </Text>
                {(item.source_name || item.destination_name) && (
                  <Text
                    variant="bodySmall"
                    numberOfLines={1}
                    style={styles.txAccountName}
                  >
                    {isIncoming ? item.source_name : item.destination_name}
                  </Text>
                )}
                {subtitle ? (
                  <Text
                    variant="labelSmall"
                    numberOfLines={1}
                    style={styles.txSubtitle}
                  >
                    {subtitle}
                  </Text>
                ) : null}
              </View>
            </View>
            <View style={styles.txRight}>
              <Text
                variant="titleSmall"
                style={[styles.txAmount, { color: amountColor }]}
              >
                {isIncoming ? "+" : "-"}
                {item.currency_symbol}{" "}
                {balanceVisible
                  ? formatAmount(amount, item.currency_decimal_places ?? 2)
                  : "••••••"}
              </Text>
              <Text variant="labelSmall" style={styles.txDate}>
                {formatDate(item.date)}
              </Text>
            </View>
          </View>
        </View>
      </GlassCard>
    );
  },
  (prevProps, nextProps) => {
    // Custom comparison for better memoization (include balanceVisible so toggle updates immediately)
    return (
      prevProps.item._flatKey === nextProps.item._flatKey &&
      prevProps.primaryColor === nextProps.primaryColor &&
      prevProps.errorColor === nextProps.errorColor &&
      prevProps.surfaceVariantColor === nextProps.surfaceVariantColor &&
      prevProps.balanceVisible === nextProps.balanceVisible
    );
  }
);

// Memoized Header Component
interface ListHeaderProps {
  typeFilter: TransactionTypeFilter;
  onTypeFilterChange: (filter: TransactionTypeFilter) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  primaryContainerColor: string;
  onPrimaryContainerColor: string;
  surfaceVariantColor: string;
  onSurfaceVariantColor: string;
  onSurfaceColor: string;
}

const ListHeader = memo(function ListHeader({
  typeFilter,
  onTypeFilterChange,
  searchQuery,
  onSearchChange,
  primaryContainerColor,
  onPrimaryContainerColor,
  surfaceVariantColor,
  onSurfaceVariantColor,
  onSurfaceColor,
}: ListHeaderProps) {
  return (
    <>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabsScroll}
        contentContainerStyle={styles.tabsContent}
      >
        {TRANSACTION_TYPE_TABS.map(({ key, label }) => (
          <Chip
            key={key}
            selected={typeFilter === key}
            onPress={() => onTypeFilterChange(key)}
            style={[
              styles.tabChip,
              typeFilter === key && {
                backgroundColor: primaryContainerColor,
              },
            ]}
            textStyle={
              typeFilter === key
                ? { color: onPrimaryContainerColor }
                : undefined
            }
          >
            {label}
          </Chip>
        ))}
      </ScrollView>
      <Searchbar
        placeholder="Search by description, category, account..."
        value={searchQuery}
        onChangeText={onSearchChange}
        style={[styles.searchBar, { backgroundColor: surfaceVariantColor }]}
        iconColor={onSurfaceVariantColor}
        placeholderTextColor={onSurfaceVariantColor}
        inputStyle={{ color: onSurfaceColor }}
      />
    </>
  );
});

// Selector for balanceVisible to prevent re-renders from other store changes
const selectBalanceVisible = (state: { balanceVisible: boolean }) =>
  state.balanceVisible;

export default function AccountTransactionsScreen() {
  const theme = useTheme();
  const navigation = useNavigation();
  const router = useRouter();
  const balanceVisible = useStore(selectBalanceVisible);
  const { id: accountId, name: accountName } = useLocalSearchParams<{
    id: string;
    name?: string;
  }>();

  // Refs for cleanup and request cancellation
  const isMountedRef = useRef(true);
  const loadingForAccountRef = useRef<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const interactionTaskRef = useRef<ReturnType<
    typeof InteractionManager.runAfterInteractions
  > | null>(null);

  // State
  const [groups, setGroups] = useState<AccountTransactionGroup[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<TransactionTypeFilter>("all");
  const [isReady, setIsReady] = useState(false);

  // Stable navigation callback
  const goBackToAccounts = useCallback(() => {
    router.replace("/(drawer)/accounts");
  }, [router]);

  // Setup navigation header - only when account name changes
  useEffect(() => {
    const title = accountName
      ? decodeURIComponent(accountName)
      : "Transactions";
    navigation.setOptions({
      title,
      headerLeft: () => (
        <Pressable
          onPress={goBackToAccounts}
          hitSlop={12}
          style={({ pressed }) => [
            { padding: 8, marginLeft: 4, opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <MaterialCommunityIcons
            name="arrow-left"
            size={24}
            color={theme.colors.onSurface}
          />
        </Pressable>
      ),
    });
  }, [navigation, accountName, goBackToAccounts, theme.colors.onSurface]);

  // Hardware back button handler
  useEffect(() => {
    const onBackPress = () => {
      goBackToAccounts();
      return true;
    };
    const sub = BackHandler.addEventListener("hardwareBackPress", onBackPress);
    return () => sub.remove();
  }, [goBackToAccounts]);

  // Master cleanup effect - runs once on mount/unmount
  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      // Mark as unmounted first
      isMountedRef.current = false;
      loadingForAccountRef.current = null;

      // Cancel any pending API requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }

      // Cancel any pending interaction tasks
      if (interactionTaskRef.current) {
        interactionTaskRef.current.cancel();
        interactionTaskRef.current = null;
      }
    };
  }, []);

  // Data loading function with abort support
  const loadPage = useCallback(
    async (pageNum: number, append: boolean) => {
      if (!accountId || !isMountedRef.current) return;

      const thisAccountId = accountId;
      loadingForAccountRef.current = thisAccountId;

      // Cancel any previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      if (pageNum === 1 && !append) {
        setIsLoading(true);
      } else if (append) {
        setIsLoadingMore(true);
      }

      try {
        const res = await apiClient.getAccountTransactions(
          thisAccountId,
          pageNum,
          undefined,
          undefined,
          undefined
        );

        // Check if still mounted and same account before updating state
        if (
          !isMountedRef.current ||
          loadingForAccountRef.current !== thisAccountId
        ) {
          return;
        }

        const newGroups = res.data ?? [];
        const totalPages = res.meta?.pagination?.total_pages ?? 1;

        if (append) {
          setGroups((prev) => [...prev, ...newGroups]);
        } else {
          setGroups(newGroups);
        }
        setHasMore(pageNum < totalPages);
        setPage(pageNum);
      } catch (error) {
        // Ignore abort errors
        if (error instanceof Error && error.name === "AbortError") {
          return;
        }
        // Handle other errors silently if unmounted
        if (!isMountedRef.current) return;
        console.error("Failed to load transactions:", error);
      } finally {
        if (
          isMountedRef.current &&
          loadingForAccountRef.current === thisAccountId
        ) {
          setIsLoading(false);
          setIsLoadingMore(false);
          setIsRefreshing(false);
        }
      }
    },
    [accountId]
  );

  // Load more callback - stable reference
  const loadMore = useCallback(() => {
    if (isLoadingMore || !hasMore || !accountId || !isMountedRef.current)
      return;
    loadPage(page + 1, true);
  }, [loadPage, page, hasMore, isLoadingMore, accountId]);

  // Refresh callback
  const onRefresh = useCallback(() => {
    if (!isMountedRef.current) return;
    setIsRefreshing(true);
    setPage(1);
    setHasMore(true);
    loadPage(1, false);
  }, [loadPage]);

  // Initial data load when account changes
  useEffect(() => {
    if (!accountId) return;

    // Reset state for new account
    setIsReady(false);
    setGroups([]);
    setPage(1);
    setHasMore(true);
    setSearchQuery("");
    setTypeFilter("all");

    // Cancel any previous interaction task
    if (interactionTaskRef.current) {
      interactionTaskRef.current.cancel();
    }

    // Defer loading until after animations complete
    interactionTaskRef.current = InteractionManager.runAfterInteractions(() => {
      if (!isMountedRef.current) return;
      setIsReady(true);
      loadPage(1, false);
    });

    return () => {
      if (interactionTaskRef.current) {
        interactionTaskRef.current.cancel();
        interactionTaskRef.current = null;
      }
    };
  }, [accountId, loadPage]);

  // Memoized data transformations
  const flatData = useMemo(() => flattenGroups(groups), [groups]);

  const filteredFlatData = useMemo(() => {
    let result = flatData;
    if (typeFilter !== "all") {
      const typeLower = typeFilter.toLowerCase();
      result = result.filter((tx) => tx.type?.toLowerCase() === typeLower);
    }
    if (!searchQuery.trim()) return result;
    const q = searchQuery.trim().toLowerCase();
    return result.filter(
      (tx) =>
        tx.description?.toLowerCase().includes(q) ||
        tx.source_name?.toLowerCase().includes(q) ||
        tx.destination_name?.toLowerCase().includes(q) ||
        tx.category_name?.toLowerCase().includes(q) ||
        tx.budget_name?.toLowerCase().includes(q) ||
        tx.notes?.toLowerCase().includes(q)
    );
  }, [flatData, typeFilter, searchQuery]);

  // Stable callbacks for header component
  const handleTypeFilterChange = useCallback(
    (filter: TransactionTypeFilter) => {
      setTypeFilter(filter);
    },
    []
  );

  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  // Memoized header with stable props
  const listHeader = useMemo(
    () => (
      <ListHeader
        typeFilter={typeFilter}
        onTypeFilterChange={handleTypeFilterChange}
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        primaryContainerColor={theme.colors.primaryContainer}
        onPrimaryContainerColor={theme.colors.onPrimaryContainer}
        surfaceVariantColor={theme.colors.surfaceVariant}
        onSurfaceVariantColor={theme.colors.onSurfaceVariant}
        onSurfaceColor={theme.colors.onSurface}
      />
    ),
    [
      typeFilter,
      handleTypeFilterChange,
      searchQuery,
      handleSearchChange,
      theme.colors.primaryContainer,
      theme.colors.onPrimaryContainer,
      theme.colors.surfaceVariant,
      theme.colors.onSurfaceVariant,
      theme.colors.onSurface,
    ]
  );

  // Memoized empty state
  const listEmpty = useMemo(() => {
    if (isLoading) {
      return (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text variant="bodyMedium" style={styles.loadingText}>
            Loading transactions...
          </Text>
        </View>
      );
    }
    const noResults = flatData.length > 0 && filteredFlatData.length === 0;
    return (
      <View style={styles.emptyState}>
        <MaterialCommunityIcons
          name={noResults ? "magnify" : "swap-horizontal"}
          size={64}
          color={theme.colors.onSurfaceVariant}
        />
        <Text variant="headlineSmall" style={styles.emptyTitle}>
          {noResults ? "No matching transactions" : "No transactions"}
        </Text>
        <Text variant="bodyMedium" style={styles.emptySubtitle}>
          {noResults
            ? "Try a different search or filter"
            : "This account has no transactions yet."}
        </Text>
      </View>
    );
  }, [
    isLoading,
    flatData.length,
    filteredFlatData.length,
    theme.colors.primary,
    theme.colors.onSurfaceVariant,
  ]);

  // Extract colors for renderItem to avoid theme dependency
  const primaryColor = theme.colors.primary;
  const errorColor = theme.colors.error;
  const surfaceVariantColor = theme.colors.surfaceVariant;

  // Optimized renderItem using memoized component
  const renderItem = useCallback(
    ({ item }: { item: FlatTransaction }) => (
      <TransactionItem
        item={item}
        primaryColor={primaryColor}
        errorColor={errorColor}
        surfaceVariantColor={surfaceVariantColor}
        balanceVisible={balanceVisible}
      />
    ),
    [primaryColor, errorColor, surfaceVariantColor, balanceVisible]
  );

  // Stable key extractor
  const keyExtractor = useCallback(
    (item: FlatTransaction) => item._flatKey,
    []
  );

  // Item layout for better scroll performance
  const getItemLayout = useCallback(
    (_data: ArrayLike<FlatTransaction> | null | undefined, index: number) => ({
      length: ITEM_HEIGHT + ITEM_MARGIN,
      offset: (ITEM_HEIGHT + ITEM_MARGIN) * index,
      index,
    }),
    []
  );

  // Memoized footer
  const footer = useMemo(() => {
    if (!hasMore || flatData.length === 0) return null;
    if (isLoadingMore) {
      return (
        <View style={styles.footer}>
          <ActivityIndicator size="small" color={theme.colors.primary} />
          <Text variant="bodySmall" style={styles.footerText}>
            Loading more...
          </Text>
        </View>
      );
    }
    return null;
  }, [hasMore, flatData.length, isLoadingMore, theme.colors.primary]);

  // Early returns for invalid/loading states
  if (!accountId) {
    return (
      <View
        style={[
          styles.container,
          styles.centerContent,
          { backgroundColor: theme.colors.background },
        ]}
      >
        <Text variant="bodyLarge">Invalid account.</Text>
      </View>
    );
  }

  if (!isReady) {
    return (
      <View
        style={[
          styles.container,
          styles.centerContent,
          { backgroundColor: theme.colors.background },
        ]}
      >
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text variant="bodyMedium" style={styles.loadingText}>
          Loading...
        </Text>
      </View>
    );
  }

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <FlatList
        data={filteredFlatData}
        extraData={balanceVisible}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        getItemLayout={getItemLayout}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={listEmpty}
        ListFooterComponent={footer}
        contentContainerStyle={[
          styles.listContent,
          filteredFlatData.length === 0 &&
            !isLoading &&
            styles.listContentEmpty,
        ]}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing && !isLoading}
            onRefresh={onRefresh}
            colors={[theme.colors.primary]}
          />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.4}
        removeClippedSubviews={true}
        maxToRenderPerBatch={12}
        windowSize={7}
        initialNumToRender={10}
        updateCellsBatchingPeriod={50}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  listContentEmpty: {
    flexGrow: 1,
  },
  centerContent: {
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 80,
  },
  emptyState: {
    alignItems: "center",
    paddingTop: 80,
  },
  emptyTitle: {
    marginTop: 16,
  },
  emptySubtitle: {
    marginTop: 8,
    opacity: 0.7,
  },
  loadingText: {
    marginTop: 12,
  },
  tabsScroll: {
    marginBottom: 12,
    maxHeight: 48,
  },
  tabsContent: {
    flexDirection: "row",
    gap: 8,
    paddingVertical: 4,
  },
  tabChip: {
    marginRight: 4,
  },
  searchBar: {
    marginBottom: 16,
    elevation: 0,
  },
  txCard: {
    marginBottom: ITEM_MARGIN,
    borderRadius: 16,
    overflow: "hidden",
  },
  txCardInner: {
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  txRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  txLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    minWidth: 0,
  },
  txIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  txBody: {
    flex: 1,
    minWidth: 0,
  },
  txRight: {
    alignItems: "flex-end",
    marginLeft: 12,
  },
  txDescription: {
    fontWeight: "600",
  },
  txAccountName: {
    marginTop: 2,
    opacity: 0.7,
  },
  txSubtitle: {
    marginTop: 2,
    opacity: 0.6,
  },
  txAmount: {
    fontWeight: "700",
  },
  txDate: {
    marginTop: 2,
    opacity: 0.6,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 20,
  },
  footerText: {
    marginLeft: 8,
  },
});
