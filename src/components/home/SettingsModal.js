import React, { memo } from 'react';
import { Modal, Pressable, View, Text, Switch, TouchableOpacity, StyleSheet } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { toggleMusic, toggleSound, setLanguage } from '../../redux/slices/settingsSlice';
import { translations } from '../../utils/translations';

const SettingsModal = memo(({ visible, onClose, handlePlaySound }) => {
  const dispatch = useDispatch();
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
                handlePlaySound();
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
                hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                onPress={() => {
                  handlePlaySound();
                  dispatch(setLanguage('fr'));
                }}
              >
                <Text style={styles.langText}>FR</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.langButton, settings.language === 'en' && styles.langButtonActive]}
                hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                onPress={() => {
                  handlePlaySound();
                  dispatch(setLanguage('en'));
                }}
              >
                <Text style={styles.langText}>EN</Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={styles.closeButton}
            hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
            onPress={() => {
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
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#041c55',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  settingText: {
    fontSize: 18,
    color: '#333',
  },
  languageContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  langButton: {
    padding: 8,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#041c55',
  },
  langButtonActive: {
    backgroundColor: '#041c55',
  },
  langText: {
    color: '#333',
    fontWeight: 'bold',
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
});

export default SettingsModal;
