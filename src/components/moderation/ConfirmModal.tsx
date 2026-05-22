import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Pressable } from 'react-native';
import { T } from '../../utils/theme';
import { getResponsiveSize } from '../../utils/responsive';
import { useTranslation } from 'react-i18next';

interface ConfirmModalProps {
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmLabel?: string;
  confirmColor?: string;
  visible: boolean;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  title,
  message,
  onConfirm,
  onCancel,
  confirmLabel,
  confirmColor = T.gold,
  visible
}) => {
  const { t } = useTranslation();
  
  return (
    <Modal visible={visible} transparent animationType="fade">
      <Pressable style={styles.overlay} onPress={onCancel}>
        <View style={styles.container}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.button} onPress={onCancel}>
              <Text style={styles.cancelText}>{t('common.cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.button, { borderLeftWidth: 1, borderLeftColor: T.borderSoft }]} 
              onPress={onConfirm}
            >
              <Text style={[styles.confirmText, { color: confirmColor }]}>
                {confirmLabel || t('common.confirm')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  container: {
    backgroundColor: T.bg2,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: T.borderMid,
    width: '100%',
    maxWidth: 400,
    overflow: 'hidden'
  },
  title: {
    fontSize: getResponsiveSize(18),
    fontWeight: 'bold',
    color: T.gold,
    padding: 20,
    paddingBottom: 10,
    textAlign: 'center'
  },
  message: {
    fontSize: getResponsiveSize(16),
    color: T.text,
    padding: 20,
    paddingTop: 0,
    textAlign: 'center',
    lineHeight: 24
  },
  buttonContainer: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: T.borderSoft
  },
  button: {
    flex: 1,
    padding: 15,
    justifyContent: 'center',
    alignItems: 'center'
  },
  cancelText: {
    color: T.textDim,
    fontSize: getResponsiveSize(16),
    fontWeight: '600'
  },
  confirmText: {
    fontSize: getResponsiveSize(16),
    fontWeight: 'bold'
  }
});

export default ConfirmModal;
