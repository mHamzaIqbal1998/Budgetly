// Categories Screen – lists all categories with infinite scroll and search
import { GlassCard } from "@/components/glass-card";
import { apiClient } from "@/lib/api-client";
import { queryClient } from "@/lib/query-client";
import type { CategoryRead } from "@/types";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useInfiniteQuery } from "@tanstack/react-query";
import { BlurView } from "expo-blur";
import { useRouter } from "expo-router";
import React, { memo, useCallback, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  FlatList,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from "react-native";
import { Card, Searchbar, Text, useTheme } from "react-native-paper";

// ---------------------------------------------------------------------------
// Types & Constants
// ---------------------------------------------------------------------------

/** Category decorated with flat key for FlatList */
type FlatCategory = CategoryRead & {
  _flatKey: string;
};

// Approximate height of a category card + margin (for getItemLayout)
const ITEM_HEIGHT = 72;
const ITEM_MARGIN = 12;

// Screen width for context menu
const SCREEN_WIDTH = Dimensions.get("window").width;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

// ---------------------------------------------------------------------------
// Memoized Category Item
// ---------------------------------------------------------------------------

interface CategoryItemProps {
  item: FlatCategory;
  surfaceVariantColor: string;
  primaryColor: string;
  onPress: () => void;
  onLongPress: () => void;
}

const CategoryItem = memo(
  function CategoryItem({
    item,
    surfaceVariantColor,
    primaryColor,
    onPress,
    onLongPress,
  }: CategoryItemProps) {
    const attributes = item.attributes;
    const name = attributes.name;
    const notes = attributes.notes;
    const createdAt = formatDate(attributes.created_at);

    return (
      <Pressable
        onPress={onPress}
        onLongPress={onLongPress}
        style={({ pressed }) => pressed && styles.cardPressed}
      >
        <GlassCard variant="default" style={styles.card}>
          <View style={styles.cardInner}>
            <View style={styles.row}>
              <View style={styles.left}>
                <View
                  style={[
                    styles.iconWrap,
                    { backgroundColor: surfaceVariantColor },
                  ]}
                >
                  <MaterialCommunityIcons
                    name="shape"
                    size={22}
                    color={primaryColor}
                  />
                </View>
                <View style={styles.body}>
                  <Text
                    variant="titleSmall"
                    numberOfLines={1}
                    style={styles.name}
                  >
                    {name}
                  </Text>
                  {notes ? (
                    <Text
                      variant="bodySmall"
                      numberOfLines={1}
                      style={styles.notes}
                    >
                      {notes}
                    </Text>
                  ) : null}
                  <Text variant="labelSmall" style={styles.date}>
                    Created {createdAt}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </GlassCard>
      </Pressable>
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.item._flatKey === nextProps.item._flatKey &&
      prevProps.surfaceVariantColor === nextProps.surfaceVariantColor &&
      prevProps.primaryColor === nextProps.primaryColor
    );
  }
);

// ---------------------------------------------------------------------------
// Memoized List Header (search bar)
// ---------------------------------------------------------------------------

interface ListHeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  surfaceVariantColor: string;
  onSurfaceVariantColor: string;
  onSurfaceColor: string;
}

const ListHeader = memo(function ListHeader({
  searchQuery,
  onSearchChange,
  surfaceVariantColor,
  onSurfaceVariantColor,
  onSurfaceColor,
}: ListHeaderProps) {
  return (
    <Searchbar
      placeholder="Search categories..."
      value={searchQuery}
      onChangeText={onSearchChange}
      style={[styles.searchBar, { backgroundColor: surfaceVariantColor }]}
      iconColor={onSurfaceVariantColor}
      placeholderTextColor={onSurfaceVariantColor}
      inputStyle={{ color: onSurfaceColor }}
      right={() => null}
    />
  );
});

// ---------------------------------------------------------------------------
// Context Menu Card (shown on long press)
// ---------------------------------------------------------------------------

