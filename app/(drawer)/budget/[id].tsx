// Budget Detail Screen – read-only view of a single budget
import { GlassCard } from "@/components/glass-card";
import { SpotifyColors } from "@/constants/spotify-theme";
import { apiClient } from "@/lib/api-client";
import { formatAmount } from "@/lib/format-currency";
import { useStore } from "@/lib/store";
import { getCurrentMonthStartEndDate } from "@/lib/utils";
import type { Budget, BudgetLimit } from "@/types";
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
  Animated,
  BackHandler,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { Card, Chip, Text, useTheme } from "react-native-paper";

// ---------------------------------------------------------------------------
// Zustand selector
// ---------------------------------------------------------------------------

const selectBalanceVisible = (state: { balanceVisible: boolean }) =>
  state.balanceVisible;

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BUDGETS_ROUTE = "/(drawer)/budgets" as Href;

const AUTO_BUDGET_TYPE_LABELS: Record<string, string> = {
  reset: "Set a fixed amount every period",
  rollover: "Add an amount every period",
  adjusted: "Add an amount every period and correct for overspending",
  none: "No auto-budget",
};

const PERIOD_LABELS: Record<string, string> = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
  quarterly: "Quarterly",
  "half-year": "Half-yearly",
  half_year: "Half-yearly",
  yearly: "Yearly",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

