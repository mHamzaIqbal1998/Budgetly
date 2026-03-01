// Category Detail Screen – view of a single category with spending info
import { GlassCard } from "@/components/glass-card";
import { SpotifyColors } from "@/constants/spotify-theme";
import { apiClient } from "@/lib/api-client";
import { formatAmount } from "@/lib/format-currency";
import { useStore } from "@/lib/store";
import {
  getCurrentMonthStartEndDate,
  getPreviousMonthStartEndDate,
} from "@/lib/utils";
import type { ArrayEntryWithCurrencyAndSum, CategoryRead } from "@/types";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
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
import { Card, Text, useTheme } from "react-native-paper";

// ---------------------------------------------------------------------------
// Zustand selector
// ---------------------------------------------------------------------------

const selectBalanceVisible = (state: { balanceVisible: boolean }) =>
  state.balanceVisible;

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CATEGORIES_ROUTE = "/(drawer)/categories";

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

function calculateTotal(
  entries: ArrayEntryWithCurrencyAndSum[] | null
): number {
  if (!entries || entries.length === 0) return 0;
  return entries.reduce(
    (sum, entry) => sum + Math.abs(parseFloat(entry.sum) || 0),
    0
  );
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
// SpendingCard
// ---------------------------------------------------------------------------

interface SpendingCardProps {
  title: string;
  dateRange: { startDateString: string; endDate: string };
  spent: ArrayEntryWithCurrencyAndSum[] | null;
  earned: ArrayEntryWithCurrencyAndSum[] | null;
  transferred: ArrayEntryWithCurrencyAndSum[] | null;
  balanceVisible: boolean;
  primaryColor: string;
  errorColor: string;
}

function SpendingCard({
  title,
  dateRange,
  spent,
  earned,
  transferred,
  balanceVisible,
  primaryColor,
  errorColor,
}: SpendingCardProps) {
  const totalSpent = calculateTotal(spent);
  const totalEarned = calculateTotal(earned);
  const totalTransferred = calculateTotal(transferred);

  // Get primary currency info from the first entry if available
  const primaryEntry = spent?.[0] || earned?.[0] || transferred?.[0];
  const currencySymbol = primaryEntry?.currency_symbol || "$";
  const decimalPlaces = primaryEntry?.currency_decimal_places ?? 2;

  const hasActivity = totalSpent > 0 || totalEarned > 0 || totalTransferred > 0;

  return (
    <GlassCard variant="elevated" style={styles.card}>
      <Card.Title
        title={title}
        subtitle={formatDateRange(dateRange.startDateString, dateRange.endDate)}
        left={() => (
          <MaterialCommunityIcons
            name="chart-bar"
            size={24}
            color={primaryColor}
          />
        )}
      />
      <Card.Content>
        {!hasActivity && (
          <View style={styles.emptyActivityRow}>
            <MaterialCommunityIcons
              name="check-circle-outline"
              size={16}
              color={SpotifyColors.textSecondary}
            />
            <Text variant="bodySmall" style={styles.emptyActivityText}>
              No activity in this period
            </Text>
          </View>
        )}

        {totalSpent > 0 && (
          <View style={styles.amountRow}>
            <View style={styles.amountLabelWrap}>
              <MaterialCommunityIcons
                name="arrow-up-bold"
                size={16}
                color={errorColor}
              />
              <Text variant="bodyMedium" style={styles.amountLabel}>
                Spent
              </Text>
            </View>
            <Text
              variant="titleSmall"
              style={[styles.amountValue, { color: errorColor }]}
            >
              {currencySymbol}{" "}
              {balanceVisible
                ? formatAmount(totalSpent, decimalPlaces)
                : "••••••"}
            </Text>
          </View>
        )}

        {totalEarned > 0 && (
          <View style={styles.amountRow}>
            <View style={styles.amountLabelWrap}>
              <MaterialCommunityIcons
                name="arrow-down-bold"
                size={16}
                color={primaryColor}
              />
              <Text variant="bodyMedium" style={styles.amountLabel}>
                Earned
              </Text>
            </View>
            <Text
              variant="titleSmall"
              style={[styles.amountValue, { color: primaryColor }]}
            >
              {currencySymbol}{" "}
              {balanceVisible
                ? formatAmount(totalEarned, decimalPlaces)
                : "••••••"}
            </Text>
          </View>
        )}

        {totalTransferred > 0 && (
          <View style={styles.amountRow}>
            <View style={styles.amountLabelWrap}>
              <MaterialCommunityIcons
                name="swap-horizontal"
                size={16}
                color="#64B5F6"
              />
              <Text variant="bodyMedium" style={styles.amountLabel}>
                Transferred
              </Text>
            </View>
            <Text
              variant="titleSmall"
              style={[styles.amountValue, { color: "#64B5F6" }]}
            >
              {currencySymbol}{" "}
              {balanceVisible
                ? formatAmount(totalTransferred, decimalPlaces)
                : "••••••"}
            </Text>
          </View>
        )}
      </Card.Content>
    </GlassCard>
  );
}

// ---------------------------------------------------------------------------
// Main Screen
// ---------------------------------------------------------------------------

export default function CategoryDetailScreen() {
  const theme = useTheme();
  const router = useRouter();
  const navigation = useNavigation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const balanceVisible = useStore(selectBalanceVisible);

  // Date ranges
  const currentMonthRange = useMemo(() => getCurrentMonthStartEndDate(), []);
  const previousMonthRange = useMemo(() => getPreviousMonthStartEndDate(), []);

  // Fetch category details for current month
  const {
    data: currentMonthData,
    isLoading: currentLoading,
    isError: currentError,
    refetch: refetchCurrent,
    isRefetching: currentRefetching,
  } = useQuery({
    queryKey: [
      "category-detail",
      id,
      currentMonthRange.startDateString,
      currentMonthRange.endDate,
    ],
    queryFn: () =>
      apiClient.getCategory(
        id!,
        currentMonthRange.startDateString,
        currentMonthRange.endDate
      ),
    enabled: !!id,
  });

  // Fetch category details for previous month
  const {
    data: previousMonthData,
    isLoading: previousLoading,
    refetch: refetchPrevious,
    isRefetching: previousRefetching,
  } = useQuery({
    queryKey: [
      "category-detail",
      id,
      previousMonthRange.startDateString,
      previousMonthRange.endDate,
    ],
    queryFn: () =>
      apiClient.getCategory(
        id!,
        previousMonthRange.startDateString,
        previousMonthRange.endDate
      ),
    enabled: !!id,
  });

  const category: CategoryRead | undefined = currentMonthData?.data;
  const isLoading = currentLoading || previousLoading;
  const isRefetching = currentRefetching || previousRefetching;
  const isError = currentError;

  // Navigation
  const goBack = useCallback(() => {
    router.replace(CATEGORIES_ROUTE);
  }, [router]);

  useEffect(() => {
    navigation.setOptions({
      title: category?.attributes?.name || "Category",
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
  }, [navigation, category?.attributes?.name, goBack, theme.colors.onSurface]);

  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      goBack();
      return true;
    });
    return () => sub.remove();
  }, [goBack]);

  // Refresh
  const handleRefresh = useCallback(() => {
    refetchCurrent();
    refetchPrevious();
  }, [refetchCurrent, refetchPrevious]);

  // Derived
  const attrs = category?.attributes;
  const onSurfaceVariantColor = theme.colors.onSurfaceVariant;
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
        <Text variant="bodyLarge">Invalid category.</Text>
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
          Loading category...
        </Text>
      </View>
    );
  }

  if (isError || !category) {
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
          Could not load category details.
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
              name="shape"
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
          <Text
            variant="bodyMedium"
            style={{ color: onSurfaceVariantColor, marginTop: 4 }}
          >
            {attrs!.primary_currency_name} ({attrs!.primary_currency_code})
          </Text>
        </View>

        {/* ---- Current Month Spending ---- */}
        <SpendingCard
          title="Current Month"
          dateRange={currentMonthRange}
          spent={attrs!.spent}
          earned={attrs!.earned}
          transferred={attrs!.transferred}
          balanceVisible={balanceVisible}
          primaryColor={theme.colors.primary}
          errorColor={theme.colors.error}
        />

        {/* ---- Previous Month Spending ---- */}
        <SpendingCard
          title="Previous Month"
          dateRange={previousMonthRange}
          spent={previousMonthData?.data?.attributes?.spent ?? null}
          earned={previousMonthData?.data?.attributes?.earned ?? null}
          transferred={previousMonthData?.data?.attributes?.transferred ?? null}
          balanceVisible={balanceVisible}
          primaryColor={theme.colors.primary}
          errorColor={theme.colors.error}
        />

        {/* ---- Details ---- */}
        <GlassCard variant="elevated" style={styles.card}>
          <Card.Title
            title="Details"
            left={() => (
              <MaterialCommunityIcons
                name="information-outline"
                size={24}
                color={theme.colors.primary}
              />
            )}
          />
          <Card.Content>
            <DetailRow
              label="Currency"
              value={`${attrs!.primary_currency_name} (${attrs!.primary_currency_code})`}
              icon="cash"
              onSurfaceVariantColor={onSurfaceVariantColor}
            />
            <DetailRow
              label="Symbol"
              value={attrs!.primary_currency_symbol}
              onSurfaceVariantColor={onSurfaceVariantColor}
            />
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

  // Spending
  emptyActivityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
  },
  emptyActivityText: {
    color: SpotifyColors.textSecondary,
  },
  amountRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
  },
  amountLabelWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  amountLabel: {
    opacity: 0.8,
  },
  amountValue: {
    fontWeight: "700",
  },

  // Notes
  notesText: {
    lineHeight: 22,
  },
});
