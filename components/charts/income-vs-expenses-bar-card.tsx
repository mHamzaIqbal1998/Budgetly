import { GlassCard } from "@/components/glass-card";
import { hexToRgba } from "@/constants/spotify-theme";
import { formatAmount } from "@/lib/format-currency";
import { useStore } from "@/lib/store";
import { InsightTotalEntry } from "@/types";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { Card, Text, useTheme } from "react-native-paper";

// ─── Colors ────────────────────────────────────────────────────────────────
const INCOME_COLOR_DARK = "#66BB6A"; // Green 400
const INCOME_COLOR_LIGHT = "#43A047"; // Green 600
const EXPENSE_COLOR_DARK = "#EF5350"; // Red 400
const EXPENSE_COLOR_LIGHT = "#E53935"; // Red 600

// Short month names
const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

// ─── Types ─────────────────────────────────────────────────────────────────
interface MonthData {
  monthLabel: string;
  income: number;
  expense: number;
  currencyCode: string;
}

interface TooltipInfo {
  label: string;
  income: number;
  expense: number;
  currencyCode: string;
}

export interface IncomeVsExpensesBarCardProps {
  currentMonthIncome: InsightTotalEntry[] | undefined;
  currentMonthExpense: InsightTotalEntry[] | undefined;
  previousMonthIncome: InsightTotalEntry[] | undefined;
  previousMonthExpense: InsightTotalEntry[] | undefined;
  twoMonthsAgoIncome: InsightTotalEntry[] | undefined;
  twoMonthsAgoExpense: InsightTotalEntry[] | undefined;
  isLoading: boolean;
}

// ─── Build chart data grouped by currency ──────────────────────────────────
function buildChartData(
  currentIncome: InsightTotalEntry[] | undefined,
  currentExpense: InsightTotalEntry[] | undefined,
  previousIncome: InsightTotalEntry[] | undefined,
  previousExpense: InsightTotalEntry[] | undefined,
  twoMonthsAgoIncome: InsightTotalEntry[] | undefined,
  twoMonthsAgoExpense: InsightTotalEntry[] | undefined
): Map<string, MonthData[]> {
  const today = new Date();
  const currentMonthIdx = today.getMonth();
  const prevMonthIdx = (currentMonthIdx - 1 + 12) % 12;
  const twoMonthsAgoIdx = (currentMonthIdx - 2 + 12) % 12;

  const currentMonthLabel = MONTH_NAMES[currentMonthIdx];
  const prevMonthLabel = MONTH_NAMES[prevMonthIdx];
  const twoMonthsAgoLabel = MONTH_NAMES[twoMonthsAgoIdx];

  // Collect all currency codes across all responses
  const currencyCodes = new Set<string>();

  const addCodes = (entries?: InsightTotalEntry[]) => {
    entries?.forEach((e) => currencyCodes.add(e.currency_code));
  };
  addCodes(currentIncome);
  addCodes(currentExpense);
  addCodes(previousIncome);
  addCodes(previousExpense);
  addCodes(twoMonthsAgoIncome);
  addCodes(twoMonthsAgoExpense);

  // If no currencies found, add a default
  if (currencyCodes.size === 0) currencyCodes.add("USD");

  const result = new Map<string, MonthData[]>();

  const sumByCurrency = (
    entries: InsightTotalEntry[] | undefined,
    code: string
  ): number => {
    if (!entries) return 0;
    return entries
      .filter((e) => e.currency_code === code)
      .reduce((sum, e) => sum + Math.abs(e.difference_float), 0);
  };

  for (const code of currencyCodes) {
    const twoAgoIncome = sumByCurrency(twoMonthsAgoIncome, code);
    const twoAgoExpense = sumByCurrency(twoMonthsAgoExpense, code);
    const prevIncome = sumByCurrency(previousIncome, code);
    const prevExpense = sumByCurrency(previousExpense, code);
    const curIncome = sumByCurrency(currentIncome, code);
    const curExpense = sumByCurrency(currentExpense, code);

    // Only include currency if there is any data at all
    if (
      twoAgoIncome +
        twoAgoExpense +
        prevIncome +
        prevExpense +
        curIncome +
        curExpense ===
      0
    )
      continue;

    result.set(code, [
      {
        monthLabel: twoMonthsAgoLabel,
        income: twoAgoIncome,
        expense: twoAgoExpense,
        currencyCode: code,
      },
      {
        monthLabel: prevMonthLabel,
        income: prevIncome,
        expense: prevExpense,
        currencyCode: code,
      },
      {
        monthLabel: currentMonthLabel,
        income: curIncome,
        expense: curExpense,
        currencyCode: code,
      },
    ]);
  }

  return result;
}

