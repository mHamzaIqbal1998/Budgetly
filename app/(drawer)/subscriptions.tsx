// Subscriptions (Recurring Transactions) Screen
import { GlassCard } from '@/components/glass-card';
import { apiClient } from '@/lib/api-client';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import React from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { Card, Chip, Text, useTheme } from 'react-native-paper';

export default function SubscriptionsScreen() {
  const theme = useTheme();

  // Fetch recurring transactions
  const { data: subscriptionsData, isLoading, refetch } = useQuery({
    queryKey: ['subscriptions'],
    queryFn: () => apiClient.getRecurringTransactions(),
  });

  const getRepetitionText = (repetitions: any[]) => {
    if (!repetitions || repetitions.length === 0) return 'Unknown';
    const rep = repetitions[0];
    if (rep.type === 'daily') return 'Daily';
    if (rep.type === 'weekly') return 'Weekly';
    if (rep.type === 'monthly') return 'Monthly';
    if (rep.type === 'yearly') return 'Yearly';
    return rep.type;
  };

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
            <Text>Loading subscriptions...</Text>
          </View>
        ) : subscriptionsData?.data.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons 
              name="repeat-off" 
              size={64} 
              color={theme.colors.onSurfaceVariant} 
            />
            <Text variant="headlineSmall" style={{ marginTop: 16 }}>No subscriptions yet</Text>
            <Text variant="bodyMedium" style={{ marginTop: 8, opacity: 0.6, textAlign: 'center' }}>
              Set up recurring transactions in Firefly III to track subscriptions
            </Text>
          </View>
        ) : (
          subscriptionsData?.data.map((subscription) => {
            const transaction = subscription.attributes.transactions[0];
            const amount = transaction ? parseFloat(transaction.amount) : 0;
            const repetitionText = getRepetitionText(subscription.attributes.repetitions);

            return (
              <GlassCard key={subscription.id} variant="elevated" style={styles.subscriptionCard}>
                <Card.Content>
                  <View style={styles.subscriptionHeader}>
                    <View style={styles.subscriptionLeft}>
                      <MaterialCommunityIcons
                        name="repeat"
                        size={40}
                        color={subscription.attributes.active ? theme.colors.primary : theme.colors.onSurfaceVariant}
                      />
                      <View style={styles.subscriptionInfo}>
                        <Text variant="titleLarge" style={{ fontWeight: 'bold' }}>
                          {subscription.attributes.title}
                        </Text>
                        {subscription.attributes.description && (
                          <Text variant="bodySmall" style={{ opacity: 0.6, marginTop: 4 }}>
                            {subscription.attributes.description}
                          </Text>
                        )}
                        <View style={styles.chipsRow}>
                          <Chip 
                            compact 
                            icon={subscription.attributes.active ? 'check-circle' : 'pause-circle'}
                            style={styles.chip}
                            textStyle={{ fontSize: 11 }}
                          >
                            {subscription.attributes.active ? 'Active' : 'Inactive'}
                          </Chip>
                          <Chip 
                            compact 
                            icon="calendar-repeat"
                            style={styles.chip}
                            textStyle={{ fontSize: 11 }}
                          >
                            {repetitionText}
                          </Chip>
                        </View>
                      </View>
                    </View>
                    <View style={styles.subscriptionRight}>
                      {transaction && (
                        <>
                          <Text 
                            variant="headlineSmall" 
                            style={{ 
                              color: '#FF5252',
                              fontWeight: 'bold',
                              textAlign: 'right',
                            }}
                          >
                            {transaction.currency_code} {amount.toFixed(2)}
                          </Text>
                          <Text variant="bodySmall" style={{ opacity: 0.6, marginTop: 4 }}>
                            per {repetitionText.toLowerCase()}
                          </Text>
                        </>
                      )}
                    </View>
                  </View>

                  {transaction && (
                    <View style={styles.detailsRow}>
                      <View style={styles.detailItem}>
                        <Text variant="bodySmall" style={{ opacity: 0.6 }}>From</Text>
                        <Text variant="bodyMedium">{transaction.source_name}</Text>
                      </View>
                      <MaterialCommunityIcons 
                        name="arrow-right" 
                        size={20} 
                        color={theme.colors.onSurfaceVariant} 
                      />
                      <View style={styles.detailItem}>
                        <Text variant="bodySmall" style={{ opacity: 0.6 }}>To</Text>
                        <Text variant="bodyMedium">{transaction.destination_name}</Text>
                      </View>
                    </View>
                  )}

                  <View style={styles.dateRow}>
                    <View>
                      <Text variant="bodySmall" style={{ opacity: 0.6 }}>First Date</Text>
                      <Text variant="bodyMedium">
                        {new Date(subscription.attributes.first_date).toLocaleDateString()}
                      </Text>
                    </View>
                    {subscription.attributes.latest_date && (
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text variant="bodySmall" style={{ opacity: 0.6 }}>Latest Date</Text>
                        <Text variant="bodyMedium">
                          {new Date(subscription.attributes.latest_date).toLocaleDateString()}
                        </Text>
                      </View>
                    )}
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
  subscriptionCard: {
    marginBottom: 16,
  },
  subscriptionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  subscriptionLeft: {
    flexDirection: 'row',
    flex: 1,
  },
  subscriptionInfo: {
    marginLeft: 12,
    flex: 1,
  },
  subscriptionRight: {
    alignItems: 'flex-end',
    marginLeft: 12,
  },
  chipsRow: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 6,
  },
  chip: {
    height: 24,
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 12,
    backgroundColor: 'rgba(0,0,0,0.02)',
    borderRadius: 8,
    marginBottom: 12,
  },
  detailItem: {
    alignItems: 'center',
  },
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
});

