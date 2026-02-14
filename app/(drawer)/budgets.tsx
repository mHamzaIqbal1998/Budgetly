// Budgets Screen – lists all budgets with infinite scroll and progress indicators
import { GlassCard } from "@/components/glass-card";
import { SpotifyColors } from "@/constants/spotify-theme";
import { useCachedBudgetLimitsQuery } from "@/hooks/use-cached-query";
import { apiClient } from "@/lib/api-client";
import { formatAmount } from "@/lib/format-currency";
import { useStore } from "@/lib/store";
import { getCurrentMonthStartEndDate } from "@/lib/utils";
import type { Budget, BudgetLimit, CreateBudgetData } from "@/types";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import React, { memo, useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  FlatList,
  RefreshControl,
  StyleSheet,
  View,
} from "react-native";
import {
  Button,
  Card,
  FAB,
  Modal,
  Portal,
  Switch,
  Text,
  TextInput,
  useTheme,
} from "react-native-paper";

// ---------------------------------------------------------------------------
// Types & Constants
// ---------------------------------------------------------------------------

const PAGE_SIZE = 50;

/** Enriched budget item for the flat list, combining Budget + optional BudgetLimit info */
interface FlatBudgetItem {
  budget: Budget;
  limit: BudgetLimit | null;
  _flatKey: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getSpentAmount(limit: BudgetLimit | null): {
  spent: number;
  symbol: string;
} {
  if (!limit) return { spent: 0, symbol: "" };
  const spentList = limit.attributes.spent;
  if (!spentList?.length)
    return { spent: 0, symbol: limit.attributes.currency_symbol ?? "" };
  const currencyCode =
    limit.attributes.currency_code ??
    limit.attributes.primary_currency_code ??
    spentList[0]?.currency_code;
  const entry = spentList.find((s) => s.currency_code === currencyCode);
  if (!entry)
    return { spent: 0, symbol: limit.attributes.currency_symbol ?? "" };
  return {
    spent: Math.abs(parseFloat(entry.sum)),
    symbol: entry.currency_symbol ?? entry.currency_code,
  };
}

function getBudgetTotal(limit: BudgetLimit | null): number {
  if (!limit?.attributes.amount) return 0;
  return parseFloat(limit.attributes.amount);
}

function formatBudgetDateRange(start: string, end: string): string | null {
  if (!start || !end) return null;
  const startDate = new Date(start);
  const endDate = new Date(end);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()))
    return null;
  const opts: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
  };
  return `${startDate.toLocaleDateString(undefined, opts)} – ${endDate.toLocaleDateString(undefined, opts)}`;
}

const PERIOD_LABELS: Record<string, string> = {
  daily: "Today",
  weekly: "This week",
  monthly: "This month",
  quarterly: "This quarter",
  half_year: "This half year",
  yearly: "This year",
};

function getPeriodLabel(period?: string): string {
  if (!period) return "This period";
  return PERIOD_LABELS[period] ?? "This period";
}

// ---------------------------------------------------------------------------
// Memoized Budget Card
// ---------------------------------------------------------------------------

interface BudgetCardProps {
  item: FlatBudgetItem;
  primaryColor: string;
  balanceVisible: boolean;
}

