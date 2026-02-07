// Transactions Screen – lists all transactions with infinite scroll and filters
import { GlassCard } from "@/components/glass-card";
import { apiClient } from "@/lib/api-client";
import { formatAmount } from "@/lib/format-currency";
import { useStore } from "@/lib/store";
import type { AccountTransaction, AccountTransactionGroup } from "@/types";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useInfiniteQuery } from "@tanstack/react-query";
import React, { memo, useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { Chip, Searchbar, Text, useTheme } from "react-native-paper";

// ---------------------------------------------------------------------------
// Types & Constants
// ---------------------------------------------------------------------------

type TransactionTypeFilter = "all" | "withdrawal" | "deposit" | "transfer";

const TRANSACTION_TYPE_TABS: { key: TransactionTypeFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "withdrawal", label: "Expenses" },
  { key: "deposit", label: "Income" },
  { key: "transfer", label: "Transfers" },
];

/** Individual transaction decorated with group metadata for FlatList keys */
type FlatTransaction = AccountTransaction & {
  _groupId: string;
  _groupTitle: string;
  _flatKey: string;
};

// Approximate height of a transaction card + margin (for getItemLayout)
const ITEM_HEIGHT = 82;
const ITEM_MARGIN = 12;
const PAGE_SIZE = 50;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Flatten transaction groups into a flat array of individual transactions */
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
  if (t === "transfer") return "#64B5F6";
  return primary;
}

// ---------------------------------------------------------------------------
// Memoized Transaction Item
// ---------------------------------------------------------------------------

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
    const typeLower = item.type?.toLowerCase();
    const isIncoming = typeLower === "deposit" || typeLower === "revenue";
    const isTransfer = typeLower === "transfer";
    const amountColor = getTransactionTypeColor(
      item.type,
      primaryColor,
      errorColor
    );

    const iconName = isTransfer
      ? "swap-horizontal"
      : isIncoming
        ? "arrow-down-bold"
        : "arrow-up-bold";

    const accountLabel = isTransfer
      ? `${item.source_name} → ${item.destination_name}`
      : isIncoming
        ? item.source_name
        : item.destination_name;

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
                    iconName as keyof typeof MaterialCommunityIcons.glyphMap
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
                {accountLabel ? (
                  <Text
                    variant="bodySmall"
                    numberOfLines={1}
                    style={styles.txAccountName}
                  >
                    {accountLabel}
                  </Text>
                ) : null}
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
                {isTransfer ? "" : isIncoming ? "+" : "-"}
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
    return (
      prevProps.item._flatKey === nextProps.item._flatKey &&
      prevProps.primaryColor === nextProps.primaryColor &&
      prevProps.errorColor === nextProps.errorColor &&
      prevProps.surfaceVariantColor === nextProps.surfaceVariantColor &&
      prevProps.balanceVisible === nextProps.balanceVisible
    );
  }
);

// ---------------------------------------------------------------------------
// Memoized List Header (type chips + search bar)
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Zustand selector
// ---------------------------------------------------------------------------

const selectBalanceVisible = (state: { balanceVisible: boolean }) =>
  state.balanceVisible;

// ---------------------------------------------------------------------------
// Main Screen
// ---------------------------------------------------------------------------

export default function TransactionsScreen() {
  const theme = useTheme();
  const balanceVisible = useStore(selectBalanceVisible);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<TransactionTypeFilter>("all");

  // Infinite query: fetches pages of transactions from the API
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isRefetching,
    refetch,
  } = useInfiniteQuery({
    queryKey: ["transactions", typeFilter],
    queryFn: ({ pageParam }) =>
      apiClient.getTransactions(
        pageParam,
        undefined,
        undefined,
        typeFilter === "all" ? undefined : typeFilter,
        PAGE_SIZE
      ),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      const totalPages = lastPage.meta?.pagination?.total_pages ?? 1;
      const currentPage = allPages.length;
      return currentPage < totalPages ? currentPage + 1 : undefined;
    },
  });

  // Flatten all pages into a single list of transaction groups, then into individual transactions
  const allGroups = useMemo(
    () => data?.pages.flatMap((page) => page.data ?? []) ?? [],
    [data]
  );
  const flatData = useMemo(() => flattenGroups(allGroups), [allGroups]);

  // Client-side search filtering (API does not support query param)
  const filteredFlatData = useMemo(() => {
    if (!searchQuery.trim()) return flatData;
    const q = searchQuery.trim().toLowerCase();
    return flatData.filter(
      (tx) =>
        tx.description?.toLowerCase().includes(q) ||
        tx.source_name?.toLowerCase().includes(q) ||
        tx.destination_name?.toLowerCase().includes(q) ||
        tx.category_name?.toLowerCase().includes(q) ||
        tx.budget_name?.toLowerCase().includes(q) ||
        tx.notes?.toLowerCase().includes(q)
    );
  }, [flatData, searchQuery]);

  // -----------------------------------------------------------------------
  // Stable callbacks
  // -----------------------------------------------------------------------

  const handleTypeFilterChange = useCallback(
    (filter: TransactionTypeFilter) => {
      setTypeFilter(filter);
      setSearchQuery("");
    },
    []
  );

  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  // -----------------------------------------------------------------------
  // Memoized FlatList sub-components
  // -----------------------------------------------------------------------

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
            : "No transactions found for the selected filter."}
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

  // Extract colors for stable references (avoids theme object identity changes)
  const primaryColor = theme.colors.primary;
  const errorColor = theme.colors.error;
  const surfaceVariantColor = theme.colors.surfaceVariant;

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

  const keyExtractor = useCallback(
    (item: FlatTransaction) => item._flatKey,
    []
  );

  const getItemLayout = useCallback(
    (_data: ArrayLike<FlatTransaction> | null | undefined, index: number) => ({
      length: ITEM_HEIGHT + ITEM_MARGIN,
      offset: (ITEM_HEIGHT + ITEM_MARGIN) * index,
      index,
    }),
    []
  );

  const footer = useMemo(() => {
    if (!hasNextPage || flatData.length === 0) return null;
    if (isFetchingNextPage) {
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
  }, [hasNextPage, flatData.length, isFetchingNextPage, theme.colors.primary]);

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

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
            refreshing={isRefetching && !isLoading}
            onRefresh={handleRefresh}
            colors={[theme.colors.primary]}
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.4}
        removeClippedSubviews={true}
        maxToRenderPerBatch={12}
        windowSize={7}
        initialNumToRender={15}
        updateCellsBatchingPeriod={50}
      />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

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
