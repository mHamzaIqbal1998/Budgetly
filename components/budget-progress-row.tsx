import { SpotifyColors } from "@/constants/spotify-theme";
import { formatAmount } from "@/lib/format-currency";
import { useStore } from "@/lib/store";
import { Budget } from "@/types";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, View } from "react-native";
import { Text, useTheme } from "react-native-paper";

export interface BudgetProgressRowProps {
  budget: Budget;
  /** Optional period label (e.g. "This month") - spent data is already for the period used in the API request */
  periodLabel?: string;
  /** Hide bottom border (e.g. for last item in list) */
  hideBorder?: boolean;
}

function getSpentForCurrency(
  budget: Budget
): { spent: number; symbol: string; code: string } | null {
  const spentList = budget.attributes.spent;
  if (!spentList?.length) return null;

  const currencyCode =
    budget.attributes.currency_code ??
    budget.attributes.primary_currency_code ??
    spentList[0]?.currency_code;
  const entry = spentList.find((s) => s.currency_code === currencyCode);
  if (!entry) return null;
  const sum = parseFloat(entry.sum);
  return {
    spent: Math.abs(sum),
    symbol: entry.currency_symbol ?? entry.currency_code,
    code: entry.currency_code,
  };
}

function getBudgetTotal(budget: Budget): number {
  const amount =
    budget.attributes.auto_budget_amount ??
    budget.attributes.pc_auto_budget_amount;
  if (!amount) return 0;
  return parseFloat(amount);
}

const PERIOD_LABELS: Record<
  NonNullable<Budget["attributes"]["auto_budget_period"]>,
  string
> = {
  daily: "Today",
  weekly: "This week",
  monthly: "This month",
  quarterly: "This quarter",
  half_year: "This half year",
  yearly: "This year",
};

function getPeriodLabelFromBudget(budget: Budget): string {
  const period = budget.attributes.auto_budget_period;
  return (period && PERIOD_LABELS[period]) || "This period";
}

export function BudgetProgressRow({
  budget,
  periodLabel,
  hideBorder,
}: BudgetProgressRowProps) {
  const theme = useTheme();
  const { balanceVisible } = useStore();
  const totalBudget = getBudgetTotal(budget);
  const spentInfo = getSpentForCurrency(budget);
  const spent = spentInfo?.spent ?? 0;

  const progressRatio = totalBudget > 0 ? spent / totalBudget : 0;
  const progress = totalBudget > 0 ? Math.min(progressRatio, 1) : 0;
  const fillColor =
    progressRatio >= 1
      ? SpotifyColors.danger
      : progressRatio > 0.5
        ? SpotifyColors.orange
        : SpotifyColors.green;

  const symbol =
    spentInfo?.symbol ??
    budget.attributes.currency_symbol ??
    budget.attributes.primary_currency_symbol ??
    "";

  return (
    <View style={[styles.wrapper, hideBorder && styles.wrapperNoBorder]}>
      <View style={styles.headerRow}>
        <View style={styles.nameRow}>
          <MaterialCommunityIcons
            name={budget.attributes.active ? "wallet" : "wallet-outline"}
            size={20}
            color={
              budget.attributes.active
                ? theme.colors.primary
                : theme.colors.onSurfaceVariant
            }
            style={styles.icon}
          />
          <Text
            variant="bodyLarge"
            style={[styles.name, { color: theme.colors.onSurface }]}
            numberOfLines={1}
          >
            {budget.attributes.name}
          </Text>
        </View>
        {(spent > 0 || totalBudget > 0) && (
          <Text
            variant="bodySmall"
            style={[styles.amounts, { color: theme.colors.onSurfaceVariant }]}
            numberOfLines={1}
          >
            {symbol} {balanceVisible ? formatAmount(spent) : "••••••"}
            {totalBudget > 0
              ? ` / ${symbol} ${balanceVisible ? formatAmount(totalBudget) : "••••••"}`
              : spent > 0
                ? " (no limit)"
                : ""}
          </Text>
        )}
      </View>
      {totalBudget > 0 ? (
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
      ) : spent > 0 ? (
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              { width: "100%", backgroundColor: SpotifyColors.orange },
            ]}
          />
        </View>
      ) : null}
      {(periodLabel ?? getPeriodLabelFromBudget(budget)) && (
        <Text variant="labelSmall" style={styles.periodLabel}>
          {periodLabel ?? getPeriodLabelFromBudget(budget)}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.12)",
    gap: 6,
  },
  wrapperNoBorder: {
    borderBottomWidth: 0,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    minWidth: 0,
  },
  icon: {
    marginRight: 8,
  },
  name: {
    flex: 1,
  },
  amounts: {
    flexShrink: 0,
    opacity: 0.9,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
  },
  periodLabel: {
    opacity: 0.6,
  },
});
