import { GlassCard } from "@/components/glass-card";
import { formatAmount } from "@/lib/format-currency";
import { Account } from "@/types";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { Card, Text, useTheme } from "react-native-paper";

export interface AccountsOverviewCardProps {
  accounts: Account[];
  isLoading: boolean;
  balanceVisible: boolean;
}

const MAX_VISIBLE = 5;

export function AccountsOverviewCard({
  accounts,
  isLoading,
  balanceVisible,
}: AccountsOverviewCardProps) {
  const theme = useTheme();
  const router = useRouter();
  const visibleAccounts = accounts.slice(0, MAX_VISIBLE);
  const hasMore = accounts.length > MAX_VISIBLE;

  return (
    <GlassCard variant="elevated" style={styles.card}>
      <Card.Title
        title="Accounts Overview"
        left={(props) => (
          <MaterialCommunityIcons
            name="bank"
            {...props}
            color={theme.colors.primary}
          />
        )}
        titleStyle={{ color: theme.colors.onSurface }}
      />
      <Card.Content>
        {isLoading ? (
          <Text>Loading accounts...</Text>
        ) : accounts.length === 0 ? (
          <Text>No accounts found</Text>
        ) : (
          <>
            {visibleAccounts.map((account, index, array) => {
              const isLastItem = index === array.length - 1;
              const shouldHideBorder =
                accounts.length <= MAX_VISIBLE && isLastItem;
              return (
                <View
                  key={account.id}
                  style={[
                    styles.accountItem,
                    shouldHideBorder && styles.accountItemNoBorder,
                  ]}
                >
                  <View style={styles.accountNameContainer}>
                    <Text variant="bodyLarge">{account.attributes.name}</Text>
                    <Text variant="bodySmall" style={styles.accountType}>
                      {account.attributes.type.charAt(0).toUpperCase() +
                        account.attributes.type.slice(1).toLowerCase()}
                    </Text>
                  </View>
                  <View style={styles.accountBalanceContainer}>
                    <Text variant="titleMedium" style={styles.balance}>
                      {account.attributes.currency_code}{" "}
                      {balanceVisible
                        ? formatAmount(
                            parseFloat(account.attributes.current_balance)
                          )
                        : "••••••"}
                    </Text>
                  </View>
                </View>
              );
            })}
            {hasMore && (
              <TouchableOpacity
                onPress={() => router.push("/(drawer)/accounts")}
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

const styles = StyleSheet.create({
  card: {
    marginBottom: 16,
  },
  accountItem: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.12)",
    gap: 8,
  },
  accountItemNoBorder: {
    borderBottomWidth: 0,
  },
  accountNameContainer: {
    flex: 1,
    flexShrink: 1,
    minWidth: 150,
  },
  accountType: {
    opacity: 0.6,
  },
  accountBalanceContainer: {
    flexShrink: 0,
    alignItems: "flex-end",
    marginLeft: "auto",
  },
  balance: {
    fontWeight: "bold",
  },
  showMoreButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    marginTop: 8,
    gap: 4,
  },
  showMoreText: {
    fontWeight: "600",
  },
});
