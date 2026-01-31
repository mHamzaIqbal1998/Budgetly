import { GlassCard } from "@/components/glass-card";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, View } from "react-native";
import { Card, Text, useTheme } from "react-native-paper";

export interface QuickInsightsCardProps {
  accountsCount: number;
  activeBudgetsCount: number;
  activeSubscriptionsCount: number;
}

export function QuickInsightsCard({
  accountsCount,
  activeBudgetsCount,
  activeSubscriptionsCount,
}: QuickInsightsCardProps) {
  const theme = useTheme();

  return (
    <GlassCard variant="elevated" style={styles.card}>
      <Card.Title
        title="Quick Insights"
        left={(props) => (
          <MaterialCommunityIcons
            name="lightbulb"
            {...props}
            color={theme.colors.primary}
          />
        )}
        titleStyle={{ color: theme.colors.onSurface }}
      />
      <Card.Content>
        <View style={styles.insightItem}>
          <MaterialCommunityIcons
            name="information"
            size={20}
            color={theme.colors.primary}
          />
          <Text variant="bodyMedium" style={styles.insightText}>
            You have {accountsCount} accounts connected
          </Text>
        </View>
        <View style={styles.insightItem}>
          <MaterialCommunityIcons
            name="chart-line"
            size={20}
            color={theme.colors.secondary}
          />
          <Text variant="bodyMedium" style={styles.insightText}>
            {activeBudgetsCount} active budgets tracking your spending
          </Text>
        </View>
        <View style={styles.insightItem}>
          <MaterialCommunityIcons
            name="repeat"
            size={20}
            color={theme.colors.secondary}
          />
          <Text variant="bodyMedium" style={styles.insightText}>
            {activeSubscriptionsCount} active subscription(s)
          </Text>
        </View>
      </Card.Content>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 16,
  },
  insightItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
  },
  insightText: {
    marginLeft: 8,
    flex: 1,
  },
});
