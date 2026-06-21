// DeadPions — TournamentInviteModal.jsx — invitation par code & QR

import React, { useState, useRef, useCallback } from 'react';
import {
  View, Text, Modal, TouchableOpacity, StyleSheet,
  Share, Animated, Platform
} from 'react-native';
import { useTranslation } from 'react-i18next';
import * as Clipboard from 'expo-clipboard';
import QRCode from 'react-native-qrcode-svg';
import { Ionicons } from '@expo/vector-icons';
import { getResponsiveSize } from '../utils/responsive';
import { useTournamentLayout, MODAL_MAX_WIDTH } from '../utils/tournamentLayout';

const rs = getResponsiveSize;

const makeDeepLink = (tournamentId, code) =>
  `deadpions://tournament/join?id=${tournamentId}&code=${code}`;

const makeWebLink = (tournamentId, code) =>
  `https://deadpions.eu/tournament/join?id=${tournamentId}&code=${code}`;

export default function TournamentInviteModal({
  visible,
  onClose,
  tournamentId,
  tournamentName,
  invitationCode,
  entryFee = 0,
  size = 4
}) {
  const { t } = useTranslation();
  const { isTablet, width } = useTournamentLayout();
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState('code');
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const opacAnim = useRef(new Animated.Value(0)).current;

  const onShow = useCallback(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1, useNativeDriver: true,
        tension: 65, friction: 8
      }),
      Animated.timing(opacAnim, {
        toValue: 1, duration: 200, useNativeDriver: true
      })
    ]).start();
  }, [opacAnim, scaleAnim]);

  const deepLink = makeDeepLink(tournamentId, invitationCode);
  const webLink = makeWebLink(tournamentId, invitationCode);

  const handleCopyCode = async () => {
    await Clipboard.setStringAsync(invitationCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleCopyLink = async () => {
    await Clipboard.setStringAsync(webLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleShare = async () => {
    try {
      await Share.share({
        title: t('tournament.invite.share_title'),
        message: t('tournament.invite.share_message', {
          name: tournamentName,
          entry: entryFee,
          size,
          code: invitationCode,
          link: webLink,
        }),
        url: webLink,
      });
    } catch (err) {
      console.error('[TournamentInviteModal] Share error:', err);
    }
  };

  if (!invitationCode) return null;

  const codeFormatted = invitationCode.length === 6
    ? `${invitationCode.slice(0, 3)} ${invitationCode.slice(3)}`
    : invitationCode;

  const qrSize = isTablet
    ? Math.min(width * 0.30, 260)
    : Math.min(width * 0.55, 220);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onShow={onShow}
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={[s.overlay, isTablet && { justifyContent: 'center' }]}
        activeOpacity={1}
        onPress={onClose}
      >
        <Animated.View
          style={[
            s.sheet,
            {
              transform: [{ scale: scaleAnim }],
              opacity: opacAnim,
            },
            isTablet && {
              borderRadius: rs(18),
              width: Math.min(width * 0.75, MODAL_MAX_WIDTH),
              alignSelf: 'center',
              borderTopLeftRadius: rs(18),
              borderTopRightRadius: rs(18),
              borderLeftWidth: 1,
              borderRightWidth: 1,
              borderBottomWidth: 1,
              borderColor: '#F4B41A40',
            },
          ]}
          onStartShouldSetResponder={() => true}
        >
          <View style={s.header}>
            <View style={s.headerLeft}>
              <Text style={s.headerEmoji}>🏆</Text>
              <View>
                <Text style={s.headerTitle} numberOfLines={1}>
                  {t('tournament.invite.title')}
                </Text>
                <Text style={s.headerSub} numberOfLines={1}>
                  {tournamentName}
                </Text>
              </View>
            </View>
            <TouchableOpacity style={s.closeBtn} onPress={onClose}>
              <Ionicons name="close" size={rs(20)} color="#ECE6D6" />
            </TouchableOpacity>
          </View>

          <View style={s.tabs}>
            {[
              { key: 'code', icon: 'keypad-outline', labelKey: 'tournament.invite.tab_code' },
              { key: 'qr', icon: 'qr-code-outline', labelKey: 'tournament.invite.tab_qr' },
              { key: 'share', icon: 'share-social-outline', labelKey: 'tournament.invite.tab_share' }
            ].map((tab) => (
              <TouchableOpacity
                key={tab.key}
                style={[s.tab, activeTab === tab.key && s.tabActive]}
                onPress={() => setActiveTab(tab.key)}
              >
                <Ionicons
                  name={tab.icon}
                  size={rs(16)}
                  color={activeTab === tab.key ? '#060B17' : '#ECE6D680'}
                />
                <Text style={[
                  s.tabLabel,
                  activeTab === tab.key && s.tabLabelActive,
                  isTablet && { fontSize: rs(14) },
                ]}>
                  {t(tab.labelKey)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={s.content}>
            {activeTab === 'code' && (
              <View style={s.codeSection}>
                <Text style={s.codeHint}>
                  {t('tournament.invite.code_hint')}
                </Text>

                <TouchableOpacity
                  style={s.codeBox}
                  onPress={handleCopyCode}
                  activeOpacity={0.85}
                >
                  <View style={s.codeLetters}>
                    {invitationCode.split('').map((char, i) => (
                      <React.Fragment key={i}>
                        {i === 3 && <View style={s.codeSeparator} />}
                        <View style={s.codeLetter}>
                          <Text style={s.codeChar}>{char}</Text>
                        </View>
                      </React.Fragment>
                    ))}
                  </View>
                  <View style={s.copyHint}>
                    <Ionicons
                      name={copied ? 'checkmark-circle' : 'copy-outline'}
                      size={rs(14)}
                      color={copied ? '#2ECC71' : '#F4B41A'}
                    />
                    <Text style={[s.copyHintText, copied && { color: '#2ECC71' }]}>
                      {copied ? t('tournament.invite.copied') : t('tournament.invite.copy_tap')}
                    </Text>
                  </View>
                </TouchableOpacity>

                <View style={s.tournamentInfo}>
                  <Text style={s.infoLine}>{t('tournament.invite.info_entry', { amount: entryFee })}</Text>
                  <Text style={s.infoLine}>{t('tournament.invite.info_players', { size })}</Text>
                  <Text style={s.infoLine}>
                    {t('tournament.invite.info_gain', { amount: Math.floor(entryFee * size * 0.95) })}
                  </Text>
                </View>

                <TouchableOpacity style={s.btnSecondary} onPress={handleCopyLink}>
                  <Ionicons name="link-outline" size={rs(16)} color="#F4B41A" />
                  <Text style={s.btnSecondaryText}>{t('tournament.invite.btn_copy_link')}</Text>
                </TouchableOpacity>
              </View>
            )}

            {activeTab === 'qr' && (
              <View style={s.qrSection}>
                <Text style={s.codeHint}>
                  {t('tournament.invite.qr_hint_scan')}
                </Text>

                <View style={s.qrWrapper}>
                  <QRCode
                    value={deepLink}
                    size={qrSize}
                    color="#ECE6D6"
                    backgroundColor="#0D1526"
                    logo={require('../../assets/images/LogoDeadPions2.png')}
                    logoSize={Math.round(qrSize * 0.18)}
                    logoBackgroundColor="#0D1526"
                    logoBorderRadius={4}
                    quietZone={12}
                  />
                </View>

                <View style={s.qrCodeBadge}>
                  <Text style={s.qrCodeText}>{codeFormatted}</Text>
                </View>

                <Text style={s.qrHint}>
                  {t('tournament.invite.qr_hint_manual')}
                </Text>

                <TouchableOpacity style={s.btnPrimary} onPress={handleShare}>
                  <Ionicons name="share-social-outline" size={rs(16)} color="#060B17" />
                  <Text style={s.btnPrimaryText}>{t('tournament.invite.btn_share')}</Text>
                </TouchableOpacity>
              </View>
            )}

            {activeTab === 'share' && (
              <View style={s.shareSection}>
                <Text style={s.codeHint}>
                  {t('tournament.invite.code_hint')}
                </Text>

                <View style={s.sharePreview}>
                  <Text style={s.sharePreviewLabel}>{t('tournament.invite.share_preview_label')}</Text>
                  <Text style={s.sharePreviewText}>
                    {t('tournament.invite.share_preview_text', {
                      name: tournamentName,
                      entry: entryFee,
                      size,
                      code: codeFormatted,
                      link: webLink,
                    })}
                  </Text>
                </View>

                <TouchableOpacity style={s.btnPrimary} onPress={handleShare}>
                  <Ionicons name="share-social-outline" size={rs(16)} color="#060B17" />
                  <Text style={s.btnPrimaryText}>
                    {Platform.OS === 'ios'
                      ? t('tournament.invite.btn_share_ios')
                      : t('tournament.invite.btn_share_android')}
                  </Text>
                </TouchableOpacity>

                <View style={s.quickShareRow}>
                  <TouchableOpacity style={s.quickShareBtn} onPress={handleCopyCode}>
                    <Ionicons name="copy-outline" size={rs(20)} color="#F4B41A" />
                    <Text style={s.quickShareLabel}>{t('tournament.invite.quick_copy_code')}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={s.quickShareBtn} onPress={handleCopyLink}>
                    <Ionicons name="link-outline" size={rs(20)} color="#F4B41A" />
                    <Text style={s.quickShareLabel}>{t('tournament.invite.quick_copy_link')}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={s.quickShareBtn} onPress={() => setActiveTab('qr')}>
                    <Ionicons name="qr-code-outline" size={rs(20)} color="#F4B41A" />
                    <Text style={s.quickShareLabel}>{t('tournament.invite.quick_qr')}</Text>
                  </TouchableOpacity>
                </View>

                {copied && (
                  <View style={s.copiedFeedback}>
                    <Ionicons name="checkmark-circle" size={rs(16)} color="#2ECC71" />
                    <Text style={s.copiedFeedbackText}>{t('tournament.invite.copied_feedback')}</Text>
                  </View>
                )}
              </View>
            )}
          </View>
        </Animated.View>
      </TouchableOpacity>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(6,11,23,0.88)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#0D1526',
    borderTopLeftRadius: rs(20),
    borderTopRightRadius: rs(20),
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: '#F4B41A40',
    paddingBottom: rs(40),
    paddingTop: rs(4),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: rs(20),
    paddingVertical: rs(16),
    borderBottomWidth: 1,
    borderBottomColor: '#1E2A45',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(10),
    flex: 1,
  },
  headerEmoji: { fontSize: rs(24) },
  headerTitle: {
    fontFamily: 'BarlowCondensed-Bold',
    fontSize: rs(18),
    color: '#F4B41A',
  },
  headerSub: {
    fontFamily: 'Inter',
    fontSize: rs(12),
    color: '#ECE6D660',
  },
  closeBtn: {
    width: rs(32), height: rs(32),
    borderRadius: rs(16),
    backgroundColor: '#1E2A45',
    alignItems: 'center', justifyContent: 'center',
  },
  tabs: {
    flexDirection: 'row',
    marginHorizontal: rs(20),
    marginTop: rs(14),
    backgroundColor: '#060B17',
    borderRadius: rs(12),
    padding: rs(3),
    gap: rs(2),
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: rs(8),
    borderRadius: rs(10),
    gap: rs(5),
  },
  tabActive: {
    backgroundColor: '#F4B41A',
  },
  tabLabel: {
    fontFamily: 'BarlowCondensed-Bold',
    fontSize: rs(12),
    color: '#ECE6D680',
    letterSpacing: 0.3,
  },
  tabLabelActive: {
    color: '#060B17',
  },
  content: {
    paddingHorizontal: rs(20),
    paddingTop: rs(16),
  },
  codeSection: { gap: rs(14) },
  codeHint: {
    fontFamily: 'Inter',
    fontSize: rs(13),
    color: '#ECE6D680',
    textAlign: 'center',
    lineHeight: rs(18),
  },
  codeBox: {
    backgroundColor: '#060B17',
    borderRadius: rs(14),
    borderWidth: 1,
    borderColor: '#F4B41A40',
    paddingVertical: rs(16),
    paddingHorizontal: rs(12),
    alignItems: 'center',
    gap: rs(10),
  },
  codeLetters: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(6),
  },
  codeLetter: {
    width: rs(38),
    height: rs(46),
    borderRadius: rs(8),
    backgroundColor: '#1E2A45',
    borderWidth: 1,
    borderColor: '#F4B41A60',
    alignItems: 'center',
    justifyContent: 'center',
  },
  codeChar: {
    fontFamily: 'BarlowCondensed-Bold',
    fontSize: rs(24),
    color: '#F4B41A',
    letterSpacing: 1,
  },
  codeSeparator: {
    width: rs(8),
    height: rs(2),
    backgroundColor: '#F4B41A40',
    borderRadius: rs(1),
  },
  copyHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(5),
  },
  copyHintText: {
    fontFamily: 'Inter',
    fontSize: rs(12),
    color: '#F4B41A',
  },
  tournamentInfo: {
    backgroundColor: '#060B17',
    borderRadius: rs(10),
    padding: rs(12),
    gap: rs(6),
  },
  infoLine: {
    fontFamily: 'Inter',
    fontSize: rs(13),
    color: '#ECE6D6',
  },
  btnSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: rs(8),
    borderWidth: 1,
    borderColor: '#F4B41A60',
    borderRadius: rs(12),
    paddingVertical: rs(12),
  },
  btnSecondaryText: {
    fontFamily: 'BarlowCondensed-Bold',
    fontSize: rs(14),
    color: '#F4B41A',
  },
  qrSection: { gap: rs(14), alignItems: 'center' },
  qrWrapper: {
    padding: rs(16),
    backgroundColor: '#0D1526',
    borderRadius: rs(16),
    borderWidth: 1,
    borderColor: '#F4B41A40',
  },
  qrCodeBadge: {
    backgroundColor: '#060B17',
    borderRadius: rs(10),
    paddingHorizontal: rs(20),
    paddingVertical: rs(8),
    borderWidth: 1,
    borderColor: '#F4B41A40',
  },
  qrCodeText: {
    fontFamily: 'BarlowCondensed-Bold',
    fontSize: rs(22),
    color: '#F4B41A',
    letterSpacing: rs(8),
  },
  qrHint: {
    fontFamily: 'Inter',
    fontSize: rs(12),
    color: '#ECE6D650',
  },
  shareSection: { gap: rs(14) },
  sharePreview: {
    backgroundColor: '#060B17',
    borderRadius: rs(12),
    padding: rs(14),
    borderWidth: 1,
    borderColor: '#1E2A45',
    gap: rs(6),
  },
  sharePreviewLabel: {
    fontFamily: 'BarlowCondensed-Bold',
    fontSize: rs(12),
    color: '#ECE6D660',
    letterSpacing: 0.5,
  },
  sharePreviewText: {
    fontFamily: 'Inter',
    fontSize: rs(12),
    color: '#ECE6D6',
    lineHeight: rs(18),
  },
  quickShareRow: {
    flexDirection: 'row',
    gap: rs(10),
  },
  quickShareBtn: {
    flex: 1,
    backgroundColor: '#060B17',
    borderRadius: rs(12),
    paddingVertical: rs(12),
    alignItems: 'center',
    gap: rs(6),
    borderWidth: 1,
    borderColor: '#1E2A45',
  },
  quickShareLabel: {
    fontFamily: 'Inter',
    fontSize: rs(11),
    color: '#ECE6D680',
  },
  copiedFeedback: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: rs(6),
    paddingVertical: rs(8),
  },
  copiedFeedbackText: {
    fontFamily: 'Inter',
    fontSize: rs(13),
    color: '#2ECC71',
  },
  btnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: rs(8),
    backgroundColor: '#F4B41A',
    borderRadius: rs(12),
    paddingVertical: rs(14),
    width: '100%',
  },
  btnPrimaryText: {
    fontFamily: 'BarlowCondensed-Bold',
    fontSize: rs(15),
    color: '#060B17',
    letterSpacing: 0.5,
  },
});
