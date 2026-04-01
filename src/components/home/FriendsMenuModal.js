import React, { memo } from 'react';
import { Modal, Pressable, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { playButtonSound } from '../../utils/soundManager';
import { getResponsiveSize } from '../../utils/responsive';
import { modalTheme } from '../../utils/modalTheme';

const FriendsMenuModal = memo(({ 
  visible, 
  onClose, 
  onNavigateToLiveConfig,
  onOpenFriendConfig,
  onOpenJoinByCode,
  t 
}) => {
  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={styles.friendsModalContent} onPress={() => {}}>
          <Text style={styles.friendsModalTitle}>{t.friends}</Text>
          
          {/* Bouton pour créer une Salle Live (Publique) */}
          <TouchableOpacity 
            style={styles.menuButton}
            onPress={() => {
                playButtonSound();
                onNavigateToLiveConfig();
            }}
          >
            <Ionicons name="radio-outline" size={getResponsiveSize(24)} color="#f1c40f" style={{ marginRight: getResponsiveSize(10) }} />
            <Text style={styles.menuButtonText}>Créer une Salle Live</Text>
            <View style={{ backgroundColor: '#f1c40f', paddingHorizontal: getResponsiveSize(6), paddingVertical: getResponsiveSize(2), borderRadius: getResponsiveSize(4), marginLeft: getResponsiveSize(10) }}>
                <Text style={{ color: '#041c55', fontSize: getResponsiveSize(10), fontWeight: 'bold' }}>LIVE</Text>
            </View>
          </TouchableOpacity>

          {/* Bouton pour Jouer avec un ami (Privé) */}
          <TouchableOpacity 
            style={[styles.menuButton, { marginTop: getResponsiveSize(15) }]}
            onPress={() => {
                playButtonSound();
                onOpenFriendConfig();
            }}
          >
            <Ionicons name="add-circle" size={getResponsiveSize(24)} color="#fff" style={{ marginRight: getResponsiveSize(10) }} />
            <Text style={styles.menuButtonText}>Jouer avec un ami</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.menuButton, { marginTop: getResponsiveSize(15) }]}
            onPress={() => {
                playButtonSound();
                if (onOpenJoinByCode) onOpenJoinByCode();
            }}
          >
            <Ionicons name="key-outline" size={getResponsiveSize(24)} color="#fff" style={{ marginRight: getResponsiveSize(10) }} />
            <Text style={styles.menuButtonText}>Rejoindre avec un code</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => {
                playButtonSound();
                onClose();
            }}
          >
            <Text style={styles.closeButtonText}>{t.close}</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
});

const styles = StyleSheet.create({
  modalOverlay: modalTheme.overlay,
  friendsModalContent: modalTheme.card,
  friendsModalTitle: modalTheme.title,
  menuButton: {
    ...modalTheme.button,
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    justifyContent: 'center',
  },
  menuButtonText: {
    ...modalTheme.buttonText,
  },
  closeButton: {
    ...modalTheme.buttonBase,
    ...modalTheme.buttonDestructive,
    marginTop: getResponsiveSize(10)
  },
  closeButtonText: {
    ...modalTheme.buttonTextBase,
    ...modalTheme.buttonTextOnDark,
  },
});

export default FriendsMenuModal;
