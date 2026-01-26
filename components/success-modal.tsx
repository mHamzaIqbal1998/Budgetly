import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Modal, Portal, Text } from 'react-native-paper';

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
  title = 'Success!',
  message,
  buttonText = 'Continue',
  onButtonPress,
}: SuccessModalProps) {
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
        contentContainerStyle={[styles.modal, { backgroundColor: 'rgba(40, 40, 40, 0.98)' }]}
      >
        <View style={styles.modalContent}>
          <View style={styles.iconContainer}>
            <Text style={styles.icon}>✓</Text>
          </View>
          <Text variant="headlineSmall" style={styles.title}>
            {title}
          </Text>
          <Text variant="bodyLarge" style={styles.message}>
            {message}
          </Text>
          <Button
            mode="contained"
            onPress={handleButtonPress}
            style={styles.button}
            buttonColor="#1DB954"
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
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(29, 185, 84, 0.3)',
    overflow: 'hidden',
  },
  modalContent: {
    padding: 32,
    alignItems: 'center',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(29, 185, 84, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#1DB954',
  },
  icon: {
    fontSize: 48,
    color: '#1DB954',
    fontWeight: 'bold',
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#FFFFFF',
  },
  message: {
    textAlign: 'center',
    opacity: 0.8,
    marginBottom: 24,
    color: '#FFFFFF',
  },
  button: {
    width: '100%',
    paddingVertical: 4,
  },
});

