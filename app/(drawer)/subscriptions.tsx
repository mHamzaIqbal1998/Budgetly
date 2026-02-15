// Subscriptions Screen – lists all subscriptions (bills) with infinite scroll
import { GlassCard } from "@/components/glass-card";
import { apiClient } from "@/lib/api-client";
import { formatAmount } from "@/lib/format-currency";
import { useStore } from "@/lib/store";
import type { AllBillsResponse } from "@/types";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter, type Href } from "expo-router";
import React, { memo, useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from "react-native";
import { Chip, Text, useTheme } from "react-native-paper";

// ---------------------------------------------------------------------------
// Types & Constants
// ---------------------------------------------------------------------------

const PAGE_SIZE = 50;
const ITEM_HEIGHT = 110;
const ITEM_MARGIN = 12;
const { width: SCREEN_WIDTH } = Dimensions.get("window");

const FREQ_LABELS: Record<string, string> = {
  weekly: "Weekly",
  monthly: "Monthly",
  quarterly: "Quarterly",
  "half-year": "Half-yearly",
  yearly: "Yearly",
};

const FREQ_ICONS: Record<string, keyof typeof MaterialCommunityIcons.glyphMap> =
  {
    weekly: "calendar-week",
    monthly: "calendar-month",
    quarterly: "calendar-range",
    "half-year": "calendar-range",
    yearly: "calendar-star",
  };

/** Decorated bill for the flat list */
type FlatBill = AllBillsResponse & {
  _flatKey: string;
};

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

// ---------------------------------------------------------------------------
// Memoized Subscription Card
// ---------------------------------------------------------------------------

interface SubscriptionItemProps {
  item: FlatBill;
  primaryColor: string;
  errorColor: string;
  surfaceVariantColor: string;
  balanceVisible: boolean;
  onPress: () => void;
  onLongPress: () => void;
}

const SubscriptionItem = memo(
  function SubscriptionItem({
    item,
    primaryColor,
    errorColor,
    surfaceVariantColor,
    balanceVisible,
    onPress,
    onLongPress,
  }: SubscriptionItemProps) {
    const attrs = item.attributes;
    const isActive = attrs.active;
    const amountMin = parseFloat(attrs.amount_min) || 0;
    const amountMax = parseFloat(attrs.amount_max) || 0;
    const currencySymbol = attrs.currency_symbol || "$";
    const decimals = attrs.currency_decimal_places ?? 2;
    const freqLabel = FREQ_LABELS[attrs.repeat_freq] || attrs.repeat_freq;
    const freqIcon = FREQ_ICONS[attrs.repeat_freq] || "calendar-repeat";

    const amountDisplay =
      amountMin === amountMax
        ? `${currencySymbol} ${balanceVisible ? formatAmount(amountMin, decimals) : "••••••"}`
        : `${currencySymbol} ${balanceVisible ? formatAmount(amountMin, decimals) : "••••••"} – ${balanceVisible ? formatAmount(amountMax, decimals) : "••••••"}`;

    return (
      <Pressable
        onPress={onPress}
        onLongPress={onLongPress}
        style={({ pressed }) => pressed && styles.cardPressed}
      >
        <GlassCard variant="default" style={styles.card}>
          <View style={styles.cardInner}>
            <View style={styles.cardRow}>
              <View style={styles.cardLeft}>
                <View
                  style={[
                    styles.iconWrap,
                    { backgroundColor: surfaceVariantColor },
                  ]}
                >
                  <MaterialCommunityIcons
                    name="repeat"
                    size={22}
                    color={isActive ? primaryColor : errorColor}
                  />
                </View>
                <View style={styles.cardBody}>
                  <Text
                    variant="titleSmall"
                    numberOfLines={1}
                    style={styles.cardName}
                  >
                    {attrs.name}
                  </Text>
                  <View style={styles.chipsRow}>
                    <Chip
                      compact
                      icon={
                        freqIcon as keyof typeof MaterialCommunityIcons.glyphMap
                      }
                      style={styles.chip}
                      textStyle={styles.chipText}
                    >
                      {freqLabel}
                    </Chip>
                    {!isActive && (
                      <Chip
                        compact
                        icon="pause-circle"
                        style={[
                          styles.chip,
                          { backgroundColor: errorColor + "20" },
                        ]}
                        textStyle={[styles.chipText, { color: errorColor }]}
                      >
                        Inactive
                      </Chip>
                    )}
                  </View>
                </View>
              </View>
              <View style={styles.cardRight}>
                <Text
                  variant="titleSmall"
                  style={[styles.amountText, { color: errorColor }]}
                  numberOfLines={1}
                >
                  {amountDisplay}
                </Text>
                {attrs.next_expected_match_diff ? (
                  <Text
                    variant="labelSmall"
                    numberOfLines={1}
                    style={styles.nextDueText}
                  >
                    {attrs.next_expected_match_diff}
                  </Text>
                ) : attrs.next_expected_match ? (
                  <Text
                    variant="labelSmall"
                    numberOfLines={1}
                    style={styles.nextDueText}
                  >
                    {formatDate(attrs.next_expected_match)}
                  </Text>
                ) : null}
              </View>
            </View>
          </View>
        </GlassCard>
      </Pressable>
    );
  },
  (prev, next) =>
    prev.item._flatKey === next.item._flatKey &&
    prev.primaryColor === next.primaryColor &&
    prev.errorColor === next.errorColor &&
    prev.surfaceVariantColor === next.surfaceVariantColor &&
    prev.balanceVisible === next.balanceVisible
);

// ---------------------------------------------------------------------------
// Context Menu Card
// ---------------------------------------------------------------------------

interface ContextMenuCardProps {
  item: FlatBill;
  primaryColor: string;
  errorColor: string;
  surfaceVariantColor: string;
  balanceVisible: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onClose: () => void;
}

function SubscriptionContextMenuCard({
  item,
  primaryColor,
  errorColor,
  surfaceVariantColor,
  balanceVisible,
  onEdit,
  onDelete,
  onClose,
}: ContextMenuCardProps) {
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
        {
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      {/* Card Preview */}
      <View style={styles.contextMenuCard}>
        <SubscriptionItem
          item={item}
          primaryColor={primaryColor}
          errorColor={errorColor}
          surfaceVariantColor={surfaceVariantColor}
          balanceVisible={balanceVisible}
          onPress={() => {}}
          onLongPress={() => {}}
        />
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
            Edit Subscription
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
            Delete Subscription
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

export default function SubscriptionsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const balanceVisible = useStore(selectBalanceVisible);

  // Context menu state
  const [contextMenuBill, setContextMenuBill] = useState<FlatBill | null>(null);
  const [contextMenuVisible, setContextMenuVisible] = useState(false);

  // Infinite query
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isRefetching,
    refetch,
  } = useInfiniteQuery({
    queryKey: ["subscriptions"],
    queryFn: ({ pageParam }) => apiClient.getBills(pageParam, PAGE_SIZE),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      const totalPages = lastPage.meta?.pagination?.total_pages ?? 1;
      const currentPage = allPages.length;
      return currentPage < totalPages ? currentPage + 1 : undefined;
    },
  });

  // Flatten pages
  const flatData: FlatBill[] = useMemo(() => {
    const allBills = data?.pages.flatMap((page) => page.data ?? []) ?? [];
    return allBills.map((bill, idx) => ({
      ...bill,
      _flatKey: `${bill.id}-${idx}`,
    }));
  }, [data]);

  // Callbacks
  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  // Refetch on screen focus
  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  // -----------------------------------------------------------------------
  // Context menu handlers
  // -----------------------------------------------------------------------

  const handlePress = useCallback(
    (item: FlatBill) => {
      router.push(`/(drawer)/subscription/${item.id}` as Href);
    },
    [router]
  );

  const handleLongPress = useCallback((item: FlatBill) => {
    setContextMenuBill(item);
    setContextMenuVisible(true);
  }, []);

  const handleContextMenuClose = useCallback(() => {
    setContextMenuVisible(false);
    setContextMenuBill(null);
  }, []);

  const handleEditSubscription = useCallback(() => {
    if (!contextMenuBill) return;
    const billId = contextMenuBill.id;
    setContextMenuVisible(false);
    setContextMenuBill(null);
    router.push(`/(drawer)/subscription/edit/${billId}` as Href);
  }, [contextMenuBill, router]);

  const handleDeleteSubscription = useCallback(() => {
    if (!contextMenuBill) return;
    const billName = contextMenuBill.attributes.name || "this subscription";
    const billId = contextMenuBill.id;
    Alert.alert(
      "Delete Subscription",
      `Delete "${billName}"? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setContextMenuVisible(false);
            setContextMenuBill(null);
            try {
              await apiClient.deleteBill(billId);
              await Promise.all([
                queryClient.invalidateQueries({
                  queryKey: ["subscriptions"],
                }),
                queryClient.invalidateQueries({
                  queryKey: ["subscription", billId],
                }),
                queryClient.invalidateQueries({
                  queryKey: ["subscriptionsBills"],
                }),
              ]);
              refetch();
              Alert.alert("Success", "Subscription deleted successfully");
            } catch (error) {
              console.error("Failed to delete subscription:", error);
              const message =
                error instanceof Error
                  ? error.message
                  : "Failed to delete subscription";
              Alert.alert("Error", message);
            }
          },
        },
      ]
    );
  }, [contextMenuBill, queryClient, refetch]);

  // Colors
  const primaryColor = theme.colors.primary;
  const errorColor = theme.colors.error;
  const surfaceVariantColor = theme.colors.surfaceVariant;

  // Render item
  const renderItem = useCallback(
    ({ item }: { item: FlatBill }) => (
      <SubscriptionItem
        item={item}
        primaryColor={primaryColor}
        errorColor={errorColor}
        surfaceVariantColor={surfaceVariantColor}
        balanceVisible={balanceVisible}
        onPress={() => handlePress(item)}
        onLongPress={() => handleLongPress(item)}
      />
    ),
    [
      primaryColor,
      errorColor,
      surfaceVariantColor,
      balanceVisible,
      handlePress,
      handleLongPress,
    ]
  );

  const keyExtractor = useCallback((item: FlatBill) => item._flatKey, []);

  const getItemLayout = useCallback(
    (_data: ArrayLike<FlatBill> | null | undefined, index: number) => ({
      length: ITEM_HEIGHT + ITEM_MARGIN,
      offset: (ITEM_HEIGHT + ITEM_MARGIN) * index,
      index,
    }),
    []
  );

  // Empty / loading states
  const listEmpty = useMemo(() => {
    if (isLoading) {
      return (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text variant="bodyMedium" style={styles.loadingText}>
            Loading subscriptions...
          </Text>
        </View>
      );
    }
    return (
      <View style={styles.emptyState}>
        <MaterialCommunityIcons
          name="repeat-off"
          size={64}
          color={theme.colors.onSurfaceVariant}
        />
        <Text variant="headlineSmall" style={styles.emptyTitle}>
          No subscriptions
        </Text>
        <Text variant="bodyMedium" style={styles.emptySubtitle}>
          Set up subscriptions in Firefly III to track recurring bills
        </Text>
      </View>
    );
  }, [isLoading, theme.colors.primary, theme.colors.onSurfaceVariant]);

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

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <FlatList
        data={flatData}
        extraData={balanceVisible}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        getItemLayout={getItemLayout}
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
        maxToRenderPerBatch={20}
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
            {contextMenuBill && (
              <SubscriptionContextMenuCard
                item={contextMenuBill}
                primaryColor={primaryColor}
                errorColor={errorColor}
                surfaceVariantColor={surfaceVariantColor}
                balanceVisible={balanceVisible}
                onEdit={handleEditSubscription}
                onDelete={handleDeleteSubscription}
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
    textAlign: "center",
    paddingHorizontal: 32,
  },
  loadingText: {
    marginTop: 12,
  },
  card: {
    marginBottom: ITEM_MARGIN,
    borderRadius: 16,
    overflow: "hidden",
  },
  cardPressed: {
    opacity: 0.85,
  },
  cardInner: {
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    minWidth: 0,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  cardBody: {
    flex: 1,
    minWidth: 0,
  },
  cardName: {
    fontWeight: "600",
  },
  chipsRow: {
    flexDirection: "row",
    marginTop: 6,
    gap: 6,
  },
  chip: {
    height: 32,
  },
  chipText: {
    fontSize: 10,
  },
  cardRight: {
    alignItems: "flex-end",
    marginLeft: 12,
  },
  amountText: {
    fontWeight: "700",
  },
  nextDueText: {
    marginTop: 4,
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
  editButton: {
    backgroundColor: "#3F51B5",
    borderColor: "#3F51B5",
  },
  editButtonText: {
    color: "#FFFFFF",
  },
  deleteButton: {
    backgroundColor: "#E53935",
    borderColor: "#C62828",
  },
  deleteButtonText: {
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