function formatDateRange(start: string, end: string): string {
  try {
    const s = new Date(start);
    const e = new Date(end);
    const opts: Intl.DateTimeFormatOptions = {
      day: "numeric",
      month: "short",
    };
    return `${s.toLocaleDateString(undefined, opts)} – ${e.toLocaleDateString(undefined, { ...opts, year: "numeric" })}`;
  } catch {
    return `${start} – ${end}`;
  }
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
// BudgetLimitCard
// ---------------------------------------------------------------------------

interface BudgetLimitCardProps {
  limit: BudgetLimit;
  balanceVisible: boolean;
  primaryColor: string;
}

function BudgetLimitCard({
  limit,
  balanceVisible,
  primaryColor,
}: BudgetLimitCardProps) {
  const attrs = limit.attributes;
  const totalBudget = parseFloat(attrs.amount) || 0;
  const spentArr = attrs.spent ?? [];
  const spent = spentArr.reduce(
    (s, e) => s + Math.abs(parseFloat(e.sum) || 0),
    0
  );
  const remaining = Math.max(0, totalBudget - spent);
  const progressRatio = totalBudget > 0 ? spent / totalBudget : 0;
  const progress = Math.min(progressRatio, 1);
  const isOverBudget = spent > totalBudget && totalBudget > 0;
  const currencySymbol = attrs.currency_symbol || "$";

  const fillColor = isOverBudget
    ? SpotifyColors.danger
    : progressRatio >= 0.7
      ? SpotifyColors.orange
      : primaryColor;

  return (
    <View style={styles.limitCard}>
      {/* Date Range */}
      <View style={styles.limitDateRow}>
        <MaterialCommunityIcons
          name="calendar-range"
          size={16}
          color={SpotifyColors.textSecondary}
        />
        <Text variant="labelSmall" style={styles.limitDateText}>
          {formatDateRange(attrs.start, attrs.end)}
        </Text>
        {attrs.period && (
          <Chip
            compact
            style={styles.periodChip}
            textStyle={styles.periodChipText}
          >
            {PERIOD_LABELS[attrs.period] || attrs.period}
          </Chip>
        )}
      </View>

      {/* Progress */}
      {totalBudget > 0 && (
        <View style={styles.limitProgressSection}>
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
          <View style={styles.percentageRow}>
            <Text
              variant="labelSmall"
              style={[styles.percentageText, { color: fillColor }]}
            >
              {(progressRatio * 100).toFixed(0)}% used
            </Text>
            {isOverBudget && (
              <View style={styles.overBadge}>
                <MaterialCommunityIcons
                  name="alert-circle"
                  size={12}
                  color="#FFFFFF"
                />
                <Text style={styles.overBadgeText}>Over</Text>
              </View>
            )}
          </View>
        </View>
      )}

      {/* Amounts */}
      <View style={styles.limitAmountsRow}>
        <View style={styles.amountBlock}>
          <Text variant="labelSmall" style={styles.amountLabel}>
            Spent
          </Text>
          <Text
            variant="titleSmall"
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
            {currencySymbol} {balanceVisible ? formatAmount(spent) : "••••••"}
          </Text>
        </View>
        <View style={[styles.amountBlock, styles.amountBlockRight]}>
          <Text variant="labelSmall" style={styles.amountLabel}>
            Budget
          </Text>
          <Text variant="titleSmall" style={styles.amountValue}>
            {currencySymbol}{" "}
            {balanceVisible ? formatAmount(totalBudget) : "••••••"}
          </Text>
        </View>
        <View style={[styles.amountBlock, styles.amountBlockRight]}>
          <Text variant="labelSmall" style={styles.amountLabel}>
            Remaining
          </Text>
          <Text
            variant="titleSmall"
            style={[
              styles.amountValue,
              {
                color: isOverBudget ? SpotifyColors.danger : primaryColor,
              },
            ]}
          >
            {currencySymbol}{" "}
            {balanceVisible ? formatAmount(remaining) : "••••••"}
          </Text>
        </View>
      </View>

      {/* Notes */}
      {attrs.notes && (
        <Text variant="bodySmall" style={styles.limitNotes}>
          {attrs.notes}
        </Text>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Main Screen
// ---------------------------------------------------------------------------

export default function BudgetDetailScreen() {
  const theme = useTheme();
  const router = useRouter();
  const navigation = useNavigation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const balanceVisible = useStore(selectBalanceVisible);

  // Date range for limits
  const budgetDateRange = useMemo(() => getCurrentMonthStartEndDate(), []);

  // Fetch budget details
  const {
    data: budgetData,
    isLoading: budgetLoading,
    isError: budgetError,
    refetch: refetchBudget,
    isRefetching: budgetRefetching,
  } = useQuery({
    queryKey: ["budget-detail", id],
    queryFn: () => apiClient.getBudget(id!),
    enabled: !!id,
  });

  // Fetch budget limits for this budget (current month)
  const {
    data: limitsData,
    isLoading: limitsLoading,
    refetch: refetchLimits,
    isRefetching: limitsRefetching,
  } = useQuery({
    queryKey: [
      "budget-limits-detail",
      id,
      budgetDateRange.startDateString,
      budgetDateRange.endDate,
    ],
    queryFn: () =>
      apiClient.getBudgetLimitsForBudget(
        id!,
        budgetDateRange.startDateString,
        budgetDateRange.endDate
      ),
    enabled: !!id,
  });

  const budget: Budget | undefined = budgetData?.data;
  const budgetLimits: BudgetLimit[] = limitsData?.data ?? [];
  const isLoading = budgetLoading || limitsLoading;
  const isRefetching = budgetRefetching || limitsRefetching;

  // Navigation
  const goBack = useCallback(() => {
    router.replace(BUDGETS_ROUTE);
  }, [router]);

  useEffect(() => {
    navigation.setOptions({
      title: budget?.attributes?.name || "Budget",
      headerLeft: () => (
        <Pressable
          onPress={goBack}
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
  }, [navigation, budget?.attributes?.name, goBack, theme.colors.onSurface]);

  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      goBack();
      return true;
    });
    return () => sub.remove();
  }, [goBack]);

  // Refresh
  const handleRefresh = useCallback(() => {
    refetchBudget();
    refetchLimits();
  }, [refetchBudget, refetchLimits]);

  // Derived
  const attrs = budget?.attributes;
  const onSurfaceVariantColor = theme.colors.onSurfaceVariant;

  const hasAutoBudget =
    attrs?.auto_budget_type &&
    attrs.auto_budget_type !== "none" &&
    attrs.auto_budget_type !== "null";
  const hasCurrency = attrs?.currency_code || attrs?.currency_name;
  const hasNotes = attrs?.notes && attrs.notes.trim().length > 0;

  // -----------------------------------------------------------------------
  // Early return states
  // -----------------------------------------------------------------------

  if (!id) {
    return (
      <View
        style={[
          styles.container,
          styles.centerContent,
          { backgroundColor: theme.colors.background },
        ]}
      >
        <Text variant="bodyLarge">Invalid budget.</Text>
      </View>
    );
  }

  if (isLoading) {
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
          Loading budget...
        </Text>
      </View>
    );
  }

  if (budgetError || !budget) {
    return (
      <View
        style={[
          styles.container,
          styles.centerContent,
          { backgroundColor: theme.colors.background },
        ]}
      >
        <MaterialCommunityIcons
          name="alert-circle-outline"
          size={64}
          color={theme.colors.error}
        />
        <Text variant="headlineSmall" style={styles.errorTitle}>
          Failed to load
        </Text>
        <Text variant="bodyMedium" style={styles.errorSubtitle}>
          Could not load budget details.
        </Text>
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
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={handleRefresh}
            colors={[theme.colors.primary]}
          />
        }
      >
        {/* ---- Hero Section ---- */}
        <View style={styles.heroSection}>
          <View
            style={[
              styles.heroIconWrap,
              { backgroundColor: theme.colors.primary + "20" },
            ]}
          >
            <MaterialCommunityIcons
              name="wallet"
              size={40}
              color={theme.colors.primary}
            />
          </View>
          <Text
            variant="headlineMedium"
            style={[styles.heroName, { color: theme.colors.onSurface }]}
          >
            {attrs!.name}
          </Text>

          <View style={styles.heroBadges}>
            <Chip
              compact
              style={[
                styles.statusChip,
                {
                  backgroundColor: attrs!.active
                    ? theme.colors.primary + "20"
                    : theme.colors.error + "20",
                },
              ]}
              textStyle={[
                styles.statusChipText,
                {
                  color: attrs!.active
                    ? theme.colors.primary
                    : theme.colors.error,
                },
              ]}
            >
              {attrs!.active ? "Active" : "Inactive"}
            </Chip>

            {hasAutoBudget && (
              <Chip
                compact
                style={[
                  styles.statusChip,
                  { backgroundColor: SpotifyColors.orange + "20" },
                ]}
                textStyle={[
                  styles.statusChipText,
                  { color: SpotifyColors.orange },
                ]}
              >
                {attrs!.auto_budget_type === "reset"
                  ? "Auto (Reset)"
                  : attrs!.auto_budget_type === "adjusted"
                    ? "Auto (Adjusted)"
                    : "Auto (Rollover)"}
              </Chip>
            )}
          </View>
        </View>

        {/* ---- Budget Configuration ---- */}
        <GlassCard variant="elevated" style={styles.card}>
          <Card.Title
            title="Configuration"
            left={() => (
              <MaterialCommunityIcons
                name="cog-outline"
                size={24}
                color={theme.colors.primary}
              />
            )}
          />
          <Card.Content>
            {hasAutoBudget && (
              <>
                <DetailRow
                  label="Auto Budget"
                  value={
                    AUTO_BUDGET_TYPE_LABELS[attrs!.auto_budget_type!] ||
                    attrs!.auto_budget_type
                  }
                  icon="autorenew"
                  onSurfaceVariantColor={onSurfaceVariantColor}
                />
                <DetailRow
                  label="Auto Amount"
                  value={
                    attrs!.auto_budget_amount
                      ? `${attrs!.currency_symbol || ""} ${balanceVisible ? formatAmount(parseFloat(attrs!.auto_budget_amount)) : "••••••"}`
                      : undefined
                  }
                  icon="cash"
                  valueColor={theme.colors.primary}
                  onSurfaceVariantColor={onSurfaceVariantColor}
                />
                <DetailRow
                  label="Period"
                  value={
                    attrs!.auto_budget_period
                      ? PERIOD_LABELS[attrs!.auto_budget_period] ||
                        attrs!.auto_budget_period
                      : undefined
                  }
                  icon="calendar-clock"
                  onSurfaceVariantColor={onSurfaceVariantColor}
                />
              </>
            )}
            {!hasAutoBudget && (
              <DetailRow
                label="Auto Budget"
                value="No auto-budget"
                icon="autorenew"
                onSurfaceVariantColor={onSurfaceVariantColor}
              />
            )}
            {hasCurrency && (
              <DetailRow
                label="Currency"
                value={`${attrs!.currency_name || ""} (${attrs!.currency_code || ""})`}
                icon="currency-usd"
                onSurfaceVariantColor={onSurfaceVariantColor}
              />
            )}
            <DetailRow
              label="Order"
              value={attrs!.order}
              icon="sort-numeric-ascending"
              onSurfaceVariantColor={onSurfaceVariantColor}
            />
            {attrs!.object_group_title && (
              <DetailRow
                label="Group"
                value={attrs!.object_group_title}
                icon="folder-outline"
                onSurfaceVariantColor={onSurfaceVariantColor}
              />
            )}
          </Card.Content>
        </GlassCard>

        {/* ---- Current Month Limits ---- */}
        <GlassCard variant="elevated" style={styles.card}>
          <Card.Title
            title="Current Month Limits"
            left={() => (
              <MaterialCommunityIcons
                name="chart-bar"
                size={24}
                color={theme.colors.primary}
              />
            )}
          />
          <Card.Content>
            {budgetLimits.length === 0 && (
              <View style={styles.emptyLimitsRow}>
                <MaterialCommunityIcons
                  name="information-outline"
                  size={16}
                  color={SpotifyColors.textSecondary}
                />
                <Text variant="bodySmall" style={styles.emptyLimitsText}>
                  No budget limits set for this month
                </Text>
              </View>
            )}
            {budgetLimits.map((limit, index) => (
              <React.Fragment key={limit.id}>
                {index > 0 && <View style={styles.limitDivider} />}
                <BudgetLimitCard
                  limit={limit}
                  balanceVisible={balanceVisible}
                  primaryColor={theme.colors.primary}
                />
              </React.Fragment>
            ))}
          </Card.Content>
        </GlassCard>

        {/* ---- Notes ---- */}
        {hasNotes && (
          <GlassCard variant="elevated" style={styles.card}>
            <Card.Title
              title="Notes"
              left={() => (
                <MaterialCommunityIcons
                  name="note-text-outline"
                  size={24}
                  color={theme.colors.primary}
                />
              )}
            />
            <Card.Content>
              <Text variant="bodyMedium" style={styles.notesText}>
                {attrs!.notes}
              </Text>
            </Card.Content>
          </GlassCard>
        )}

        {/* ---- Metadata ---- */}
        <GlassCard variant="elevated" style={styles.card}>
          <Card.Title
            title="Metadata"
            left={() => (
              <MaterialCommunityIcons
                name="clock-outline"
                size={24}
                color={theme.colors.primary}
              />
            )}
          />
          <Card.Content>
            <DetailRow
              label="Created"
              value={formatDateTime(attrs!.created_at)}
              icon="clock-plus-outline"
              onSurfaceVariantColor={onSurfaceVariantColor}
            />
            <DetailRow
              label="Updated"
              value={formatDateTime(attrs!.updated_at)}
              icon="clock-edit-outline"
              onSurfaceVariantColor={onSurfaceVariantColor}
            />
          </Card.Content>
        </GlassCard>

        <View style={{ height: 32 }} />
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
  centerContent: {
    justifyContent: "center",
    alignItems: "center",
    flex: 1,
  },
  loadingText: {
    marginTop: 12,
  },
  errorTitle: {
    marginTop: 16,
  },
  errorSubtitle: {
    marginTop: 8,
    opacity: 0.7,
  },
  scrollContent: {
    padding: 16,
  },

  // Hero
  heroSection: {
    alignItems: "center",
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  heroIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  heroName: {
    fontWeight: "800",
    textAlign: "center",
  },
  heroBadges: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },
  statusChip: {
    height: 32,
  },
  statusChipText: {
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 16,
  },

  // Card
  card: {
    marginBottom: 16,
  },

  // DetailRow
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
  },
  detailRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    minWidth: 0,
  },
  detailRowIcon: {
    marginRight: 8,
  },
  detailRowLabel: {
    opacity: 0.7,
  },
  detailRowValue: {
    fontWeight: "500",
    textAlign: "right",
    flexShrink: 1,
    maxWidth: "55%",
  },

  // Limits
  emptyLimitsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
  },
  emptyLimitsText: {
    color: SpotifyColors.textSecondary,
  },
  limitCard: {
    paddingVertical: 8,
  },
  limitDivider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.08)",
    marginVertical: 4,
  },
  limitDateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
  },
  limitDateText: {
    color: SpotifyColors.textSecondary,
    flex: 1,
  },
  periodChip: {
    height: 32,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  periodChipText: {
    fontSize: 10,
    lineHeight: 16,
    fontWeight: "500",
  },
  limitProgressSection: {
    marginBottom: 10,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.08)",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
  },
  percentageRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 6,
  },
  percentageText: {
    fontWeight: "600",
  },
  overBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: SpotifyColors.danger,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  overBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
    lineHeight: 14,
  },
  limitAmountsRow: {
    flexDirection: "row",
    gap: 8,
  },
  amountBlock: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 8,
    padding: 8,
  },
  amountBlockRight: {
    alignItems: "flex-end",
  },
  amountLabel: {
    color: SpotifyColors.textSecondary,
    marginBottom: 2,
  },
  amountValue: {
    fontWeight: "700",
  },
  limitNotes: {
    marginTop: 8,
    color: SpotifyColors.textSecondary,
    fontStyle: "italic",
  },

  // Notes
  notesText: {
    lineHeight: 22,
  },
});
