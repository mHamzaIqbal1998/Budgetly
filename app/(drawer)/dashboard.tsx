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
  useOnlineStatus,
} from "@/hooks/use-cached-query";
import { apiClient } from "@/lib/api-client";
import { useStore } from "@/lib/store";
import { getStartEndDate } from "@/lib/utils";
import { Account, FireflyApiResponse } from "@/types";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useNavigation } from "expo-router";
import React, { useLayoutEffect } from "react";
import { RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import {
  Card,
  FAB,
  IconButton,
  Portal,
  Text,
  useTheme,
} from "react-native-paper";

export default function DashboardScreen() {
  const theme = useTheme();
  const navigation = useNavigation();
  const [fabOpen, setFabOpen] = React.useState(false);
  const [customizeModalVisible, setCustomizeModalVisible] =
    React.useState(false);
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

  // Fetch Last 30 days expenses by expense account (dynamic dates)
  const { startDateString, endDate } = getStartEndDate(30);

  // Fetch all asset accounts
  const {
    data: accountsData,
    isLoading: accountsLoading,
    refetch: refetchAccounts,
  } = useCachedAccountsQuery<FireflyApiResponse<Account[]>>(
    ["all-asset-accounts"],
    () => apiClient.getAllAccounts("asset")
  );

  // Fetch all expense accounts
  const {
    data: expenseAccountsData,
    isLoading: expenseAccountsLoading,
    refetch: refetchExpenseAccounts,
  } = useCachedAccountsQuery<FireflyApiResponse<Account[]>>(
    ["all-expense-accounts"],
    () => apiClient.getAllAccounts("expense")
  );

  // Fetch budgets
  const {
    data: budgetsData,
    isLoading: budgetsLoading,
    refetch: refetchBudgets,
  } = useQuery({
    queryKey: ["budgets", startDateString, endDate],
    queryFn: () => apiClient.getAllBudgets(startDateString, endDate),
  });

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
  } = useQuery({
    queryKey: ["expensesByExpenseAccount", startDateString, endDate],
    queryFn: () =>
      apiClient.getExpensesByExpenseAccount(startDateString, endDate),
  });

  // Calculate total balance by currency
  const balancesByCurrency =
    accountsData?.data.reduce(
      (acc, account) => {
        const currencySymbol = account.attributes.currency_symbol;
        const currencyCode = account.attributes.currency_code;
        const balance = parseFloat(account.attributes.current_balance);

        if (!acc[currencyCode]) {
          acc[currencyCode] = {
            symbol: currencySymbol,
            code: currencyCode,
            total: 0,
          };
        }

        acc[currencyCode].total += balance;
        return acc;
      },
      {} as Record<string, { symbol: string; code: string; total: number }>
    ) || {};

  // Convert to array for easier rendering
  const currencyBalances = Object.values(balancesByCurrency);

  // Count active budgets
  const activeBudgets =
    budgetsData?.data.filter((b) => b.attributes.active).length || 0;

  const handleRefresh = () => {
    refetchAccounts();
    refetchExpenseAccounts();
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
            refreshing={
              accountsLoading ||
              expenseAccountsLoading ||
              budgetsLoading ||
              isLoadingBills ||
              isLoadingExpenses
            }
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
                  accounts={accountsData?.data ?? []}
                  type="Asset"
                />
              );
            case "expensesByAccount":
              return (
                <ExpensesByAccountPieCard
                  key={sectionId}
                  expenses={expensesData ?? []}
                  expenseAccounts={expenseAccountsData?.data ?? []}
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
                  accounts={accountsData?.data ?? []}
                  isLoading={accountsLoading}
                  balanceVisible={balanceVisible}
                />
              );
            case "budgetStatus":
              return (
                <BudgetStatusCard
                  key={sectionId}
                  budgets={budgetsData?.data}
                  isLoading={budgetsLoading}
                />
              );
            case "quickInsights":
              return (
                <QuickInsightsCard
                  key={sectionId}
                  accountsCount={accountsData?.data.length ?? 0}
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

      {/* Floating Action Button */}
      <Portal>
        <FAB.Group
          open={fabOpen}
          visible
          icon={fabOpen ? "close" : "plus"}
          actions={[
            {
              icon: "cash-plus",
              label: "Add Expense",
              onPress: () => console.log("Add expense"),
            },
            {
              icon: "wallet-plus",
              label: "Create Budget",
              onPress: () => console.log("Create budget"),
            },
            {
              icon: "bank-transfer",
              label: "Transfer",
              onPress: () => console.log("Transfer"),
            },
          ]}
          onStateChange={({ open }) => setFabOpen(open)}
        />
      </Portal>
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
    // margin: 16,
    marginBottom: 16,
    // marginTop: 8,
    backgroundColor: "rgba(255, 152, 0, 0.1)",
  },
});
