import React, { memo } from 'react';
import { Modal, Pressable, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { playButtonSound } from '../../utils/soundManager';

const FriendsMenuModal = memo(({ 
  visible, 
  onClose, 
  onNavigateToLiveConfig,
  onOpenFriendConfig,
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
            style={[styles.menuButton, { backgroundColor: '#041c55'}]}
            onPress={() => {
                playButtonSound();
                onNavigateToLiveConfig();
            }}
          >
            <Ionicons name="radio-outline" size={24} color="#ef4444" style={{ marginRight: 10 }} />
            <Text style={styles.menuButtonText}>Créer une Salle Live</Text>
            <View style={{ backgroundColor: '#ef4444', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginLeft: 10 }}>
                <Text style={{ color: '#fff', fontSize: 10, fontWeight: 'bold' }}>LIVE</Text>
            </View>
          </TouchableOpacity>

          {/* Bouton pour Jouer avec un ami (Privé) */}
          <TouchableOpacity 
            style={[styles.menuButton, { backgroundColor:  '#041c55', marginTop: 15 }]}
            onPress={() => {
                playButtonSound();
                onOpenFriendConfig();
            }}
          >
            <Ionicons name="add-circle" size={24} color="#fff" style={{ marginRight: 10 }} />
            <Text style={styles.menuButtonText}>Jouer avec un ami</Text>
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
          <View style={styles.innerShadow} pointerEvents="none" />
        </Pressable>
      </Pressable>
    </Modal>
  );
});

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  friendsModalContent: {
    width: '80%',
    backgroundColor: '#041c55',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#f1c40f',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 3,
    shadowRadius: 3,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#f1c40f',
  },
  friendsModalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#fff',
  },
  menuButton: {
    flexDirection: 'row',
    backgroundColor: '#041c55',
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 5,
    borderWidth: 3,
    borderColor: '#f1c40f',
    shadowColor: '#f1c40f',
    shadowOffset: {width: 0, height: 0},
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    width: '100%',
    justifyContent: 'center',
  },
  menuButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  closeButton: {
    backgroundColor: '#eb4141ff',
    borderRadius: 20,
    padding: 10,
    paddingHorizontal: 30,
    marginTop: 10,
  },
  closeButtonText: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  innerShadow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 20,
    borderWidth: 4,
    borderColor: 'rgba(0, 0, 0, 0.3)',
  },
});

export default FriendsMenuModal;
