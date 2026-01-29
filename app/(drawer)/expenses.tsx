// Expenses Screen with CRUD Operations
import { GlassCard } from "@/components/glass-card";
import { apiClient } from "@/lib/api-client";
import { CreateTransactionData } from "@/types";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React, { useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import {
  Button,
  Card,
  Chip,
  FAB,
  IconButton,
  Modal,
  Portal,
  Searchbar,
  Text,
  TextInput,
  useTheme,
} from "react-native-paper";

export default function ExpensesScreen() {
  const theme = useTheme();
  const queryClient = useQueryClient();

  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);

  // Form state
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [type, setType] = useState<"withdrawal" | "deposit" | "transfer">(
    "withdrawal"
  );

  // Fetch transactions
  const {
    data: transactionsData,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["transactions"],
    queryFn: () => apiClient.getTransactions(1),
  });

  // Create transaction mutation
  const createMutation = useMutation({
    mutationFn: (data: CreateTransactionData) =>
      apiClient.createTransaction(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      resetForm();
      setModalVisible(false);
    },
  });

  // Delete transaction mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.deleteTransaction(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
  });

  const resetForm = () => {
    setDescription("");
    setAmount("");
    setDate(new Date().toISOString().split("T")[0]);
    setType("withdrawal");
    setSelectedTransaction(null);
  };

  const handleSubmit = () => {
    if (!description || !amount) {
      return;
    }

    const transactionData: CreateTransactionData = {
      transactions: [
        {
          type,
          date,
          amount,
          description,
          source_name: type === "withdrawal" ? "Cash Account" : undefined,
          destination_name: type === "deposit" ? "Cash Account" : undefined,
        },
      ],
    };

    createMutation.mutate(transactionData);
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id);
  };

  const getTransactionIcon = (txType: string) => {
    switch (txType.toLowerCase()) {
      case "withdrawal":
        return "arrow-up-circle";
      case "deposit":
        return "arrow-down-circle";
      case "transfer":
        return "swap-horizontal-circle";
      default:
        return "cash";
    }
  };

  const getTransactionColor = (txType: string) => {
    switch (txType.toLowerCase()) {
      case "withdrawal":
        return "#FF5252";
      case "deposit":
        return theme.colors.primary;
      case "transfer":
        return "#64B5F6";
      default:
        return theme.colors.onSurface;
    }
  };

  // Filter transactions based on search
  const filteredTransactions = transactionsData?.data.filter((transaction) => {
    const searchLower = searchQuery.toLowerCase();
    return transaction.attributes.transactions.some(
      (t) =>
        t.description.toLowerCase().includes(searchLower) ||
        t.amount.includes(searchQuery)
    );
  });

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Search transactions..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchBar}
        />
      </View>

      {/* Transactions List */}
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refetch} />
        }
      >
        {isLoading ? (
          <View style={styles.centerContent}>
            <Text>Loading transactions...</Text>
          </View>
        ) : filteredTransactions?.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons
              name="cash-remove"
              size={64}
              color={theme.colors.onSurfaceVariant}
            />
            <Text variant="headlineSmall" style={{ marginTop: 16 }}>
              No transactions yet
            </Text>
            <Text variant="bodyMedium" style={{ marginTop: 8, opacity: 0.6 }}>
              Tap the + button to add your first transaction
            </Text>
          </View>
        ) : (
          filteredTransactions?.map((transaction) => {
            const tx = transaction.attributes.transactions[0];
            return (
              <GlassCard
                key={transaction.id}
                variant="default"
                style={styles.transactionCard}
              >
                <Card.Content style={styles.transactionContent}>
                  <View style={styles.transactionLeft}>
                    <MaterialCommunityIcons
                      name={getTransactionIcon(tx.type)}
                      size={40}
                      color={getTransactionColor(tx.type)}
                    />
                    <View style={styles.transactionInfo}>
                      <Text variant="titleMedium">{tx.description}</Text>
                      <Text variant="bodySmall" style={{ opacity: 0.6 }}>
                        {new Date(tx.date).toLocaleDateString()}
                      </Text>
                      {tx.category_name && (
                        <Chip compact style={styles.chip}>
                          {tx.category_name}
                        </Chip>
                      )}
                    </View>
                  </View>
                  <View style={styles.transactionRight}>
                    <Text
                      variant="titleLarge"
                      style={{
                        color: getTransactionColor(tx.type),
                        fontWeight: "bold",
                      }}
                    >
                      {tx.type === "withdrawal" ? "-" : "+"}
                      {tx.currency_symbol}
                      {tx.amount}
                    </Text>
                    <IconButton
                      icon="delete"
                      size={20}
                      onPress={() => handleDelete(transaction.id)}
                    />
                  </View>
                </Card.Content>
              </GlassCard>
            );
          })
        )}
        <View style={{ height: 80 }} />
      </ScrollView>

      {/* Add Transaction FAB */}
      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => setModalVisible(true)}
      />

      {/* Add/Edit Modal */}
      <Portal>
        <Modal
          visible={modalVisible}
          onDismiss={() => {
            setModalVisible(false);
            resetForm();
          }}
          contentContainerStyle={[
            styles.modal,
            { backgroundColor: theme.colors.surface },
          ]}
        >
          <Text variant="headlineSmall" style={styles.modalTitle}>
            Add Transaction
          </Text>

          <View style={styles.typeSelector}>
            <Chip
              selected={type === "withdrawal"}
              onPress={() => setType("withdrawal")}
              style={styles.typeChip}
            >
              Expense
            </Chip>
            <Chip
              selected={type === "deposit"}
              onPress={() => setType("deposit")}
              style={styles.typeChip}
            >
              Income
            </Chip>
            <Chip
              selected={type === "transfer"}
              onPress={() => setType("transfer")}
              style={styles.typeChip}
            >
              Transfer
            </Chip>
          </View>

          <TextInput
            label="Description"
            value={description}
            onChangeText={setDescription}
            mode="outlined"
            style={styles.input}
          />

          <TextInput
            label="Amount"
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            mode="outlined"
            style={styles.input}
          />

          <TextInput
            label="Date"
            value={date}
            onChangeText={setDate}
            mode="outlined"
            style={styles.input}
            placeholder="YYYY-MM-DD"
          />

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
              disabled={createMutation.isPending}
              style={{ flex: 1 }}
            >
              Add
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
  searchContainer: {
    padding: 16,
    paddingBottom: 8,
  },
  searchBar: {
    elevation: 2,
  },
  scrollView: {
    flex: 1,
    padding: 16,
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
  transactionCard: {
    marginBottom: 12,
  },
  transactionContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  transactionLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  transactionInfo: {
    marginLeft: 12,
    flex: 1,
  },
  transactionRight: {
    alignItems: "flex-end",
  },
  chip: {
    marginTop: 4,
    alignSelf: "flex-start",
  },
  fab: {
    position: "absolute",
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
    fontWeight: "bold",
  },
  typeSelector: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 16,
  },
  typeChip: {
    marginHorizontal: 4,
  },
  input: {
    marginBottom: 12,
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
});
