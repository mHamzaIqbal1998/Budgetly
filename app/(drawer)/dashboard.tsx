// Dashboard Screen
import React from 'react';
import { View, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { Card, Text, Button, useTheme, FAB, Portal } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { VictoryPie, VictoryChart, VictoryLine, VictoryAxis, VictoryTheme } from 'victory-native';
import { GlassCard, GlassContainer } from '@/components/glass-card';

export default function DashboardScreen() {
  const theme = useTheme();
  const [fabOpen, setFabOpen] = React.useState(false);

  // Fetch accounts
  const { data: accountsData, isLoading: accountsLoading } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => apiClient.getAccounts(),
  });

  // Fetch budgets
  const { data: budgetsData, isLoading: budgetsLoading } = useQuery({
    queryKey: ['budgets'],
    queryFn: () => apiClient.getBudgets(),
  });

  // Calculate total balance
  const totalBalance = accountsData?.data.reduce((sum, account) => {
    const balance = parseFloat(account.attributes.current_balance);
    return sum + balance;
  }, 0) || 0;

  // Count active budgets
  const activeBudgets = budgetsData?.data.filter(b => b.attributes.active).length || 0;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView style={styles.scrollView}>
        {/* Summary Cards */}
        <View style={styles.summaryRow}>
          <GlassCard variant="primary" style={[styles.summaryCard, { flex: 1 }]}>
            <Card.Content>
              <MaterialCommunityIcons 
                name="wallet" 
                size={32} 
                color={theme.colors.primary} 
                style={styles.summaryIcon}
              />
              <Text variant="bodySmall" style={styles.summaryLabel}>Total Balance</Text>
              <Text variant="headlineMedium" style={[styles.summaryValue, { color: theme.colors.primary }]}>
                ${totalBalance.toFixed(2)}
              </Text>
            </Card.Content>
          </GlassCard>

          <GlassCard variant="primary" style={[styles.summaryCard, { flex: 1 }]}>
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
              accountsData?.data.slice(0, 5).map((account) => (
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
              ))
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
        <GlassCard variant="elevated" style={[styles.card, { marginBottom: 80 }]}>
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
  summaryCard: {
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