interface CategoryContextMenuCardProps {
  item: FlatCategory;
  primaryColor: string;
  errorColor: string;
  surfaceVariantColor: string;
  onEdit: () => void;
  onDelete: () => void;
  onClose: () => void;
}

function CategoryContextMenuCard({
  item,
  primaryColor,
  errorColor,
  surfaceVariantColor,
  onEdit,
  onDelete,
  onClose,
}: CategoryContextMenuCardProps) {
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  React.useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 8,
      tension: 100,
      useNativeDriver: true,
    }).start();
  }, [scaleAnim]);

  const name = item.attributes.name;
  const notes = item.attributes.notes;

  return (
    <Animated.View
      style={[
        styles.contextMenuContainer,
        { transform: [{ scale: scaleAnim }] },
      ]}
    >
      {/* Category Preview Card */}
      <View style={styles.contextMenuCard}>
        <GlassCard variant="elevated" style={styles.contextMenuCardInner}>
          <Card.Content>
            <View style={styles.contextRow}>
              <View style={styles.contextLeft}>
                <View
                  style={[
                    styles.contextIconWrap,
                    { backgroundColor: surfaceVariantColor },
                  ]}
                >
                  <MaterialCommunityIcons
                    name="shape"
                    size={20}
                    color={primaryColor}
                  />
                </View>
                <View style={styles.contextBody}>
                  <Text
                    variant="titleSmall"
                    numberOfLines={1}
                    style={styles.contextName}
                  >
                    {name || "—"}
                  </Text>
                  {notes && (
                    <Text
                      variant="bodySmall"
                      numberOfLines={1}
                      style={styles.contextNotes}
                    >
                      {notes}
                    </Text>
                  )}
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
            Edit Category
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
            Delete Category
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

// ---------------------------------------------------------------------------
// Main Screen
// ---------------------------------------------------------------------------

export default function CategoriesScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [contextMenuCategory, setContextMenuCategory] =
    useState<FlatCategory | null>(null);
  const [contextMenuVisible, setContextMenuVisible] = useState(false);

  // Infinite query: fetches pages of categories from the API
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isRefetching,
    refetch,
  } = useInfiniteQuery({
    queryKey: ["categories"],
    queryFn: ({ pageParam }) => apiClient.getCategories(pageParam),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      const totalPages = lastPage.meta?.pagination?.total_pages ?? 1;
      const currentPage = allPages.length;
      return currentPage < totalPages ? currentPage + 1 : undefined;
    },
  });

  // Flatten all pages into a single list of categories
  const allCategories = useMemo(
    () => data?.pages.flatMap((page) => page.data ?? []) ?? [],
    [data]
  );

  // Transform categories to FlatCategory with unique keys
  const flatData: FlatCategory[] = useMemo(
    () =>
      allCategories.map((category, index) => ({
        ...category,
        _flatKey: `category-${category.id}-${index}`,
      })),
    [allCategories]
  );

  // Client-side search filtering
  const filteredFlatData = useMemo(() => {
    if (!searchQuery.trim()) return flatData;
    const q = searchQuery.trim().toLowerCase();
    return flatData.filter(
      (category) =>
        category.attributes.name?.toLowerCase().includes(q) ||
        category.attributes.notes?.toLowerCase().includes(q)
    );
  }, [flatData, searchQuery]);

  // -----------------------------------------------------------------------
  // Stable callbacks
  // -----------------------------------------------------------------------

  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const handleCategoryPress = useCallback(
    (category: FlatCategory) => {
      router.replace(`/(drawer)/category/${category.id}`);
    },
    [router]
  );

  const handleLongPress = useCallback((item: FlatCategory) => {
    setContextMenuCategory(item);
    setContextMenuVisible(true);
  }, []);

  const handleContextMenuClose = useCallback(() => {
    setContextMenuVisible(false);
    setContextMenuCategory(null);
  }, []);

  const handleEditCategory = useCallback(() => {
    if (!contextMenuCategory) return;
    const categoryId = contextMenuCategory.id;
    setContextMenuVisible(false);
    setContextMenuCategory(null);
    router.push(`/(drawer)/category/edit/${categoryId}`);
  }, [contextMenuCategory, router]);

  const handleDeleteCategory = useCallback(() => {
    if (!contextMenuCategory) return;
    const categoryName = contextMenuCategory.attributes.name || "this category";
    const categoryId = contextMenuCategory.id;
    Alert.alert(
      "Delete Category",
      `Delete "${categoryName}"? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setContextMenuVisible(false);
            setContextMenuCategory(null);
            try {
              await apiClient.deleteCategory(categoryId);
              // Remove the detail cache for this category
              queryClient.removeQueries({
                queryKey: ["category-detail", categoryId],
              });
              queryClient.removeQueries({ queryKey: ["categories"] });
              queryClient.invalidateQueries({ queryKey: ["categories"] });
              // Refetch the categories list to reflect the deletion
              refetch();
              Alert.alert("Success", "Category deleted successfully");
            } catch (error) {
              console.error("Failed to delete category:", error);
              const message =
                error instanceof Error
                  ? error.message
                  : "Failed to delete category";
              Alert.alert("Error", message);
            }
          },
        },
      ]
    );
  }, [contextMenuCategory, refetch]);

  // -----------------------------------------------------------------------
  // Memoized FlatList sub-components
  // -----------------------------------------------------------------------

  const listHeader = useMemo(
    () => (
      <ListHeader
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        surfaceVariantColor={theme.colors.surfaceVariant}
        onSurfaceVariantColor={theme.colors.onSurfaceVariant}
        onSurfaceColor={theme.colors.onSurface}
      />
    ),
    [
      searchQuery,
      handleSearchChange,
      theme.colors.surfaceVariant,
      theme.colors.onSurfaceVariant,
      theme.colors.onSurface,
    ]
  );

  const listEmpty = useMemo(() => {
    if (isLoading) {
      return (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text variant="bodyMedium" style={styles.loadingText}>
            Loading categories...
          </Text>
        </View>
      );
    }
    const noResults = flatData.length > 0 && filteredFlatData.length === 0;
    return (
      <View style={styles.emptyState}>
        <MaterialCommunityIcons
          name={noResults ? "magnify" : "shape-outline"}
          size={64}
          color={theme.colors.onSurfaceVariant}
        />
        <Text variant="headlineSmall" style={styles.emptyTitle}>
          {noResults ? "No matching categories" : "No categories"}
        </Text>
        <Text variant="bodyMedium" style={styles.emptySubtitle}>
          {noResults
            ? "Try a different search term"
            : "No categories found. Create one to get started."}
        </Text>
      </View>
    );
  }, [
    isLoading,
    flatData.length,
    filteredFlatData.length,
    theme.colors.primary,
    theme.colors.onSurfaceVariant,
  ]);

  // Extract colors for stable references
  const primaryColor = theme.colors.primary;
  const surfaceVariantColor = theme.colors.surfaceVariant;

  const renderItem = useCallback(
    ({ item }: { item: FlatCategory }) => (
      <CategoryItem
        item={item}
        surfaceVariantColor={surfaceVariantColor}
        primaryColor={primaryColor}
        onPress={() => handleCategoryPress(item)}
        onLongPress={() => handleLongPress(item)}
      />
    ),
    [surfaceVariantColor, primaryColor, handleCategoryPress, handleLongPress]
  );

  const keyExtractor = useCallback((item: FlatCategory) => item._flatKey, []);

  const getItemLayout = useCallback(
    (_data: ArrayLike<FlatCategory> | null | undefined, index: number) => ({
      length: ITEM_HEIGHT + ITEM_MARGIN,
      offset: (ITEM_HEIGHT + ITEM_MARGIN) * index,
      index,
    }),
    []
  );

  const footer = useMemo(() => {
    if (!hasNextPage || flatData.length === 0) return null;
    if (isFetchingNextPage) {
      return (
        <View style={styles.footer}>
          <ActivityIndicator size="small" color={theme.colors.primary} />
          <Text variant="bodySmall" style={styles.footerText}>
            Loading more...
          </Text>
        </View>
      );
    }
    return null;
  }, [hasNextPage, flatData.length, isFetchingNextPage, theme.colors.primary]);

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <FlatList
        data={filteredFlatData}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        getItemLayout={getItemLayout}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={listEmpty}
        ListFooterComponent={footer}
        contentContainerStyle={[
          styles.listContent,
          filteredFlatData.length === 0 &&
            !isLoading &&
            styles.listContentEmpty,
        ]}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching && !isLoading}
            onRefresh={handleRefresh}
            colors={[theme.colors.primary]}
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        removeClippedSubviews={true}
        maxToRenderPerBatch={20}
        windowSize={5}
        initialNumToRender={10}
        updateCellsBatchingPeriod={100}
        disableVirtualization={false}
      />

      {/* Context Menu Modal */}
      <Modal
        visible={contextMenuVisible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={handleContextMenuClose}
      >
        <Pressable style={styles.modalOverlay} onPress={handleContextMenuClose}>
          {Platform.OS === "ios" ? (
            <BlurView
              intensity={80}
              tint="dark"
              style={StyleSheet.absoluteFill}
            />
          ) : (
            <View style={styles.androidOverlay} />
          )}
          <Pressable onPress={(e) => e.stopPropagation()}>
            {contextMenuCategory && (
              <CategoryContextMenuCard
                item={contextMenuCategory}
                primaryColor={primaryColor}
                errorColor={theme.colors.error}
                surfaceVariantColor={surfaceVariantColor}
                onEdit={handleEditCategory}
                onDelete={handleDeleteCategory}
                onClose={handleContextMenuClose}
              />
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  listContentEmpty: {
    flexGrow: 1,
  },
  centerContent: {
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 80,
  },
  emptyState: {
    alignItems: "center",
    paddingTop: 80,
  },
  emptyTitle: {
    marginTop: 16,
  },
  emptySubtitle: {
    marginTop: 8,
    opacity: 0.7,
  },
  loadingText: {
    marginTop: 12,
  },
  searchBar: {
    marginBottom: 16,
    elevation: 0,
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: {
      width: 0,
      height: 0,
    },
  },
  card: {
    marginBottom: ITEM_MARGIN,
    borderRadius: 16,
  },
  cardPressed: {
    opacity: 0.85,
  },
  cardInner: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  left: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    minWidth: 0,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  body: {
    flex: 1,
    minWidth: 0,
  },
  right: {
    marginLeft: 8,
  },
  name: {
    fontWeight: "600",
  },
  notes: {
    marginTop: 2,
    opacity: 0.7,
  },
  date: {
    marginTop: 2,
    opacity: 0.5,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 20,
  },
  footerText: {
    marginLeft: 8,
  },
  // Context Menu Styles (matching accounts/transactions screens)
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  androidOverlay: {
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
    borderColor: "rgba(63, 81, 181, 0.3)",
  },
  contextRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  contextLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  contextIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  contextBody: {
    flex: 1,
    minWidth: 0,
  },
  contextName: {
    fontWeight: "600",
  },
  contextNotes: {
    marginTop: 2,
    opacity: 0.7,
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
    borderColor: "rgba(120, 120, 120, 0.15)",
  },
  contextMenuButtonPressed: {
    opacity: 0.92,
  },
  contextMenuButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  editButton: {
    backgroundColor: "#3F51B5",
    borderColor: "#3F51B5",
  },
  editButtonText: {
    color: "#FFFFFF",
  },
  deleteButton: {
    backgroundColor: "#E53935",
    borderColor: "#C62828",
  },
  deleteButtonText: {
    color: "#FFFFFF",
  },
  cancelButton: {
    backgroundColor: "#525252",
    borderColor: "#6B6B6B",
  },
  cancelButtonText: {
    color: "#FFFFFF",
  },
});
