// Accounts Screen
import React from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Card, Text, useTheme, Chip } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { GlassCard } from '@/components/glass-card';

export default function AccountsScreen() {
  const theme = useTheme();

  // Fetch accounts
  const { data: accountsData, isLoading, refetch } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => apiClient.getAccounts(),
  });

  const getAccountIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'asset':
        return 'wallet';
      case 'cash':
        return 'cash';
      case 'revenue':
        return 'arrow-down-circle';
      case 'expense':
        return 'arrow-up-circle';
      case 'liability':
        return 'credit-card';
      default:
        return 'bank';
    }
  };

  const getAccountTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'asset':
        return theme.colors.primary;
      case 'cash':
        return theme.colors.primary;
      case 'revenue':
        return '#64B5F6';
      case 'expense':
        return '#FF5252';
      case 'liability':
        return '#FFB74D';
      default:
        return theme.colors.onSurface;
    }
  };

  // Calculate totals by type
  const calculateTotalByType = (type: string) => {
    if (!accountsData?.data) return 0;
    return accountsData.data
      .filter(acc => acc.attributes.type.toLowerCase() === type.toLowerCase())
      .reduce((sum, acc) => sum + parseFloat(acc.attributes.current_balance), 0);
  };

  const totalAssets = calculateTotalByType('asset');
  const totalLiabilities = calculateTotalByType('liability');
  const netWorth = totalAssets - totalLiabilities;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView 
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refetch} />
        }
      >
        {/* Net Worth Summary */}
        <GlassCard variant="primary" style={styles.summaryCard}>
          <Card.Content>
            <Text variant="bodyLarge" style={{ opacity: 0.7, textAlign: 'center' }}>
              Net Worth
            </Text>
            <Text 
              variant="displaySmall" 
              style={{ 
                textAlign: 'center', 
                fontWeight: 'bold',
                marginTop: 8,
                color: netWorth >= 0 ? theme.colors.primary : '#FF5252',
              }}
            >
              ${netWorth.toFixed(2)}
            </Text>
            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <Text variant="bodySmall" style={{ opacity: 0.6 }}>Assets</Text>
                <Text variant="titleMedium" style={{ color: theme.colors.primary, fontWeight: 'bold' }}>
                  ${totalAssets.toFixed(2)}
                </Text>
              </View>
              <View style={styles.summaryItem}>
                <Text variant="bodySmall" style={{ opacity: 0.6 }}>Liabilities</Text>
                <Text variant="titleMedium" style={{ color: '#FF5252', fontWeight: 'bold' }}>
                  ${totalLiabilities.toFixed(2)}
                </Text>
              </View>
            </View>
          </Card.Content>
        </GlassCard>

        {/* Accounts List */}
        {isLoading ? (
          <View style={styles.centerContent}>
            <Text>Loading accounts...</Text>
          </View>
        ) : accountsData?.data.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons 
              name="bank-plus" 
              size={64} 
              color={theme.colors.onSurfaceVariant} 
            />
            <Text variant="headlineSmall" style={{ marginTop: 16 }}>No accounts found</Text>
            <Text variant="bodyMedium" style={{ marginTop: 8, opacity: 0.6 }}>
              Connect your accounts in Firefly III to see them here
            </Text>
          </View>
        ) : (
          accountsData?.data.map((account) => {
            const balance = parseFloat(account.attributes.current_balance);
            const isPositive = balance >= 0;

            return (
              <GlassCard key={account.id} variant="default" style={styles.accountCard}>
                <Card.Content>
                  <View style={styles.accountHeader}>
                    <View style={styles.accountLeft}>
                      <MaterialCommunityIcons
                        name={getAccountIcon(account.attributes.type)}
                        size={40}
                        color={getAccountTypeColor(account.attributes.type)}
                      />
                      <View style={styles.accountInfo}>
                        <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>
                          {account.attributes.name}
                        </Text>
                        <View style={styles.accountMeta}>
                          <Chip 
                            compact 
                            style={styles.chip}
                            textStyle={{ fontSize: 11 }}
                          >
                            {account.attributes.type}
                          </Chip>
                          {account.attributes.iban && (
                            <Text variant="bodySmall" style={{ opacity: 0.6, marginLeft: 8 }}>
                              {account.attributes.iban}
                            </Text>
                          )}
                        </View>
                      </View>
                    </View>
                    <View style={styles.accountRight}>
                      <Text 
                        variant="headlineSmall" 
                        style={{ 
                          color: isPositive ? theme.colors.primary : '#FF5252',
                          fontWeight: 'bold',
                        }}
                      >
                        {account.attributes.currency_code} {balance.toFixed(2)}
                      </Text>
                      <View style={styles.accountStatus}>
                        <MaterialCommunityIcons
                          name={account.attributes.active ? 'check-circle' : 'pause-circle'}
                          size={16}
                          color={account.attributes.active ? theme.colors.primary : theme.colors.onSurfaceVariant}
                        />
                        <Text variant="bodySmall" style={{ marginLeft: 4, opacity: 0.6 }}>
                          {account.attributes.active ? 'Active' : 'Inactive'}
                        </Text>
                      </View>
                    </View>
                  </View>
                </Card.Content>
              </GlassCard>
            );
          })
        )}
        <View style={{ height: 20 }} />
      </ScrollView>
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
  summaryCard: {
    marginBottom: 16,
    padding: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
  },
  summaryItem: {
    alignItems: 'center',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 100,
  },
  accountCard: {
    marginBottom: 12,
  },
  accountHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  accountLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  accountInfo: {
    marginLeft: 12,
    flex: 1,
  },
  accountMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  accountRight: {
    alignItems: 'flex-end',
  },
  accountStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  chip: {
    height: 24,
  },
});

