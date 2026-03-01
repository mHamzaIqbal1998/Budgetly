// Edit Category Screen
import { GlassCard } from "@/components/glass-card";
import { apiClient } from "@/lib/api-client";
import { queryClient } from "@/lib/query-client";
import type { CategoryRead } from "@/types";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  BackHandler,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import {
  ActivityIndicator,
  Button,
  Card,
  Text,
  TextInput,
  useTheme,
} from "react-native-paper";

// ---------------------------------------------------------------------------
// Main Screen
// ---------------------------------------------------------------------------

export default function EditCategoryScreen() {
  const theme = useTheme();
  const router = useRouter();
  const navigation = useNavigation();
  const { id } = useLocalSearchParams<{ id: string }>();

  // Loading states
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Original category
  const [originalCategory, setOriginalCategory] = useState<CategoryRead | null>(
    null
  );

  // Form state
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");

  // Track if form has changes
  const hasChanges = originalCategory
    ? name !== originalCategory.attributes.name ||
      notes !== (originalCategory.attributes.notes || "")
    : false;

  // ---------------------------------------------------------------------------
  // Fetch category on mount
  // ---------------------------------------------------------------------------

  useEffect(() => {
    const fetchCategory = async () => {
      if (!id) return;
      try {
        setIsLoading(true);
        const response = await apiClient.getCategory(id);
        const category = response.data;
        setOriginalCategory(category);
        setName(category.attributes.name);
        setNotes(category.attributes.notes || "");
      } catch (error) {
        console.error("Failed to fetch category:", error);
        Alert.alert("Error", "Failed to load category details", [
          { text: "OK", onPress: () => router.replace("/categories") },
        ]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchCategory();
  }, [id, router]);

  // ---------------------------------------------------------------------------
  // Navigation setup
  // ---------------------------------------------------------------------------

  const goBack = useCallback(() => {
    if (hasChanges) {
      Alert.alert(
        "Discard Changes?",
        "You have unsaved changes. Are you sure you want to leave?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Discard",
            style: "destructive",
            onPress: () => router.replace("/categories"),
          },
        ]
      );
    } else {
      router.replace("/categories");
    }
  }, [hasChanges, router]);

  useEffect(() => {
    navigation.setOptions({
      title: "Edit Category",
      headerLeft: () => (
        <Pressable
          onPress={goBack}
          hitSlop={12}
          style={({ pressed }) => [
            { padding: 8, marginLeft: 4, opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <MaterialCommunityIcons
            name="arrow-left"
            size={24}
            color={theme.colors.onSurface}
          />
        </Pressable>
      ),
    });
  }, [navigation, goBack, theme.colors.onSurface]);

  // Hardware back button
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      goBack();
      return true;
    });
    return () => sub.remove();
  }, [goBack]);

  // ---------------------------------------------------------------------------
  // Save handler
  // ---------------------------------------------------------------------------

  const handleSave = useCallback(async () => {
    if (!id || !name.trim()) {
      Alert.alert("Validation Error", "Category name is required");
      return;
    }

    try {
      setIsSaving(true);
      await apiClient.updateCategory(id, {
        name: name.trim(),
        notes: notes.trim() || null,
      });

      // Invalidate and refetch relevant queries
      queryClient.removeQueries({ queryKey: ["category-detail", id] });
      queryClient.removeQueries({ queryKey: ["categories"] });
      queryClient.invalidateQueries({ queryKey: ["categories"] });

      Alert.alert("Success", "Category updated successfully", [
        { text: "OK", onPress: () => router.replace("/categories") },
      ]);
    } catch (error) {
      console.error("Failed to update category:", error);
      const message =
        error instanceof Error ? error.message : "Failed to update category";
      Alert.alert("Error", message);
    } finally {
      setIsSaving(false);
    }
  }, [id, name, notes, router]);

  // ---------------------------------------------------------------------------
  // Loading state
  // ---------------------------------------------------------------------------

  if (isLoading) {
    return (
      <View
        style={[
          styles.container,
          styles.centerContent,
          { backgroundColor: theme.colors.background },
        ]}
      >
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text variant="bodyMedium" style={styles.loadingText}>
          Loading category...
        </Text>
      </View>
    );
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header Card */}
        <GlassCard variant="elevated" style={styles.card}>
          <Card.Title
            title="Edit Category"
            subtitle="Update category details"
            left={() => (
              <View
                style={[
                  styles.iconWrap,
                  { backgroundColor: theme.colors.primary + "20" },
                ]}
              >
                <MaterialCommunityIcons
                  name="shape"
                  size={24}
                  color={theme.colors.primary}
                />
              </View>
            )}
          />
        </GlassCard>

        {/* Form Card */}
        <GlassCard variant="elevated" style={styles.card}>
          <Card.Content>
            <View style={styles.fieldGroup}>
              <Text variant="labelLarge" style={styles.label}>
                Name *
              </Text>
              <TextInput
                mode="outlined"
                value={name}
                onChangeText={setName}
                placeholder="Category name"
                autoCapitalize="words"
                autoCorrect={false}
                style={styles.input}
                outlineColor={theme.colors.outline}
                activeOutlineColor={theme.colors.primary}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text variant="labelLarge" style={styles.label}>
                Notes
              </Text>
              <TextInput
                mode="outlined"
                value={notes}
                onChangeText={setNotes}
                placeholder="Optional notes"
                multiline
                numberOfLines={3}
                style={[styles.input, styles.notesInput]}
                outlineColor={theme.colors.outline}
                activeOutlineColor={theme.colors.primary}
              />
            </View>
          </Card.Content>
        </GlassCard>

        {/* Save Button */}
        <View style={styles.buttonContainer}>
          <Button
            mode="contained"
            onPress={handleSave}
            style={styles.saveButton}
            contentStyle={styles.saveButtonContent}
            disabled={isSaving || !name.trim()}
            loading={isSaving}
            icon="content-save"
          >
            Save Changes
          </Button>
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContent: {
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
  },
  scrollContent: {
    padding: 16,
  },
  card: {
    marginBottom: 16,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  fieldGroup: {
    marginBottom: 16,
  },
  label: {
    marginBottom: 8,
  },
  input: {
    backgroundColor: "transparent",
  },
  notesInput: {
    minHeight: 80,
    textAlignVertical: "top",
    paddingVertical: 8,
    paddingHorizontal: 0,
  },
  buttonContainer: {
    marginTop: 8,
  },
  saveButton: {
    borderRadius: 8,
  },
  saveButtonContent: {
    paddingVertical: 8,
  },
});
