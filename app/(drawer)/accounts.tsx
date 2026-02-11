// Accounts Screen
import { NetWorthCard } from "@/components/dashboard/net-worth-card";
import { GlassCard } from "@/components/glass-card";
import { useCachedAccountsQuery } from "@/hooks/use-cached-query";
import { apiClient } from "@/lib/api-client";
import { formatAmount } from "@/lib/format-currency";
import { queryClient } from "@/lib/query-client";
import { useStore } from "@/lib/store";
import { filterAccountsByType } from "@/lib/utils";
import { Account, FireflyApiResponse } from "@/types";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { useRouter, type Href } from "expo-router";
import React, { memo, useCallback, useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Dimensions,
  FlatList,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { Card, Chip, Searchbar, Text, useTheme } from "react-native-paper";

import type { AccountTypeFilter } from "@/lib/utils";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const ACCOUNT_TYPE_TABS: { key: AccountTypeFilter; label: string }[] = [
  { key: "asset", label: "Assets" },
  { key: "expense", label: "Expenses" },
  { key: "revenue", label: "Revenue" },
  { key: "liabilities", label: "Liabilities" },
];

function getAccountIcon(type: string): string {
  switch (type.toLowerCase()) {
    case "asset":
    case "cash":
      return "wallet";
    case "revenue":
      return "arrow-down-circle";
    case "expense":
      return "arrow-up-circle";
    case "liability":
    case "liabilities":
      return "credit-card";
    default:
      return "bank";
  }
}

function getAccountTypeColor(type: string, primaryColor: string): string {
  switch (type.toLowerCase()) {
    case "asset":
    case "cash":
      return primaryColor;
    case "revenue":
      return "#64B5F6";
    case "expense":
      return "#FF5252";
    case "liability":
    case "liabilities":
      return "#FFB74D";
    default:
      return primaryColor;
  }
}

// Memoized Account Item Component
interface AccountItemProps {
  account: Account;
  balanceVisible: boolean;
  primaryColor: string;
  onSurfaceVariantColor: string;
  onPress: () => void;
  onLongPress: () => void;
}

const AccountItem = memo(
  function AccountItem({
    account,
    balanceVisible,
    primaryColor,
    onSurfaceVariantColor,
    onPress,
    onLongPress,
  }: AccountItemProps) {
    const balance = parseFloat(account.attributes.current_balance);
    const isPositive = balance >= 0;
    const typeColor = getAccountTypeColor(
      account.attributes.type,
      primaryColor
    );

    return (
      <Pressable
        onPress={onPress}
        onLongPress={onLongPress}
        delayLongPress={400}
        style={({ pressed }) => [
          styles.accountCard,
          pressed && styles.accountCardPressed,
        ]}
      >
        <GlassCard variant="default" style={styles.accountCardInner}>
          <Card.Content>
            <View style={styles.accountHeader}>
              <View style={styles.accountLeft}>
                <MaterialCommunityIcons
                  name={
                    getAccountIcon(
                      account.attributes.type
                    ) as keyof typeof MaterialCommunityIcons.glyphMap
                  }
                  size={40}
                  color={typeColor}
                />
                <View style={styles.accountInfo}>
                  <Text variant="titleMedium" style={styles.accountName}>
                    {account.attributes.name}
                  </Text>
                  <View style={styles.accountMeta}>
                    <View style={styles.chipWrapper}>
                      <Chip
                        compact
                        style={styles.chip}
                        textStyle={styles.chipText}
                      >
                        {account.attributes.type}
                      </Chip>
                    </View>
                  </View>
                </View>
              </View>
              <View style={styles.accountRight}>
                <Text
                  variant="titleMedium"
                  style={[
                    styles.accountBalance,
                    { color: isPositive ? primaryColor : "#FF5252" },
                  ]}
                >
                  {account.attributes.currency_code}{" "}
                  {balanceVisible ? formatAmount(balance) : "••••••"}
                </Text>
                <View style={styles.accountStatus}>
                  <MaterialCommunityIcons
                    name={
                      account.attributes.active
                        ? "check-circle"
                        : "pause-circle"
                    }
                    size={16}
                    color={
                      account.attributes.active
                        ? primaryColor
                        : onSurfaceVariantColor
                    }
                  />
                  <Text variant="bodySmall" style={styles.statusText}>
                    {account.attributes.active ? "Active" : "Inactive"}
                  </Text>
                </View>
              </View>
            </View>
          </Card.Content>
        </GlassCard>
      </Pressable>
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.account.id === nextProps.account.id &&
      prevProps.account.attributes.updated_at ===
        nextProps.account.attributes.updated_at &&
      prevProps.balanceVisible === nextProps.balanceVisible &&
      prevProps.primaryColor === nextProps.primaryColor &&
      prevProps.onSurfaceVariantColor === nextProps.onSurfaceVariantColor
    );
  }
);

// Context Menu Card Component (shown in modal)
interface ContextMenuCardProps {
  account: Account;
  balanceVisible: boolean;
  primaryColor: string;
  onSurfaceVariantColor: string;
  onEdit: () => void;
  onDelete: () => void;
  onClose: () => void;
}

function ContextMenuCard({
  account,
  balanceVisible,
  primaryColor,
  onSurfaceVariantColor,
  onEdit,
  onDelete,
  onClose,
}: ContextMenuCardProps) {
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  React.useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 8,
      tension: 100,
      useNativeDriver: true,
    }).start();
  }, [scaleAnim]);

  const balance = parseFloat(account.attributes.current_balance);
  const isPositive = balance >= 0;
  const typeColor = getAccountTypeColor(account.attributes.type, primaryColor);

  return (
    <Animated.View
      style={[
        styles.contextMenuContainer,
        {
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      {/* Account Card Preview */}
      <View style={styles.contextMenuCard}>
        <GlassCard variant="elevated" style={styles.contextMenuCardInner}>
          <Card.Content>
            <View style={styles.accountHeader}>
              <View style={styles.accountLeft}>
                <MaterialCommunityIcons
                  name={
                    getAccountIcon(
                      account.attributes.type
                    ) as keyof typeof MaterialCommunityIcons.glyphMap
                  }
                  size={40}
                  color={typeColor}
                />
                <View style={styles.accountInfo}>
                  <Text variant="titleMedium" style={styles.accountName}>
                    {account.attributes.name}
                  </Text>
                  <View style={styles.accountMeta}>
                    <View style={styles.chipWrapper}>
                      <Chip
                        compact
                        style={styles.chip}
                        textStyle={styles.chipText}
                      >
                        {account.attributes.type}
                      </Chip>
                    </View>
                  </View>
                </View>
              </View>
              <View style={styles.accountRight}>
                <Text
                  variant="titleMedium"
                  style={[
                    styles.accountBalance,
                    { color: isPositive ? primaryColor : "#FF5252" },
                  ]}
                >
                  {account.attributes.currency_code}{" "}
                  {balanceVisible ? formatAmount(balance) : "••••••"}
                </Text>
                <View style={styles.accountStatus}>
                  <MaterialCommunityIcons
                    name={
                      account.attributes.active
                        ? "check-circle"
                        : "pause-circle"
                    }
                    size={16}
                    color={
                      account.attributes.active
                        ? primaryColor
                        : onSurfaceVariantColor
                    }
                  />
                  <Text variant="bodySmall" style={styles.statusText}>
                    {account.attributes.active ? "Active" : "Inactive"}
                  </Text>
                </View>
              </View>
            </View>
          </Card.Content>
        </GlassCard>
      </View>

      {/* Action Buttons */}
      <View style={styles.contextMenuActions}>
        <Pressable
          onPress={onEdit}
          style={({ pressed }) => [
            styles.contextMenuButton,
            styles.editButton,
            pressed && styles.contextMenuButtonPressed,
          ]}
        >
          <MaterialCommunityIcons name="pencil" size={20} color="#FFFFFF" />
          <Text style={[styles.contextMenuButtonText, styles.editButtonText]}>
            Edit Account
          </Text>
        </Pressable>

        <Pressable
          onPress={onDelete}
          style={({ pressed }) => [
            styles.contextMenuButton,
            styles.deleteButton,
            pressed && styles.contextMenuButtonPressed,
          ]}
        >
          <MaterialCommunityIcons
            name="delete-outline"
            size={20}
            color="#FFFFFF"
          />
          <Text style={[styles.contextMenuButtonText, styles.deleteButtonText]}>
            Delete Account
          </Text>
        </Pressable>

        <Pressable
          onPress={onClose}
          style={({ pressed }) => [
            styles.contextMenuButton,
            styles.cancelButton,
            pressed && styles.contextMenuButtonPressed,
          ]}
        >
          <MaterialCommunityIcons name="close" size={20} color="#FFFFFF" />
          <Text style={[styles.contextMenuButtonText, styles.cancelButtonText]}>
            Cancel
          </Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

// Selectors for store to prevent unnecessary re-renders
const selectBalanceVisible = (state: { balanceVisible: boolean }) =>
  state.balanceVisible;
const selectToggleBalanceVisibility = (state: {
  toggleBalanceVisibility: () => void;
}) => state.toggleBalanceVisibility;

export default function AccountsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const balanceVisible = useStore(selectBalanceVisible);
  const toggleBalanceVisibility = useStore(selectToggleBalanceVisibility);
  const [selectedAccountType, setSelectedAccountType] =
    useState<AccountTypeFilter>("asset");
  const [searchQuery, setSearchQuery] = useState("");

  // Context menu state
  const [contextMenuAccount, setContextMenuAccount] = useState<Account | null>(
    null
  );
  const [contextMenuVisible, setContextMenuVisible] = useState(false);

  const {
    data: accountsData,
    isLoading: accountsLoading,
    refetch: refetchAccounts,
  } = useCachedAccountsQuery<FireflyApiResponse<Account[]>>(
    ["all-accounts"],
    () => apiClient.getAllAccounts("all")
  );

  const allAccounts = useMemo(
    () => accountsData?.data ?? [],
    [accountsData?.data]
  );

  const currencyBalancesForNetWorth = useMemo(() => {
    const byCode: Record<
      string,
      { symbol: string; code: string; total: number }
    > = {};
    // Net worth = Assets - Liabilities (per currency)
    const asset = filterAccountsByType(allAccounts, "asset");
    for (let i = 0; i < asset.length; i++) {
      const acc = asset[i];
      const code = acc.attributes.currency_code;
      const symbol = acc.attributes.currency_symbol ?? code;
      const balance = parseFloat(acc.attributes.current_balance);
      if (!byCode[code]) byCode[code] = { symbol, code, total: 0 };
      byCode[code].total += balance;
    }
    const liabilities = filterAccountsByType(allAccounts, "liabilities");
    for (let i = 0; i < liabilities.length; i++) {
      const acc = liabilities[i];
      const code = acc.attributes.currency_code;
      const symbol = acc.attributes.currency_symbol ?? code;
      const balance = parseFloat(acc.attributes.debt_amount ?? "0");
      if (!byCode[code]) byCode[code] = { symbol, code, total: 0 };
      byCode[code].total -= balance;
    }
    return Object.values(byCode).filter((c) => c.total !== 0);
  }, [allAccounts]);

  const filteredByType = useMemo(
    () => filterAccountsByType(allAccounts, selectedAccountType),
    [allAccounts, selectedAccountType]
  );

  const filteredBySearch = useMemo(() => {
    if (!searchQuery.trim()) return filteredByType;
    const q = searchQuery.trim().toLowerCase();
    return filteredByType.filter(
      (acc) =>
        acc.attributes.name.toLowerCase().includes(q) ||
        acc.attributes.iban?.toLowerCase().includes(q) ||
        acc.attributes.account_number?.toLowerCase().includes(q)
    );
  }, [filteredByType, searchQuery]);

  // Extract colors for stable references
  const primaryColor = theme.colors.primary;
  const onSurfaceVariantColor = theme.colors.onSurfaceVariant;

  const listHeader = useMemo(
    () => (
      <>
        <NetWorthCard
          title="Net Worth"
          currencyBalances={currencyBalancesForNetWorth}
          balanceVisible={balanceVisible}
          toggleBalanceVisibility={toggleBalanceVisibility}
        />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tabsScroll}
          contentContainerStyle={styles.tabsContent}
        >
          {ACCOUNT_TYPE_TABS.map(({ key, label }) => (
            <Chip
              key={key}
              selected={selectedAccountType === key}
              onPress={() => setSelectedAccountType(key)}
              style={[
                styles.tabChip,
                selectedAccountType === key && {
                  backgroundColor: theme.colors.primaryContainer,
                },
              ]}
              textStyle={
                selectedAccountType === key
                  ? { color: theme.colors.onPrimaryContainer }
                  : undefined
              }
            >
              {label}
            </Chip>
          ))}
        </ScrollView>
        <Searchbar
          placeholder="Search accounts by name, IBAN..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={[
            styles.searchBar,
            { backgroundColor: theme.colors.surfaceVariant },
          ]}
          iconColor={theme.colors.onSurfaceVariant}
          placeholderTextColor={theme.colors.onSurfaceVariant}
          inputStyle={{ color: theme.colors.onSurface }}
        />
      </>
    ),
    [
      currencyBalancesForNetWorth,
      balanceVisible,
      toggleBalanceVisibility,
      selectedAccountType,
      searchQuery,
      theme,
    ]
  );

  const listEmpty = useMemo(() => {
    if (accountsLoading) {
      return (
        <View style={styles.centerContent}>
          <Text>Loading accounts...</Text>
        </View>
      );
    }
    return (
      <View style={styles.emptyState}>
        <MaterialCommunityIcons
          name="bank-plus"
          size={64}
          color={theme.colors.onSurfaceVariant}
        />
        <Text variant="headlineSmall" style={{ marginTop: 16 }}>
          No accounts found
        </Text>
        <Text variant="bodyMedium" style={{ marginTop: 8, opacity: 0.6 }}>
          {filteredByType.length === 0
            ? `No ${ACCOUNT_TYPE_TABS.find((t) => t.key === selectedAccountType)?.label ?? selectedAccountType} accounts`
            : "Try a different search term"}
        </Text>
      </View>
    );
  }, [
    accountsLoading,
    filteredByType.length,
    selectedAccountType,
    theme.colors.onSurfaceVariant,
  ]);

  // Context menu handlers
  const handleLongPress = useCallback((account: Account) => {
    setContextMenuAccount(account);
    setContextMenuVisible(true);
  }, []);

  const handleCloseContextMenu = useCallback(() => {
    setContextMenuVisible(false);
    setContextMenuAccount(null);
  }, []);

  const handleEditAccount = useCallback(() => {
    if (contextMenuAccount) {
      setContextMenuVisible(false);
      router.push(`/(drawer)/account/edit/${contextMenuAccount.id}` as Href);
      setContextMenuAccount(null);
    }
  }, [contextMenuAccount, router]);

  const handleDeleteAccount = useCallback(() => {
    if (!contextMenuAccount) return;
    const accountName = contextMenuAccount.attributes.name;
    const accountId = contextMenuAccount.id;
    Alert.alert(
      "Delete Account",
      `Delete "${accountName}"? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setContextMenuVisible(false);
            setContextMenuAccount(null);
            try {
              await apiClient.deleteAccount(accountId);
              const { cachedAccounts, setCachedAccounts } = useStore.getState();
              const accountsArray = Array.isArray(cachedAccounts)
                ? cachedAccounts
                : cachedAccounts &&
                    typeof cachedAccounts === "object" &&
                    "data" in cachedAccounts
                  ? (cachedAccounts as { data: Account[] }).data
                  : [];
              if (accountsArray.length > 0) {
                setCachedAccounts(
                  accountsArray.filter((a) => a.id !== accountId)
                );
              }
              queryClient.invalidateQueries({ queryKey: ["all-accounts"] });
              Alert.alert("Success", "Account deleted successfully");
            } catch (error) {
              console.error("Failed to delete account:", error);
              const message =
                error instanceof Error
                  ? error.message
                  : "Failed to delete account";
              Alert.alert("Error", message);
            }
          },
        },
      ]
    );
  }, [contextMenuAccount]);

  // Memoized render function using the AccountItem component
  const renderAccountItem = useCallback(
    ({ item: account }: { item: Account }) => (
      <AccountItem
        account={account}
        balanceVisible={balanceVisible}
        primaryColor={primaryColor}
        onSurfaceVariantColor={onSurfaceVariantColor}
        onPress={() =>
          router.push(
            `/(drawer)/transactions?accountId=${account.id}&accountName=${encodeURIComponent(account.attributes.name)}` as Href
          )
        }
        onLongPress={() => handleLongPress(account)}
      />
    ),
    [
      balanceVisible,
      primaryColor,
      onSurfaceVariantColor,
      router,
      handleLongPress,
    ]
  );

  // Stable key extractor
  const keyExtractor = useCallback((item: Account) => item.id, []);

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <FlatList
        data={filteredBySearch}
        extraData={balanceVisible}
        keyExtractor={keyExtractor}
        renderItem={renderAccountItem}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={listEmpty}
        contentContainerStyle={styles.listContent}
        removeClippedSubviews={true}
        maxToRenderPerBatch={12}
        windowSize={6}
        initialNumToRender={10}
        updateCellsBatchingPeriod={50}
        refreshControl={
          <RefreshControl
            refreshing={accountsLoading}
            onRefresh={refetchAccounts}
          />
        }
      />

      {/* Context Menu Modal with Blur */}
      <Modal
        visible={contextMenuVisible}
        transparent
        animationType="fade"
        onRequestClose={handleCloseContextMenu}
      >
        <Pressable style={styles.modalOverlay} onPress={handleCloseContextMenu}>
          {Platform.OS === "ios" ? (
            <BlurView
              intensity={80}
              tint="dark"
              style={StyleSheet.absoluteFill}
            />
          ) : (
            <View style={styles.androidBlurOverlay} />
          )}
          <Pressable onPress={(e) => e.stopPropagation()}>
            {contextMenuAccount && (
              <ContextMenuCard
                account={contextMenuAccount}
                balanceVisible={balanceVisible}
                primaryColor={primaryColor}
                onSurfaceVariantColor={onSurfaceVariantColor}
                onEdit={handleEditAccount}
                onDelete={handleDeleteAccount}
                onClose={handleCloseContextMenu}
              />
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  tabsScroll: {
    marginBottom: 12,
    maxHeight: 48,
  },
  tabsContent: {
    flexDirection: "row",
    gap: 8,
    paddingVertical: 4,
  },
  tabChip: {
    marginRight: 4,
  },
  searchBar: {
    marginBottom: 16,
    elevation: 0,
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
  accountCard: {
    marginBottom: 12,
  },
  accountCardPressed: {
    opacity: 0.85,
  },
  accountCardInner: {
    flex: 1,
  },
  accountHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  accountLeft: {
    flexDirection: "row",
    alignItems: "flex-start",
    flex: 1,
    minWidth: 0,
  },
  accountInfo: {
    marginLeft: 12,
    flex: 1,
    minWidth: 0,
  },
  accountMeta: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    flexWrap: "wrap",
  },
  chipWrapper: {
    flexShrink: 0,
  },
  accountRight: {
    alignItems: "flex-end",
    justifyContent: "flex-start",
    marginLeft: 12,
  },
  accountName: {
    fontWeight: "bold",
  },
  accountBalance: {
    fontWeight: "bold",
  },
  accountStatus: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
  },
  statusText: {
    marginLeft: 4,
    opacity: 0.6,
  },
  chip: {
    height: 28,
    justifyContent: "center" as const,
  },
  chipText: {
    fontSize: 11,
    lineHeight: 16,
  },
  // Context menu styles
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  androidBlurOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.85)",
  },
  contextMenuContainer: {
    width: SCREEN_WIDTH - 48,
    maxWidth: 400,
  },
  contextMenuCard: {
    marginBottom: 16,
  },
  contextMenuCardInner: {
    borderWidth: 1,
    borderColor: "rgba(29, 185, 84, 0.3)",
  },
  contextMenuActions: {
    gap: 10,
  },
  contextMenuButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  contextMenuButtonPressed: {
    opacity: 0.92,
  },
  editButton: {
    backgroundColor: "#1DB954",
    borderColor: "#1DB954",
  },
  deleteButton: {
    backgroundColor: "#E53935",
    borderColor: "#C62828",
  },
  cancelButton: {
    backgroundColor: "#525252",
    borderColor: "#6B6B6B",
  },
  contextMenuButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  editButtonText: {
    color: "#FFFFFF",
  },
  deleteButtonText: {
    color: "#FFFFFF",
  },
  cancelButtonText: {
    color: "#FFFFFF",
  },
});