const BudgetCard = memo(
  function BudgetCard({ item, primaryColor, balanceVisible }: BudgetCardProps) {
    const { budget, limit } = item;
    const totalBudget = getBudgetTotal(limit);
    const { spent, symbol } = getSpentAmount(limit);
    const progressRatio = totalBudget > 0 ? spent / totalBudget : 0;
    const progress = Math.min(progressRatio, 1);
    const remaining = totalBudget > 0 ? Math.max(totalBudget - spent, 0) : 0;

    const fillColor =
      progressRatio >= 1
        ? SpotifyColors.danger
        : progressRatio > 0.7
          ? SpotifyColors.orange
          : SpotifyColors.green;

    const isOverBudget = progressRatio >= 1;
    const isActive = budget.attributes.active;
    const periodText = getPeriodLabel(budget.attributes.auto_budget_period);
    const dateRange = limit
      ? formatBudgetDateRange(limit.attributes.start, limit.attributes.end)
      : null;

    const currencySymbol =
      symbol ||
      budget.attributes.currency_symbol ||
      budget.attributes.primary_currency_symbol ||
      "";

    return (
      <GlassCard variant="elevated" style={styles.budgetCard}>
        <Card.Content style={styles.cardContent}>
          {/* Header: Name + Status badge */}
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <View
                style={[
                  styles.iconWrap,
                  {
                    backgroundColor: isActive
                      ? `${primaryColor}20`
                      : "rgba(255,255,255,0.08)",
                  },
                ]}
              >
                <MaterialCommunityIcons
                  name={isActive ? "wallet" : "wallet-outline"}
                  size={22}
                  color={isActive ? primaryColor : SpotifyColors.textSecondary}
                />
              </View>
              <View style={styles.nameContainer}>
                <Text
                  variant="titleMedium"
                  numberOfLines={1}
                  style={styles.budgetName}
                >
                  {budget.attributes.name}
                </Text>
                {dateRange && (
                  <Text
                    variant="labelSmall"
                    numberOfLines={1}
                    style={styles.periodText}
                  >
                    {periodText} · {dateRange}
                  </Text>
                )}
                {!dateRange && (
                  <Text
                    variant="labelSmall"
                    numberOfLines={1}
                    style={styles.periodText}
                  >
                    {periodText}
                  </Text>
                )}
              </View>
            </View>
            {isOverBudget && (
              <View style={styles.overBudgetBadge}>
                <MaterialCommunityIcons
                  name="alert-circle"
                  size={14}
                  color="#FFFFFF"
                />
                <Text style={styles.overBudgetText}>Over</Text>
              </View>
            )}
            {!isOverBudget && !isActive && (
              <View style={styles.inactiveBadge}>
                <Text style={styles.inactiveBadgeText}>Inactive</Text>
              </View>
            )}
          </View>

          {/* Progress Section */}
          {totalBudget > 0 && (
            <View style={styles.progressSection}>
              {/* Progress Bar */}
              <View style={styles.progressTrack}>
                <Animated.View
                  style={[
                    styles.progressFill,
                    {
                      width: `${progress * 100}%`,
                      backgroundColor: fillColor,
                    },
                  ]}
                />
              </View>

              {/* Percentage Label */}
              <View style={styles.percentageRow}>
                <Text
                  variant="labelSmall"
                  style={[styles.percentageText, { color: fillColor }]}
                >
                  {(progressRatio * 100).toFixed(0)}% used
                </Text>
                <Text variant="labelSmall" style={styles.remainingText}>
                  {balanceVisible
                    ? `${currencySymbol} ${formatAmount(remaining)} left`
                    : "•••••• left"}
                </Text>
              </View>
            </View>
          )}

          {/* Amounts Row */}
          {(spent > 0 || totalBudget > 0) && (
            <View style={styles.amountsRow}>
              <View style={styles.amountBlock}>
                <Text variant="labelSmall" style={styles.amountLabel}>
                  Spent
                </Text>
                <Text
                  variant="titleMedium"
                  style={[
                    styles.amountValue,
                    {
                      color:
                        spent > 0
                          ? isOverBudget
                            ? SpotifyColors.danger
                            : SpotifyColors.orange
                          : SpotifyColors.textSecondary,
                    },
                  ]}
                >
                  {currencySymbol}{" "}
                  {balanceVisible ? formatAmount(spent) : "••••••"}
                </Text>
              </View>
              {totalBudget > 0 && (
                <View style={[styles.amountBlock, styles.amountBlockRight]}>
                  <Text variant="labelSmall" style={styles.amountLabel}>
                    Budget
                  </Text>
                  <Text variant="titleMedium" style={styles.amountValue}>
                    {currencySymbol}{" "}
                    {balanceVisible ? formatAmount(totalBudget) : "••••••"}
                  </Text>
                </View>
              )}
              {totalBudget === 0 && spent > 0 && (
                <View style={[styles.amountBlock, styles.amountBlockRight]}>
                  <Text variant="labelSmall" style={styles.amountLabel}>
                    Budget
                  </Text>
                  <Text
                    variant="titleMedium"
                    style={[
                      styles.amountValue,
                      { color: SpotifyColors.textSecondary },
                    ]}
                  >
                    No limit
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* No spent data at all */}
          {spent === 0 && totalBudget === 0 && (
            <View style={styles.noDataRow}>
              <MaterialCommunityIcons
                name="information-outline"
                size={16}
                color={SpotifyColors.textSecondary}
              />
              <Text variant="bodySmall" style={styles.noDataText}>
                No budget limit set for this period
              </Text>
            </View>
          )}
        </Card.Content>
      </GlassCard>
    );
  },
  (prev, next) =>
    prev.item._flatKey === next.item._flatKey &&
    prev.primaryColor === next.primaryColor &&
    prev.balanceVisible === next.balanceVisible
);

// ---------------------------------------------------------------------------
// Zustand selector
// ---------------------------------------------------------------------------

const selectBalanceVisible = (state: { balanceVisible: boolean }) =>
  state.balanceVisible;

// ---------------------------------------------------------------------------
// Main Screen
// ---------------------------------------------------------------------------

export default function BudgetsScreen() {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const balanceVisible = useStore(selectBalanceVisible);

  // Create budget modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [name, setName] = useState("");
  const [active, setActive] = useState(true);

  // Budget limits (same date range as dashboard – current month)
  const budgetDateRange = getCurrentMonthStartEndDate();

  const {
    data: budgetLimitsData,
    isLoading: limitsLoading,
    refetch: refetchLimits,
  } = useCachedBudgetLimitsQuery(
    ["all-budgets", budgetDateRange.startDateString, budgetDateRange.endDate],
    () =>
      apiClient.getAllBudgetLimits(
        budgetDateRange.startDateString,
        budgetDateRange.endDate
      )
  );

  // Infinite query for paginated budgets list (name, active, period, etc.)
  const {
    data: budgetsPages,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: budgetsLoading,
    isRefetching,
    refetch: refetchBudgets,
  } = useInfiniteQuery({
    queryKey: ["budgets-list"],
    queryFn: ({ pageParam }) => apiClient.getBudgets(pageParam),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      const totalPages = lastPage.meta?.pagination?.total_pages ?? 1;
      const currentPage = allPages.length;
      return currentPage < totalPages ? currentPage + 1 : undefined;
    },
  });

  // Create budget mutation
  const createMutation = useMutation({
    mutationFn: (data: CreateBudgetData) => apiClient.createBudget(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budgets-list"] });
      queryClient.invalidateQueries({ queryKey: ["all-budgets"] });
      queryClient.invalidateQueries({ queryKey: ["budgets"] });
      resetForm();
      setModalVisible(false);
    },
  });

  const resetForm = () => {
    setName("");
    setActive(true);
  };

  const handleSubmit = () => {
    if (!name) return;
    createMutation.mutate({ name, active });
  };

  // Build a map of budget_id -> BudgetLimit for O(1) lookup
  const limitsByBudgetId = useMemo(() => {
    const map = new Map<string, BudgetLimit>();
    const limits = budgetLimitsData?.data ?? [];
    for (const limit of limits) {
      const budgetId = limit.attributes.budget_id;
      if (budgetId) {
        // If multiple limits for the same budget, take the latest one
        const existing = map.get(budgetId);
        if (!existing) {
          map.set(budgetId, limit);
        }
      }
    }
    return map;
  }, [budgetLimitsData?.data]);

  // Flatten all pages of budgets into a single list
  const allBudgets = useMemo(
    () => budgetsPages?.pages.flatMap((page) => page.data ?? []) ?? [],
    [budgetsPages]
  );

  // Build FlatBudgetItem[] merging budget info + limit data
  const flatData: FlatBudgetItem[] = useMemo(() => {
    return allBudgets.map((budget, index) => ({
      budget,
      limit: limitsByBudgetId.get(budget.id) ?? null,
      _flatKey: `budget-${budget.id}-${index}`,
    }));
  }, [allBudgets, limitsByBudgetId]);

  // -----------------------------------------------------------------------
  // Stable callbacks
  // -----------------------------------------------------------------------

  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handleRefresh = useCallback(() => {
    refetchBudgets();
    refetchLimits();
  }, [refetchBudgets, refetchLimits]);

  // -----------------------------------------------------------------------
  // Memoized sub-components
  // -----------------------------------------------------------------------

  const isLoading = budgetsLoading || limitsLoading;

  const primaryColor = theme.colors.primary;

  const listEmpty = useMemo(() => {
    if (isLoading) {
      return (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text variant="bodyMedium" style={styles.loadingText}>
            Loading budgets...
          </Text>
        </View>
      );
    }
    return (
      <View style={styles.emptyState}>
        <View style={styles.emptyIconWrap}>
          <MaterialCommunityIcons
            name="wallet-plus"
            size={64}
            color={theme.colors.onSurfaceVariant}
          />
        </View>
        <Text variant="headlineSmall" style={styles.emptyTitle}>
          No budgets yet
        </Text>
        <Text variant="bodyMedium" style={styles.emptySubtitle}>
          Create your first budget to start tracking your spending
        </Text>
      </View>
    );
  }, [isLoading, theme.colors.primary, theme.colors.onSurfaceVariant]);

  const renderItem = useCallback(
    ({ item }: { item: FlatBudgetItem }) => (
      <BudgetCard
        item={item}
        primaryColor={primaryColor}
        balanceVisible={balanceVisible}
      />
    ),
    [primaryColor, balanceVisible]
  );

  const keyExtractor = useCallback((item: FlatBudgetItem) => item._flatKey, []);

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
        data={flatData}
        extraData={balanceVisible}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        ListEmptyComponent={listEmpty}
        ListFooterComponent={footer}
        contentContainerStyle={[
          styles.listContent,
          flatData.length === 0 && !isLoading && styles.listContentEmpty,
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
        maxToRenderPerBatch={15}
        windowSize={5}
        initialNumToRender={10}
        updateCellsBatchingPeriod={100}
      />

      {/* Add Budget FAB */}
      <FAB
        icon="plus"
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        color="#FFFFFF"
        onPress={() => setModalVisible(true)}
      />

      {/* Create Budget Modal */}
      <Portal>
        <Modal
          visible={modalVisible}
          onDismiss={() => {
            setModalVisible(false);
            resetForm();
          }}
          contentContainerStyle={[
            styles.modal,
            { backgroundColor: theme.colors.surface },
          ]}
        >
          <Text variant="headlineSmall" style={styles.modalTitle}>
            Create Budget
          </Text>

          <TextInput
            label="Budget Name"
            value={name}
            onChangeText={setName}
            mode="outlined"
            style={styles.input}
            placeholder="e.g., Groceries, Entertainment"
          />

          <View style={styles.switchContainer}>
            <Text variant="bodyLarge">Active</Text>
            <Switch value={active} onValueChange={setActive} />
          </View>

          <View style={styles.modalActions}>
            <Button
              mode="outlined"
              onPress={() => {
                setModalVisible(false);
                resetForm();
              }}
              style={{ flex: 1 }}
            >
              Cancel
            </Button>
            <Button
              mode="contained"
              onPress={handleSubmit}
              loading={createMutation.isPending}
              disabled={createMutation.isPending || !name}
              style={{ flex: 1 }}
            >
              Create
            </Button>
          </View>
        </Modal>
      </Portal>
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
    paddingBottom: 80,
  },
  listContentEmpty: {
    flexGrow: 1,
  },
  centerContent: {
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 80,
  },
  loadingText: {
    marginTop: 12,
    opacity: 0.7,
  },
  emptyState: {
    alignItems: "center",
    paddingTop: 80,
    paddingHorizontal: 32,
  },
  emptyIconWrap: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  emptyTitle: {
    marginTop: 16,
    fontWeight: "700",
  },
  emptySubtitle: {
    marginTop: 8,
    opacity: 0.6,
    textAlign: "center",
  },
  // Budget Card
  budgetCard: {
    marginBottom: 12,
    borderRadius: 16,
  },
  cardContent: {
    paddingVertical: 16,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    minWidth: 0,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  nameContainer: {
    flex: 1,
    minWidth: 0,
  },
  budgetName: {
    fontWeight: "700",
  },
  periodText: {
    opacity: 0.5,
    marginTop: 2,
  },
  overBudgetBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: SpotifyColors.danger,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
    marginLeft: 8,
  },
  overBudgetText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },
  inactiveBadge: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  inactiveBadgeText: {
    color: SpotifyColors.textSecondary,
    fontSize: 11,
    fontWeight: "600",
  },
  // Progress
  progressSection: {
    marginBottom: 14,
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 4,
  },
  percentageRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 6,
  },
  percentageText: {
    fontWeight: "700",
  },
  remainingText: {
    opacity: 0.5,
  },
  // Amounts
  amountsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  amountBlock: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderRadius: 12,
    padding: 12,
  },
  amountBlockRight: {
    alignItems: "flex-end",
  },
  amountLabel: {
    opacity: 0.5,
    marginBottom: 4,
  },
  amountValue: {
    fontWeight: "700",
  },
  // No data
  noDataRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 4,
  },
  noDataText: {
    opacity: 0.5,
  },
  // Footer
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 20,
  },
  footerText: {
    marginLeft: 8,
  },
  // FAB
  fab: {
    position: "absolute",
    right: 16,
    bottom: 16,
  },
  // Modal
  modal: {
    margin: 20,
    padding: 20,
    borderRadius: 16,
  },
  modalTitle: {
    marginBottom: 16,
    fontWeight: "bold",
  },
  input: {
    marginBottom: 12,
  },
  switchContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
  },
});
