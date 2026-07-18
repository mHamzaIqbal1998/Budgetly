// Transactions Screen – lists all transactions with infinite scroll and filters
import { GlassCard } from "@/components/glass-card";
import { TransactionFiltersModal } from "@/components/transaction-filters-modal";
import { apiClient } from "@/lib/api-client";
import { CACHE_KEYS, cache } from "@/lib/cache";
import { formatAmount } from "@/lib/format-currency";
import { queryClient } from "@/lib/query-client";
import { useStore } from "@/lib/store";
import {
  DEFAULT_FILTERS,
  buildSearchQuery,
  clearFilter,
  countActiveFilters,
  getActiveFilterChips,
  type AdvancedFilters,
  type FilterChipKey,
} from "@/lib/transaction-filters";
import type { AccountTransaction, AccountTransactionGroup } from "@/types";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { BlurView } from "expo-blur";
import {
  useLocalSearchParams,
  useNavigation,
  useRouter,
  type Href,
} from "expo-router";
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
  Alert,
  Animated,
  Dimensions,
  FlatList,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { Card, Chip, Searchbar, Text, useTheme } from "react-native-paper";

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
const { width: SCREEN_WIDTH } = Dimensions.get("window");

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
  onPress: () => void;
  onLongPress: () => void;
}

const TransactionItem = memo(
  function TransactionItem({
    item,
    primaryColor,
    errorColor,
    surfaceVariantColor,
    balanceVisible,
    onPress,
    onLongPress,
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
      <Pressable
        onPress={onPress}
        onLongPress={onLongPress}
        delayLongPress={400}
        style={({ pressed }) => pressed && styles.txCardPressed}
      >
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
      </Pressable>
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
  onOpenFilters: () => void;
  activeFilterCount: number;
  activeFilterChips: { key: FilterChipKey; label: string; icon: string }[];
  onRemoveFilter: (key: FilterChipKey) => void;
  onClearAllFilters: () => void;
  primaryColor: string;
  onPrimaryColor: string;
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
  onOpenFilters,
  activeFilterCount,
  activeFilterChips,
  onRemoveFilter,
  onClearAllFilters,
  primaryColor,
  onPrimaryColor,
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

      <View style={styles.searchRow}>
        <Searchbar
          placeholder="Search description, category, account..."
          value={searchQuery}
          onChangeText={onSearchChange}
          style={[
            styles.searchBar,
            styles.searchBarFlex,
            { backgroundColor: surfaceVariantColor },
          ]}
          iconColor={onSurfaceVariantColor}
          placeholderTextColor={onSurfaceVariantColor}
          inputStyle={{ color: onSurfaceColor }}
          right={() => null}
        />
        <Pressable
          onPress={onOpenFilters}
          style={({ pressed }) => [
            styles.filterButton,
            {
              backgroundColor:
                activeFilterCount > 0 ? primaryColor : surfaceVariantColor,
            },
            pressed && styles.filterButtonPressed,
          ]}
          hitSlop={6}
        >
          <MaterialCommunityIcons
            name="tune-variant"
            size={22}
            color={
              activeFilterCount > 0 ? onPrimaryColor : onSurfaceVariantColor
            }
          />
          {activeFilterCount > 0 ? (
            <View
              style={[styles.filterBadge, { backgroundColor: onPrimaryColor }]}
            >
              <Text style={[styles.filterBadgeText, { color: primaryColor }]}>
                {activeFilterCount}
              </Text>
            </View>
          ) : null}
        </Pressable>
      </View>

      {activeFilterChips.length > 0 ? (
        <View style={styles.activeFiltersWrap}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.activeFiltersContent}
          >
            {activeFilterChips.map((chip) => (
              <Chip
                key={chip.key}
                compact
                icon={chip.icon}
                onClose={() => onRemoveFilter(chip.key)}
                style={[
                  styles.activeChip,
                  { backgroundColor: primaryContainerColor },
                ]}
                textStyle={{ color: onPrimaryContainerColor }}
                closeIcon="close"
              >
                {chip.label}
              </Chip>
            ))}
            <Pressable onPress={onClearAllFilters} style={styles.clearAllChip}>
              <Text style={[styles.clearAllText, { color: primaryColor }]}>
                Clear all
              </Text>
            </Pressable>
          </ScrollView>
        </View>
      ) : null}
    </>
  );
});

// ---------------------------------------------------------------------------
// Context Menu Card (shown on long press)
// ---------------------------------------------------------------------------

interface TransactionContextMenuCardProps {
  item: FlatTransaction;
  primaryColor: string;
  errorColor: string;
  surfaceVariantColor: string;
  balanceVisible: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onClose: () => void;
}