// ─── Component ─────────────────────────────────────────────────────────────
export function IncomeVsExpensesBarCard({
  currentMonthIncome,
  currentMonthExpense,
  previousMonthIncome,
  previousMonthExpense,
  twoMonthsAgoIncome,
  twoMonthsAgoExpense,
  isLoading,
}: IncomeVsExpensesBarCardProps) {
  const theme = useTheme();
  const { balanceVisible } = useStore();
  const [activeTooltip, setActiveTooltip] = useState<TooltipInfo | null>(null);

  const isDark = theme.dark;
  const incomeColor = isDark ? INCOME_COLOR_DARK : INCOME_COLOR_LIGHT;
  const expenseColor = isDark ? EXPENSE_COLOR_DARK : EXPENSE_COLOR_LIGHT;

  const dataByCurrency = useMemo(
    () =>
      buildChartData(
        currentMonthIncome,
        currentMonthExpense,
        previousMonthIncome,
        previousMonthExpense,
        twoMonthsAgoIncome,
        twoMonthsAgoExpense
      ),
    [
      currentMonthIncome,
      currentMonthExpense,
      previousMonthIncome,
      previousMonthExpense,
      twoMonthsAgoIncome,
      twoMonthsAgoExpense,
    ]
  );

  const currencyCodes = useMemo(
    () => Array.from(dataByCurrency.keys()),
    [dataByCurrency]
  );

  const handleBarPress = (tooltip: TooltipInfo) => {
    setActiveTooltip((prev) =>
      prev?.label === tooltip.label &&
      prev?.currencyCode === tooltip.currencyCode
        ? null
        : tooltip
    );
  };

  // ── Header ─────────────────────────────────────────────────────────────
  const headerContent = (
    <View style={styles.header}>
      <View style={styles.titleRow}>
        <MaterialCommunityIcons
          name="chart-bar"
          size={24}
          color={theme.colors.primary}
        />
        <Text variant="labelLarge" style={styles.title}>
          Income vs Expenses
        </Text>
      </View>
    </View>
  );

  // ── Empty / Loading ────────────────────────────────────────────────────
  if (
    isLoading ||
    (!currentMonthIncome &&
      !currentMonthExpense &&
      !previousMonthIncome &&
      !previousMonthExpense &&
      !twoMonthsAgoIncome &&
      !twoMonthsAgoExpense)
  ) {
    return (
      <GlassCard variant="primary" style={styles.card} mode="outlined">
        <Card.Content>
          {headerContent}
          <View style={styles.emptyContainer}>
            <Text variant="bodyMedium" style={styles.emptyText}>
              {isLoading ? "Loading…" : "No data available"}
            </Text>
          </View>
        </Card.Content>
      </GlassCard>
    );
  }

  if (currencyCodes.length === 0) {
    return (
      <GlassCard variant="primary" style={styles.card} mode="outlined">
        <Card.Content>
          {headerContent}
          <View style={styles.emptyContainer}>
            <Text variant="bodyMedium" style={styles.emptyText}>
              No income or expense data
            </Text>
          </View>
        </Card.Content>
      </GlassCard>
    );
  }

  return (
    <GlassCard variant="primary" style={styles.card} mode="outlined">
      <Card.Content>
        {headerContent}

        {/* Legend */}
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View
              style={[styles.legendDot, { backgroundColor: incomeColor }]}
            />
            <Text variant="bodySmall" style={styles.legendLabel}>
              Income
            </Text>
          </View>
          <View style={styles.legendItem}>
            <View
              style={[styles.legendDot, { backgroundColor: expenseColor }]}
            />
            <Text variant="bodySmall" style={styles.legendLabel}>
              Expense
            </Text>
          </View>
        </View>

        {/* Tooltip */}
        {activeTooltip && (
          <View
            style={[
              styles.tooltipContainer,
              {
                backgroundColor: hexToRgba(
                  theme.colors.inverseSurface,
                  isDark ? 0.92 : 0.88
                ),
              },
            ]}
          >
            <Text
              variant="labelMedium"
              style={[
                styles.tooltipTitle,
                { color: theme.colors.inverseOnSurface },
              ]}
            >
              {activeTooltip.label} ({activeTooltip.currencyCode})
            </Text>
            <View style={styles.tooltipRow}>
              <View
                style={[styles.tooltipDot, { backgroundColor: incomeColor }]}
              />
              <Text
                variant="bodySmall"
                style={{ color: theme.colors.inverseOnSurface }}
              >
                Income:{" "}
                {balanceVisible ? formatAmount(activeTooltip.income) : "••••••"}
              </Text>
            </View>
            <View style={styles.tooltipRow}>
              <View
                style={[styles.tooltipDot, { backgroundColor: expenseColor }]}
              />
              <Text
                variant="bodySmall"
                style={{ color: theme.colors.inverseOnSurface }}
              >
                Expense:{" "}
                {balanceVisible
                  ? formatAmount(activeTooltip.expense)
                  : "••••••"}
              </Text>
            </View>
          </View>
        )}

        {/* Chart per currency */}
        {currencyCodes.map((code) => {
          const monthsData = dataByCurrency.get(code) ?? [];

          const maxValue = Math.max(
            ...monthsData.flatMap((m) => [m.income, m.expense]),
            1
          );

          return (
            <View key={code} style={styles.currencySection}>
              {currencyCodes.length > 1 && (
                <Text
                  variant="labelMedium"
                  style={[
                    styles.currencyLabel,
                    { color: theme.colors.primary },
                  ]}
                >
                  {code}
                </Text>
              )}

              {/* Custom rendered bars for better touchability */}
              <View style={styles.barsContainer}>
                {monthsData.map((m, monthIdx) => {
                  const maxBarHeight = CHART_HEIGHT - 24; // leave room for labels
                  const incomeHeight =
                    maxValue > 0
                      ? Math.max((m.income / maxValue) * maxBarHeight, 4)
                      : 4;
                  const expenseHeight =
                    maxValue > 0
                      ? Math.max((m.expense / maxValue) * maxBarHeight, 4)
                      : 4;

                  const isActive =
                    activeTooltip?.label === m.monthLabel &&
                    activeTooltip?.currencyCode === code;

                  return (
                    <TouchableOpacity
                      key={m.monthLabel}
                      activeOpacity={0.7}
                      onPress={() =>
                        handleBarPress({
                          label: m.monthLabel,
                          income: m.income,
                          expense: m.expense,
                          currencyCode: code,
                        })
                      }
                      style={styles.monthGroup}
                    >
                      <View style={styles.barsRow}>
                        {/* Income bar */}
                        <View
                          style={[
                            styles.bar,
                            {
                              height: incomeHeight,
                              backgroundColor: incomeColor,
                              opacity: isActive ? 1 : 0.85,
                              borderColor: isActive
                                ? theme.colors.onSurface
                                : "transparent",
                              borderWidth: isActive ? 1.5 : 0,
                            },
                          ]}
                        />
                        {/* Expense bar */}
                        <View
                          style={[
                            styles.bar,
                            {
                              height: expenseHeight,
                              backgroundColor: expenseColor,
                              opacity: isActive ? 1 : 0.85,
                              borderColor: isActive
                                ? theme.colors.onSurface
                                : "transparent",
                              borderWidth: isActive ? 1.5 : 0,
                            },
                          ]}
                        />
                      </View>
                      <Text
                        variant="labelSmall"
                        style={[
                          styles.monthLabel,
                          {
                            color: isActive
                              ? theme.colors.primary
                              : theme.colors.onSurfaceVariant,
                            fontWeight: isActive ? "700" : "500",
                          },
                        ]}
                      >
                        {m.monthLabel}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          );
        })}

        {/* Tap hint */}
        {!activeTooltip && (
          <Text
            variant="bodySmall"
            style={[styles.tapHint, { color: theme.colors.onSurfaceVariant }]}
          >
            Tap on bars to see amounts
          </Text>
        )}
      </Card.Content>
    </GlassCard>
  );
}

// ─── Constants & Styles ────────────────────────────────────────────────────
const CHART_HEIGHT = 160;
const BAR_WIDTH = 28;

const styles = StyleSheet.create({
  card: {
    marginBottom: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  title: {
    opacity: 0.9,
    letterSpacing: 0.5,
  },
  legend: {
    flexDirection: "row",
    gap: 20,
    marginBottom: 12,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendLabel: {
    opacity: 0.85,
  },
  emptyContainer: {
    paddingVertical: 24,
    alignItems: "center",
  },
  emptyText: {
    opacity: 0.7,
  },
  tooltipContainer: {
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 12,
    gap: 4,
  },
  tooltipTitle: {
    fontWeight: "700",
    marginBottom: 2,
  },
  tooltipRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  tooltipDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  currencySection: {
    marginBottom: 8,
  },
  currencyLabel: {
    fontWeight: "600",
    marginBottom: 8,
  },
  barsContainer: {
    flexDirection: "row",
    justifyContent: "space-evenly",
    alignItems: "flex-end",
    height: CHART_HEIGHT,
    paddingBottom: 24,
  },
  monthGroup: {
    alignItems: "center",
    flex: 1,
  },
  barsRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 6,
    flex: 1,
  },
  bar: {
    width: BAR_WIDTH,
    borderRadius: 6,
    minHeight: 4,
  },
  monthLabel: {
    marginTop: 6,
  },
  tapHint: {
    textAlign: "center",
    opacity: 0.6,
    marginTop: 4,
    fontStyle: "italic",
  },
});
