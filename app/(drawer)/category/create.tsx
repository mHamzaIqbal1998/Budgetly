// Create Category Screen
import { GlassCard } from "@/components/glass-card";
import { apiClient } from "@/lib/api-client";
import { queryClient } from "@/lib/query-client";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation, useRouter } from "expo-router";
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
import { Button, Card, Text, TextInput, useTheme } from "react-native-paper";

// ---------------------------------------------------------------------------
// Main Screen
// ---------------------------------------------------------------------------

export default function CreateCategoryScreen() {
  const theme = useTheme();
  const router = useRouter();
  const navigation = useNavigation();

  // Loading state
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");

  // Track if form has changes
  const hasChanges = name.trim().length > 0 || notes.trim().length > 0;

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
      title: "Create Category",
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
    if (!name.trim()) {
      Alert.alert("Validation Error", "Category name is required");
      return;
    }

    try {
      setIsSaving(true);
      await apiClient.createCategory({
        name: name.trim(),
        notes: notes.trim() || null,
      });

      // Invalidate and refetch relevant queries
      queryClient.removeQueries({ queryKey: ["categories"] });
      queryClient.invalidateQueries({ queryKey: ["categories"] });

      Alert.alert("Success", "Category created successfully", [
        { text: "OK", onPress: () => router.replace("/categories") },
      ]);
    } catch (error) {
      console.error("Failed to create category:", error);
      const message =
        error instanceof Error ? error.message : "Failed to create category";
      Alert.alert("Error", message);
    } finally {
      setIsSaving(false);
    }
  }, [name, notes, router]);

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
            title="Create Category"
            subtitle="Add a new category"
            left={() => (
              <View
                style={[
                  styles.iconWrap,
                  { backgroundColor: theme.colors.primary + "20" },
                ]}
              >
                <MaterialCommunityIcons
                  name="shape-plus"
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
            Create Category
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