function TransactionContextMenuCard({
  item,
  primaryColor,
  errorColor,
  surfaceVariantColor,
  balanceVisible,
  onEdit,
  onDelete,
  onClose,
}: TransactionContextMenuCardProps) {
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  React.useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 8,
      tension: 100,
      useNativeDriver: true,
    }).start();
  }, [scaleAnim]);

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

  return (
    <Animated.View
      style={[
        styles.contextMenuContainer,
        { transform: [{ scale: scaleAnim }] },
      ]}
    >
      {/* Transaction Preview Card */}
      <View style={styles.contextMenuCard}>
        <GlassCard variant="elevated" style={styles.contextMenuCardInner}>
          <Card.Content>
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
                  <Text
                    variant="bodySmall"
                    numberOfLines={1}
                    style={styles.txAccountName}
                  >
                    {isTransfer
                      ? `${item.source_name} → ${item.destination_name}`
                      : isIncoming
                        ? item.source_name
                        : item.destination_name}
                  </Text>
                </View>
              </View>
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
            </View>
          </Card.Content>
        </GlassCard>
      </View>

      {/* Action Buttons */}
      <View style={styles.contextMenuActions}>
        <Pressable
          onPress={onEdit}
          style={({ pressed }) => [
            styles.contextMenuButton,
            styles.editButton,
            pressed && styles.contextMenuButtonPressed,
          ]}
        >
          <MaterialCommunityIcons name="pencil" size={20} color="#FFFFFF" />
          <Text style={[styles.contextMenuButtonText, styles.editButtonText]}>
            Edit Transaction
          </Text>
        </Pressable>

        <Pressable
          onPress={onDelete}
          style={({ pressed }) => [
            styles.contextMenuButton,
            styles.deleteButton,
            pressed && styles.contextMenuButtonPressed,
          ]}
        >
          <MaterialCommunityIcons
            name="delete-outline"
            size={20}
            color="#FFFFFF"
          />
          <Text style={[styles.contextMenuButtonText, styles.deleteButtonText]}>
            Delete Transaction
          </Text>
        </Pressable>

        <Pressable
          onPress={onClose}
          style={({ pressed }) => [
            styles.contextMenuButton,
            styles.cancelButton,
            pressed && styles.contextMenuButtonPressed,
          ]}
        >
          <MaterialCommunityIcons name="close" size={20} color="#FFFFFF" />
          <Text style={[styles.contextMenuButtonText, styles.cancelButtonText]}>
            Cancel
          </Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

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
  const router = useRouter();
  const navigation = useNavigation();
  const balanceVisible = useStore(selectBalanceVisible);
  const { accountId, accountName } = useLocalSearchParams<{
    accountId?: string;
    accountName?: string;
  }>();
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<TransactionTypeFilter>("all");
  const [filters, setFilters] = useState<AdvancedFilters>(DEFAULT_FILTERS);
  const [filtersModalVisible, setFiltersModalVisible] = useState(false);
  const [contextMenuTransaction, setContextMenuTransaction] =
    useState<FlatTransaction | null>(null);
  const [contextMenuVisible, setContextMenuVisible] = useState(false);

  // Advanced-filter derived values
  const activeFilterCount = useMemo(
    () => countActiveFilters(filters),
    [filters]
  );
  const activeFilterChips = useMemo(
    () => getActiveFilterChips(filters),
    [filters]
  );
  // Use the search endpoint whenever we are scoped to an account OR any
  // advanced filter is active. Otherwise keep the original plain list path.
  const useSearchEndpoint = !!accountId || activeFilterCount > 0;
  const composedQuery = useMemo(
    () => buildSearchQuery({ accountId, type: typeFilter, filters }),
    [accountId, typeFilter, filters]
  );

  // Reference data for the filter modal selectors
  const { data: categoriesData } = useQuery({
    queryKey: ["autocomplete-categories"],
    queryFn: () => apiClient.getAutocompleteCategories(),
    staleTime: 5 * 60 * 1000,
  });
  const { data: budgetsData } = useQuery({
    queryKey: ["all-budgets-filter"],
    queryFn: () => apiClient.getAllBudgets(),
    staleTime: 5 * 60 * 1000,
  });

  const categoryOptions = useMemo(
    () => (categoriesData ?? []).map((c) => ({ id: c.id, name: c.name })),
    [categoriesData]
  );
  const budgetOptions = useMemo(
    () =>
      (budgetsData?.data ?? []).map((b) => ({
        id: b.id,
        name: b.attributes.name,
      })),
    [budgetsData]
  );

  // Setup navigation header based on whether account info is provided
  useEffect(() => {
    if (accountId && accountId !== "" && accountName && accountName !== "") {
      const title = decodeURIComponent(accountName);
      navigation.setOptions({
        title,
        headerLeft: () => (
          <Pressable
            onPress={() => router.replace("/(drawer)/accounts")}
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
    } else {
      navigation.setOptions({
        title: "Transactions",
        headerLeft: undefined,
      });
    }
  }, [navigation, accountId, accountName, router, theme.colors.onSurface]);

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
    queryKey: useSearchEndpoint
      ? ["transactionsSearch", accountId ?? "all", typeFilter, composedQuery]
      : ["transactions", typeFilter],
    queryFn: ({ pageParam }) =>
      useSearchEndpoint
        ? apiClient.searchTransactions(composedQuery, pageParam, PAGE_SIZE)
        : apiClient.getTransactions(
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

  const handleOpenFilters = useCallback(() => {
    setFiltersModalVisible(true);
  }, []);

  const handleCloseFilters = useCallback(() => {
    setFiltersModalVisible(false);
  }, []);

  const handleApplyFilters = useCallback((next: AdvancedFilters) => {
    setFilters(next);
    setFiltersModalVisible(false);
  }, []);

  const handleRemoveFilter = useCallback((key: FilterChipKey) => {
    setFilters((prev) => clearFilter(prev, key));
  }, []);

  const handleClearAllFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
  }, []);

  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const handleLongPress = useCallback((item: FlatTransaction) => {
    setContextMenuTransaction(item);
    setContextMenuVisible(true);
  }, []);

  const handleContextMenuClose = useCallback(() => {
    setContextMenuVisible(false);
    setContextMenuTransaction(null);
  }, []);

  const handleEditTransaction = useCallback(() => {
    if (!contextMenuTransaction) return;
    const groupId = contextMenuTransaction._groupId;
    setContextMenuVisible(false);
    setContextMenuTransaction(null);
    if (accountId && accountName) {
      router.push(
        `/(drawer)/transaction/edit/${groupId}?accountId=${accountId}&accountName=${accountName}` as Href
      );
    } else {
      router.push(`/(drawer)/transaction/edit/${groupId}` as Href);
    }
  }, [contextMenuTransaction, router, accountId, accountName]);

  const handleDeleteTransaction = useCallback(() => {
    if (!contextMenuTransaction) return;
    const txDescription =
      contextMenuTransaction.description || "this transaction";
    const groupId = contextMenuTransaction._groupId;
    Alert.alert(
      "Delete Transaction",
      `Delete "${txDescription}"? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setContextMenuVisible(false);
            setContextMenuTransaction(null);
            try {
              await apiClient.deleteTransaction(groupId);
              // Remove the detail cache for this transaction
              queryClient.removeQueries({
                queryKey: ["transaction", groupId],
              });
              queryClient.removeQueries({ queryKey: ["transactions"] });
              cache.remove(CACHE_KEYS.ACCOUNTS);
              queryClient.removeQueries({ queryKey: ["all-accounts"] });
              queryClient.invalidateQueries({ queryKey: ["all-accounts"] });
              // Invalidate piggy banks since account balances changed
              queryClient.removeQueries({ queryKey: ["piggy-banks-list"] });
              queryClient.removeQueries({
                queryKey: ["all-accounts-piggy-banks"],
              });
              queryClient.invalidateQueries({ queryKey: ["piggy-banks-list"] });
              queryClient.invalidateQueries({
                queryKey: ["all-accounts-piggy-banks"],
              });
              // Refetch the transactions list to reflect the deletion
              refetch();
              Alert.alert("Success", "Transaction deleted successfully");
            } catch (error) {
              console.error("Failed to delete transaction:", error);
              const message =
                error instanceof Error
                  ? error.message
                  : "Failed to delete transaction";
              Alert.alert("Error", message);
            }
          },
        },
      ]
    );
  }, [contextMenuTransaction, refetch]);

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
        onOpenFilters={handleOpenFilters}
        activeFilterCount={activeFilterCount}
        activeFilterChips={activeFilterChips}
        onRemoveFilter={handleRemoveFilter}
        onClearAllFilters={handleClearAllFilters}
        primaryColor={theme.colors.primary}
        onPrimaryColor={theme.colors.onPrimary}
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
      handleOpenFilters,
      activeFilterCount,
      activeFilterChips,
      handleRemoveFilter,
      handleClearAllFilters,
      theme.colors.primary,
      theme.colors.onPrimary,
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
    const hasFilters = activeFilterCount > 0;
    return (
      <View style={styles.emptyState}>
        <MaterialCommunityIcons
          name={
            noResults || hasFilters
              ? "filter-remove-outline"
              : "swap-horizontal"
          }
          size={64}
          color={theme.colors.onSurfaceVariant}
        />
        <Text variant="headlineSmall" style={styles.emptyTitle}>
          {noResults || hasFilters
            ? "No matching transactions"
            : "No transactions"}
        </Text>
        <Text variant="bodyMedium" style={styles.emptySubtitle}>
          {noResults || hasFilters
            ? "Try adjusting your search or filters"
            : "No transactions found for the selected filter."}
        </Text>
      </View>
    );
  }, [
    isLoading,
    flatData.length,
    filteredFlatData.length,
    activeFilterCount,
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
        onPress={() =>
          router.push(
            `/(drawer)/transaction/${item._groupId}${accountId ? `?accountId=${accountId}&accountName=${accountName}` : ""}` as Href
          )
        }
        onLongPress={() => handleLongPress(item)}
      />
    ),
    [
      primaryColor,
      errorColor,
      surfaceVariantColor,
      balanceVisible,
      router,
      handleLongPress,
      accountId,
      accountName,
    ]
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
        onEndReachedThreshold={0.5}
        removeClippedSubviews={true}
        maxToRenderPerBatch={20}
        windowSize={5}
        initialNumToRender={10}
        updateCellsBatchingPeriod={100}
        disableVirtualization={false}
      />

      {/* Context Menu Modal */}
      <Modal
        visible={contextMenuVisible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={handleContextMenuClose}
      >
        <Pressable style={styles.modalOverlay} onPress={handleContextMenuClose}>
          {Platform.OS === "ios" ? (
            <BlurView
              intensity={80}
              tint="dark"
              style={StyleSheet.absoluteFill}
            />
          ) : (
            <View style={styles.androidOverlay} />
          )}
          <Pressable onPress={(e) => e.stopPropagation()}>
            {contextMenuTransaction && (
              <TransactionContextMenuCard
                item={contextMenuTransaction}
                primaryColor={primaryColor}
                errorColor={errorColor}
                surfaceVariantColor={surfaceVariantColor}
                balanceVisible={balanceVisible}
                onEdit={handleEditTransaction}
                onDelete={handleDeleteTransaction}
                onClose={handleContextMenuClose}
              />
            )}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Advanced Filters Modal */}
      <TransactionFiltersModal
        visible={filtersModalVisible}
        onClose={handleCloseFilters}
        initialFilters={filters}
        onApply={handleApplyFilters}
        categories={categoryOptions}
        budgets={budgetOptions}
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
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
  },
  searchBar: {
    elevation: 0,
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: {
      width: 0,
      height: 0,
    },
  },
  searchBarFlex: {
    flex: 1,
  },
  filterButton: {
    width: 50,
    height: 50,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  filterButtonPressed: {
    opacity: 0.8,
  },
  filterBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 5,
    alignItems: "center",
    justifyContent: "center",
  },
  filterBadgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  activeFiltersWrap: {
    marginBottom: 16,
    marginTop: -4,
  },
  activeFiltersContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 2,
  },
  activeChip: {
    marginRight: 2,
  },
  clearAllChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    justifyContent: "center",
  },
  clearAllText: {
    fontWeight: "700",
    fontSize: 13,
  },
  txCard: {
    marginBottom: ITEM_MARGIN,
    borderRadius: 16,
  },
  txCardPressed: {
    opacity: 0.85,
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
  // Context Menu Styles (matching accounts screen)
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  androidOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.85)",
  },
  contextMenuContainer: {
    width: SCREEN_WIDTH - 48,
    maxWidth: 400,
  },
  contextMenuCard: {
    marginBottom: 16,
  },
  contextMenuCardInner: {
    borderWidth: 1,
    borderColor: "rgba(63, 81, 181, 0.3)",
  },
  contextMenuActions: {
    gap: 10,
  },
  contextMenuButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: "rgba(120, 120, 120, 0.15)",
  },
  contextMenuButtonPressed: {
    opacity: 0.92,
  },
  editButton: {
    backgroundColor: "#3F51B5",
    borderColor: "#3F51B5",
  },
  deleteButton: {
    backgroundColor: "#E53935",
    borderColor: "#C62828",
  },
  cancelButton: {
    backgroundColor: "#525252",
    borderColor: "#6B6B6B",
  },
  contextMenuButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  editButtonText: {
    color: "#FFFFFF",
  },
  deleteButtonText: {
    color: "#FFFFFF",
  },
  cancelButtonText: {
    color: "#FFFFFF",
  },
});
