// Transactions Screen – lists all transactions with infinite scroll and filters
import { GlassCard } from "@/components/glass-card";
import { apiClient } from "@/lib/api-client";
import { formatAmount } from "@/lib/format-currency";
import { queryClient } from "@/lib/query-client";
import { useStore } from "@/lib/store";
import type { AccountTransaction, AccountTransactionGroup } from "@/types";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useInfiniteQuery } from "@tanstack/react-query";
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
  const [contextMenuTransaction, setContextMenuTransaction] =
    useState<FlatTransaction | null>(null);
  const [contextMenuVisible, setContextMenuVisible] = useState(false);

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
    queryKey: accountId
      ? ["accountTransactions", accountId, typeFilter]
      : ["transactions", typeFilter],
    queryFn: ({ pageParam }) =>
      accountId
        ? apiClient.searchTransactions(
            `account_id:${accountId}${typeFilter !== "all" ? ` type:${typeFilter}` : ""}`,
            pageParam,
            PAGE_SIZE
          )
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
    router.push(`/(drawer)/transaction/edit/${groupId}` as Href);
  }, [contextMenuTransaction, router]);

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
        onEndReachedThreshold={0.4}
        removeClippedSubviews={true}
        maxToRenderPerBatch={12}
        windowSize={7}
        initialNumToRender={15}
        updateCellsBatchingPeriod={50}
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
    borderColor: "rgba(29, 185, 84, 0.3)",
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
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  contextMenuButtonPressed: {
    opacity: 0.92,
  },
  editButton: {
    backgroundColor: "#1DB954",
    borderColor: "#1DB954",
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
