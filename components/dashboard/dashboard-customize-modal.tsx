import {
  DASHBOARD_SECTION_LABELS,
  type DashboardSectionId,
} from "@/constants/dashboard-sections";
import { useStore } from "@/lib/store";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import {
  Modal,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { Card, IconButton, Text, useTheme } from "react-native-paper";

export interface DashboardCustomizeModalProps {
  visible: boolean;
  onDismiss: () => void;
}

export function DashboardCustomizeModal({
  visible,
  onDismiss,
}: DashboardCustomizeModalProps) {
  const theme = useTheme();
  const {
    dashboardVisibleSectionIds,
    dashboardHiddenSectionIds,
    moveDashboardSectionToHidden,
    moveDashboardSectionToVisible,
    reorderDashboardVisible,
  } = useStore();

  const visibleIds = dashboardVisibleSectionIds;
  const hiddenIds = dashboardHiddenSectionIds;

  const cardStyle = {
    backgroundColor: theme.colors.surfaceVariant,
    marginBottom: 8,
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onDismiss}
    >
      <View
        style={[styles.overlay, { backgroundColor: theme.colors.backdrop }]}
      >
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: theme.colors.surface,
            },
          ]}
        >
          <View style={styles.header}>
            <Text
              variant="titleLarge"
              style={{ color: theme.colors.onSurface }}
            >
              Customize Dashboard
            </Text>
            <IconButton
              icon="close"
              size={24}
              onPress={onDismiss}
              iconColor={theme.colors.onSurface}
            />
          </View>
          <Text
            variant="bodySmall"
            style={[styles.hint, { color: theme.colors.onSurfaceVariant }]}
          >
            Reorder with arrows. Move to Hidden to hide on dashboard.
          </Text>
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
          >
            <Text
              variant="labelLarge"
              style={[styles.sectionTitle, { color: theme.colors.primary }]}
            >
              Visible (on dashboard)
            </Text>
            {visibleIds.map((id, index) => (
              <Card
                key={id}
                style={[styles.itemCard, cardStyle]}
                mode="contained"
              >
                <View style={styles.itemRow}>
                  <View style={styles.itemLeft}>
                    <TouchableOpacity
                      onPress={() => reorderDashboardVisible(index, index - 1)}
                      disabled={index === 0}
                      style={styles.arrowBtn}
                    >
                      <MaterialCommunityIcons
                        name="chevron-up"
                        size={24}
                        color={
                          index === 0
                            ? theme.colors.onSurfaceDisabled
                            : theme.colors.onSurface
                        }
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => reorderDashboardVisible(index, index + 1)}
                      disabled={index === visibleIds.length - 1}
                      style={styles.arrowBtn}
                    >
                      <MaterialCommunityIcons
                        name="chevron-down"
                        size={24}
                        color={
                          index === visibleIds.length - 1
                            ? theme.colors.onSurfaceDisabled
                            : theme.colors.onSurface
                        }
                      />
                    </TouchableOpacity>
                  </View>
                  <Text
                    variant="bodyLarge"
                    style={[
                      styles.itemLabel,
                      { color: theme.colors.onSurface },
                    ]}
                    numberOfLines={1}
                  >
                    {DASHBOARD_SECTION_LABELS[id as DashboardSectionId] ?? id}
                  </Text>
                  <IconButton
                    icon="eye-off-outline"
                    size={22}
                    onPress={() => moveDashboardSectionToHidden(id)}
                    iconColor={theme.colors.onSurfaceVariant}
                  />
                </View>
              </Card>
            ))}

            <Text
              variant="labelLarge"
              style={[
                styles.sectionTitle,
                { color: theme.colors.onSurfaceVariant },
              ]}
            >
              Hidden
            </Text>
            {hiddenIds.length === 0 ? (
              <Text
                variant="bodySmall"
                style={[
                  styles.emptyHint,
                  { color: theme.colors.onSurfaceVariant },
                ]}
              >
                No hidden sections. Tap eye-off on a visible card to hide it.
              </Text>
            ) : (
              hiddenIds.map((id) => (
                <Card
                  key={id}
                  style={[styles.itemCard, cardStyle]}
                  mode="contained"
                >
                  <View style={styles.itemRow}>
                    <Text
                      variant="bodyLarge"
                      style={[
                        styles.itemLabel,
                        styles.itemLabelHidden,
                        { color: theme.colors.onSurfaceVariant },
                      ]}
                      numberOfLines={1}
                    >
                      {DASHBOARD_SECTION_LABELS[id as DashboardSectionId] ?? id}
                    </Text>
                    <IconButton
                      icon="eye-plus-outline"
                      size={22}
                      onPress={() => moveDashboardSectionToVisible(id)}
                      iconColor={theme.colors.primary}
                    />
                  </View>
                </Card>
              ))
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    height: "85%",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  hint: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    opacity: 0.9,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  sectionTitle: {
    marginBottom: 8,
    marginTop: 8,
  },
  itemCard: {
    paddingVertical: 4,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  itemLeft: {
    flexDirection: "column",
  },
  arrowBtn: {
    padding: 4,
  },
  itemLabel: {
    flex: 1,
    marginLeft: 8,
  },
  itemLabelHidden: {
    opacity: 0.8,
  },
  emptyHint: {
    fontStyle: "italic",
    marginBottom: 16,
  },
});
