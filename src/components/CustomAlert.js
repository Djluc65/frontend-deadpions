import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Pressable } from 'react-native';
import { playButtonSound } from '../utils/soundManager';
import { getResponsiveSize } from '../utils/responsive';
import { modalTheme } from '../utils/modalTheme';

const CustomAlert = ({ visible, title, message, buttons = [], onClose }) => {
  const isSingleButton = !Array.isArray(buttons) || buttons.length <= 1;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={styles.alertContent} onPress={() => {}}>
            <View style={styles.body}>
              <Text style={styles.alertTitle}>{title}</Text>
              <Text style={styles.alertMessage}>{message}</Text>
            </View>
            
            <View style={styles.buttonContainer}>
                {buttons.map((btn, index) => (
                    <TouchableOpacity 
                        key={index} 
                        style={[
                            styles.button,
                            isSingleButton ? styles.buttonSingle : styles.buttonMulti,
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
                            btn.style === 'cancel' || btn.style === 'destructive' ? styles.buttonTextOnDark : null,
                            btn?.textStyle
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
  alertContent: {
    ...modalTheme.card,
    maxWidth: getResponsiveSize(460),
    minWidth: getResponsiveSize(280)
  },
  body: {
    width: '100%',
    alignItems: 'center'
  },
  alertTitle: {
    ...modalTheme.title,
    marginBottom: getResponsiveSize(10)
  },
  alertMessage: {
    ...modalTheme.message,
    marginBottom: getResponsiveSize(18)
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    width: '100%',
    gap: getResponsiveSize(12),
    flexWrap: 'wrap'
  },
  button: {
    ...modalTheme.buttonBase,
    minHeight: getResponsiveSize(44),
    paddingVertical: getResponsiveSize(12)
  },
  buttonSingle: {
    width: '100%',
    maxWidth: '100%'
  },
  buttonMulti: {
    flexGrow: 1,
    flexBasis: '45%',
    maxWidth: '48%'
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
    ...modalTheme.buttonTextPrimary,
    flexShrink: 1
  },
  buttonTextOnDark: modalTheme.buttonTextOnDark
});

export default CustomAlert;
