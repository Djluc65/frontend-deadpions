import React, { memo } from 'react';
import { Modal, Pressable, View, Text, Switch, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { toggleMusic, toggleSound, toggleChat, setLanguage } from '../../redux/slices/settingsSlice';
import { useTranslation } from 'react-i18next';
import i18n from '../../i18n/index';
import { usePrivacyMode } from '../../hooks/usePrivacyMode';
import { useAdManager } from '../../ads/AdSystem';
import { playButtonSound } from '../../utils/soundManager';
import { getResponsiveSize } from '../../utils/responsive';
import { modalTheme } from '../../utils/modalTheme';
import { T } from '../../utils/theme';

const SettingsModal = memo(({ visible, onClose, handlePlaySound }) => {
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const settings = useSelector(state => state.settings || { isMusicEnabled: true, isSoundEnabled: true, isChatEnabled: true, language: null });
  const activeLanguage = settings.language || i18n.language || 'en';
  const { privacyMode, updatePrivacy, loading: privacyLoading } = usePrivacyMode();
  const { showPrivacyOptions } = useAdManager();
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
              trackColor={{ false: T.bg3, true: '#5BD2FF' }}
              thumbColor={settings.isMusicEnabled ? '#fff' : '#8090B5'}
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
              trackColor={{ false: T.bg3, true: '#5BD2FF' }}
              thumbColor={settings.isSoundEnabled ? '#fff' : '#8090B5'}
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

          <View style={styles.settingRow}>
            <Text style={styles.settingText}>{t('settings.chat_enabled')}</Text>
            <Switch
              trackColor={{ false: T.bg3, true: '#5BD2FF' }}
              thumbColor={settings.isChatEnabled ? '#fff' : '#8090B5'}
              onValueChange={() => {
                playButtonSound();
                dispatch(toggleChat());
              }}
              value={settings.isChatEnabled}
            />
          </View>

          <View style={styles.privacyBlock}>
            <Text style={styles.settingText}>{t('settings.privacy_label')}</Text>
            <View style={styles.privacyOptions}>
              <TouchableOpacity 
                style={[styles.privacyBtn, privacyMode === 'public' && styles.privacyBtnActive]}
                onPress={() => updatePrivacy('public')}
                disabled={privacyLoading}
              >
                <Ionicons name="earth" size={18} color={privacyMode === 'public' ? T.bg0 : T.textDim} />
                <Text style={[styles.privacyBtnText, privacyMode === 'public' && styles.privacyBtnTextActive]}>{t('settings.privacy_public')}</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.privacyBtn, privacyMode === 'friends_only' && styles.privacyBtnActive]}
                onPress={() => updatePrivacy('friends_only')}
                disabled={privacyLoading}
              >
                <Ionicons name="people" size={18} color={privacyMode === 'friends_only' ? T.bg0 : T.textDim} />
                <Text style={[styles.privacyBtnText, privacyMode === 'friends_only' && styles.privacyBtnTextActive]}>{t('settings.privacy_friends_only')}</Text>
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
            <Ionicons name="information-circle-outline" size={getResponsiveSize(24)} color={T.cyan} />
            <Text style={styles.infoButtonText}>{t('settings.about_rules')}</Text>
          </TouchableOpacity>

          {Platform.OS === 'android' && (
            <TouchableOpacity
              style={styles.infoButton}
              onPress={() => {
                playButtonSound();
                showPrivacyOptions?.();
              }}
            >
              <Ionicons name="shield-checkmark-outline" size={getResponsiveSize(24)} color={T.cyan} />
              <Text style={styles.infoButtonText}>{t('settings.ads_privacy')}</Text>
            </TouchableOpacity>
          )}

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
    borderColor: 'rgba(150, 180, 255, 0.18)',
    backgroundColor: T.bg3,
    width: '48%',
    alignItems: 'center',
  },
  langButtonActive: {
    backgroundColor: '#5BD2FF',
    borderColor: '#5BD2FF',
    shadowColor: '#5BD2FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: getResponsiveSize(6),
    elevation: 4,
  },
  langText: {
    color: T.textDim,
    fontWeight: '700',
    fontSize: getResponsiveSize(13),
  },
  langTextActive: {
    color: '#05060B',
  },
  infoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: getResponsiveSize(18),
    padding: getResponsiveSize(10),
    borderWidth: 1,
    borderColor: 'rgba(150, 180, 255, 0.18)',
    borderRadius: getResponsiveSize(T.radiusMd),
    width: '100%',
    justifyContent: 'center',
    backgroundColor: 'rgba(91, 210, 255, 0.06)',
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
  privacyBlock: {
    marginTop: 20,
    width: '100%',
  },
  privacyOptions: {
    flexDirection: 'row',
    marginTop: 10,
    backgroundColor: T.bg3,
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: 'rgba(150, 180, 255, 0.12)',
  },
  privacyBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
  },
  privacyBtnActive: {
    backgroundColor: '#5BD2FF',
    shadowColor: '#5BD2FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  privacyBtnText: {
    color: T.textDim,
    fontSize: getResponsiveSize(12),
    marginLeft: 6,
    fontWeight: '600',
  },
  privacyBtnTextActive: {
    color: '#05060B',
    fontWeight: 'bold',
  },
});

export default SettingsModal;
