import React, { memo } from 'react';
import { Modal, Pressable, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { playButtonSound } from '../../utils/soundManager';
import { getResponsiveSize } from '../../utils/responsive';
import { modalTheme } from '../../utils/modalTheme';
import { T } from '../../utils/theme';

const FriendsMenuModal = memo(({ 
  visible, 
  onClose, 
  onNavigateToLiveConfig,
  onOpenFriendConfig,
  onOpenJoinByCode,
}) => {
  const { t } = useTranslation();

  return (
    <Modal
      animationType="none"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.friendsModalContent} onStartShouldSetResponder={() => true}>
          <Text style={styles.friendsModalTitle}>{t('game.friends_tab')}</Text>
          
          {/* Bouton pour créer une Salle Live (Publique) */}
          <TouchableOpacity 
            style={styles.menuButton}
            onPress={() => {
                playButtonSound();
                onNavigateToLiveConfig();
            }}
          >
            <Ionicons name="radio-outline" size={getResponsiveSize(24)} color={T.cyan} style={{ marginRight: getResponsiveSize(10) }} />
            <Text style={styles.menuButtonText}>{t('friends_menu.create_live_room')}</Text>
            <View style={{ backgroundColor: T.cyan, paddingHorizontal: getResponsiveSize(6), paddingVertical: getResponsiveSize(2), borderRadius: getResponsiveSize(4), marginLeft: getResponsiveSize(10) }}>
                <Text style={{ color: '#05060B', fontSize: getResponsiveSize(10), fontWeight: 'bold' }}>{t('live_room.live_badge')}</Text>
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
            <Text style={styles.menuButtonText}>{t('friends_menu.play_with_friend')}</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.menuButton, { marginTop: getResponsiveSize(15) }]}
            onPress={() => {
                playButtonSound();
                if (onOpenJoinByCode) onOpenJoinByCode();
            }}
          >
            <Ionicons name="key-outline" size={getResponsiveSize(24)} color="#fff" style={{ marginRight: getResponsiveSize(10) }} />
            <Text style={styles.menuButtonText}>{t('live_room.join_with_code')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => {
                playButtonSound();
                onClose();
            }}
          >
            <Text style={styles.closeButtonText}>{t('common.close')}</Text>
          </TouchableOpacity>
        </View>
      </View>
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
