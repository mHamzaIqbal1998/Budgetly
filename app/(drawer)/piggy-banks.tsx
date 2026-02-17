// Piggy Banks Screen – lists all piggy banks with infinite scroll, progress indicators, and add/remove funds functionality
import { GlassCard } from "@/components/glass-card";
import { SpotifyColors } from "@/constants/spotify-theme";
import { apiClient } from "@/lib/api-client";
import { formatAmount } from "@/lib/format-currency";
import { queryClient } from "@/lib/query-client";
import { useStore } from "@/lib/store";
import type { Account, PiggyBank, UpdatePiggyBankData } from "@/types";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useInfiniteQuery, useMutation, useQuery } from "@tanstack/react-query";
import { useRouter, type Href } from "expo-router";
import React, { memo, useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { Button, Card, Text, useTheme } from "react-native-paper";

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
      attrs.accounts.map((a: { name: string }) => a.name).join(", ") ||
      "No account linked";

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
  onEdit: () => void;
  onAddRemove: () => void;
  onDelete: () => void;
  onClose: () => void;
}

function PiggyBankContextMenu({
  item,
  primaryColor,
  secondaryColor,
  balanceVisible,
  onEdit,
  onAddRemove,
  onDelete,
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
          onPress={onEdit}
          style={({ pressed }) => [
            styles.contextMenuButton,
            { backgroundColor: "#3F51B5" },
            pressed && styles.contextMenuButtonPressed,
          ]}
        >
          <MaterialCommunityIcons name="pencil" size={20} color="#FFFFFF" />
          <Text style={[styles.contextMenuButtonText, { color: "#FFFFFF" }]}>
            Edit
          </Text>
        </Pressable>

        <Pressable
          onPress={onAddRemove}
          style={({ pressed }) => [
            styles.contextMenuButton,
            { backgroundColor: "#26A69A" },
            pressed && styles.contextMenuButtonPressed,
          ]}
        >
          <MaterialCommunityIcons
            name="swap-vertical"
            size={20}
            color="#FFFFFF"
          />
          <Text style={[styles.contextMenuButtonText, { color: "#FFFFFF" }]}>
            Add/Remove
          </Text>
        </Pressable>

        <Pressable
          onPress={onDelete}
          style={({ pressed }) => [
            styles.contextMenuButton,
            { backgroundColor: SpotifyColors.danger },
            pressed && styles.contextMenuButtonPressed,
          ]}
        >
          <MaterialCommunityIcons
            name="delete-outline"
            size={20}
            color="#FFFFFF"
          />
          <Text style={[styles.contextMenuButtonText, { color: "#FFFFFF" }]}>
            Delete
          </Text>
        </Pressable>

        <Pressable
          onPress={onClose}
          style={({ pressed }) => [
            styles.contextMenuButton,
            { backgroundColor: "#525252" },
            pressed && styles.contextMenuButtonPressed,
          ]}
        >
          <MaterialCommunityIcons name="close" size={20} color="#FFFFFF" />
          <Text style={[styles.contextMenuButtonText, { color: "#FFFFFF" }]}>
            Cancel
          </Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------
// Add/Remove Amount Modal Component
// ---------------------------------------------------------------------------

interface AddRemoveModalProps {
  visible: boolean;
  piggyBank: PiggyBank | null;
  accounts: Account[];
  allPiggyBanks: PiggyBank[];
  onClose: () => void;
  onSubmit: (amount: number, isAdding: boolean) => void;
  isLoading: boolean;
  balanceVisible: boolean;
}

function AddRemoveModal({
  visible,
  piggyBank,
  accounts,
  allPiggyBanks,
  onClose,
  onSubmit,
  isLoading,
  balanceVisible,
}: AddRemoveModalProps) {
  const theme = useTheme();
  const [amount, setAmount] = useState("");
  const [isAdding, setIsAdding] = useState(true);

  // Reset state when modal opens
  React.useEffect(() => {
    if (visible) {
      setAmount("");
      setIsAdding(true);
    }
  }, [visible]);

  if (!piggyBank) return null;

  const attrs = piggyBank.attributes;
  const currentAmount = parseFloat(attrs.current_amount) || 0;
  const targetAmount = parseFloat(attrs.target_amount || "0") || 0;
  const currencySymbol = attrs.currency_symbol || "$";
  const decimalPlaces = attrs.currency_decimal_places ?? 2;

  // Get linked account IDs for this piggy bank
  const linkedAccountIds = attrs.accounts.map(
    (a: { account_id: string }) => a.account_id
  );

  // Calculate how much is already allocated to OTHER piggy banks from the same accounts
  const allocatedToOthers = allPiggyBanks.reduce(
    (sum: number, pb: PiggyBank) => {
      // Skip the current piggy bank
      if (pb.id === piggyBank.id) return sum;

      // Check if this piggy bank shares any linked accounts
      const otherLinkedIds = pb.attributes.accounts.map(
        (a: { account_id: string }) => a.account_id
      );
      const hasSharedAccount = linkedAccountIds.some((id: string) =>
        otherLinkedIds.includes(id)
      );

      if (hasSharedAccount) {
        // Add the virtual amount from this other piggy bank
        return sum + (parseFloat(pb.attributes.current_amount) || 0);
      }
      return sum;
    },
    0
  );

  // Get the real account balance from linked asset accounts
  const realAccountBalance = attrs.accounts.reduce(
    (sum: number, pbAcc: { account_id: string }) => {
      const realAccount = accounts.find(
        (acc: Account) => acc.id === pbAcc.account_id
      );
      if (realAccount) {
        return sum + (parseFloat(realAccount.attributes.current_balance) || 0);
      }
      return sum;
    },
    0
  );

  // Calculate available balance: real balance minus self amount minus what's allocated to other piggy banks
  const availableBalance = Math.max(
    0,
    realAccountBalance - currentAmount - allocatedToOthers
  );

  // Calculate max addable amount based on rules:
  // 1. Can't exceed target amount
  // 2. Can't exceed available balance
  // 3. Can't add negative (already at or exceeded target)
  const remainingToTarget = Math.max(0, targetAmount - currentAmount);
  const maxAddableAmount = Math.min(remainingToTarget, availableBalance);

  const maxRemovableAmount = currentAmount;

  const handleSubmit = () => {
    const value = parseFloat(amount);
    if (isNaN(value) || value <= 0) {
      Alert.alert(
        "Invalid Amount",
        "Please enter a valid amount greater than 0"
      );
      return;
    }
    onSubmit(value, isAdding);
  };

  const setMaxAmount = () => {
    const max = isAdding ? maxAddableAmount : maxRemovableAmount;
    setAmount(max.toFixed(decimalPlaces));
  };

  return (
    <Modal
      visible={visible}
      onRequestClose={onClose}
      transparent
      animationType="fade"
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.addRemoveOverlay}
      >
        <Pressable style={styles.addRemoveBackdrop} onPress={onClose}>
          <Pressable
            style={[
              styles.addRemoveContainer,
              { backgroundColor: theme.colors.surface },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <View style={styles.addRemoveHeader}>
              <Text variant="titleLarge" style={styles.addRemoveTitle}>
                {isAdding ? "Add" : "Remove"} money to piggy bank
              </Text>
              <Pressable onPress={onClose} style={styles.closeButton}>
                <MaterialCommunityIcons
                  name="close"
                  size={24}
                  color={theme.colors.onSurface}
                />
              </Pressable>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.addRemoveContent}
            >
              {/* Account Info */}
              <View style={styles.accountInfoContainer}>
                <Text variant="bodyMedium" style={styles.accountInfoText}>
                  {attrs.name}
                </Text>
                <Text variant="bodySmall" style={styles.maxAmountText}>
                  (The maximum amount you can {isAdding ? "add" : "remove"} is:{" "}
                  <Text
                    style={{ color: SpotifyColors.green, fontWeight: "700" }}
                  >
                    {" "}
                    {balanceVisible
                      ? `${currencySymbol} ${formatAmount(
                          isAdding ? maxAddableAmount : maxRemovableAmount,
                          decimalPlaces
                        )}`
                      : "••••••"}
                  </Text>
                  )
                </Text>
              </View>

              {/* Amount Input */}
              <View style={styles.amountInputContainer}>
                <View style={styles.currencySymbol}>
                  <Text variant="bodyLarge">{currencySymbol}</Text>
                </View>
                <TextInput
                  style={[
                    styles.amountInput,
                    {
                      backgroundColor: theme.colors.background,
                      color: theme.colors.onSurface,
                      borderColor: theme.colors.outline,
                    },
                  ]}
                  value={amount}
                  onChangeText={setAmount}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                  placeholderTextColor={theme.colors.onSurfaceVariant}
                />
                <Pressable onPress={setMaxAmount} style={styles.maxButton}>
                  <Text
                    variant="labelSmall"
                    style={{ color: theme.colors.primary }}
                  >
                    MAX
                  </Text>
                </Pressable>
              </View>

              {/* Add/Remove Toggle */}
              <View style={styles.toggleContainer}>
                <Pressable
                  onPress={() => setIsAdding(true)}
                  style={[
                    styles.toggleButton,
                    isAdding && { backgroundColor: SpotifyColors.green },
                  ]}
                >
                  <MaterialCommunityIcons
                    name="plus"
                    size={20}
                    color={isAdding ? "#FFFFFF" : theme.colors.onSurface}
                  />
                  <Text
                    style={[
                      styles.toggleText,
                      isAdding && { color: "#FFFFFF" },
                    ]}
                  >
                    Add
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setIsAdding(false)}
                  style={[
                    styles.toggleButton,
                    !isAdding && { backgroundColor: SpotifyColors.danger },
                  ]}
                >
                  <MaterialCommunityIcons
                    name="minus"
                    size={20}
                    color={!isAdding ? "#FFFFFF" : theme.colors.onSurface}
                  />
                  <Text
                    style={[
                      styles.toggleText,
                      !isAdding && { color: "#FFFFFF" },
                    ]}
                  >
                    Remove
                  </Text>
                </Pressable>
              </View>

              {/* Current Status */}
              <View style={styles.statusContainer}>
                <View style={styles.statusRow}>
                  <Text variant="bodySmall" style={{ opacity: 0.6 }}>
                    Currently saved:
                  </Text>
                  <Text variant="bodyMedium" style={{ fontWeight: "700" }}>
                    {balanceVisible
                      ? `${currencySymbol} ${formatAmount(currentAmount, decimalPlaces)}`
                      : "••••••"}
                  </Text>
                </View>
                {amount && !isNaN(parseFloat(amount)) && (
                  <View style={styles.statusRow}>
                    <Text variant="bodySmall" style={{ opacity: 0.6 }}>
                      After {isAdding ? "adding" : "removing"}:
                    </Text>
                    <Text
                      variant="bodyMedium"
                      style={{
                        fontWeight: "700",
                        color: isAdding
                          ? SpotifyColors.green
                          : SpotifyColors.danger,
                      }}
                    >
                      {balanceVisible
                        ? `${currencySymbol} ${formatAmount(
                            isAdding
                              ? currentAmount + parseFloat(amount || "0")
                              : currentAmount - parseFloat(amount || "0"),
                            decimalPlaces
                          )}`
                        : "••••••"}
                    </Text>
                  </View>
                )}
              </View>
            </ScrollView>

            {/* Action Buttons */}
            <View style={styles.addRemoveActions}>
              <Button
                mode="outlined"
                onPress={onClose}
                style={styles.actionButton}
                textColor={theme.colors.onSurface}
              >
                Close
              </Button>
              <Button
                mode="contained"
                onPress={handleSubmit}
                loading={isLoading}
                disabled={isLoading || !amount || parseFloat(amount) <= 0}
                style={[
                  styles.actionButton,
                  {
                    backgroundColor: isAdding
                      ? SpotifyColors.green
                      : SpotifyColors.danger,
                  },
                ]}
                textColor="#FFFFFF"
              >
                {isAdding ? "Add" : "Remove"}
              </Button>
            </View>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
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

  // Add/Remove modal state
  const [addRemoveItem, setAddRemoveItem] = useState<FlatPiggyBankItem | null>(
    null
  );
  const [addRemoveVisible, setAddRemoveVisible] = useState(false);

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

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdatePiggyBankData }) =>
      apiClient.updatePiggyBank(id, data),
    onSuccess: () => {
      // Force immediate refetch of piggy banks list
      queryClient.removeQueries({ queryKey: ["piggy-banks-list"] });
      queryClient.removeQueries({ queryKey: ["all-accounts-piggy-banks"] });
      queryClient.refetchQueries({
        queryKey: ["piggy-banks-list"],
        type: "active",
      });
      queryClient.refetchQueries({ queryKey: ["all-accounts-piggy-banks"] });
      setAddRemoveVisible(false);
      setAddRemoveItem(null);
      Alert.alert("Success", "Amount updated successfully");
    },
    onError: (error: Error) => {
      Alert.alert("Error", error.message || "Failed to update amount");
    },
  });

  // Fetch all accounts for real balance lookup in Add/Remove modal
  const { data: accountsData } = useQuery({
    queryKey: ["all-accounts-piggy-banks"],
    queryFn: () => apiClient.getAllAccounts("all"),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const allAccounts = useMemo(() => accountsData?.data ?? [], [accountsData]);

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

  // Press opens detail page
  const handlePress = useCallback(
    (item: FlatPiggyBankItem) => {
      const id = item.piggyBank.id;
      router.push(`/(drawer)/piggy-bank/${id}` as Href);
    },
    [router]
  );

  // Long press opens context menu
  const handleLongPress = useCallback((item: FlatPiggyBankItem) => {
    setContextMenuItem(item);
    setContextMenuVisible(true);
  }, []);

  const handleContextMenuClose = useCallback(() => {
    setContextMenuVisible(false);
    setContextMenuItem(null);
  }, []);

  const handleEdit = useCallback(() => {
    if (!contextMenuItem) return;
    const id = contextMenuItem.piggyBank.id;
    setContextMenuVisible(false);
    setContextMenuItem(null);
    router.push(`/(drawer)/piggy-bank/edit/${id}` as Href);
  }, [contextMenuItem, router]);

  const handleAddRemoveFromContext = useCallback(() => {
    if (!contextMenuItem) return;
    setContextMenuVisible(false);
    setContextMenuItem(null);
    setAddRemoveItem(contextMenuItem);
    setAddRemoveVisible(true);
  }, [contextMenuItem]);

  const handleDelete = useCallback(() => {
    if (!contextMenuItem) return;
    const piggyBankName =
      contextMenuItem.piggyBank.attributes.name || "this piggy bank";
    const piggyBankId = contextMenuItem.piggyBank.id;
    Alert.alert(
      "Delete Piggy Bank",
      `Delete "${piggyBankName}"? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setContextMenuVisible(false);
            setContextMenuItem(null);
            try {
              await apiClient.deletePiggyBank(piggyBankId);
              // Invalidate all piggy bank caches (same as update action)
              queryClient.removeQueries({ queryKey: ["piggy-banks-list"] });
              queryClient.removeQueries({
                queryKey: ["all-accounts-piggy-banks"],
              });
              queryClient.removeQueries({
                queryKey: ["piggy-bank-detail", piggyBankId],
              });
              queryClient.refetchQueries({
                queryKey: ["piggy-banks-list"],
                type: "active",
              });
              queryClient.refetchQueries({
                queryKey: ["all-accounts-piggy-banks"],
              });
              refetch();
              Alert.alert("Success", "Piggy bank deleted successfully");
            } catch (error) {
              console.error("Failed to delete piggy bank:", error);
              const message =
                error instanceof Error
                  ? error.message
                  : "Failed to delete piggy bank";
              Alert.alert("Error", message);
            }
          },
        },
      ]
    );
  }, [contextMenuItem, refetch]);

  const handleAddRemoveClose = useCallback(() => {
    setAddRemoveVisible(false);
    setAddRemoveItem(null);
  }, []);

  const handleAddRemoveSubmit = useCallback(
    (amount: number, isAdding: boolean) => {
      if (!addRemoveItem) return;

      const piggyBank = addRemoveItem.piggyBank;
      const currentAmount =
        parseFloat(piggyBank.attributes.current_amount) || 0;
      const newAmount = isAdding
        ? currentAmount + amount
        : Math.max(0, currentAmount - amount);

      // Build update data - update the first account's current_amount
      const accounts = piggyBank.attributes.accounts.map(
        (
          acc: { account_id: string; name: string; current_amount: string },
          idx: number
        ) => ({
          account_id: acc.account_id,
          name: acc.name,
          current_amount: idx === 0 ? newAmount.toFixed(2) : acc.current_amount,
        })
      );

      const updateData: UpdatePiggyBankData = {
        name: piggyBank.attributes.name,
        accounts,
        target_amount: piggyBank.attributes.target_amount,
        start_date: piggyBank.attributes.start_date,
        target_date: piggyBank.attributes.target_date,
        order: piggyBank.attributes.order,
        notes: piggyBank.attributes.notes,
      };

      updateMutation.mutate({ id: piggyBank.id, data: updateData });
    },
    [addRemoveItem, updateMutation]
  );

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

      {/* Context Menu Modal */}
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
                onEdit={handleEdit}
                onAddRemove={handleAddRemoveFromContext}
                onDelete={handleDelete}
                onClose={handleContextMenuClose}
              />
            )}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Add/Remove Amount Modal */}
      <AddRemoveModal
        visible={addRemoveVisible}
        piggyBank={addRemoveItem?.piggyBank ?? null}
        accounts={allAccounts}
        allPiggyBanks={allPiggyBanks}
        onClose={handleAddRemoveClose}
        onSubmit={handleAddRemoveSubmit}
        isLoading={updateMutation.isPending}
        balanceVisible={balanceVisible}
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
  // Add/Remove Modal
  addRemoveOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  addRemoveBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  addRemoveContainer: {
    width: "100%",
    maxWidth: 450,
    borderRadius: 16,
    overflow: "hidden",
  },
  addRemoveHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(120, 120, 120, 0.2)",
  },
  addRemoveTitle: {
    fontWeight: "600",
    flex: 1,
    flexWrap: "wrap",
  },
  closeButton: {
    padding: 4,
  },
  addRemoveContent: {
    padding: 20,
  },
  accountInfoContainer: {
    marginBottom: 16,
  },
  accountInfoText: {
    fontWeight: "600",
    marginBottom: 4,
  },
  maxAmountText: {
    opacity: 0.7,
  },
  amountInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  currencySymbol: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderRightWidth: 0,
    borderColor: "rgba(120, 120, 120, 0.3)",
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
    backgroundColor: "rgba(120, 120, 120, 0.1)",
  },
  amountInput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "rgba(120, 120, 120, 0.3)",
    fontSize: 16,
  },
  maxButton: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderLeftWidth: 0,
    borderColor: "rgba(120, 120, 120, 0.3)",
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
    backgroundColor: "rgba(120, 120, 120, 0.1)",
  },
  toggleContainer: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },
  toggleButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: "rgba(120, 120, 120, 0.1)",
  },
  toggleText: {
    fontWeight: "600",
  },
  statusContainer: {
    gap: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(120, 120, 120, 0.15)",
  },
  statusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  addRemoveActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
    padding: 20,
    paddingTop: 0,
  },
  actionButton: {
    minWidth: 80,
  },
});
