import { BudgetProgressRow } from "@/components/budget-progress-row";
import { GlassCard } from "@/components/glass-card";
import { Budget } from "@/types";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { TouchableOpacity, View } from "react-native";
import { Card, Text, useTheme } from "react-native-paper";

export interface BudgetStatusCardProps {
  budgets: Budget[] | undefined;
  isLoading: boolean;
}

const MAX_VISIBLE = 5;

export function BudgetStatusCard({
  budgets,
  isLoading,
}: BudgetStatusCardProps) {
  const theme = useTheme();
  const router = useRouter();
  const visibleBudgets = (budgets ?? []).slice(0, MAX_VISIBLE);
  const hasMore = (budgets?.length ?? 0) > MAX_VISIBLE;

  return (
    <GlassCard variant="elevated" style={styles.card}>
      <Card.Title
        title="Budget Status"
        left={(props) => (
          <MaterialCommunityIcons
            name="wallet"
            {...props}
            color={theme.colors.primary}
          />
        )}
        titleStyle={{ color: theme.colors.onSurface }}
      />
      <Card.Content>
        {isLoading ? (
          <Text>Loading budgets...</Text>
        ) : !budgets?.length ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons
              name="wallet-plus"
              size={48}
              color={theme.colors.onSurfaceVariant}
            />
            <Text variant="bodyLarge" style={styles.emptyTitle}>
              No budgets yet
            </Text>
            <Text variant="bodySmall" style={styles.emptySubtitle}>
              Create your first budget to start tracking expenses
            </Text>
          </View>
        ) : (
          <>
            {visibleBudgets.map((budget, index, array) => {
              const isLastItem = index === array.length - 1;
              const hideBorder =
                (budgets?.length ?? 0) <= MAX_VISIBLE && isLastItem;
              return (
                <BudgetProgressRow
                  key={budget.id}
                  budget={budget}
                  hideBorder={hideBorder}
                />
              );
            })}
            {hasMore && (
              <TouchableOpacity
                onPress={() => router.push("/(drawer)/budgets")}
                style={styles.showMoreButton}
              >
                <Text
                  variant="bodyMedium"
                  style={[styles.showMoreText, { color: theme.colors.primary }]}
                >
                  Show more
                </Text>
                <MaterialCommunityIcons
                  name="chevron-right"
                  size={20}
                  color={theme.colors.primary}
                />
              </TouchableOpacity>
            )}
          </>
        )}
      </Card.Content>
    </GlassCard>
  );
}

const styles = {
  card: { marginBottom: 16 },
  emptyState: {
    alignItems: "center" as const,
    paddingVertical: 32,
  },
  emptyTitle: { marginTop: 8 },
  emptySubtitle: { opacity: 0.6, marginTop: 4 },
  showMoreButton: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingVertical: 12,
    marginTop: 8,
    gap: 4,
  },
  showMoreText: { fontWeight: "600" as const },
};
