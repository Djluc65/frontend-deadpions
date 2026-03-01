import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Pressable } from 'react-native';
import { playButtonSound } from '../utils/soundManager';
import { getResponsiveSize } from '../utils/responsive';

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
                            btn.style === 'cancel' ? styles.cancelButton : styles.confirmButton,
                            btn.style === 'destructive' ? styles.destructiveButton : null
                        ]}
                        onPress={() => {
                            playButtonSound();
                            if (btn.onPress) btn.onPress();
                            if (!btn.manualClose && onClose) onClose();
                        }}
                    >
                        <Text style={styles.buttonText}>{btn.text}</Text>
                    </TouchableOpacity>
                ))}
            </View>
            <View style={styles.innerShadow} pointerEvents="none" />
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertContent: {
    width: '80%',
    backgroundColor: '#041c55',
    borderRadius: getResponsiveSize(20),
    padding: getResponsiveSize(20),
    alignItems: 'center',
    shadowColor: '#f1c40f',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 3,
    shadowRadius: getResponsiveSize(3),
    elevation: 5,
    borderWidth: getResponsiveSize(1),
    borderColor: '#f1c40f',
  },
  alertTitle: {
    fontSize: getResponsiveSize(22),
    fontWeight: 'bold',
    marginBottom: getResponsiveSize(10),
    color: '#fff',
    textAlign: 'center'
  },
  alertMessage: {
    fontSize: getResponsiveSize(16),
    color: '#ccc',
    marginBottom: getResponsiveSize(20),
    textAlign: 'center'
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    width: '100%',
    gap: getResponsiveSize(15),
    flexWrap: 'wrap'
  },
  button: {
    paddingVertical: getResponsiveSize(12),
    paddingHorizontal: getResponsiveSize(20),
    borderRadius: getResponsiveSize(10),
    minWidth: getResponsiveSize(100),
    alignItems: 'center',
    flex: 1,
  },
  confirmButton: {
    backgroundColor: '#2ecc71',
  },
  cancelButton: {
    backgroundColor: '#95a5a6',
  },
  destructiveButton: {
    backgroundColor: '#e74c3c',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: getResponsiveSize(16),
    textAlign: 'center',
  },
  innerShadow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: getResponsiveSize(20),
    borderWidth: getResponsiveSize(4),
    borderColor: 'rgba(0, 0, 0, 0.3)',
  },
});

export default CustomAlert;
