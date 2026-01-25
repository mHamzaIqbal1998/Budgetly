// Piggy Banks Screen
import React from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Card, Text, useTheme, ProgressBar } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export default function PiggyBanksScreen() {
  const theme = useTheme();

  // Fetch piggy banks
  const { data: piggyBanksData, isLoading, refetch } = useQuery({
    queryKey: ['piggyBanks'],
    queryFn: () => apiClient.getPiggyBanks(),
  });

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView 
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refetch} />
        }
      >
        {isLoading ? (
          <View style={styles.centerContent}>
            <Text>Loading piggy banks...</Text>
          </View>
        ) : piggyBanksData?.data.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons 
              name="piggy-bank-outline" 
              size={64} 
              color={theme.colors.onSurfaceVariant} 
            />
            <Text variant="headlineSmall" style={{ marginTop: 16 }}>No piggy banks yet</Text>
            <Text variant="bodyMedium" style={{ marginTop: 8, opacity: 0.6, textAlign: 'center' }}>
              Create piggy banks in Firefly III to track your savings goals
            </Text>
          </View>
        ) : (
          piggyBanksData?.data.map((piggyBank) => {
            const currentAmount = parseFloat(piggyBank.attributes.current_amount);
            const targetAmount = parseFloat(piggyBank.attributes.target_amount);
            const percentage = piggyBank.attributes.percentage;
            const leftToSave = parseFloat(piggyBank.attributes.left_to_save);

            return (
              <Card key={piggyBank.id} style={styles.piggyBankCard} mode="elevated">
                <Card.Content>
                  <View style={styles.piggyBankHeader}>
                    <MaterialCommunityIcons
                      name="piggy-bank"
                      size={40}
                      color={theme.colors.primary}
                    />
                    <View style={styles.piggyBankInfo}>
                      <Text variant="titleLarge" style={{ fontWeight: 'bold' }}>
                        {piggyBank.attributes.name}
                      </Text>
                      <Text variant="bodySmall" style={{ opacity: 0.6, marginTop: 4 }}>
                        Account: {piggyBank.attributes.account_name}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.amountRow}>
                    <View>
                      <Text variant="bodySmall" style={{ opacity: 0.6 }}>Current</Text>
                      <Text variant="titleLarge" style={{ color: theme.colors.primary, fontWeight: 'bold' }}>
                        {piggyBank.attributes.currency_symbol}{currentAmount.toFixed(2)}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text variant="bodySmall" style={{ opacity: 0.6 }}>Target</Text>
                      <Text variant="titleLarge" style={{ fontWeight: 'bold' }}>
                        {piggyBank.attributes.currency_symbol}{targetAmount.toFixed(2)}
                      </Text>
                    </View>
                  </View>

                  <ProgressBar 
                    progress={percentage / 100} 
                    color={percentage >= 100 ? '#4caf50' : theme.colors.primary}
                    style={styles.progressBar}
                  />
                  
                  <View style={styles.progressInfo}>
                    <Text variant="bodyMedium" style={{ fontWeight: 'bold' }}>
                      {percentage.toFixed(1)}% saved
                    </Text>
                    {leftToSave > 0 && (
                      <Text variant="bodySmall" style={{ opacity: 0.6 }}>
                        {piggyBank.attributes.currency_symbol}{leftToSave.toFixed(2)} to go
                      </Text>
                    )}
                  </View>

                  {piggyBank.attributes.target_date && (
                    <View style={styles.dateInfo}>
                      <MaterialCommunityIcons 
                        name="calendar" 
                        size={16} 
                        color={theme.colors.onSurfaceVariant} 
                      />
                      <Text variant="bodySmall" style={{ marginLeft: 6, opacity: 0.6 }}>
                        Target: {new Date(piggyBank.attributes.target_date).toLocaleDateString()}
                      </Text>
                    </View>
                  )}

                  {piggyBank.attributes.notes && (
                    <Text variant="bodySmall" style={{ marginTop: 8, opacity: 0.7, fontStyle: 'italic' }}>
                      {piggyBank.attributes.notes}
                    </Text>
                  )}
                </Card.Content>
              </Card>
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
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 100,
    paddingHorizontal: 32,
  },
  piggyBankCard: {
    marginBottom: 16,
  },
  piggyBankHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  piggyBankInfo: {
    marginLeft: 12,
    flex: 1,
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  progressBar: {
    height: 10,
    borderRadius: 5,
    marginBottom: 8,
  },
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
});

