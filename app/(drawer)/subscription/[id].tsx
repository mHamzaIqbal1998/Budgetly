// Subscription Detail Screen – read-only view of a single subscription (bill)
import { GlassCard } from "@/components/glass-card";
import { SpotifyColors } from "@/constants/spotify-theme";
import { apiClient } from "@/lib/api-client";
import { formatAmount } from "@/lib/format-currency";
import { useStore } from "@/lib/store";
import type { AllBillsResponse } from "@/types";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import {
  useLocalSearchParams,
  useNavigation,
  useRouter,
  type Href,
} from "expo-router";
import { useCallback, useEffect, useMemo } from "react";
import {
  ActivityIndicator,
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

const SUBSCRIPTIONS_ROUTE = "/(drawer)/subscriptions" as Href;

const FREQ_LABELS: Record<string, string> = {
  weekly: "Weekly",
  monthly: "Monthly",
  quarterly: "Quarterly",
  "half-year": "Half-yearly",
  yearly: "Yearly",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, {
      weekday: "short",
      day: "numeric",
      month: "long",
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

function formatShortDate(iso: string): string {
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
// Main Screen
// ---------------------------------------------------------------------------

export default function SubscriptionDetailScreen() {
  const theme = useTheme();
  const router = useRouter();
  const navigation = useNavigation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const balanceVisible = useStore(selectBalanceVisible);

  // Calculate date range: 6 months back from today
  const dateRange = useMemo(() => {
    const now = new Date();
    const end = now.toISOString().split("T")[0];
    const start = new Date(now);
    start.setMonth(start.getMonth() - 6);
    return { start: start.toISOString().split("T")[0], end };
  }, []);

  // Fetch subscription by ID
  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ["subscription", id],
    queryFn: () => apiClient.getBill(id!, dateRange.start, dateRange.end),
    enabled: !!id,
  });

  const bill: AllBillsResponse | undefined = data?.data;
  const attrs = bill?.attributes;

  // Navigation
  const goBack = useCallback(() => {
    router.replace(SUBSCRIPTIONS_ROUTE);
  }, [router]);

  useEffect(() => {
    navigation.setOptions({
      title: attrs?.name || "Subscription",
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
  }, [navigation, attrs?.name, goBack, theme.colors.onSurface]);

  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      goBack();
      return true;
    });
    return () => sub.remove();
  }, [goBack]);

  // Derived
  const onSurfaceVariantColor = theme.colors.onSurfaceVariant;

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
        <Text variant="bodyLarge">Invalid subscription.</Text>
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
          Loading subscription...
        </Text>
      </View>
    );
  }

  if (isError || !bill || !attrs) {
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
          Could not load subscription details.
        </Text>
      </View>
    );
  }

  // -----------------------------------------------------------------------
  // Data derivations
  // -----------------------------------------------------------------------

  const amountMin = parseFloat(attrs.amount_min) || 0;
  const amountMax = parseFloat(attrs.amount_max) || 0;
  const amountAvg = parseFloat(attrs.amount_avg) || 0;
  const currencySymbol = attrs.currency_symbol || "$";
  const decimals = attrs.currency_decimal_places ?? 2;
  const freqLabel = FREQ_LABELS[attrs.repeat_freq] || attrs.repeat_freq;
  const hasNotes = attrs.notes && attrs.notes.trim().length > 0;
  const paidDates = attrs.paid_dates ?? [];
  const payDates = attrs.pay_dates ?? [];

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
            onRefresh={refetch}
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
              name="repeat"
              size={40}
              color={theme.colors.primary}
            />
          </View>
          <Text
            variant="headlineMedium"
            style={[styles.heroName, { color: theme.colors.onSurface }]}
          >
            {attrs.name}
          </Text>

          <View style={styles.heroBadges}>
            <Chip
              compact
              style={[
                styles.statusChip,
                {
                  backgroundColor: attrs.active
                    ? theme.colors.primary + "20"
                    : theme.colors.error + "20",
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
              {freqLabel}
            </Chip>
          </View>
        </View>

        {/* ---- Amount Card ---- */}
        <GlassCard variant="elevated" style={styles.sectionCard}>
          <Card.Title
            title="Amount"
            left={() => (
              <MaterialCommunityIcons
                name="cash"
                size={24}
                color={theme.colors.primary}
              />
            )}
          />
          <Card.Content>
            <View style={styles.amountsRow}>
              <View style={styles.amountBlock}>
                <Text variant="labelSmall" style={styles.amountLabel}>
                  Min
                </Text>
                <Text
                  variant="titleSmall"
                  style={[styles.amountValue, { color: theme.colors.error }]}
                >
                  {currencySymbol}{" "}
                  {balanceVisible
                    ? formatAmount(amountMin, decimals)
                    : "••••••"}
                </Text>
              </View>
              <View style={styles.amountBlock}>
                <Text variant="labelSmall" style={styles.amountLabel}>
                  Avg
                </Text>
                <Text
                  variant="titleSmall"
                  style={[styles.amountValue, { color: SpotifyColors.orange }]}
                >
                  {currencySymbol}{" "}
                  {balanceVisible
                    ? formatAmount(amountAvg, decimals)
                    : "••••••"}
                </Text>
              </View>
              <View style={[styles.amountBlock, styles.amountBlockRight]}>
                <Text variant="labelSmall" style={styles.amountLabel}>
                  Max
                </Text>
                <Text
                  variant="titleSmall"
                  style={[styles.amountValue, { color: theme.colors.error }]}
                >
                  {currencySymbol}{" "}
                  {balanceVisible
                    ? formatAmount(amountMax, decimals)
                    : "••••••"}
                </Text>
              </View>
            </View>
            <DetailRow
              label="Currency"
              value={`${attrs.currency_name || ""} (${attrs.currency_code || ""})`}
              icon="currency-usd"
              onSurfaceVariantColor={onSurfaceVariantColor}
            />
          </Card.Content>
        </GlassCard>

        {/* ---- Schedule Card ---- */}
        <GlassCard variant="elevated" style={styles.sectionCard}>
          <Card.Title
            title="Schedule"
            left={() => (
              <MaterialCommunityIcons
                name="calendar-clock"
                size={24}
                color={theme.colors.primary}
              />
            )}
          />
          <Card.Content>
            <DetailRow
              label="Start Date"
              value={attrs.date ? formatDate(attrs.date) : undefined}
              icon="calendar-start"
              onSurfaceVariantColor={onSurfaceVariantColor}
            />
            <DetailRow
              label="End Date"
              value={attrs.end_date ? formatDate(attrs.end_date) : undefined}
              icon="calendar-end"
              onSurfaceVariantColor={onSurfaceVariantColor}
            />
            <DetailRow
              label="Extension Date"
              value={
                attrs.extension_date
                  ? formatDate(attrs.extension_date)
                  : undefined
              }
              icon="calendar-edit"
              onSurfaceVariantColor={onSurfaceVariantColor}
            />
            <DetailRow
              label="Frequency"
              value={freqLabel}
              icon="repeat"
              onSurfaceVariantColor={onSurfaceVariantColor}
            />
            {attrs.skip > 0 && (
              <DetailRow
                label="Skip"
                value={`Every ${attrs.skip + 1} periods`}
                icon="debug-step-over"
                onSurfaceVariantColor={onSurfaceVariantColor}
              />
            )}
            <DetailRow
              label="Next Due"
              value={
                attrs.next_expected_match
                  ? formatDate(attrs.next_expected_match)
                  : undefined
              }
              icon="calendar-alert"
              valueColor={theme.colors.primary}
              onSurfaceVariantColor={onSurfaceVariantColor}
            />
            {attrs.next_expected_match_diff && (
              <DetailRow
                label="Due In"
                value={attrs.next_expected_match_diff}
                icon="clock-outline"
                valueColor={theme.colors.primary}
                onSurfaceVariantColor={onSurfaceVariantColor}
              />
            )}
          </Card.Content>
        </GlassCard>

        {/* ---- Recent Payments Card ---- */}
        {paidDates.length > 0 && (
          <GlassCard variant="elevated" style={styles.sectionCard}>
            <Card.Title
              title="Recent Payments"
              left={() => (
                <MaterialCommunityIcons
                  name="history"
                  size={24}
                  color={theme.colors.primary}
                />
              )}
            />
            <Card.Content>
              {paidDates.map((pd, idx) => (
                <View key={`pd-${idx}`} style={styles.paymentRow}>
                  <View style={styles.paymentLeft}>
                    <MaterialCommunityIcons
                      name="check-circle"
                      size={18}
                      color={SpotifyColors.green}
                      style={styles.paymentIcon}
                    />
                    <Text variant="bodyMedium">{formatShortDate(pd.date)}</Text>
                  </View>
                  <Text
                    variant="bodyMedium"
                    style={[
                      styles.paymentAmount,
                      { color: theme.colors.error },
                    ]}
                  >
                    {pd.currency_symbol || currencySymbol}{" "}
                    {balanceVisible
                      ? formatAmount(
                          parseFloat(pd.amount) || 0,
                          pd.currency_decimal_places ?? decimals
                        )
                      : "••••••"}
                  </Text>
                </View>
              ))}
            </Card.Content>
          </GlassCard>
        )}

        {/* ---- Upcoming Payments Card ---- */}
        {payDates.length > 0 && (
          <GlassCard variant="elevated" style={styles.sectionCard}>
            <Card.Title
              title="Upcoming Payments"
              left={() => (
                <MaterialCommunityIcons
                  name="calendar-check"
                  size={24}
                  color={theme.colors.primary}
                />
              )}
            />
            <Card.Content>
              {payDates.slice(0, 6).map((dateStr, idx) => (
                <View key={`pay-${idx}`} style={styles.paymentRow}>
                  <View style={styles.paymentLeft}>
                    <MaterialCommunityIcons
                      name="calendar-blank"
                      size={18}
                      color={onSurfaceVariantColor}
                      style={styles.paymentIcon}
                    />
                    <Text variant="bodyMedium">{formatShortDate(dateStr)}</Text>
                  </View>
                </View>
              ))}
            </Card.Content>
          </GlassCard>
        )}

        {/* ---- Group ---- */}
        {attrs.object_group_title && (
          <GlassCard variant="elevated" style={styles.sectionCard}>
            <Card.Title
              title="Group"
              left={() => (
                <MaterialCommunityIcons
                  name="folder-outline"
                  size={24}
                  color={theme.colors.primary}
                />
              )}
            />
            <Card.Content>
              <DetailRow
                label="Group"
                value={attrs.object_group_title}
                icon="folder"
                onSurfaceVariantColor={onSurfaceVariantColor}
              />
            </Card.Content>
          </GlassCard>
        )}

        {/* ---- Notes ---- */}
        {hasNotes && (
          <GlassCard variant="elevated" style={styles.sectionCard}>
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
                {attrs.notes}
              </Text>
            </Card.Content>
          </GlassCard>
        )}

        {/* ---- Metadata ---- */}
        <GlassCard variant="elevated" style={styles.sectionCard}>
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
              value={formatDateTime(attrs.created_at)}
              icon="clock-plus-outline"
              onSurfaceVariantColor={onSurfaceVariantColor}
            />
            <DetailRow
              label="Updated"
              value={formatDateTime(attrs.updated_at)}
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

  // Cards
  sectionCard: {
    marginBottom: 16,
  },

  // Detail Row
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
    maxWidth: "50%",
  },

  // Amount row
  amountsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "rgba(120, 120, 120, 0.06)",
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  amountBlock: {
    flex: 1,
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

  // Payment rows
  paymentRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  paymentLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  paymentIcon: {
    marginRight: 8,
  },
  paymentAmount: {
    fontWeight: "600",
  },

  // Notes
  notesText: {
    opacity: 0.8,
    lineHeight: 22,
  },
});
