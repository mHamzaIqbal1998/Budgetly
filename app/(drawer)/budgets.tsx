// Budgets Screen
import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { 
  Card, 
  Text, 
  FAB, 
  Portal, 
  Modal, 
  TextInput, 
  Button, 
  useTheme,
  ProgressBar,
  Switch,
  IconButton,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { CreateBudgetData } from '@/types/firefly';
import { GlassCard } from '@/components/glass-card';

export default function BudgetsScreen() {
  const theme = useTheme();
  const queryClient = useQueryClient();
  
  const [modalVisible, setModalVisible] = useState(false);
  const [name, setName] = useState('');
  const [active, setActive] = useState(true);

  // Fetch budgets
  const { data: budgetsData, isLoading, refetch } = useQuery({
    queryKey: ['budgets'],
    queryFn: () => apiClient.getBudgets(),
  });

  // Create budget mutation
  const createMutation = useMutation({
    mutationFn: (data: CreateBudgetData) => apiClient.createBudget(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      resetForm();
      setModalVisible(false);
    },
  });

  // Delete budget mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.deleteBudget(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
    },
  });

  const resetForm = () => {
    setName('');
    setActive(true);
  };

  const handleSubmit = () => {
    if (!name) {
      return;
    }

    const budgetData: CreateBudgetData = {
      name,
      active,
    };

    createMutation.mutate(budgetData);
  };

  const calculateProgress = (spent: any[], limit?: string) => {
    if (!spent || spent.length === 0 || !limit) return 0;
    const spentAmount = Math.abs(parseFloat(spent[0].amount));
    const limitAmount = parseFloat(limit);
    return limitAmount > 0 ? spentAmount / limitAmount : 0;
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
            <Text>Loading budgets...</Text>
          </View>
        ) : budgetsData?.data.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons 
              name="wallet-plus" 
              size={64} 
              color={theme.colors.onSurfaceVariant} 
            />
            <Text variant="headlineSmall" style={{ marginTop: 16 }}>No budgets yet</Text>
            <Text variant="bodyMedium" style={{ marginTop: 8, opacity: 0.6, textAlign: 'center' }}>
              Create your first budget to start tracking your spending
            </Text>
          </View>
        ) : (
          budgetsData?.data.map((budget) => {
            const spent = budget.attributes.spent?.[0];
            const spentAmount = spent ? Math.abs(parseFloat(spent.amount)) : 0;
            const progress = budget.attributes.auto_budget_amount 
              ? calculateProgress(budget.attributes.spent || [], budget.attributes.auto_budget_amount)
              : 0;

            return (
              <GlassCard key={budget.id} variant="elevated" style={styles.budgetCard}>
                <Card.Content>
                  <View style={styles.budgetHeader}>
                    <View style={{ flex: 1 }}>
                      <Text variant="titleLarge" style={{ fontWeight: 'bold' }}>
                        {budget.attributes.name}
                      </Text>
                      {budget.attributes.auto_budget_period && (
                        <Text variant="bodySmall" style={{ opacity: 0.6, marginTop: 4 }}>
                          Period: {budget.attributes.auto_budget_period}
                        </Text>
                      )}
                    </View>
                    <View style={styles.budgetActions}>
                      <MaterialCommunityIcons
                        name={budget.attributes.active ? 'check-circle' : 'circle-outline'}
                        size={24}
                        color={budget.attributes.active ? theme.colors.primary : theme.colors.onSurfaceVariant}
                      />
                      <IconButton
                        icon="delete"
                        size={20}
                        onPress={() => deleteMutation.mutate(budget.id)}
                      />
                    </View>
                  </View>

                  {spent && (
                    <>
                      <View style={styles.budgetAmounts}>
                        <View>
                          <Text variant="bodySmall" style={{ opacity: 0.6 }}>Spent</Text>
                          <Text variant="titleMedium" style={{ color: '#FF5252', fontWeight: 'bold' }}>
                            {spent.currency_symbol}{spentAmount.toFixed(2)}
                          </Text>
                        </View>
                        {budget.attributes.auto_budget_amount && (
                          <View style={{ alignItems: 'flex-end' }}>
                            <Text variant="bodySmall" style={{ opacity: 0.6 }}>Budget</Text>
                            <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>
                              {spent.currency_symbol}{budget.attributes.auto_budget_amount}
                            </Text>
                          </View>
                        )}
                      </View>
                      {budget.attributes.auto_budget_amount && (
                        <>
                          <ProgressBar 
                            progress={Math.min(progress, 1)} 
                            color={progress > 0.9 ? '#FF5252' : progress > 0.7 ? '#FFB74D' : theme.colors.primary}
                            style={styles.progressBar}
                          />
                          <Text variant="bodySmall" style={{ textAlign: 'right', marginTop: 4 }}>
                            {(progress * 100).toFixed(0)}% used
                          </Text>
                        </>
                      )}
                    </>
                  )}
                </Card.Content>
              </GlassCard>
            );
          })
        )}
        <View style={{ height: 80 }} />
      </ScrollView>

      {/* Add Budget FAB */}
      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => setModalVisible(true)}
      />

      {/* Add Budget Modal */}
      <Portal>
        <Modal
          visible={modalVisible}
          onDismiss={() => {
            setModalVisible(false);
            resetForm();
          }}
          contentContainerStyle={[styles.modal, { backgroundColor: theme.colors.surface }]}
        >
          <Text variant="headlineSmall" style={styles.modalTitle}>
            Create Budget
          </Text>

          <TextInput
            label="Budget Name"
            value={name}
            onChangeText={setName}
            mode="outlined"
            style={styles.input}
            placeholder="e.g., Groceries, Entertainment"
          />

          <View style={styles.switchContainer}>
            <Text variant="bodyLarge">Active</Text>
            <Switch value={active} onValueChange={setActive} />
          </View>

          <View style={styles.modalActions}>
            <Button 
              mode="outlined" 
              onPress={() => {
                setModalVisible(false);
                resetForm();
              }}
              style={{ flex: 1 }}
            >
              Cancel
            </Button>
            <Button 
              mode="contained" 
              onPress={handleSubmit}
              loading={createMutation.isPending}
              disabled={createMutation.isPending || !name}
              style={{ flex: 1 }}
            >
              Create
            </Button>
          </View>
        </Modal>
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
  budgetCard: {
    marginBottom: 12,
  },
  budgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  budgetActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  budgetAmounts: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
  },
  modal: {
    margin: 20,
    padding: 20,
    borderRadius: 8,
  },
  modalTitle: {
    marginBottom: 16,
    fontWeight: 'bold',
  },
  input: {
    marginBottom: 12,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
});

