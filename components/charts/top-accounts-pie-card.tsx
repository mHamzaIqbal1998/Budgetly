import { GlassCard } from "@/components/glass-card";
import { MD3ChartColors } from "@/constants/spotify-theme";
import { Account } from "@/types";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { Card, Text, useTheme } from "react-native-paper";
import { Pie, PolarChart } from "victory-native";

const CHART_SLICE_COLORS = MD3ChartColors;

const MAX_VISIBLE_ACCOUNTS = 4;

/** Minimum slice angle in degrees so tiny percentages (e.g. 0.2%, 0%) stay visible */
const MIN_SLICE_ANGLE_DEGREES = 4;
const MIN_SLICE_FRACTION = MIN_SLICE_ANGLE_DEGREES / 360;

export interface TopAccountsPieCardProps {
  accounts: Account[];
  type: string;
}

interface ChartDatum {
  label: string;
  value: number;
  color: string;
}

/** Chart datum with display value (ensures minimum visible slice); legend uses original value */
interface ChartDisplayDatum extends ChartDatum {
  displayValue: number;
}

function processAccounts(accounts: Account[]): ChartDatum[] {
  if (!accounts?.length) return [];

  const withBalance = accounts
    .map((acc) => ({
      name: acc.attributes.name,
      value: Math.abs(parseFloat(acc.attributes.current_balance)),
    }))
    .filter((a) => a.value >= 0);

  if (withBalance.length === 0) return [];

  const sorted = [...withBalance].sort((a, b) => b.value - a.value);

  if (sorted.length <= 5) {
    return sorted.map((item, i) => ({
      label: item.name,
      value: item.value,
      color: CHART_SLICE_COLORS[i % CHART_SLICE_COLORS.length],
    }));
  }

  const top = sorted.slice(0, MAX_VISIBLE_ACCOUNTS);
  const othersSum = sorted
    .slice(MAX_VISIBLE_ACCOUNTS)
    .reduce((sum, item) => sum + item.value, 0);

  const result: ChartDatum[] = top.map((item, i) => ({
    label: item.name,
    value: item.value,
    color: CHART_SLICE_COLORS[i % CHART_SLICE_COLORS.length],
  }));

  if (othersSum > 0) {
    result.push({
      label: "Others",
      value: othersSum,
      color: CHART_SLICE_COLORS[MAX_VISIBLE_ACCOUNTS],
    });
  }

  return result;
}

/** Applies minimum display value so small slices stay visible; normalizes so total is unchanged */
function withMinimumSliceVisibility(
  data: ChartDatum[],
  total: number
): ChartDisplayDatum[] {
  if (data.length === 0 || total <= 0) return [];
  const minDisplay = total * MIN_SLICE_FRACTION;
  const withMin = data.map((d) => ({
    ...d,
    displayValue: Math.max(d.value, minDisplay),
  }));
  const displaySum = withMin.reduce((s, d) => s + d.displayValue, 0);
  if (displaySum <= 0) return withMin;
  const scale = total / displaySum;
  return withMin.map((d) => ({
    ...d,
    displayValue: d.displayValue * scale,
  }));
}

export function TopAccountsPieCard({
  accounts,
  type,
}: TopAccountsPieCardProps) {
  const theme = useTheme();
  const chartData = useMemo(() => processAccounts(accounts), [accounts]);
  const total = useMemo(
    () => chartData.reduce((sum, d) => sum + d.value, 0),
    [chartData]
  );
  const chartDisplayData = useMemo(
    () => withMinimumSliceVisibility(chartData, total),
    [chartData, total]
  );

  if (!accounts?.length) {
    return (
      <GlassCard variant="primary" style={styles.card} mode="outlined">
        <Card.Content>
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <MaterialCommunityIcons
                name="chart-pie"
                size={24}
                color={theme.colors.primary}
              />
              <Text variant="labelLarge" style={styles.title}>
                Top Accounts
              </Text>
            </View>
          </View>
          <View style={styles.emptyContainer}>
            <Text variant="bodyMedium" style={styles.emptyText}>
              No accounts
            </Text>
          </View>
        </Card.Content>
      </GlassCard>
    );
  }

  if (chartData.length === 0) {
    return (
      <GlassCard variant="primary" style={styles.card} mode="outlined">
        <Card.Content>
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <MaterialCommunityIcons
                name="chart-pie"
                size={24}
                color={theme.colors.primary}
              />
              <Text variant="labelLarge" style={styles.title}>
                Top Accounts
              </Text>
            </View>
          </View>
          <View style={styles.emptyContainer}>
            <Text variant="bodyMedium" style={styles.emptyText}>
              No balance data
            </Text>
          </View>
        </Card.Content>
      </GlassCard>
    );
  }

  return (
    <GlassCard variant="primary" style={styles.card} mode="outlined">
      <Card.Content>
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <MaterialCommunityIcons
              name="chart-pie"
              size={24}
              color={theme.colors.primary}
            />
            <Text variant="labelLarge" style={styles.title}>
              Top {type} Accounts
            </Text>
          </View>
        </View>
        <View style={styles.content}>
          <View style={styles.chartWrapper}>
            <PolarChart
              data={chartDisplayData.map((d) => ({
                label: d.label,
                value: d.displayValue,
                color: d.color,
              }))}
              labelKey={"label" as const}
              valueKey={"value" as const}
              colorKey={"color" as const}
              containerStyle={styles.polarContainer}
            >
              <Pie.Chart innerRadius="50%" />
            </PolarChart>
          </View>
          <View style={styles.legend}>
            {chartData.map((d) => {
              const pct = total > 0 ? (d.value / total) * 100 : 0;
              return (
                <View key={d.label} style={styles.legendItem}>
                  <View
                    style={[styles.legendDot, { backgroundColor: d.color }]}
                  />
                  <Text
                    variant="bodySmall"
                    style={styles.legendLabel}
                    numberOfLines={1}
                  >
                    {d.label}
                  </Text>
                  <Text
                    variant="bodySmall"
                    style={[styles.legendPct, { color: theme.colors.primary }]}
                  >
                    {pct.toFixed(1)}%
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      </Card.Content>
    </GlassCard>
  );
}

const CHART_SIZE = 140;

const styles = StyleSheet.create({
  card: {
    marginBottom: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
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
  content: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  chartWrapper: {
    width: CHART_SIZE,
    height: CHART_SIZE,
  },
  polarContainer: {
    width: CHART_SIZE,
    height: CHART_SIZE,
  },
  legend: {
    flex: 1,
    gap: 8,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendLabel: {
    flex: 1,
    opacity: 0.9,
  },
  legendPct: {
    fontWeight: "600",
  },
  emptyContainer: {
    paddingVertical: 24,
    alignItems: "center",
  },
  emptyText: {
    opacity: 0.7,
  },
});
