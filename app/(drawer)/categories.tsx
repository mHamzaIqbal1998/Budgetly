// Categories Screen – lists all categories with infinite scroll and search
import { GlassCard } from "@/components/glass-card";
import { apiClient } from "@/lib/api-client";
import type { CategoryRead } from "@/types";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useInfiniteQuery } from "@tanstack/react-query";
import React, { memo, useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from "react-native";
import { Searchbar, Text, useTheme } from "react-native-paper";

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
}

const CategoryItem = memo(
  function CategoryItem({
    item,
    surfaceVariantColor,
    primaryColor,
    onPress,
  }: CategoryItemProps) {
    const attributes = item.attributes;
    const name = attributes.name;
    const notes = attributes.notes;
    const createdAt = formatDate(attributes.created_at);

    return (
      <Pressable
        onPress={onPress}
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
              <View style={styles.right}>
                <MaterialCommunityIcons
                  name="chevron-right"
                  size={20}
                  color={surfaceVariantColor}
                />
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
// Main Screen
// ---------------------------------------------------------------------------

export default function CategoriesScreen() {
  const theme = useTheme();
  const [searchQuery, setSearchQuery] = useState("");

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

  const handleCategoryPress = useCallback((category: FlatCategory) => {
    // Placeholder for future category detail screen
    console.log("Category pressed:", category.id, category.attributes.name);
  }, []);

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
      />
    ),
    [surfaceVariantColor, primaryColor, handleCategoryPress]
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
});
