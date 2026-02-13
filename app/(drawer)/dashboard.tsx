// Dashboard Screen
import { ExpensesByAccountPieCard } from "@/components/charts/expenses-by-account-pie-card";
import { TopAccountsPieCard } from "@/components/charts/top-accounts-pie-card";
import { AccountsOverviewCard } from "@/components/dashboard/accounts-overview-card";
import { BudgetStatusCard } from "@/components/dashboard/budget-status-card";
import { DashboardCustomizeModal } from "@/components/dashboard/dashboard-customize-modal";
import { NetWorthCard } from "@/components/dashboard/net-worth-card";
import { QuickInsightsCard } from "@/components/dashboard/quick-insights-card";
import { GlassCard } from "@/components/glass-card";
import { DEFAULT_DASHBOARD_VISIBLE_ORDER } from "@/constants/dashboard-sections";
import { SpotifyColors } from "@/constants/spotify-theme";
import {
  useCachedAccountsQuery,
  useCachedBudgetLimitsQuery,
  useCachedExpensesByAccountQuery,
  useOnlineStatus,
} from "@/hooks/use-cached-query";
import { apiClient } from "@/lib/api-client";
import { useStore } from "@/lib/store";
import {
  filterAccountsByType,
  getCurrentMonthStartEndDate,
  getStartEndDate,
} from "@/lib/utils";
import { Account, FireflyApiResponse } from "@/types";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useNavigation } from "expo-router";
import React, { useLayoutEffect } from "react";
import { RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { Card, IconButton, Text, useTheme } from "react-native-paper";

export default function DashboardScreen() {
  const theme = useTheme();
  const navigation = useNavigation();
  const [customizeModalVisible, setCustomizeModalVisible] =
    React.useState(false);
  const [expenseChartDays, setExpenseChartDays] = React.useState<7 | 15 | 30>(
    30
  );
  const {
    balanceVisible,
    toggleBalanceVisibility,
    dashboardVisibleSectionIds,
  } = useStore();
  const visibleSectionIds = dashboardVisibleSectionIds ?? [
    ...DEFAULT_DASHBOARD_VISIBLE_ORDER,
  ];
  const { isOnline } = useOnlineStatus();

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <IconButton
          icon="view-dashboard-edit"
          size={24}
          onPress={() => setCustomizeModalVisible(true)}
          iconColor={theme.colors.onSurface}
        />
      ),
    });
  }, [navigation, theme.colors.onSurface]);

  // Expense chart range: 7, 15, or 30 days (user-selectable)
  const expenseChartDateRange = React.useMemo(
    () => getStartEndDate(expenseChartDays),
    [expenseChartDays]
  );
  // Current month (1st to today) for budgets so monthly reset aligns
  const budgetDateRange = getCurrentMonthStartEndDate();

  // Single fetch for all accounts; filter by type for dashboard sections
  const {
    data: accountsData,
    isLoading: accountsLoading,
    refetch: refetchAccounts,
  } = useCachedAccountsQuery<FireflyApiResponse<Account[]>>(
    ["all-accounts"],
    () => apiClient.getAllAccounts("all")
  );

  const allAccounts = React.useMemo(
    () => accountsData?.data ?? [],
    [accountsData?.data]
  );
  const assetAccounts = React.useMemo(
    () => filterAccountsByType(allAccounts, "asset"),
    [allAccounts]
  );
  const expenseAccounts = React.useMemo(
    () => filterAccountsByType(allAccounts, "expense"),
    [allAccounts]
  );

  const {
    data: budgetsData,
    isLoading: budgetsLoading,
    refetch: refetchBudgets,
  } = useCachedBudgetLimitsQuery(
    ["all-budgets", budgetDateRange.startDateString, budgetDateRange.endDate],
    () =>
      apiClient.getAllBudgetLimits(
        budgetDateRange.startDateString,
        budgetDateRange.endDate
      )
  );

  // Fetch subscriptions bills
  const {
    data: subscriptionsBillsData,
    isLoading: isLoadingBills,
    refetch: refetchSubscriptionsBills,
  } = useQuery({
    queryKey: ["subscriptionsBills"],
    queryFn: () => apiClient.getSubscriptionsBills(),
  });

  const {
    data: expensesData,
    isLoading: isLoadingExpenses,
    refetch: refetchExpenses,
  } = useCachedExpensesByAccountQuery(
    [
      "expensesByExpenseAccount",
      expenseChartDateRange.startDateString,
      expenseChartDateRange.endDate,
    ],
    expenseChartDateRange.startDateString,
    expenseChartDateRange.endDate,
    () =>
      apiClient.getExpensesByExpenseAccount(
        expenseChartDateRange.startDateString,
        expenseChartDateRange.endDate
      )
  );

  // Calculate total balance by currency (asset accounts only)
  const balancesByCurrency = React.useMemo(() => {
    const acc: Record<string, { symbol: string; code: string; total: number }> =
      {};
    for (let i = 0; i < assetAccounts.length; i++) {
      const account = assetAccounts[i];
      const currencyCode = account.attributes.currency_code;
      if (!acc[currencyCode]) {
        acc[currencyCode] = {
          symbol: account.attributes.currency_symbol,
          code: currencyCode,
          total: 0,
        };
      }
      acc[currencyCode].total += parseFloat(account.attributes.current_balance);
    }
    return acc;
  }, [assetAccounts]);

  // Convert to array for easier rendering
  const currencyBalances = Object.values(balancesByCurrency);

  // Count active budgets
  const activeBudgets = React.useMemo(
    () => budgetsData?.included?.filter((b) => b.attributes.active).length || 0,
    [budgetsData?.included]
  );

  const handleRefresh = () => {
    refetchAccounts();
    refetchBudgets();
    refetchSubscriptionsBills();
    refetchExpenses();
  };

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={accountsLoading || budgetsLoading || isLoadingBills}
            onRefresh={handleRefresh}
          />
        }
      >
        {/* Offline indicator */}
        {!isOnline && (
          <Card style={styles.offlineBanner} mode="contained">
            <Card.Content>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <MaterialCommunityIcons
                  name="cloud-off-outline"
                  size={20}
                  color={theme.colors.onSurfaceVariant}
                />
                <Text
                  variant="bodySmall"
                  style={{
                    marginLeft: 8,
                    color: theme.colors.onSurfaceVariant,
                  }}
                >
                  Showing cached data (offline)
                </Text>
              </View>
            </Card.Content>
          </Card>
        )}
        {visibleSectionIds.map((sectionId) => {
          switch (sectionId) {
            case "netWorth":
              return (
                <NetWorthCard
                  key={sectionId}
                  currencyBalances={currencyBalances}
                  balanceVisible={balanceVisible}
                  toggleBalanceVisibility={toggleBalanceVisibility}
                />
              );
            case "topAccounts":
              return (
                <TopAccountsPieCard
                  key={sectionId}
                  accounts={assetAccounts}
                  type="Asset"
                />
              );
            case "expensesByAccount":
              return (
                <ExpensesByAccountPieCard
                  key={sectionId}
                  expenses={expensesData ?? []}
                  expenseAccounts={expenseAccounts}
                  selectedDays={expenseChartDays}
                  onDaysChange={setExpenseChartDays}
                />
              );
            case "summaryCards":
              return (
                <View key={sectionId} style={styles.summaryRow}>
                  <GlassCard
                    variant="blue"
                    style={styles.summaryCardSmall}
                    mode="contained"
                  >
                    <Card.Content>
                      <MaterialCommunityIcons
                        name="chart-donut"
                        size={32}
                        color={SpotifyColors.blue}
                        style={styles.summaryIcon}
                      />
                      <Text variant="bodySmall" style={styles.summaryLabel}>
                        Active Budgets
                      </Text>
                      <Text
                        variant="headlineMedium"
                        style={[
                          styles.summaryValue,
                          { color: SpotifyColors.blue },
                        ]}
                      >
                        {activeBudgets}
                      </Text>
                    </Card.Content>
                  </GlassCard>
                  <GlassCard
                    variant="orange"
                    style={styles.summaryCardSmall}
                    mode="contained"
                  >
                    <Card.Content>
                      <MaterialCommunityIcons
                        name="repeat"
                        size={32}
                        color={SpotifyColors.orange}
                        style={styles.summaryIcon}
                      />
                      <Text variant="bodySmall" style={styles.summaryLabel}>
                        Active Subscriptions
                      </Text>
                      <Text
                        variant="headlineMedium"
                        style={[
                          styles.summaryValue,
                          { color: SpotifyColors.orange },
                        ]}
                      >
                        {subscriptionsBillsData?.data.filter(
                          (bill) => bill.attributes.active
                        ).length || 0}
                      </Text>
                    </Card.Content>
                  </GlassCard>
                </View>
              );
            case "accountsOverview":
              return (
                <AccountsOverviewCard
                  key={sectionId}
                  accounts={assetAccounts}
                  isLoading={accountsLoading}
                  balanceVisible={balanceVisible}
                />
              );
            case "budgetStatus":
              return (
                <BudgetStatusCard
                  key={sectionId}
                  budgets={budgetsData?.data ?? null}
                  included={budgetsData?.included ?? null}
                  isLoading={budgetsLoading}
                />
              );
            case "quickInsights":
              return (
                <QuickInsightsCard
                  key={sectionId}
                  accountsCount={assetAccounts.length}
                  activeBudgetsCount={activeBudgets}
                  activeSubscriptionsCount={
                    subscriptionsBillsData?.data.filter(
                      (bill) => bill.attributes.active
                    ).length ?? 0
                  }
                />
              );
            default:
              return null;
          }
        })}
        <View style={{ height: 32 }} />
      </ScrollView>

      <DashboardCustomizeModal
        visible={customizeModalVisible}
        onDismiss={() => setCustomizeModalVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  summaryRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  summaryCard: {
    flex: 1,
    minHeight: 120,
  },
  summaryCardSmall: {
    flex: 1,
    minHeight: 120,
  },
  summaryIcon: {
    marginBottom: 8,
  },
  summaryLabel: {
    opacity: 0.7,
    marginBottom: 4,
  },
  summaryValue: {
    fontWeight: "bold",
  },
  card: {
    marginBottom: 16,
  },
  offlineBanner: {
    marginBottom: 16,
    backgroundColor: "rgba(255, 152, 0, 0.1)",
  },
});
