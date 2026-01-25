// Reports & Insights Screen
import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Card, Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { GlassCard } from '@/components/glass-card';

export default function ReportsScreen() {
  const theme = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.comingSoon}>
          <MaterialCommunityIcons 
            name="chart-bar" 
            size={80} 
            color={theme.colors.primary} 
          />
          <Text variant="displaySmall" style={{ marginTop: 24, fontWeight: 'bold' }}>
            Reports & Insights
          </Text>
          <Text 
            variant="bodyLarge" 
            style={{ marginTop: 16, opacity: 0.7, textAlign: 'center', paddingHorizontal: 32 }}
          >
            Advanced reporting and analytics features coming soon!
          </Text>
          
          <GlassCard variant="elevated" style={styles.featureCard}>
            <Card.Content>
              <Text variant="titleMedium" style={{ fontWeight: 'bold', marginBottom: 12 }}>
                Upcoming Features
              </Text>
              <View style={styles.featureItem}>
                <MaterialCommunityIcons name="chart-line" size={24} color={theme.colors.primary} />
                <Text variant="bodyMedium" style={{ marginLeft: 12, flex: 1 }}>
                  Spending trends over time
                </Text>
              </View>
              <View style={styles.featureItem}>
                <MaterialCommunityIcons name="chart-pie" size={24} color={theme.colors.primary} />
                <Text variant="bodyMedium" style={{ marginLeft: 12, flex: 1 }}>
                  Category breakdown analysis
                </Text>
              </View>
              <View style={styles.featureItem}>
                <MaterialCommunityIcons name="compare" size={24} color={theme.colors.primary} />
                <Text variant="bodyMedium" style={{ marginLeft: 12, flex: 1 }}>
                  Month-over-month comparisons
                </Text>
              </View>
              <View style={styles.featureItem}>
                <MaterialCommunityIcons name="cash-multiple" size={24} color={theme.colors.primary} />
                <Text variant="bodyMedium" style={{ marginLeft: 12, flex: 1 }}>
                  Cash flow projections
                </Text>
              </View>
              <View style={styles.featureItem}>
                <MaterialCommunityIcons name="file-export" size={24} color={theme.colors.primary} />
                <Text variant="bodyMedium" style={{ marginLeft: 12, flex: 1 }}>
                  Export reports to PDF/CSV
                </Text>
              </View>
            </Card.Content>
          </GlassCard>
        </View>
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
  },
  comingSoon: {
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: 24,
  },
  featureCard: {
    marginTop: 32,
    width: '100%',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
});

