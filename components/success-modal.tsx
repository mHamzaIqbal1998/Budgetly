import { hexToRgba } from "@/constants/spotify-theme";
import React from "react";
import { StyleSheet, View } from "react-native";
import { Button, Modal, Portal, Text, useTheme } from "react-native-paper";

interface SuccessModalProps {
  visible: boolean;
  onDismiss: () => void;
  title?: string;
  message: string;
  buttonText?: string;
  onButtonPress?: () => void;
}

export function SuccessModal({
  visible,
  onDismiss,
  title = "Success!",
  message,
  buttonText = "Continue",
  onButtonPress,
}: SuccessModalProps) {
  const theme = useTheme();

  const handleButtonPress = () => {
    if (onButtonPress) {
      onButtonPress();
    } else {
      onDismiss();
    }
  };

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={[
          styles.modal,
          {
            backgroundColor: theme.dark
              ? theme.colors.elevation.level3
              : theme.colors.elevation.level1,
            borderColor: hexToRgba(theme.colors.primary, 0.3),
          },
        ]}
      >
        <View style={styles.modalContent}>
          <View
            style={[
              styles.iconContainer,
              {
                backgroundColor: hexToRgba(theme.colors.primary, 0.15),
                borderColor: theme.colors.primary,
              },
            ]}
          >
            <Text style={[styles.icon, { color: theme.colors.primary }]}>
              ✓
            </Text>
          </View>
          <Text
            variant="headlineSmall"
            style={[styles.title, { color: theme.colors.onSurface }]}
          >
            {title}
          </Text>
          <Text
            variant="bodyLarge"
            style={[styles.message, { color: theme.colors.onSurfaceVariant }]}
          >
            {message}
          </Text>
          <Button
            mode="contained"
            onPress={handleButtonPress}
            style={styles.button}
          >
            {buttonText}
          </Button>
        </View>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  modal: {
    margin: 20,
    borderRadius: 28,
    borderWidth: 1,
    overflow: "hidden",
  },
  modalContent: {
    padding: 32,
    alignItems: "center",
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
    borderWidth: 2,
  },
  icon: {
    fontSize: 48,
    fontWeight: "bold",
  },
  title: {
    fontWeight: "bold",
    marginBottom: 12,
  },
  message: {
    textAlign: "center",
    opacity: 0.8,
    marginBottom: 24,
  },
  button: {
    width: "100%",
    paddingVertical: 4,
    borderRadius: 28,
  },
});
