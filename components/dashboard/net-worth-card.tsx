import { GlassCard } from "@/components/glass-card";
import { formatAmount } from "@/lib/format-currency";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, View } from "react-native";
import { Card, Text, useTheme } from "react-native-paper";

export interface CurrencyBalance {
  symbol: string;
  code: string;
  total: number;
}

export interface NetWorthCardProps {
  currencyBalances: CurrencyBalance[];
  balanceVisible: boolean;
  toggleBalanceVisibility: () => void;
  /** Optional card title (default: "Total Assets") */
  title?: string;
}

export function NetWorthCard({
  currencyBalances,
  balanceVisible,
  toggleBalanceVisibility,
  title = "Total Assets",
}: NetWorthCardProps) {
  const theme = useTheme();

  return (
    <GlassCard variant="primary" style={styles.card} mode="outlined">
      <Card.Content>
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <MaterialCommunityIcons
              name="wallet"
              size={24}
              color={theme.colors.primary}
            />
            <Text variant="labelLarge" style={styles.label}>
              {title}
            </Text>
          </View>
          <MaterialCommunityIcons
            name={balanceVisible ? "eye" : "eye-off"}
            size={24}
            color={theme.colors.primary}
            onPress={toggleBalanceVisibility}
            style={styles.eyeIcon}
          />
        </View>
        {currencyBalances.length === 0 ? (
          <Text variant="displaySmall" style={styles.value}>
            No accounts
          </Text>
        ) : currencyBalances.length === 1 ? (
          <Text variant="displayLarge" style={styles.value}>
            {currencyBalances[0].symbol}{" "}
            {formatAmount(currencyBalances[0].total)}
          </Text>
        ) : (
          <View style={styles.multiCurrencyContainer}>
            {currencyBalances.map((currency, index) => (
              <Text
                key={currency.code}
                variant="displaySmall"
                style={[styles.value, index > 0 && styles.additionalCurrency]}
              >
                {currency.symbol}{" "}
                {balanceVisible ? formatAmount(currency.total) : "••••••"}
              </Text>
            ))}
          </View>
        )}
      </Card.Content>
    </GlassCard>
  );
}

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
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  label: {
    opacity: 0.8,
    letterSpacing: 0.5,
  },
  eyeIcon: {
    padding: 4,
  },
  value: {
    fontWeight: "bold",
    letterSpacing: -1,
  },
  multiCurrencyContainer: {
    gap: 8,
  },
  additionalCurrency: {
    fontSize: 32,
  },
});
