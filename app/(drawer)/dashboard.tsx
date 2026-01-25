// Dashboard Screen
import { GlassCard } from '@/components/glass-card';
import { apiClient } from '@/lib/api-client';
import { useStore } from '@/lib/store';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Card, FAB, Portal, Text, useTheme } from 'react-native-paper';

export default function DashboardScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [fabOpen, setFabOpen] = React.useState(false);
  const { balanceVisible, toggleBalanceVisibility } = useStore();

  // Fetch accounts
  const { data: accountsData, isLoading: accountsLoading } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => apiClient.getAccounts(1, 'asset'),
  });

  // Fetch budgets
  const { data: budgetsData, isLoading: budgetsLoading } = useQuery({
    queryKey: ['budgets'],
    queryFn: () => apiClient.getBudgets(),
  });

  // Calculate total balance by currency
  const balancesByCurrency = accountsData?.data.reduce((acc, account) => {
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
  }, {} as Record<string, { symbol: string; code: string; total: number }>) || {};

  // Convert to array for easier rendering
  const currencyBalances = Object.values(balancesByCurrency);

  // Count active budgets
  const activeBudgets = budgetsData?.data.filter(b => b.attributes.active).length || 0;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView style={styles.scrollView}>
        {/* Net Worth Card */}
        <GlassCard variant="primary" style={styles.netWorthCard} mode='outlined'>
          <Card.Content>
            <View style={styles.netWorthHeader}>
              <View style={styles.netWorthTitleContainer}>
                <MaterialCommunityIcons 
                  name="wallet" 
                  size={24} 
                  color={theme.colors.primary} 
                />
                <Text variant="labelLarge" style={styles.netWorthLabel}>Net Worth</Text>
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
              <Text variant="displaySmall" style={styles.netWorthValue}>
                No accounts
              </Text>
            ) : (
              currencyBalances.length === 1 ? (
                <Text variant="displayLarge" style={styles.netWorthValue}>
                  {currencyBalances[0].symbol} {currencyBalances[0].total.toFixed(2)}
                </Text>
              ) : (
                <View style={styles.multiCurrencyContainer}>
                  {currencyBalances.map((currency, index) => (
                    <Text 
                      key={currency.code} 
                      variant="displaySmall" 
                      style={[styles.netWorthValue, index > 0 && styles.additionalCurrency]}
                    >
                      {currency.symbol} {balanceVisible ? currency.total.toFixed(2) : "••••••"}
                    </Text>
                  ))}
                </View>
              )
            ) }
          </Card.Content>
        </GlassCard>

        {/* Summary Cards */}
        <View style={styles.summaryRow}>
          <GlassCard variant="primary" style={styles.summaryCardSmall} mode='outlined'>
            <Card.Content>
              <MaterialCommunityIcons 
                name="chart-donut" 
                size={32} 
                color={theme.colors.primary} 
                style={styles.summaryIcon}
              />
              <Text variant="bodySmall" style={styles.summaryLabel}>Active Budgets</Text>
              <Text variant="headlineMedium" style={[styles.summaryValue, { color: theme.colors.primary }]}>
                {activeBudgets}
              </Text>
            </Card.Content>
          </GlassCard>
          <GlassCard variant="primary" style={styles.summaryCardSmall} mode='outlined'>
            <Card.Content>
              <MaterialCommunityIcons 
                name="chart-donut" 
                size={32} 
                color={theme.colors.primary} 
                style={styles.summaryIcon}
              />
              <Text variant="bodySmall" style={styles.summaryLabel}>Active Budgets</Text>
              <Text variant="headlineMedium" style={[styles.summaryValue, { color: theme.colors.primary }]}>
                {activeBudgets}
              </Text>
            </Card.Content>
          </GlassCard>
        </View>

        {/* Accounts Overview */}
        <GlassCard variant="elevated" style={styles.card}>
          <Card.Title 
            title="Accounts Overview" 
            left={(props) => <MaterialCommunityIcons name="bank" {...props} color={theme.colors.primary} />}
            titleStyle={{ color: theme.colors.onSurface }}
          />
          <Card.Content>
            {accountsLoading ? (
              <Text>Loading accounts...</Text>
            ) : accountsData?.data.length === 0 ? (
              <Text>No accounts found</Text>
            ) : (
              <>
                {accountsData?.data.slice(0, 5).map((account) => (
                  <View key={account.id} style={styles.accountItem}>
                    <View>
                      <Text variant="bodyLarge">{account.attributes.name}</Text>
                      <Text variant="bodySmall" style={{ opacity: 0.6 }}>
                        {account.attributes.type}
                      </Text>
                    </View>
                    <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>
                      {account.attributes.currency_code} {account.attributes.current_balance}
                    </Text>
                  </View>
                ))}
                {accountsData && accountsData.data.length > 5 && (
                  <TouchableOpacity
                    onPress={() => router.push('/(drawer)/accounts')}
                    style={styles.showMoreButton}
                  >
                    <Text variant="bodyMedium" style={[styles.showMoreText, { color: theme.colors.primary }]}>
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

        {/* Budgets Overview */}
        <GlassCard variant="elevated" style={styles.card}>
          <Card.Title 
            title="Budget Status" 
            left={(props) => <MaterialCommunityIcons name="wallet" {...props} color={theme.colors.primary} />}
            titleStyle={{ color: theme.colors.onSurface }}
          />
          <Card.Content>
            {budgetsLoading ? (
              <Text>Loading budgets...</Text>
            ) : budgetsData?.data.length === 0 ? (
              <View style={styles.emptyState}>
                <MaterialCommunityIcons 
                  name="wallet-plus" 
                  size={48} 
                  color={theme.colors.onSurfaceVariant} 
                />
                <Text variant="bodyLarge" style={{ marginTop: 8 }}>No budgets yet</Text>
                <Text variant="bodySmall" style={{ opacity: 0.6, marginTop: 4 }}>
                  Create your first budget to start tracking expenses
                </Text>
              </View>
            ) : (
              budgetsData?.data.slice(0, 5).map((budget) => (
                <View key={budget.id} style={styles.budgetItem}>
                  <View style={{ flex: 1 }}>
                    <Text variant="bodyLarge">{budget.attributes.name}</Text>
                    {budget.attributes.spent && budget.attributes.spent.length > 0 && (
                      <Text variant="bodySmall" style={{ opacity: 0.6 }}>
                        Spent: {budget.attributes.spent[0].currency_code} {budget.attributes.spent[0].amount}
                      </Text>
                    )}
                  </View>
                  <MaterialCommunityIcons
                    name={budget.attributes.active ? 'check-circle' : 'circle-outline'}
                    size={24}
                    color={budget.attributes.active ? theme.colors.primary : theme.colors.onSurfaceVariant}
                  />
                </View>
              ))
            )}
          </Card.Content>
        </GlassCard>

        {/* Quick Insights */}
        <GlassCard variant="elevated" style={styles.insightsCard}>
          <Card.Title 
            title="Quick Insights" 
            left={(props) => <MaterialCommunityIcons name="lightbulb" {...props} color={theme.colors.primary} />}
            titleStyle={{ color: theme.colors.onSurface }}
          />
          <Card.Content>
            <View style={styles.insightItem}>
              <MaterialCommunityIcons 
                name="information" 
                size={20} 
                color={theme.colors.primary} 
              />
              <Text variant="bodyMedium" style={{ marginLeft: 8, flex: 1 }}>
                You have {accountsData?.data.length || 0} accounts connected
              </Text>
            </View>
            <View style={styles.insightItem}>
              <MaterialCommunityIcons 
                name="chart-line" 
                size={20} 
                color={theme.colors.secondary} 
              />
              <Text variant="bodyMedium" style={{ marginLeft: 8, flex: 1 }}>
                {activeBudgets} active budgets tracking your spending
              </Text>
            </View>
          </Card.Content>
        </GlassCard>
      </ScrollView>

      {/* Floating Action Button */}
      <Portal>
        <FAB.Group
          open={fabOpen}
          visible
          icon={fabOpen ? 'close' : 'plus'}
          actions={[
            {
              icon: 'cash-plus',
              label: 'Add Expense',
              onPress: () => console.log('Add expense'),
            },
            {
              icon: 'wallet-plus',
              label: 'Create Budget',
              onPress: () => console.log('Create budget'),
            },
            {
              icon: 'bank-transfer',
              label: 'Transfer',
              onPress: () => console.log('Transfer'),
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
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  netWorthCard: {
    marginBottom: 16,
  },
  netWorthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  netWorthTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  netWorthLabel: {
    opacity: 0.8,
    letterSpacing: 0.5,
  },
  eyeIcon: {
    padding: 4,
  },
  netWorthValue: {
    color: '#1DB954',
    fontWeight: 'bold',
    letterSpacing: -1,
  },
  multiCurrencyContainer: {
    gap: 8,
  },
  additionalCurrency: {
    fontSize: 32,
  },
  summaryCard: {
    flex: 1,
    minHeight: 120,
  },
  summaryCardSmall: {
    flex: 1,
    minHeight: 120,
  },
  insightsCard: {
    marginBottom: 80,
  },
  summaryIcon: {
    marginBottom: 8,
  },
  summaryLabel: {
    opacity: 0.7,
    marginBottom: 4,
  },
  summaryValue: {
    fontWeight: 'bold',
  },
  card: {
    marginBottom: 16,
  },
  accountItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  showMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginTop: 8,
    gap: 4,
  },
  showMoreText: {
    fontWeight: '600',
  },
  budgetItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  insightItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
});

