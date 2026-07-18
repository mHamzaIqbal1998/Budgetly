// Advanced transaction filters – bottom sheet modal.
// Presentational: holds a local draft of the filters and commits on "Apply".
import {
  AdvancedFilters,
  DATE_PRESETS,
  DatePresetKey,
  countActiveFilters,
  parseYmd,
  ymd,
} from "@/lib/transaction-filters";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import React, { useEffect, useMemo, useState } from "react";
import {
  Dimensions,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import {
  Button,
  Chip,
  Divider,
  Switch,
  Text,
  TextInput,
  useTheme,
} from "react-native-paper";

interface Option {
  id: string;
  name: string;
}

interface TransactionFiltersModalProps {
  visible: boolean;
  onClose: () => void;
  initialFilters: AdvancedFilters;
  onApply: (filters: AdvancedFilters) => void;
  categories: Option[];
  budgets: Option[];
}

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

export function TransactionFiltersModal({
  visible,
  onClose,
  initialFilters,
  onApply,
  categories,
  budgets,
}: TransactionFiltersModalProps) {
  const theme = useTheme();
  const [draft, setDraft] = useState<AdvancedFilters>(initialFilters);
  const [categorySearch, setCategorySearch] = useState("");
  const [datePickerField, setDatePickerField] = useState<
    "after" | "before" | null
  >(null);
  const [datePickerValue, setDatePickerValue] = useState(new Date());

  // Re-sync the draft each time the sheet opens.
  useEffect(() => {
    if (visible) {
      setDraft(initialFilters);
      setCategorySearch("");
      setDatePickerField(null);
    }
  }, [visible, initialFilters]);

  const activeCount = useMemo(() => countActiveFilters(draft), [draft]);

  const filteredCategories = useMemo(() => {
    const q = categorySearch.trim().toLowerCase();
    if (!q) return categories;
    return categories.filter((c) => c.name.toLowerCase().includes(q));
  }, [categories, categorySearch]);

  // -----------------------------------------------------------------------
  // Draft mutators
  // -----------------------------------------------------------------------

  const setPreset = (key: DatePresetKey) =>
    setDraft((d) => ({ ...d, datePreset: key }));

  const toggleCategory = (name: string) =>
    setDraft((d) => ({
      ...d,
      categoryName: d.categoryName === name ? null : name,
    }));

  const toggleBudget = (name: string) =>
    setDraft((d) => ({
      ...d,
      budgetName: d.budgetName === name ? null : name,
    }));

  const openDatePicker = (field: "after" | "before") => {
    const current =
      field === "after"
        ? parseYmd(draft.dateAfter)
        : parseYmd(draft.dateBefore);
    setDatePickerValue(current ?? new Date());
    setDatePickerField(field);
  };

  const commitDate = (date: Date) => {
    const value = ymd(date);
    setDraft((d) =>
      datePickerField === "after"
        ? { ...d, dateAfter: value, datePreset: "custom" }
        : { ...d, dateBefore: value, datePreset: "custom" }
    );
  };

  const handleReset = () =>
    setDraft({
      datePreset: "any",
      dateAfter: null,
      dateBefore: null,
      amountMin: "",
      amountMax: "",
      categoryName: null,
      budgetName: null,
      tag: "",
      hasAttachments: false,
      reconciled: false,
      hasNotes: false,
    });

  // -----------------------------------------------------------------------
  // Render helpers
  // -----------------------------------------------------------------------

  const SectionLabel = ({ icon, title }: { icon: string; title: string }) => (
    <View style={styles.sectionLabelRow}>
      <MaterialCommunityIcons
        name={icon as keyof typeof MaterialCommunityIcons.glyphMap}
        size={18}
        color={theme.colors.primary}
      />
      <Text variant="titleSmall" style={styles.sectionLabelText}>
        {title}
      </Text>
    </View>
  );

  const dateFieldValue = (field: "after" | "before") =>
    field === "after" ? draft.dateAfter : draft.dateBefore;

  const ToggleRow = ({
    icon,
    label,
    value,
    onChange,
  }: {
    icon: string;
    label: string;
    value: boolean;
    onChange: (v: boolean) => void;
  }) => (
    <Pressable
      onPress={() => onChange(!value)}
      style={styles.toggleRow}
      android_ripple={{ color: theme.colors.surfaceVariant }}
    >
      <View style={styles.toggleLeft}>
        <MaterialCommunityIcons
          name={icon as keyof typeof MaterialCommunityIcons.glyphMap}
          size={20}
          color={theme.colors.onSurfaceVariant}
        />
        <Text variant="bodyMedium" style={styles.toggleLabel}>
          {label}
        </Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        color={theme.colors.primary}
      />
    </Pressable>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.overlayTouchable} onPress={onClose} />

        <View
          style={[
            styles.sheet,
            {
              backgroundColor: theme.colors.elevation.level2,
              borderColor: theme.colors.outlineVariant,
            },
          ]}
        >
          {/* Grabber */}
          <View style={styles.grabberWrap}>
            <View
              style={[
                styles.grabber,
                { backgroundColor: theme.colors.onSurfaceVariant },
              ]}
            />
          </View>

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleWrap}>
              <MaterialCommunityIcons
                name="tune-variant"
                size={22}
                color={theme.colors.onSurface}
              />
              <Text variant="titleLarge" style={styles.headerTitle}>
                Filters
              </Text>
            </View>
            {activeCount > 0 ? (
              <Button
                mode="text"
                compact
                onPress={handleReset}
                textColor={theme.colors.error}
              >
                Clear all
              </Button>
            ) : null}
          </View>

          <Divider style={{ backgroundColor: theme.colors.outlineVariant }} />

          <ScrollView
            style={styles.body}
            contentContainerStyle={styles.bodyContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Date range */}
            <SectionLabel icon="calendar-range" title="Date range" />
            <View style={styles.chipWrap}>
              {DATE_PRESETS.map(({ key, label }) => {
                const selected = draft.datePreset === key;
                return (
                  <Chip
                    key={key}
                    selected={selected}
                    showSelectedCheck={false}
                    onPress={() => setPreset(key)}
                    style={[
                      styles.choiceChip,
                      selected && {
                        backgroundColor: theme.colors.primaryContainer,
                      },
                    ]}
                    textStyle={
                      selected
                        ? { color: theme.colors.onPrimaryContainer }
                        : undefined
                    }
                  >
                    {label}
                  </Chip>
                );
              })}
            </View>

            {draft.datePreset === "custom" ? (
              <View style={styles.customDateRow}>
                {(["after", "before"] as const).map((field) => (
                  <Pressable
                    key={field}
                    onPress={() => openDatePicker(field)}
                    style={[
                      styles.dateBox,
                      {
                        borderColor: theme.colors.outline,
                        backgroundColor: theme.colors.surface,
                      },
                    ]}
                  >
                    <Text
                      variant="labelSmall"
                      style={{ color: theme.colors.onSurfaceVariant }}
                    >
                      {field === "after" ? "From" : "To"}
                    </Text>
                    <Text variant="bodyMedium" style={styles.dateBoxValue}>
                      {dateFieldValue(field) ?? "Select"}
                    </Text>
                  </Pressable>
                ))}
              </View>
            ) : null}

            {/* iOS inline date picker */}
            {datePickerField !== null && Platform.OS === "ios" ? (
              <View style={styles.iosPickerWrap}>
                <DateTimePicker
                  value={datePickerValue}
                  mode="date"
                  display="spinner"
                  onChange={(_, selectedDate) => {
                    if (selectedDate) {
                      setDatePickerValue(selectedDate);
                      commitDate(selectedDate);
                    }
                  }}
                />
                <Button
                  mode="contained-tonal"
                  compact
                  onPress={() => setDatePickerField(null)}
                >
                  Done
                </Button>
              </View>
            ) : null}

            {/* Android native date dialog */}
            {datePickerField !== null && Platform.OS === "android" ? (
              <DateTimePicker
                value={datePickerValue}
                mode="date"
                display="default"
                onChange={(event, selectedDate) => {
                  setDatePickerField(null);
                  if (event.type === "set" && selectedDate) {
                    commitDate(selectedDate);
                  }
                }}
              />
            ) : null}

            <Divider style={styles.sectionDivider} />

            {/* Amount */}
            <SectionLabel icon="cash-multiple" title="Amount range" />
            <View style={styles.amountRow}>
              <TextInput
                mode="outlined"
                label="Min"
                value={draft.amountMin}
                onChangeText={(v) => setDraft((d) => ({ ...d, amountMin: v }))}
                keyboardType="decimal-pad"
                style={styles.amountInput}
                left={<TextInput.Icon icon="arrow-up" />}
                dense
              />
              <TextInput
                mode="outlined"
                label="Max"
                value={draft.amountMax}
                onChangeText={(v) => setDraft((d) => ({ ...d, amountMax: v }))}
                keyboardType="decimal-pad"
                style={styles.amountInput}
                left={<TextInput.Icon icon="arrow-down" />}
                dense
              />
            </View>

            <Divider style={styles.sectionDivider} />

            {/* Category */}
            <SectionLabel icon="shape-outline" title="Category" />
            {categories.length > 8 ? (
              <TextInput
                mode="outlined"
                placeholder="Search categories"
                value={categorySearch}
                onChangeText={setCategorySearch}
                style={styles.searchInput}
                left={<TextInput.Icon icon="magnify" />}
                dense
              />
            ) : null}
            {categories.length === 0 ? (
              <Text variant="bodySmall" style={styles.emptyHint}>
                No categories available
              </Text>
            ) : (
              <View style={styles.chipWrap}>
                {filteredCategories.slice(0, 40).map((c) => {
                  const selected = draft.categoryName === c.name;
                  return (
                    <Chip
                      key={c.id}
                      selected={selected}
                      showSelectedCheck={false}
                      onPress={() => toggleCategory(c.name)}
                      style={[
                        styles.choiceChip,
                        selected && {
                          backgroundColor: theme.colors.primaryContainer,
                        },
                      ]}
                      textStyle={
                        selected
                          ? { color: theme.colors.onPrimaryContainer }
                          : undefined
                      }
                    >
                      {c.name}
                    </Chip>
                  );
                })}
              </View>
            )}

            <Divider style={styles.sectionDivider} />

            {/* Budget */}
            <SectionLabel icon="wallet-outline" title="Budget" />
            {budgets.length === 0 ? (
              <Text variant="bodySmall" style={styles.emptyHint}>
                No budgets available
              </Text>
            ) : (
              <View style={styles.chipWrap}>
                {budgets.map((b) => {
                  const selected = draft.budgetName === b.name;
                  return (
                    <Chip
                      key={b.id}
                      selected={selected}
                      showSelectedCheck={false}
                      onPress={() => toggleBudget(b.name)}
                      style={[
                        styles.choiceChip,
                        selected && {
                          backgroundColor: theme.colors.primaryContainer,
                        },
                      ]}
                      textStyle={
                        selected
                          ? { color: theme.colors.onPrimaryContainer }
                          : undefined
                      }
                    >
                      {b.name}
                    </Chip>
                  );
                })}
              </View>
            )}

            <Divider style={styles.sectionDivider} />

            {/* Tag */}
            <SectionLabel icon="tag-outline" title="Tag" />
            <TextInput
              mode="outlined"
              placeholder="e.g. groceries"
              value={draft.tag}
              onChangeText={(v) => setDraft((d) => ({ ...d, tag: v }))}
              style={styles.searchInput}
              left={<TextInput.Icon icon="pound" />}
              autoCapitalize="none"
              dense
            />

            <Divider style={styles.sectionDivider} />

            {/* Other */}
            <SectionLabel icon="filter-variant" title="Other" />
            <ToggleRow
              icon="paperclip"
              label="Has attachments"
              value={draft.hasAttachments}
              onChange={(v) => setDraft((d) => ({ ...d, hasAttachments: v }))}
            />
            <ToggleRow
              icon="check-decagram"
              label="Reconciled only"
              value={draft.reconciled}
              onChange={(v) => setDraft((d) => ({ ...d, reconciled: v }))}
            />
            <ToggleRow
              icon="note-text-outline"
              label="Has notes"
              value={draft.hasNotes}
              onChange={(v) => setDraft((d) => ({ ...d, hasNotes: v }))}
            />
          </ScrollView>

          {/* Footer */}
          <View
            style={[
              styles.footer,
              { borderTopColor: theme.colors.outlineVariant },
            ]}
          >
            <Button
              mode="contained"
              onPress={() => onApply(draft)}
              style={styles.applyButton}
              contentStyle={styles.applyButtonContent}
              icon="check"
            >
              {activeCount > 0 ? `Apply filters (${activeCount})` : "Apply"}
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0, 0, 0, 0.55)",
  },
  overlayTouchable: {
    flex: 1,
  },
  sheet: {
    maxHeight: SCREEN_HEIGHT * 0.9,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderBottomWidth: 0,
    overflow: "hidden",
  },
  grabberWrap: {
    alignItems: "center",
    paddingTop: 10,
    paddingBottom: 4,
  },
  grabber: {
    width: 40,
    height: 4,
    borderRadius: 2,
    opacity: 0.4,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 8,
    minHeight: 48,
  },
  headerTitleWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerTitle: {
    fontWeight: "700",
  },
  body: {
    paddingHorizontal: 20,
  },
  bodyContent: {
    paddingTop: 16,
    paddingBottom: 24,
  },
  sectionLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  sectionLabelText: {
    fontWeight: "700",
  },
  sectionDivider: {
    marginVertical: 20,
    opacity: 0.5,
  },
  chipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  choiceChip: {
    marginBottom: 4,
  },
  customDateRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 14,
  },
  dateBox: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 2,
  },
  dateBoxValue: {
    fontWeight: "600",
  },
  iosPickerWrap: {
    marginTop: 8,
    alignItems: "center",
  },
  amountRow: {
    flexDirection: "row",
    gap: 12,
  },
  amountInput: {
    flex: 1,
  },
  searchInput: {
    marginBottom: 12,
  },
  emptyHint: {
    opacity: 0.6,
    fontStyle: "italic",
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
  },
  toggleLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  toggleLabel: {
    fontWeight: "500",
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === "ios" ? 28 : 16,
    borderTopWidth: 1,
  },
  applyButton: {
    borderRadius: 14,
  },
  applyButtonContent: {
    paddingVertical: 6,
  },
});
