import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Pressable } from 'react-native';
import { playButtonSound } from '../utils/soundManager';
import { getResponsiveSize } from '../utils/responsive';
import { modalTheme } from '../utils/modalTheme';

const CustomAlert = ({ visible, title, message, buttons = [], onClose }) => {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={styles.alertContent} onPress={() => {}}>
            <Text style={styles.alertTitle}>{title}</Text>
            <Text style={styles.alertMessage}>{message}</Text>
            
            <View style={styles.buttonContainer}>
                {buttons.map((btn, index) => (
                    <TouchableOpacity 
                        key={index} 
                        style={[
                            styles.button,
                            btn.style === 'cancel' ? styles.cancelButton : null,
                            btn.style === 'destructive' ? styles.destructiveButton : styles.confirmButton
                        ]}
                        onPress={() => {
                            playButtonSound();
                            if (btn.onPress) btn.onPress();
                            if (!btn.manualClose && onClose) onClose();
                        }}
                    >
                        <Text
                          style={[
                            styles.buttonText,
                            btn.style === 'cancel' || btn.style === 'destructive' ? styles.buttonTextOnDark : null
                          ]}
                        >
                          {btn.text}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: modalTheme.overlay,
  alertContent: modalTheme.card,
  alertTitle: modalTheme.title,
  alertMessage: modalTheme.message,
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    width: '100%',
    gap: getResponsiveSize(15),
    flexWrap: 'wrap'
  },
  button: {
    ...modalTheme.buttonBase,
    flex: 1
  },
  confirmButton: {
    ...modalTheme.buttonPrimary
  },
  cancelButton: {
    ...modalTheme.buttonCancel
  },
  destructiveButton: {
    ...modalTheme.buttonDestructive
  },
  buttonText: {
    ...modalTheme.buttonTextBase,
    ...modalTheme.buttonTextPrimary
  },
  buttonTextOnDark: modalTheme.buttonTextOnDark
});

export default CustomAlert;
