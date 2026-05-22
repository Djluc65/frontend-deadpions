import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Pressable, useWindowDimensions } from 'react-native';
import { playButtonSound } from '../utils/soundManager';
import { getResponsiveSize } from '../utils/responsive';
import { modalTheme } from '../utils/modalTheme';

const CustomAlert = ({ visible, title, message, buttons = [], onClose, dismissOnBackdropPress = false }) => {
  const isSingleButton = !Array.isArray(buttons) || buttons.length <= 1;
  const isThreeButtons = Array.isArray(buttons) && buttons.length === 3;
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;

  // On iOS, <Modal visible={false}> leaves an invisible touch interceptor that blocks all gestures.
  // Returning null when not visible completely removes the Modal from the native view hierarchy.
  if (!visible) return null;

  const handleBackdropPress = () => {
    if (dismissOnBackdropPress && onClose) onClose();
  };

  return (
    <Modal
      visible={true}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.modalOverlay} onPress={handleBackdropPress}>
        <Pressable
          style={[
            styles.alertContent,
            isTablet && { width: '50%', maxWidth: 500, alignSelf: 'center' },
            !isTablet && { width: '85%' },
          ]}
          onPress={() => {}}
        >
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
                            isSingleButton ? styles.buttonSingle : (isThreeButtons ? styles.buttonTri : styles.buttonMulti),
                            btn.style === 'cancel' ? styles.cancelButton : null,
                            btn.style === 'destructive' ? styles.destructiveButton : styles.confirmButton
                        ]}
                        onPress={() => {
                            playButtonSound();
                            if (!btn.manualClose && onClose) onClose();
                            if (btn.onPress) {
                              setTimeout(() => {
                                try {
                                  btn.onPress();
                                } catch {}
                              }, 0);
                            }
                        }}
                    >
                        <Text
                          style={[
                            styles.buttonText,
                            btn.style === 'cancel' || btn.style === 'destructive' ? null : styles.buttonTextActive,
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
    minWidth: getResponsiveSize(280),
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
    ...modalTheme.button,
  },
  buttonSingle: {
    width: '100%',
    maxWidth: '100%'
  },
  buttonMulti: {
    flex: 1,
    maxWidth: '48%'
  },
  buttonTri: {
    flex: 1,
    maxWidth: '31%',
  },
  confirmButton: {
    ...modalTheme.buttonActive
  },
  cancelButton: {
    ...modalTheme.buttonCancel
  },
  destructiveButton: {
    ...modalTheme.buttonDestructive
  },
  buttonText: {
    ...modalTheme.buttonText,
    flexShrink: 1,
  },
  buttonTextActive: modalTheme.buttonTextActive,
});

export default CustomAlert;
