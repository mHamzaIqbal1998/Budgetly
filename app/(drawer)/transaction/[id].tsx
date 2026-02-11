// Transaction Detail Screen – read-only view of a single transaction
import { GlassCard } from "@/components/glass-card";
import { apiClient } from "@/lib/api-client";
import { formatAmount } from "@/lib/format-currency";
import { useStore } from "@/lib/store";
import type { AccountTransaction } from "@/types";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import {
  useLocalSearchParams,
  useNavigation,
  useRouter,
  type Href,
} from "expo-router";
import React, { useCallback, useEffect } from "react";
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
// Helpers
// ---------------------------------------------------------------------------

const TRANSACTIONS_ROUTE = "/(drawer)/transactions" as Href;

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

function getTransactionTypeLabel(type: string): string {
  const t = type?.toLowerCase();
  if (t === "withdrawal") return "Expense";
  if (t === "deposit") return "Income";
  if (t === "transfer") return "Transfer";
  if (t === "reconciliation") return "Reconciliation";
  if (t === "opening balance") return "Opening Balance";
  return type;
}

// ---------------------------------------------------------------------------
// DetailRow – reusable label/value row
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

export default function TransactionDetailScreen() {
  const theme = useTheme();
  const router = useRouter();
  const navigation = useNavigation();
  const { id, accountId, accountName } = useLocalSearchParams<{
    id: string;
    accountId?: string;
    accountName?: string;
  }>();
  const balanceVisible = useStore(selectBalanceVisible);

  // Fetch transaction by ID
  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ["transaction", id],
    queryFn: () => apiClient.getTransaction(id!),
    enabled: !!id,
  });

  const group = data?.data;
  const tx: AccountTransaction | undefined = group?.attributes.transactions[0];

  // Navigation – go back to account transactions if coming from account, otherwise to main transactions
  const goBack = useCallback(() => {
    if (accountId && accountName) {
      router.replace(
        `/(drawer)/transactions?accountId=${accountId}&accountName=${accountName}` as Href
      );
    } else {
      router.replace(TRANSACTIONS_ROUTE);
    }
  }, [router, accountId, accountName]);

  useEffect(() => {
    navigation.setOptions({
      title: tx?.description || "Transaction",
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
  }, [navigation, tx?.description, goBack, theme.colors.onSurface]);

  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      goBack();
      return true;
    });
    return () => sub.remove();
  }, [goBack]);

  // Derived values
  const amountColor = tx
    ? getTransactionTypeColor(tx.type, theme.colors.primary, theme.colors.error)
    : theme.colors.onSurface;
  const typeLower = tx?.type?.toLowerCase();
  const isIncoming = typeLower === "deposit" || typeLower === "revenue";
  const isTransfer = typeLower === "transfer";
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
        <Text variant="bodyLarge">Invalid transaction.</Text>
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
          Loading transaction...
        </Text>
      </View>
    );
  }

  if (isError || !tx) {
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
          Could not load transaction details.
        </Text>
      </View>
    );
  }

  // -----------------------------------------------------------------------
  // Data derivations
  // -----------------------------------------------------------------------

  const amount = parseFloat(tx.amount);
  const hasForeignAmount =
    tx.foreign_amount && parseFloat(tx.foreign_amount) !== 0;
  const hasCategoryOrBudget = tx.category_name || tx.budget_name;
  const hasTags = tx.tags && tx.tags.length > 0;
  const hasNotes = tx.notes && tx.notes.trim().length > 0;
  const hasSubscription = tx.subscription_name || tx.bill_name;
  const hasReferences =
    tx.internal_reference || tx.external_id || tx.external_url;
  const hasExtraDates =
    tx.book_date ||
    tx.due_date ||
    tx.payment_date ||
    tx.invoice_date ||
    tx.interest_date ||
    tx.process_date;

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
        {/* ---- Amount Hero ---- */}
        <View style={styles.heroSection}>
          <Text
            variant="displaySmall"
            style={[styles.heroAmount, { color: amountColor }]}
          >
            {isTransfer ? "" : isIncoming ? "+" : "-"}
            {tx.currency_symbol}{" "}
            {balanceVisible
              ? formatAmount(amount, tx.currency_decimal_places ?? 2)
              : "••••••"}
          </Text>

          {hasForeignAmount && (
            <Text
              variant="titleMedium"
              style={{ color: onSurfaceVariantColor, marginTop: 4 }}
            >
              {tx.foreign_currency_symbol}{" "}
              {balanceVisible
                ? formatAmount(
                    parseFloat(tx.foreign_amount!),
                    tx.foreign_currency_decimal_places ?? 2
                  )
                : "••••••"}{" "}
              {tx.foreign_currency_code}
            </Text>
          )}

          <Chip
            style={[styles.typeBadge, { backgroundColor: amountColor + "20" }]}
            textStyle={[styles.typeBadgeText, { color: amountColor }]}
            compact
          >
            {getTransactionTypeLabel(tx.type)}
          </Chip>

          <Text
            variant="bodyMedium"
            style={{ color: onSurfaceVariantColor, marginTop: 8 }}
          >
            {formatDate(tx.date)}
          </Text>
        </View>

        {/* ---- General Details ---- */}
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
              label="Description"
              value={tx.description}
              icon="text"
              onSurfaceVariantColor={onSurfaceVariantColor}
            />
            <DetailRow
              label="Date"
              value={formatDate(tx.date)}
              icon="calendar"
              onSurfaceVariantColor={onSurfaceVariantColor}
            />
            <DetailRow
              label="Currency"
              value={`${tx.currency_name} (${tx.currency_code})`}
              icon="cash"
              onSurfaceVariantColor={onSurfaceVariantColor}
            />
            {hasForeignAmount && (
              <DetailRow
                label="Foreign Currency"
                value={`${tx.foreign_currency_code}`}
                icon="cash-multiple"
                onSurfaceVariantColor={onSurfaceVariantColor}
              />
            )}
            <DetailRow
              label="Reconciled"
              value={tx.reconciled}
              icon="check-decagram"
              onSurfaceVariantColor={onSurfaceVariantColor}
            />
          </Card.Content>
        </GlassCard>

        {/* ---- Accounts ---- */}
        <GlassCard variant="elevated" style={styles.card}>
          <Card.Title
            title="Accounts"
            left={() => (
              <MaterialCommunityIcons
                name="bank-transfer"
                size={24}
                color={theme.colors.primary}
              />
            )}
          />
          <Card.Content>
            <DetailRow
              label="From"
              value={tx.source_name}
              icon="arrow-up-circle-outline"
              onSurfaceVariantColor={onSurfaceVariantColor}
            />
            <DetailRow
              label="From Type"
              value={tx.source_type}
              onSurfaceVariantColor={onSurfaceVariantColor}
            />
            {tx.source_iban ? (
              <DetailRow
                label="From IBAN"
                value={tx.source_iban}
                onSurfaceVariantColor={onSurfaceVariantColor}
              />
            ) : null}

            <Divider style={styles.sectionDivider} />

            <DetailRow
              label="To"
              value={tx.destination_name}
              icon="arrow-down-circle-outline"
              onSurfaceVariantColor={onSurfaceVariantColor}
            />
            <DetailRow
              label="To Type"
              value={tx.destination_type}
              onSurfaceVariantColor={onSurfaceVariantColor}
            />
            {tx.destination_iban ? (
              <DetailRow
                label="To IBAN"
                value={tx.destination_iban}
                onSurfaceVariantColor={onSurfaceVariantColor}
              />
            ) : null}
          </Card.Content>
        </GlassCard>

        {/* ---- Category & Budget ---- */}
        {(hasCategoryOrBudget || hasTags) && (
          <GlassCard variant="elevated" style={styles.card}>
            <Card.Title
              title="Categorization"
              left={() => (
                <MaterialCommunityIcons
                  name="tag-outline"
                  size={24}
                  color={theme.colors.primary}
                />
              )}
            />
            <Card.Content>
              {tx.category_name ? (
                <DetailRow
                  label="Category"
                  value={tx.category_name}
                  icon="shape-outline"
                  onSurfaceVariantColor={onSurfaceVariantColor}
                />
              ) : null}
              {tx.budget_name ? (
                <DetailRow
                  label="Budget"
                  value={tx.budget_name}
                  icon="wallet-outline"
                  onSurfaceVariantColor={onSurfaceVariantColor}
                />
              ) : null}
              {hasTags && (
                <View style={styles.tagsRow}>
                  <View style={styles.detailRowLeft}>
                    <MaterialCommunityIcons
                      name="tag-multiple"
                      size={18}
                      color={onSurfaceVariantColor}
                      style={styles.detailRowIcon}
                    />
                    <Text variant="bodyMedium" style={styles.detailRowLabel}>
                      Tags
                    </Text>
                  </View>
                  <View style={styles.tagsContainer}>
                    {tx.tags!.map((tag, i) => (
                      <Chip
                        key={`${tag}-${i}`}
                        compact
                        style={styles.tagChip}
                        textStyle={styles.tagChipText}
                      >
                        {tag}
                      </Chip>
                    ))}
                  </View>
                </View>
              )}
            </Card.Content>
          </GlassCard>
        )}

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
                {tx.notes}
              </Text>
            </Card.Content>
          </GlassCard>
        )}

        {/* ---- Subscription / Bill ---- */}
        {hasSubscription && (
          <GlassCard variant="elevated" style={styles.card}>
            <Card.Title
              title="Subscription"
              left={() => (
                <MaterialCommunityIcons
                  name="repeat"
                  size={24}
                  color={theme.colors.primary}
                />
              )}
            />
            <Card.Content>
              <DetailRow
                label="Subscription"
                value={tx.subscription_name || tx.bill_name}
                icon="repeat"
                onSurfaceVariantColor={onSurfaceVariantColor}
              />
            </Card.Content>
          </GlassCard>
        )}

        {/* ---- References ---- */}
        {hasReferences && (
          <GlassCard variant="elevated" style={styles.card}>
            <Card.Title
              title="References"
              left={() => (
                <MaterialCommunityIcons
                  name="link-variant"
                  size={24}
                  color={theme.colors.primary}
                />
              )}
            />
            <Card.Content>
              {tx.internal_reference ? (
                <DetailRow
                  label="Internal Ref"
                  value={tx.internal_reference}
                  icon="identifier"
                  onSurfaceVariantColor={onSurfaceVariantColor}
                />
              ) : null}
              {tx.external_id ? (
                <DetailRow
                  label="External ID"
                  value={tx.external_id}
                  icon="card-text-outline"
                  onSurfaceVariantColor={onSurfaceVariantColor}
                />
              ) : null}
              {tx.external_url ? (
                <DetailRow
                  label="External URL"
                  value={tx.external_url}
                  icon="open-in-new"
                  onSurfaceVariantColor={onSurfaceVariantColor}
                />
              ) : null}
            </Card.Content>
          </GlassCard>
        )}

        {/* ---- Additional Dates ---- */}
        {hasExtraDates && (
          <GlassCard variant="elevated" style={styles.card}>
            <Card.Title
              title="Additional Dates"
              left={() => (
                <MaterialCommunityIcons
                  name="calendar-range"
                  size={24}
                  color={theme.colors.primary}
                />
              )}
            />
            <Card.Content>
              {tx.book_date ? (
                <DetailRow
                  label="Book Date"
                  value={formatDateTime(tx.book_date)}
                  icon="calendar"
                  onSurfaceVariantColor={onSurfaceVariantColor}
                />
              ) : null}
              {tx.due_date ? (
                <DetailRow
                  label="Due Date"
                  value={formatDateTime(tx.due_date)}
                  icon="calendar-alert"
                  onSurfaceVariantColor={onSurfaceVariantColor}
                />
              ) : null}
              {tx.payment_date ? (
                <DetailRow
                  label="Payment Date"
                  value={formatDateTime(tx.payment_date)}
                  icon="calendar-check"
                  onSurfaceVariantColor={onSurfaceVariantColor}
                />
              ) : null}
              {tx.invoice_date ? (
                <DetailRow
                  label="Invoice Date"
                  value={formatDateTime(tx.invoice_date)}
                  icon="file-document-outline"
                  onSurfaceVariantColor={onSurfaceVariantColor}
                />
              ) : null}
              {tx.interest_date ? (
                <DetailRow
                  label="Interest Date"
                  value={formatDateTime(tx.interest_date)}
                  icon="percent-outline"
                  onSurfaceVariantColor={onSurfaceVariantColor}
                />
              ) : null}
              {tx.process_date ? (
                <DetailRow
                  label="Process Date"
                  value={formatDateTime(tx.process_date)}
                  icon="cog-outline"
                  onSurfaceVariantColor={onSurfaceVariantColor}
                />
              ) : null}
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
              value={formatDateTime(group!.attributes.created_at)}
              icon="clock-plus-outline"
              onSurfaceVariantColor={onSurfaceVariantColor}
            />
            <DetailRow
              label="Updated"
              value={formatDateTime(group!.attributes.updated_at)}
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
  heroSection: {
    alignItems: "center",
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  heroAmount: {
    fontWeight: "800",
    textAlign: "center",
  },
  typeBadge: {
    marginTop: 12,
  },
  typeBadgeText: {
    fontWeight: "600",
    fontSize: 13,
  },
  card: {
    marginBottom: 16,
  },
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
  sectionDivider: {
    marginVertical: 8,
  },
  tagsRow: {
    paddingVertical: 10,
  },
  tagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 8,
  },
  tagChip: {
    height: 28,
  },
  tagChipText: {
    fontSize: 12,
  },
  notesText: {
    lineHeight: 22,
    opacity: 0.9,
  },
});
