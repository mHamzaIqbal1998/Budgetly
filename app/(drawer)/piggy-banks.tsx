// Piggy Banks Screen – lists all piggy banks with infinite scroll and progress indicators
import { GlassCard } from "@/components/glass-card";
import { SpotifyColors } from "@/constants/spotify-theme";
import { apiClient } from "@/lib/api-client";
import { formatAmount } from "@/lib/format-currency";
import { useStore } from "@/lib/store";
import type { PiggyBank } from "@/types";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useRouter, type Href } from "expo-router";
import React, { memo, useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from "react-native";
import { Card, Text, useTheme } from "react-native-paper";

// ---------------------------------------------------------------------------
// Types & Constants
// ---------------------------------------------------------------------------

const { width: SCREEN_WIDTH } = Dimensions.get("window");

/** Enriched piggy bank item for the flat list */
interface FlatPiggyBankItem {
  piggyBank: PiggyBank;
  _flatKey: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

function getDaysUntilTarget(targetDate: string | null): number | null {
  if (!targetDate) return null;
  const target = new Date(targetDate);
  const now = new Date();
  const diff = target.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

// ---------------------------------------------------------------------------
// Memoized Piggy Bank Card
// ---------------------------------------------------------------------------

interface PiggyBankCardProps {
  item: FlatPiggyBankItem;
  primaryColor: string;
  secondaryColor: string;
  balanceVisible: boolean;
  onPress: () => void;
  onLongPress: () => void;
}

const PiggyBankCard = memo(
  function PiggyBankCard({
    item,
    primaryColor,
    secondaryColor,
    balanceVisible,
    onPress,
    onLongPress,
  }: PiggyBankCardProps) {
    const { piggyBank } = item;
    const attrs = piggyBank.attributes;

    const currentAmount = parseFloat(attrs.current_amount) || 0;
    const targetAmount = attrs.target_amount
      ? parseFloat(attrs.target_amount)
      : null;
    const percentage =
      attrs.percentage ??
      (targetAmount ? (currentAmount / targetAmount) * 100 : 0);
    const progress = Math.min(percentage / 100, 1);
    const leftToSave = attrs.left_to_save
      ? parseFloat(attrs.left_to_save)
      : null;
    const daysUntil = getDaysUntilTarget(attrs.target_date);

    const isCompleted = percentage >= 100;
    const isActive = attrs.active;

    // Color based on progress
    let fillColor = primaryColor;
    if (isCompleted) {
      fillColor = SpotifyColors.green;
    } else if (percentage >= 75) {
      fillColor = secondaryColor;
    } else if (percentage >= 50) {
      fillColor = SpotifyColors.blue;
    }

    const currencySymbol = attrs.currency_symbol || "$";
    const decimalPlaces = attrs.currency_decimal_places ?? 2;

    // Get linked accounts names
    const accountNames =
      attrs.accounts.map((a) => a.name).join(", ") || "No account linked";

    return (
      <Pressable onPress={onPress} onLongPress={onLongPress}>
        <GlassCard variant="elevated" style={styles.piggyBankCard}>
          <Card.Content style={styles.cardContent}>
            {/* Header: Icon + Name + Status */}
            <View style={styles.headerRow}>
              <View style={styles.headerLeft}>
                <View
                  style={[
                    styles.iconWrap,
                    {
                      backgroundColor: isActive
                        ? `${primaryColor}20`
                        : "rgba(120,120,120,0.08)",
                    },
                  ]}
                >
                  <MaterialCommunityIcons
                    name={isCompleted ? "piggy-bank" : "piggy-bank-outline"}
                    size={24}
                    color={
                      isActive ? primaryColor : SpotifyColors.textSecondary
                    }
                  />
                </View>
                <View style={styles.nameContainer}>
                  <Text
                    variant="titleMedium"
                    numberOfLines={1}
                    style={styles.piggyBankName}
                  >
                    {attrs.name}
                  </Text>
                  <Text
                    variant="labelSmall"
                    numberOfLines={1}
                    style={styles.accountText}
                  >
                    {accountNames}
                  </Text>
                </View>
              </View>
              {isCompleted && (
                <View style={styles.completedBadge}>
                  <MaterialCommunityIcons
                    name="check-circle"
                    size={14}
                    color="#FFFFFF"
                  />
                  <Text style={styles.completedBadgeText}>Done</Text>
                </View>
              )}
              {!isCompleted && !isActive && (
                <View style={styles.inactiveBadge}>
                  <Text style={styles.inactiveBadgeText}>Inactive</Text>
                </View>
              )}
            </View>

            {/* Progress Section */}
            {targetAmount !== null && targetAmount > 0 && (
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
                    {percentage.toFixed(0)}% saved
                  </Text>
                  {leftToSave !== null && leftToSave > 0 && (
                    <Text variant="labelSmall" style={styles.remainingText}>
                      {balanceVisible
                        ? `${currencySymbol} ${formatAmount(leftToSave, decimalPlaces)} to go`
                        : "•••••• to go"}
                    </Text>
                  )}
                </View>
              </View>
            )}

            {/* Amounts Row */}
            <View style={styles.amountsRow}>
              <View style={styles.amountBlock}>
                <Text variant="labelSmall" style={styles.amountLabel}>
                  Saved
                </Text>
                <Text
                  variant="titleMedium"
                  style={[styles.amountValue, { color: primaryColor }]}
                >
                  {balanceVisible
                    ? `${currencySymbol} ${formatAmount(currentAmount, decimalPlaces)}`
                    : "••••••"}
                </Text>
              </View>
              {targetAmount !== null && targetAmount > 0 ? (
                <View style={[styles.amountBlock, styles.amountBlockRight]}>
                  <Text variant="labelSmall" style={styles.amountLabel}>
                    Target
                  </Text>
                  <Text variant="titleMedium" style={styles.amountValue}>
                    {balanceVisible
                      ? `${currencySymbol} ${formatAmount(targetAmount, decimalPlaces)}`
                      : "••••••"}
                  </Text>
                </View>
              ) : (
                <View style={[styles.amountBlock, styles.amountBlockRight]}>
                  <Text variant="labelSmall" style={styles.amountLabel}>
                    Target
                  </Text>
                  <Text
                    variant="titleMedium"
                    style={[
                      styles.amountValue,
                      { color: SpotifyColors.textSecondary },
                    ]}
                  >
                    No target
                  </Text>
                </View>
              )}
            </View>

            {/* Date Info */}
            {(attrs.start_date || attrs.target_date) && (
              <View style={styles.dateRow}>
                {attrs.start_date && (
                  <View style={styles.dateItem}>
                    <MaterialCommunityIcons
                      name="calendar-start"
                      size={14}
                      color={SpotifyColors.textSecondary}
                    />
                    <Text variant="labelSmall" style={styles.dateText}>
                      Started {formatDate(attrs.start_date)}
                    </Text>
                  </View>
                )}
                {attrs.target_date && (
                  <View style={styles.dateItem}>
                    <MaterialCommunityIcons
                      name="calendar-end"
                      size={14}
                      color={
                        daysUntil !== null && daysUntil < 0
                          ? SpotifyColors.danger
                          : SpotifyColors.textSecondary
                      }
                    />
                    <Text
                      variant="labelSmall"
                      style={[
                        styles.dateText,
                        daysUntil !== null &&
                          daysUntil < 0 && { color: SpotifyColors.danger },
                      ]}
                    >
                      {daysUntil !== null && daysUntil < 0
                        ? `Overdue by ${Math.abs(daysUntil)} days`
                        : daysUntil !== null && daysUntil === 0
                          ? "Due today"
                          : daysUntil !== null
                            ? `${daysUntil} days left`
                            : `Target: ${formatDate(attrs.target_date)}`}
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* Notes */}
            {attrs.notes && (
              <View style={styles.notesRow}>
                <MaterialCommunityIcons
                  name="note-text-outline"
                  size={14}
                  color={SpotifyColors.textSecondary}
                />
                <Text
                  variant="bodySmall"
                  numberOfLines={2}
                  style={styles.notesText}
                >
                  {attrs.notes}
                </Text>
              </View>
            )}
          </Card.Content>
        </GlassCard>
      </Pressable>
    );
  },
  (prev, next) =>
    prev.item._flatKey === next.item._flatKey &&
    prev.primaryColor === next.primaryColor &&
    prev.secondaryColor === next.secondaryColor &&
    prev.balanceVisible === next.balanceVisible
);

// ---------------------------------------------------------------------------
// Context Menu Component
// ---------------------------------------------------------------------------

interface PiggyBankContextMenuProps {
  item: FlatPiggyBankItem;
  primaryColor: string;
  secondaryColor: string;
  balanceVisible: boolean;
  onViewDetails: () => void;
  onClose: () => void;
}

function PiggyBankContextMenu({
  item,
  primaryColor,
  secondaryColor,
  balanceVisible,
  onViewDetails,
  onClose,
}: PiggyBankContextMenuProps) {
  const scaleAnim = React.useRef(new Animated.Value(0.9)).current;

  React.useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 8,
      tension: 100,
      useNativeDriver: true,
    }).start();
  }, [scaleAnim]);

  return (
    <Animated.View
      style={[
        styles.contextMenuContainer,
        { transform: [{ scale: scaleAnim }] },
      ]}
    >
      {/* Preview Card */}
      <View style={styles.contextMenuCard}>
        <PiggyBankCard
          item={item}
          primaryColor={primaryColor}
          secondaryColor={secondaryColor}
          balanceVisible={balanceVisible}
          onPress={() => {}}
          onLongPress={() => {}}
        />
      </View>

      {/* Action Buttons */}
      <View style={styles.contextMenuActions}>
        <Pressable
          onPress={onViewDetails}
          style={({ pressed }) => [
            styles.contextMenuButton,
            styles.viewButton,
            pressed && styles.contextMenuButtonPressed,
          ]}
        >
          <MaterialCommunityIcons name="eye" size={20} color="#FFFFFF" />
          <Text style={[styles.contextMenuButtonText, styles.viewButtonText]}>
            View Details
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

export default function PiggyBanksScreen() {
  const theme = useTheme();
  const router = useRouter();
  const balanceVisible = useStore(selectBalanceVisible);

  // Context menu state
  const [contextMenuItem, setContextMenuItem] =
    useState<FlatPiggyBankItem | null>(null);
  const [contextMenuVisible, setContextMenuVisible] = useState(false);

  // Infinite query for paginated piggy banks
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isRefetching,
    refetch,
  } = useInfiniteQuery({
    queryKey: ["piggy-banks-list"],
    queryFn: ({ pageParam }) => apiClient.getPiggyBanks(pageParam),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      const totalPages = lastPage.meta?.pagination?.total_pages ?? 1;
      const currentPage = allPages.length;
      return currentPage < totalPages ? currentPage + 1 : undefined;
    },
  });

  // Flatten all pages into a single list
  const allPiggyBanks = useMemo(
    () => data?.pages.flatMap((page) => page.data ?? []) ?? [],
    [data]
  );

  // Build FlatPiggyBankItem[]
  const flatData: FlatPiggyBankItem[] = useMemo(() => {
    return allPiggyBanks.map((piggyBank, index) => ({
      piggyBank,
      _flatKey: `piggy-bank-${piggyBank.id}-${index}`,
    }));
  }, [allPiggyBanks]);

  // -----------------------------------------------------------------------
  // Stable callbacks
  // -----------------------------------------------------------------------

  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const handlePress = useCallback(
    (item: FlatPiggyBankItem) => {
      router.push(`/(drawer)/piggy-bank/${item.piggyBank.id}` as Href);
    },
    [router]
  );

  const handleLongPress = useCallback((item: FlatPiggyBankItem) => {
    setContextMenuItem(item);
    setContextMenuVisible(true);
  }, []);

  const handleContextMenuClose = useCallback(() => {
    setContextMenuVisible(false);
    setContextMenuItem(null);
  }, []);

  const handleViewDetails = useCallback(() => {
    if (!contextMenuItem) return;
    const id = contextMenuItem.piggyBank.id;
    setContextMenuVisible(false);
    setContextMenuItem(null);
    router.push(`/(drawer)/piggy-bank/${id}` as Href);
  }, [contextMenuItem, router]);

  // -----------------------------------------------------------------------
  // Memoized sub-components
  // -----------------------------------------------------------------------

  const primaryColor = theme.colors.primary;
  const secondaryColor = theme.colors.secondary;

  const listEmpty = useMemo(() => {
    if (isLoading) {
      return (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text variant="bodyMedium" style={styles.loadingText}>
            Loading piggy banks...
          </Text>
        </View>
      );
    }
    return (
      <View style={styles.emptyState}>
        <View style={styles.emptyIconWrap}>
          <MaterialCommunityIcons
            name="piggy-bank-outline"
            size={64}
            color={theme.colors.onSurfaceVariant}
          />
        </View>
        <Text variant="headlineSmall" style={styles.emptyTitle}>
          No piggy banks yet
        </Text>
        <Text variant="bodyMedium" style={styles.emptySubtitle}>
          Create piggy banks in Firefly III to track your savings goals
        </Text>
      </View>
    );
  }, [isLoading, theme.colors.primary, theme.colors.onSurfaceVariant]);

  const renderItem = useCallback(
    ({ item }: { item: FlatPiggyBankItem }) => (
      <PiggyBankCard
        item={item}
        primaryColor={primaryColor}
        secondaryColor={secondaryColor}
        balanceVisible={balanceVisible}
        onPress={() => handlePress(item)}
        onLongPress={() => handleLongPress(item)}
      />
    ),
    [primaryColor, secondaryColor, balanceVisible, handlePress, handleLongPress]
  );

  const keyExtractor = useCallback(
    (item: FlatPiggyBankItem) => item._flatKey,
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

      <Modal
        visible={contextMenuVisible}
        onDismiss={handleContextMenuClose}
        transparent
        animationType="fade"
        onRequestClose={handleContextMenuClose}
      >
        <Pressable style={styles.modalOverlay} onPress={handleContextMenuClose}>
          <Pressable
            style={styles.modalContentWrapper}
            onPress={(e) => e.stopPropagation()}
          >
            {contextMenuItem && (
              <PiggyBankContextMenu
                item={contextMenuItem}
                primaryColor={primaryColor}
                secondaryColor={secondaryColor}
                balanceVisible={balanceVisible}
                onViewDetails={handleViewDetails}
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
    backgroundColor: "rgba(120, 120, 120, 0.08)",
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
  // Piggy Bank Card
  piggyBankCard: {
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
  piggyBankName: {
    fontWeight: "700",
  },
  accountText: {
    opacity: 0.5,
    marginTop: 2,
  },
  completedBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: SpotifyColors.green,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
    marginLeft: 8,
  },
  completedBadgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },
  inactiveBadge: {
    backgroundColor: "rgba(120, 120, 120, 0.15)",
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
    backgroundColor: "rgba(120, 120, 120, 0.15)",
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
    marginBottom: 12,
  },
  amountBlock: {
    flex: 1,
    backgroundColor: "rgba(120, 120, 120, 0.06)",
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
  // Date
  dateRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
  dateItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dateText: {
    opacity: 0.6,
  },
  // Notes
  notesRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(120, 120, 120, 0.1)",
  },
  notesText: {
    opacity: 0.7,
    flex: 1,
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
  // Context Menu
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.85)",
    width: "100%",
  },
  modalContentWrapper: {
    width: "100%",
    alignItems: "center",
  },
  contextMenuContainer: {
    width: SCREEN_WIDTH - 48,
    maxWidth: 400,
  },
  contextMenuCard: {
    marginBottom: 16,
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
  contextMenuButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  viewButton: {
    backgroundColor: "#3F51B5",
    borderColor: "#3F51B5",
  },
  viewButtonText: {
    color: "#FFFFFF",
  },
  cancelButton: {
    backgroundColor: "#525252",
    borderColor: "#6B6B6B",
  },
  cancelButtonText: {
    color: "#FFFFFF",
  },
});
