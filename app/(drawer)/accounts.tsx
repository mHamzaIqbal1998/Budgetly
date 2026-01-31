// Accounts Screen
import { NetWorthCard } from "@/components/dashboard/net-worth-card";
import { GlassCard } from "@/components/glass-card";
import { useCachedAccountsQuery } from "@/hooks/use-cached-query";
import { apiClient } from "@/lib/api-client";
import { formatAmount } from "@/lib/format-currency";
import { useStore } from "@/lib/store";
import { Account, FireflyApiResponse } from "@/types";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useCallback, useMemo, useState } from "react";
import {
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { Card, Chip, Searchbar, Text, useTheme } from "react-native-paper";

export type AccountTypeFilter = "asset" | "expense" | "revenue" | "liabilities";

const ACCOUNT_TYPE_TABS: { key: AccountTypeFilter; label: string }[] = [
  { key: "asset", label: "Assets" },
  { key: "expense", label: "Expenses" },
  { key: "revenue", label: "Revenue" },
  { key: "liabilities", label: "Liabilities" },
];

function matchesAccountType(
  accountType: string,
  selected: AccountTypeFilter
): boolean {
  const t = accountType.toLowerCase();
  switch (selected) {
    case "asset":
      return t === "asset" || t === "cash";
    case "expense":
      return t.includes("expense");
    case "revenue":
      return t.includes("revenue");
    case "liabilities":
      return t.includes("liability");
    default:
      return false;
  }
}

function getAccountIcon(type: string): string {
  switch (type.toLowerCase()) {
    case "asset":
    case "cash":
      return "wallet";
    case "revenue":
      return "arrow-down-circle";
    case "expense":
      return "arrow-up-circle";
    case "liability":
    case "liabilities":
      return "credit-card";
    default:
      return "bank";
  }
}

export default function AccountsScreen() {
  const theme = useTheme();
  const { balanceVisible, toggleBalanceVisibility } = useStore();
  const [selectedAccountType, setSelectedAccountType] =
    useState<AccountTypeFilter>("asset");
  const [searchQuery, setSearchQuery] = useState("");

  const {
    data: accountsData,
    isLoading: accountsLoading,
    refetch: refetchAccounts,
  } = useCachedAccountsQuery<FireflyApiResponse<Account[]>>(
    ["all-accounts"],
    () => apiClient.getAllAccounts("all")
  );

  const allAccounts = useMemo(
    () => accountsData?.data ?? [],
    [accountsData?.data]
  );

  const currencyBalancesForNetWorth = useMemo(() => {
    const byCode: Record<
      string,
      { symbol: string; code: string; total: number }
    > = {};
    allAccounts
      .filter((acc) => matchesAccountType(acc.attributes.type, "asset"))
      .forEach((acc) => {
        const code = acc.attributes.currency_code;
        const symbol = acc.attributes.currency_symbol ?? code;
        const balance = parseFloat(acc.attributes.current_balance);
        if (!byCode[code]) byCode[code] = { symbol, code, total: 0 };
        byCode[code].total += balance;
      });
    allAccounts
      .filter((acc) => matchesAccountType(acc.attributes.type, "liabilities"))
      .forEach((acc) => {
        const code = acc.attributes.currency_code;
        const symbol = acc.attributes.currency_symbol ?? code;
        const balance = parseFloat(acc.attributes.current_balance);
        if (!byCode[code]) byCode[code] = { symbol, code, total: 0 };
        byCode[code].total -= balance;
      });
    return Object.values(byCode).filter((c) => c.total !== 0);
  }, [allAccounts]);

  const filteredByType = useMemo(
    () =>
      allAccounts.filter((acc) =>
        matchesAccountType(acc.attributes.type, selectedAccountType)
      ),
    [allAccounts, selectedAccountType]
  );

  const filteredBySearch = useMemo(() => {
    if (!searchQuery.trim()) return filteredByType;
    const q = searchQuery.trim().toLowerCase();
    return filteredByType.filter(
      (acc) =>
        acc.attributes.name.toLowerCase().includes(q) ||
        acc.attributes.iban?.toLowerCase().includes(q) ||
        acc.attributes.account_number?.toLowerCase().includes(q)
    );
  }, [filteredByType, searchQuery]);

  const getAccountTypeColor = useCallback(
    (type: string) => {
      switch (type.toLowerCase()) {
        case "asset":
        case "cash":
          return theme.colors.primary;
        case "revenue":
          return "#64B5F6";
        case "expense":
          return "#FF5252";
        case "liability":
        case "liabilities":
          return "#FFB74D";
        default:
          return theme.colors.onSurface;
      }
    },
    [theme]
  );

  const listHeader = useMemo(
    () => (
      <>
        <NetWorthCard
          title="Net Worth"
          currencyBalances={currencyBalancesForNetWorth}
          balanceVisible={balanceVisible}
          toggleBalanceVisibility={toggleBalanceVisibility}
        />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tabsScroll}
          contentContainerStyle={styles.tabsContent}
        >
          {ACCOUNT_TYPE_TABS.map(({ key, label }) => (
            <Chip
              key={key}
              selected={selectedAccountType === key}
              onPress={() => setSelectedAccountType(key)}
              style={[
                styles.tabChip,
                selectedAccountType === key && {
                  backgroundColor: theme.colors.primaryContainer,
                },
              ]}
              textStyle={
                selectedAccountType === key
                  ? { color: theme.colors.onPrimaryContainer }
                  : undefined
              }
            >
              {label}
            </Chip>
          ))}
        </ScrollView>
        <Searchbar
          placeholder="Search accounts by name, IBAN..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={[
            styles.searchBar,
            { backgroundColor: theme.colors.surfaceVariant },
          ]}
          iconColor={theme.colors.onSurfaceVariant}
          placeholderTextColor={theme.colors.onSurfaceVariant}
          inputStyle={{ color: theme.colors.onSurface }}
        />
      </>
    ),
    [
      currencyBalancesForNetWorth,
      balanceVisible,
      toggleBalanceVisibility,
      selectedAccountType,
      searchQuery,
      theme,
    ]
  );

  const listEmpty = useMemo(() => {
    if (accountsLoading) {
      return (
        <View style={styles.centerContent}>
          <Text>Loading accounts...</Text>
        </View>
      );
    }
    return (
      <View style={styles.emptyState}>
        <MaterialCommunityIcons
          name="bank-plus"
          size={64}
          color={theme.colors.onSurfaceVariant}
        />
        <Text variant="headlineSmall" style={{ marginTop: 16 }}>
          No accounts found
        </Text>
        <Text variant="bodyMedium" style={{ marginTop: 8, opacity: 0.6 }}>
          {filteredByType.length === 0
            ? `No ${ACCOUNT_TYPE_TABS.find((t) => t.key === selectedAccountType)?.label ?? selectedAccountType} accounts`
            : "Try a different search term"}
        </Text>
      </View>
    );
  }, [
    accountsLoading,
    filteredByType.length,
    selectedAccountType,
    theme.colors.onSurfaceVariant,
  ]);

  const renderAccountItem = useCallback(
    ({ item: account }: { item: Account }) => {
      const balance = parseFloat(account.attributes.current_balance);
      const isPositive = balance >= 0;
      return (
        <GlassCard variant="default" style={styles.accountCard}>
          <Card.Content>
            <View style={styles.accountHeader}>
              <View style={styles.accountLeft}>
                <MaterialCommunityIcons
                  name={
                    getAccountIcon(
                      account.attributes.type
                    ) as keyof typeof MaterialCommunityIcons.glyphMap
                  }
                  size={40}
                  color={getAccountTypeColor(account.attributes.type)}
                />
                <View style={styles.accountInfo}>
                  <Text variant="titleMedium" style={{ fontWeight: "bold" }}>
                    {account.attributes.name}
                  </Text>
                  <View style={styles.accountMeta}>
                    <View style={styles.chipWrapper}>
                      <Chip
                        compact
                        style={styles.chip}
                        textStyle={styles.chipText}
                      >
                        {account.attributes.type}
                      </Chip>
                    </View>
                  </View>
                </View>
              </View>
              <View style={styles.accountRight}>
                <Text
                  variant="titleMedium"
                  style={{
                    color: isPositive ? theme.colors.primary : "#FF5252",
                    fontWeight: "bold",
                  }}
                >
                  {account.attributes.currency_code}{" "}
                  {balanceVisible ? formatAmount(balance) : "••••••"}
                </Text>
                <View style={styles.accountStatus}>
                  <MaterialCommunityIcons
                    name={
                      account.attributes.active
                        ? "check-circle"
                        : "pause-circle"
                    }
                    size={16}
                    color={
                      account.attributes.active
                        ? theme.colors.primary
                        : theme.colors.onSurfaceVariant
                    }
                  />
                  <Text
                    variant="bodySmall"
                    style={{ marginLeft: 4, opacity: 0.6 }}
                  >
                    {account.attributes.active ? "Active" : "Inactive"}
                  </Text>
                </View>
              </View>
            </View>
          </Card.Content>
        </GlassCard>
      );
    },
    [balanceVisible, theme, getAccountTypeColor]
  );

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <FlatList
        data={filteredBySearch}
        keyExtractor={(item) => item.id}
        renderItem={renderAccountItem}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={listEmpty}
        contentContainerStyle={styles.listContent}
        removeClippedSubviews={true}
        maxToRenderPerBatch={12}
        windowSize={6}
        initialNumToRender={10}
        refreshControl={
          <RefreshControl
            refreshing={accountsLoading}
            onRefresh={refetchAccounts}
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  tabsScroll: {
    marginBottom: 12,
    maxHeight: 48,
  },
  tabsContent: {
    flexDirection: "row",
    gap: 8,
    paddingVertical: 4,
  },
  tabChip: {
    marginRight: 4,
  },
  searchBar: {
    marginBottom: 16,
    elevation: 0,
  },
  centerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 100,
  },
  emptyState: {
    alignItems: "center",
    paddingTop: 100,
  },
  accountCard: {
    marginBottom: 12,
  },
  accountHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  accountLeft: {
    flexDirection: "row",
    alignItems: "flex-start",
    flex: 1,
    minWidth: 0,
  },
  accountInfo: {
    marginLeft: 12,
    flex: 1,
    minWidth: 0,
  },
  accountMeta: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    flexWrap: "wrap",
  },
  chipWrapper: {
    flexShrink: 0,
  },
  accountRight: {
    alignItems: "flex-end",
    justifyContent: "flex-start",
    marginLeft: 12,
  },
  accountStatus: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
  },
  chip: {
    height: 28,
    justifyContent: "center" as const,
  },
  chipText: {
    fontSize: 11,
    lineHeight: 16,
  },
});
