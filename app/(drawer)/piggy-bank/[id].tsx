// Piggy Bank Detail Screen – read-only view of a single piggy bank
import { GlassCard } from "@/components/glass-card";
import { SpotifyColors } from "@/constants/spotify-theme";
import { apiClient } from "@/lib/api-client";
import { formatAmount } from "@/lib/format-currency";
import { useStore } from "@/lib/store";
import type { PiggyBank, PiggyBankAccount } from "@/types";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import {
  useLocalSearchParams,
  useNavigation,
  useRouter,
  type Href,
} from "expo-router";
import React, { useCallback, useEffect, useMemo } from "react";
import {
  ActivityIndicator,
  BackHandler,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { Card, Chip, Divider, Text, useTheme } from "react-native-paper";

// ---------------------------------------------------------------------------
// Zustand selector
// ---------------------------------------------------------------------------

const selectBalanceVisible = (state: { balanceVisible: boolean }) =>
  state.balanceVisible;

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PIGGY_BANKS_ROUTE = "/(drawer)/piggy-banks" as Href;

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

function formatDateTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
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
// DetailRow
// ---------------------------------------------------------------------------

interface DetailRowProps {
  label: string;
  value: string | number | boolean | null | undefined;
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
  valueColor?: string;
  onSurfaceVariantColor: string;
}

function DetailRow({
  label,
  value,
  icon,
  valueColor,
  onSurfaceVariantColor,
}: DetailRowProps) {
  if (value === null || value === undefined || value === "") return null;

  const displayValue =
    typeof value === "boolean" ? (value ? "Yes" : "No") : String(value);

  return (
    <View style={styles.detailRow}>
      <View style={styles.detailRowLeft}>
        {icon && (
          <MaterialCommunityIcons
            name={icon}
            size={18}
            color={onSurfaceVariantColor}
            style={styles.detailRowIcon}
          />
        )}
        <Text variant="bodyMedium" style={styles.detailRowLabel}>
          {label}
        </Text>
      </View>
      <Text
        variant="bodyMedium"
        style={[
          styles.detailRowValue,
          valueColor ? { color: valueColor } : undefined,
        ]}
        numberOfLines={2}
      >
        {displayValue}
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Linked Account Card
// ---------------------------------------------------------------------------

interface LinkedAccountCardProps {
  account: PiggyBankAccount;
  currencySymbol: string;
  decimalPlaces: number;
  balanceVisible: boolean;
  onSurfaceVariantColor: string;
}

function LinkedAccountCard({
  account,
  currencySymbol,
  decimalPlaces,
  balanceVisible,
  onSurfaceVariantColor,
}: LinkedAccountCardProps) {
  const currentAmount = parseFloat(account.current_amount) || 0;

  return (
    <View style={styles.linkedAccountCard}>
      <View style={styles.linkedAccountHeader}>
        <MaterialCommunityIcons
          name="bank"
          size={20}
          color={onSurfaceVariantColor}
        />
        <Text variant="bodyMedium" style={styles.linkedAccountName}>
          {account.name}
        </Text>
      </View>
      <Text variant="titleSmall" style={styles.linkedAccountAmount}>
        {balanceVisible
          ? `${currencySymbol} ${formatAmount(currentAmount, decimalPlaces)}`
          : "••••••"}
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Main Screen
// ---------------------------------------------------------------------------

export default function PiggyBankDetailScreen() {
  const theme = useTheme();
  const router = useRouter();
  const navigation = useNavigation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const balanceVisible = useStore(selectBalanceVisible);

  // Fetch piggy bank details
  const {
    data: piggyBankData,
    isLoading,
    isRefetching,
    refetch,
    error,
  } = useQuery({
    queryKey: ["piggy-bank-detail", id],
    queryFn: () => apiClient.getPiggyBank(id),
    enabled: !!id,
  });

  const piggyBank: PiggyBank | null = piggyBankData?.data ?? null;
  const attrs = piggyBank?.attributes;

  // Setup navigation header with back button
  useEffect(() => {
    navigation.setOptions({
      title: attrs?.name || "Piggy Bank",
      headerLeft: () => (
        <Pressable
          onPress={() => router.replace(PIGGY_BANKS_ROUTE)}
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
  }, [navigation, attrs?.name, router, theme.colors.onSurface]);

  // Handle back button
  useEffect(() => {
    const onBack = () => {
      router.replace(PIGGY_BANKS_ROUTE);
      return true;
    };
    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      onBack
    );
    return () => subscription.remove();
  }, [router]);

  // Handle refresh
  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  // Memoized calculations
  const {
    currentAmount,
    targetAmount,
    percentage,
    progress,
    leftToSave,
    daysUntil,
    isCompleted,
    isActive,
    fillColor,
  } = useMemo(() => {
    if (!attrs) {
      return {
        currentAmount: 0,
        targetAmount: null,
        percentage: 0,
        progress: 0,
        leftToSave: null,
        daysUntil: null,
        isCompleted: false,
        isActive: false,
        fillColor: theme.colors.primary,
      };
    }

    const current = parseFloat(attrs.current_amount) || 0;
    const target = attrs.target_amount ? parseFloat(attrs.target_amount) : null;
    const pct = attrs.percentage ?? (target ? (current / target) * 100 : 0);
    const prog = Math.min(pct / 100, 1);
    const left = attrs.left_to_save ? parseFloat(attrs.left_to_save) : null;
    const days = getDaysUntilTarget(attrs.target_date);
    const completed = pct >= 100;
    const active = attrs.active;

    let color = theme.colors.primary;
    if (completed) {
      color = SpotifyColors.green;
    } else if (pct >= 75) {
      color = theme.colors.secondary;
    } else if (pct >= 50) {
      color = SpotifyColors.blue;
    }

    return {
      currentAmount: current,
      targetAmount: target,
      percentage: pct,
      progress: prog,
      leftToSave: left,
      daysUntil: days,
      isCompleted: completed,
      isActive: active,
      fillColor: color,
    };
  }, [attrs, theme.colors.primary, theme.colors.secondary]);

  const currencySymbol = attrs?.currency_symbol || "$";
  const decimalPlaces = attrs?.currency_decimal_places ?? 2;

  // -----------------------------------------------------------------------
  // Loading State
  // -----------------------------------------------------------------------

  if (isLoading) {
    return (
      <View
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text variant="bodyMedium" style={styles.loadingText}>
            Loading piggy bank...
          </Text>
        </View>
      </View>
    );
  }

  // -----------------------------------------------------------------------
  // Error State
  // -----------------------------------------------------------------------

  if (error || !piggyBank || !attrs) {
    return (
      <View
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <View style={styles.centerContent}>
          <MaterialCommunityIcons
            name="alert-circle-outline"
            size={64}
            color={theme.colors.error}
          />
          <Text variant="headlineSmall" style={styles.errorTitle}>
            Failed to load
          </Text>
          <Text variant="bodyMedium" style={styles.errorSubtitle}>
            {error instanceof Error
              ? error.message
              : "Could not load piggy bank details"}
          </Text>
          <Pressable onPress={handleRefresh} style={styles.retryButton}>
            <MaterialCommunityIcons
              name="refresh"
              size={20}
              color={theme.colors.primary}
            />
            <Text
              variant="bodyMedium"
              style={{ color: theme.colors.primary, marginLeft: 8 }}
            >
              Retry
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={handleRefresh}
            colors={[theme.colors.primary]}
          />
        }
      >
        {/* Status Header Card */}
        <GlassCard variant="elevated" style={styles.headerCard}>
          <Card.Content>
            {/* Icon + Name */}
            <View style={styles.headerRow}>
              <View
                style={[
                  styles.headerIconWrap,
                  {
                    backgroundColor: isActive
                      ? `${theme.colors.primary}20`
                      : "rgba(120,120,120,0.08)",
                  },
                ]}
              >
                <MaterialCommunityIcons
                  name={isCompleted ? "piggy-bank" : "piggy-bank-outline"}
                  size={32}
                  color={
                    isActive
                      ? theme.colors.primary
                      : SpotifyColors.textSecondary
                  }
                />
              </View>
              <View style={styles.headerTextContainer}>
                <Text variant="headlineSmall" style={styles.headerName}>
                  {attrs.name}
                </Text>
                <View style={styles.statusRow}>
                  {isCompleted && (
                    <Chip
                      compact
                      style={[styles.statusChip, styles.completedChip]}
                      textStyle={styles.completedChipText}
                    >
                      <MaterialCommunityIcons
                        name="check-circle"
                        size={12}
                        color="#FFFFFF"
                      />
                      {"  "}Goal Reached
                    </Chip>
                  )}
                  {!isCompleted && (
                    <Chip
                      compact
                      style={[
                        styles.statusChip,
                        {
                          backgroundColor: attrs.active
                            ? theme.colors.primary + "20"
                            : theme.colors.surfaceVariant,
                        },
                      ]}
                      textStyle={[
                        styles.statusChipText,
                        {
                          color: attrs.active
                            ? theme.colors.primary
                            : theme.colors.error,
                        },
                      ]}
                    >
                      {attrs.active ? "Active" : "Inactive"}
                    </Chip>
                  )}
                </View>
              </View>
            </View>

            {/* Progress Section */}
            {targetAmount !== null && targetAmount > 0 && (
              <View style={styles.progressSection}>
                <View style={styles.progressTrack}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${progress * 100}%`,
                        backgroundColor: fillColor,
                      },
                    ]}
                  />
                </View>
                <View style={styles.progressInfo}>
                  <Text
                    variant="titleMedium"
                    style={[styles.progressPercent, { color: fillColor }]}
                  >
                    {percentage.toFixed(0)}%
                  </Text>
                  <Text variant="bodySmall" style={styles.progressLabel}>
                    saved
                  </Text>
                </View>
              </View>
            )}
          </Card.Content>
        </GlassCard>

        {/* Amounts Overview */}
        <GlassCard variant="elevated" style={styles.amountsCard}>
          <Card.Content>
            <Text variant="titleSmall" style={styles.sectionTitle}>
              Savings Overview
            </Text>
            <View style={styles.amountsGrid}>
              <View style={styles.amountBox}>
                <Text variant="labelSmall" style={styles.amountBoxLabel}>
                  Current Saved
                </Text>
                <Text
                  variant="headlineSmall"
                  style={[
                    styles.amountBoxValue,
                    { color: theme.colors.primary },
                  ]}
                >
                  {balanceVisible
                    ? `${currencySymbol} ${formatAmount(
                        currentAmount,
                        decimalPlaces
                      )}`
                    : "••••••"}
                </Text>
              </View>

              <View style={styles.amountBox}>
                <Text variant="labelSmall" style={styles.amountBoxLabel}>
                  Target Amount
                </Text>
                <Text variant="headlineSmall" style={styles.amountBoxValue}>
                  {targetAmount !== null && targetAmount > 0
                    ? balanceVisible
                      ? `${currencySymbol} ${formatAmount(
                          targetAmount,
                          decimalPlaces
                        )}`
                      : "••••••"
                    : "No target"}
                </Text>
              </View>

              {leftToSave !== null && leftToSave > 0 && (
                <View style={styles.amountBox}>
                  <Text variant="labelSmall" style={styles.amountBoxLabel}>
                    Left to Save
                  </Text>
                  <Text
                    variant="headlineSmall"
                    style={[
                      styles.amountBoxValue,
                      { color: SpotifyColors.orange },
                    ]}
                  >
                    {balanceVisible
                      ? `${currencySymbol} ${formatAmount(
                          leftToSave,
                          decimalPlaces
                        )}`
                      : "••••••"}
                  </Text>
                </View>
              )}

              {attrs.save_per_month && attrs.save_per_month !== "0" && (
                <View style={styles.amountBox}>
                  <Text variant="labelSmall" style={styles.amountBoxLabel}>
                    Save Per Month
                  </Text>
                  <Text variant="headlineSmall" style={styles.amountBoxValue}>
                    {balanceVisible
                      ? `${currencySymbol} ${formatAmount(
                          parseFloat(attrs.save_per_month),
                          decimalPlaces
                        )}`
                      : "••••••"}
                  </Text>
                </View>
              )}
            </View>
          </Card.Content>
        </GlassCard>

        {/* Currency Information */}
        <GlassCard variant="elevated" style={styles.currencyCard}>
          <Card.Content>
            <Text variant="titleSmall" style={styles.sectionTitle}>
              Currency
            </Text>
            <DetailRow
              label="Currency"
              value={`${attrs.currency_name} (${attrs.currency_code})`}
              icon="currency-usd"
              onSurfaceVariantColor={theme.colors.onSurfaceVariant}
            />
          </Card.Content>
        </GlassCard>

        {/* Linked Accounts */}
        {attrs.accounts.length > 0 && (
          <GlassCard variant="elevated" style={styles.accountsCard}>
            <Card.Content>
              <Text variant="titleSmall" style={styles.sectionTitle}>
                Linked Accounts ({attrs.accounts.length})
              </Text>
              <Text variant="bodySmall" style={styles.accountsSubtitle}>
                Money saved in these accounts contributes to this piggy bank
              </Text>
              <Divider style={styles.accountsDivider} />
              {attrs.accounts.map((account) => (
                <LinkedAccountCard
                  key={account.account_id}
                  account={account}
                  currencySymbol={currencySymbol}
                  decimalPlaces={decimalPlaces}
                  balanceVisible={balanceVisible}
                  onSurfaceVariantColor={theme.colors.onSurfaceVariant}
                />
              ))}
            </Card.Content>
          </GlassCard>
        )}

        {/* Date Information */}
        <GlassCard variant="elevated" style={styles.datesCard}>
          <Card.Content>
            <Text variant="titleSmall" style={styles.sectionTitle}>
              Timeline
            </Text>
            <DetailRow
              label="Start Date"
              value={attrs.start_date ? formatDate(attrs.start_date) : null}
              icon="calendar-start"
              onSurfaceVariantColor={theme.colors.onSurfaceVariant}
            />
            <DetailRow
              label="Target Date"
              value={
                attrs.target_date
                  ? daysUntil !== null && daysUntil < 0
                    ? `Overdue by ${Math.abs(daysUntil)} days`
                    : daysUntil !== null && daysUntil === 0
                      ? "Due today"
                      : daysUntil !== null
                        ? `${daysUntil} days left`
                        : formatDate(attrs.target_date)
                  : null
              }
              icon="calendar-end"
              valueColor={
                daysUntil !== null && daysUntil < 0
                  ? SpotifyColors.danger
                  : undefined
              }
              onSurfaceVariantColor={theme.colors.onSurfaceVariant}
            />
            <DetailRow
              label="Created"
              value={formatDateTime(attrs.created_at)}
              icon="clock-outline"
              onSurfaceVariantColor={theme.colors.onSurfaceVariant}
            />
            <DetailRow
              label="Last Updated"
              value={formatDateTime(attrs.updated_at)}
              icon="update"
              onSurfaceVariantColor={theme.colors.onSurfaceVariant}
            />
          </Card.Content>
        </GlassCard>

        {/* Notes */}
        {attrs.notes && (
          <GlassCard variant="elevated" style={styles.notesCard}>
            <Card.Content>
              <Text variant="titleSmall" style={styles.sectionTitle}>
                Notes
              </Text>
              <View style={styles.notesContainer}>
                <MaterialCommunityIcons
                  name="note-text"
                  size={20}
                  color={theme.colors.onSurfaceVariant}
                  style={styles.notesIcon}
                />
                <Text variant="bodyMedium" style={styles.notesText}>
                  {attrs.notes}
                </Text>
              </View>
            </Card.Content>
          </GlassCard>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  centerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 80,
  },
  loadingText: {
    marginTop: 12,
    opacity: 0.7,
  },
  errorTitle: {
    marginTop: 16,
    fontWeight: "700",
  },
  errorSubtitle: {
    marginTop: 8,
    opacity: 0.6,
    textAlign: "center",
    paddingHorizontal: 32,
  },
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 20,
    padding: 12,
    borderRadius: 8,
    backgroundColor: "rgba(120, 120, 120, 0.1)",
  },
  // Header Card
  headerCard: {
    marginBottom: 12,
    borderRadius: 16,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  headerIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerName: {
    fontWeight: "700",
    marginBottom: 8,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  completedChip: {
    backgroundColor: SpotifyColors.green,
  },
  completedChipText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },
  inactiveChip: {
    backgroundColor: "rgba(120, 120, 120, 0.15)",
  },
  inactiveChipText: {
    color: SpotifyColors.textSecondary,
    fontSize: 11,
    fontWeight: "600",
  },
  activeChip: {
    backgroundColor: "rgba(63, 81, 181, 0.15)",
  },
  activeChipText: {
    color: SpotifyColors.blue,
    fontSize: 11,
    fontWeight: "600",
  },
  // Progress
  progressSection: {
    marginTop: 8,
  },
  progressTrack: {
    height: 12,
    borderRadius: 6,
    backgroundColor: "rgba(120, 120, 120, 0.15)",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 6,
  },
  progressInfo: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "center",
    marginTop: 12,
  },
  progressPercent: {
    fontWeight: "700",
    fontSize: 28,
    lineHeight: 34,
  },
  progressLabel: {
    opacity: 0.5,
    marginLeft: 6,
    fontSize: 16,
  },
  // Amounts Card
  amountsCard: {
    marginBottom: 12,
    borderRadius: 16,
  },
  sectionTitle: {
    fontWeight: "700",
    marginBottom: 16,
    opacity: 0.9,
  },
  amountsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  amountBox: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: "rgba(120, 120, 120, 0.06)",
    borderRadius: 12,
    padding: 16,
  },
  amountBoxLabel: {
    opacity: 0.5,
    marginBottom: 8,
  },
  amountBoxValue: {
    fontWeight: "700",
  },
  // Dates Card
  datesCard: {
    marginBottom: 12,
    borderRadius: 16,
  },
  // Accounts Card
  accountsCard: {
    marginBottom: 12,
    borderRadius: 16,
  },
  accountsSubtitle: {
    opacity: 0.5,
    marginBottom: 12,
  },
  accountsDivider: {
    marginBottom: 12,
    opacity: 0.3,
  },
  linkedAccountCard: {
    backgroundColor: "rgba(120, 120, 120, 0.06)",
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  linkedAccountHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  linkedAccountName: {
    fontWeight: "600",
    flex: 1,
  },
  linkedAccountAmount: {
    fontWeight: "700",
  },
  // Currency Card
  currencyCard: {
    marginBottom: 12,
    borderRadius: 16,
  },
  // Details Card
  detailsCard: {
    marginBottom: 12,
    borderRadius: 16,
  },
  // Notes Card
  notesCard: {
    marginBottom: 12,
    borderRadius: 16,
  },
  notesContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  notesIcon: {
    marginTop: 2,
  },
  notesText: {
    flex: 1,
    opacity: 0.8,
    lineHeight: 22,
  },
  // Detail Row
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
  },
  detailRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  detailRowIcon: {
    marginRight: 10,
  },
  detailRowLabel: {
    opacity: 0.6,
  },
  detailRowValue: {
    fontWeight: "600",
    textAlign: "right",
    flexShrink: 1,
    marginLeft: 12,
  },
  // Bottom Padding
  bottomPadding: {
    height: 20,
  },
  statusChip: {
    height: 28,
  },
  statusChipText: {
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 16,
  },
});
