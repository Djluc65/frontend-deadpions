import React, { memo } from 'react';
import { Modal, Pressable, View, Text, Switch, TouchableOpacity, StyleSheet } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { toggleMusic, toggleSound, setLanguage } from '../../redux/slices/settingsSlice';
import { translations } from '../../utils/translations';
import { playButtonSound } from '../../utils/soundManager';
import { getResponsiveSize } from '../../utils/responsive';

const SettingsModal = memo(({ visible, onClose, handlePlaySound }) => {
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const settings = useSelector(state => state.settings || { isMusicEnabled: true, isSoundEnabled: true, language: 'fr' });
  const t = translations[settings.language] || translations.fr;

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={styles.modalContent} onPress={() => {}}>
          <Text style={styles.modalTitle}>{t.settings}</Text>
          
          <View style={styles.settingRow}>
            <Text style={styles.settingText}>{t.music}</Text>
            <Switch
              trackColor={{ false: "#767577", true: "#81b0ff" }}
              thumbColor={settings.isMusicEnabled ? "#f5dd4b" : "#f4f3f4"}
              onValueChange={() => {
                handlePlaySound();
                dispatch(toggleMusic());
              }}
              value={settings.isMusicEnabled}
            />
          </View>

          <View style={styles.settingRow}>
            <Text style={styles.settingText}>{t.sound}</Text>
            <Switch
              trackColor={{ false: "#767577", true: "#81b0ff" }}
              thumbColor={settings.isSoundEnabled ? "#f5dd4b" : "#f4f3f4"}
              onValueChange={() => {
                playButtonSound();
                dispatch(toggleSound());
              }}
              value={settings.isSoundEnabled}
            />
          </View>

          <View style={styles.settingRow}>
            <Text style={styles.settingText}>{t.language}</Text>
            <View style={styles.languageContainer}>
              <TouchableOpacity 
                style={[styles.langButton, settings.language === 'fr' && styles.langButtonActive]}
                hitSlop={{ top: getResponsiveSize(15), bottom: getResponsiveSize(15), left: getResponsiveSize(15), right: getResponsiveSize(15) }}
                onPress={() => {
                  playButtonSound();
                  handlePlaySound();
                  dispatch(setLanguage('fr'));
                }}
              >
                <Text style={[styles.langText, settings.language === 'fr' && styles.langTextActive]}>FR</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.langButton, settings.language === 'en' && styles.langButtonActive]}
                hitSlop={{ top: getResponsiveSize(15), bottom: getResponsiveSize(15), left: getResponsiveSize(15), right: getResponsiveSize(15) }}
                onPress={() => {
                  playButtonSound();
                  handlePlaySound();
                  dispatch(setLanguage('en'));
                }}
              >
                <Text style={[styles.langText, settings.language === 'en' && styles.langTextActive]}>EN</Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={styles.infoButton}
            onPress={() => {
              playButtonSound();
              onClose();
              navigation.navigate('Info');
            }}
          >
            <Ionicons name="information-circle-outline" size={getResponsiveSize(24)} color="#f1c40f" />
            <Text style={styles.infoButtonText}>{settings.language === 'en' ? 'About & Rules' : 'Infos & Règles'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.closeButton}
            hitSlop={{ top: getResponsiveSize(15), bottom: getResponsiveSize(15), left: getResponsiveSize(15), right: getResponsiveSize(15) }}
            onPress={() => {
              playButtonSound();
              handlePlaySound();
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
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
  modalTitle: {
    fontSize: getResponsiveSize(24),
    fontWeight: 'bold',
    marginBottom: getResponsiveSize(20),
    color: '#fff',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: getResponsiveSize(20),
    paddingHorizontal: getResponsiveSize(10),
  },
  settingText: {
    fontSize: getResponsiveSize(18),
    color: '#fff',
  },
  languageContainer: {
    flexDirection: 'row',
    gap: getResponsiveSize(10),
  },
  langButton: {
    padding: getResponsiveSize(8),
    borderRadius: getResponsiveSize(5),
    borderWidth: getResponsiveSize(1),
    borderColor: '#f1c40f',
  },
  langButtonActive: {
    backgroundColor: '#f1c40f',
  },
  langText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  langTextActive: {
    color: '#041c55',
  },
  infoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: getResponsiveSize(20),
    padding: getResponsiveSize(10),
    borderWidth: getResponsiveSize(1),
    borderColor: '#f1c40f',
    borderRadius: getResponsiveSize(10),
    width: '100%',
    justifyContent: 'center',
  },
  infoButtonText: {
    color: '#fff',
    marginLeft: getResponsiveSize(10),
    fontWeight: 'bold',
    fontSize: getResponsiveSize(16),
  },
  closeButton: {
    backgroundColor: '#eb4141ff',
    borderRadius: getResponsiveSize(20),
    padding: getResponsiveSize(10),
    paddingHorizontal: getResponsiveSize(30),
    marginTop: getResponsiveSize(10),
  },
  closeButtonText: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default SettingsModal;
