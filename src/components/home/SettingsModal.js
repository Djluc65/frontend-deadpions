import React, { memo } from 'react';
import { Modal, Pressable, View, Text, Switch, TouchableOpacity, StyleSheet } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { toggleMusic, toggleSound, setLanguage } from '../../redux/slices/settingsSlice';
import { useTranslation } from 'react-i18next';
import i18n from '../../i18n/index';
import { playButtonSound } from '../../utils/soundManager';
import { getResponsiveSize } from '../../utils/responsive';
import { modalTheme } from '../../utils/modalTheme';
import { T } from '../../utils/theme';

const SettingsModal = memo(({ visible, onClose, handlePlaySound }) => {
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const settings = useSelector(state => state.settings || { isMusicEnabled: true, isSoundEnabled: true, language: null });
  const activeLanguage = settings.language || i18n.language || 'en';
  const { t } = useTranslation();
  const FLAGS = {
    fr: '🇫🇷',
    en: '🇬🇧',
    ht: '🇭🇹',
    es: '🇪🇸',
    pt: '🇧🇷',
    de: '🇩🇪',
    ja: '🇯🇵',
    zh: '🇨🇳',
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={styles.modalContent} onPress={() => {}}>
          <Text style={styles.modalTitle}>{t('settings.title')}</Text>
          
          <View style={styles.settingRow}>
            <Text style={styles.settingText}>{t('settings.music')}</Text>
            <Switch
              trackColor={{ false: T.bg3, true: T.blue }}
              thumbColor={settings.isMusicEnabled ? "#f5dd4b" : "#f4f3f4"}
              onValueChange={() => {
                handlePlaySound();
                dispatch(toggleMusic());
              }}
              value={settings.isMusicEnabled}
            />
          </View>

          <View style={styles.settingRow}>
            <Text style={styles.settingText}>{t('settings.sound')}</Text>
            <Switch
              trackColor={{ false: T.bg3, true: T.blue }}
              thumbColor={settings.isSoundEnabled ? "#f5dd4b" : "#f4f3f4"}
              onValueChange={() => {
                playButtonSound();
                dispatch(toggleSound());
              }}
              value={settings.isSoundEnabled}
            />
          </View>

          <View style={styles.languageBlock}>
            <Text style={styles.settingText}>{t('settings.language')}</Text>
            <View style={styles.languageGrid}>
              {['fr', 'en', 'ht', 'es', 'pt', 'de', 'ja', 'zh'].map((lang) => (
                <TouchableOpacity
                  key={lang}
                  style={[styles.langButton, activeLanguage === lang && styles.langButtonActive]}
                  hitSlop={{ top: getResponsiveSize(12), bottom: getResponsiveSize(12), left: getResponsiveSize(12), right: getResponsiveSize(12) }}
                  onPress={() => {
                    playButtonSound();
                    handlePlaySound();
                    dispatch(setLanguage(lang));
                  }}
                >
                  <Text style={[styles.langText, activeLanguage === lang && styles.langTextActive]} numberOfLines={1}>
                    {FLAGS[lang]} {t(`languages.${lang}`)}
                  </Text>
                </TouchableOpacity>
              ))}
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
            <Ionicons name="information-circle-outline" size={getResponsiveSize(24)} color={T.gold} />
            <Text style={styles.infoButtonText}>{t('settings.about_rules')}</Text>
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
            <Text style={styles.closeButtonText}>{t('common.close')}</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
});

const styles = StyleSheet.create({
  modalOverlay: modalTheme.overlay,
  modalContent: modalTheme.card,
  modalTitle: modalTheme.title,
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: getResponsiveSize(20),
    paddingHorizontal: getResponsiveSize(10),
  },
  settingText: {
    fontSize: getResponsiveSize(16),
    color: T.text,
    fontWeight: '600',
  },
  languageBlock: {
    width: '100%',
    marginBottom: getResponsiveSize(20),
    paddingHorizontal: getResponsiveSize(10),
  },
  languageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: getResponsiveSize(12),
    rowGap: getResponsiveSize(10),
  },
  langButton: {
    padding: getResponsiveSize(8),
    borderRadius: getResponsiveSize(T.radiusSm),
    borderWidth: 1,
    borderColor: T.borderSoft,
    backgroundColor: T.bg3,
    width: '48%',
    alignItems: 'center',
  },
  langButtonActive: {
    backgroundColor: T.gold,
    borderColor: T.gold,
  },
  langText: {
    color: T.textDim,
    fontWeight: '700',
    fontSize: getResponsiveSize(13),
  },
  langTextActive: {
    color: '#1B1305',
  },
  infoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: getResponsiveSize(18),
    padding: getResponsiveSize(10),
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: getResponsiveSize(T.radiusMd),
    width: '100%',
    justifyContent: 'center',
    backgroundColor: 'rgba(244,180,26,0.06)',
  },
  infoButtonText: {
    color: T.text,
    marginLeft: getResponsiveSize(10),
    fontWeight: '700',
    fontSize: getResponsiveSize(15),
  },
  closeButton: {
    backgroundColor: T.red,
    borderRadius: getResponsiveSize(T.radiusPill),
    padding: getResponsiveSize(10),
    paddingHorizontal: getResponsiveSize(30),
    marginTop: getResponsiveSize(10),
    ...T.shadowBtn,
  },
  closeButtonText: {
    color: '#fff',
    fontWeight: '800',
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
});

export default SettingsModal;
