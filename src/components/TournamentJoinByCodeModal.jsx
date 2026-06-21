// DeadPions — TournamentJoinByCodeModal.jsx

import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, Modal, TouchableOpacity, StyleSheet,
  TextInput, ActivityIndicator, Keyboard, Animated,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { API_URL } from '../config';
import { getResponsiveSize } from '../utils/responsive';
import { useTournamentLayout, MODAL_MAX_WIDTH } from '../utils/tournamentLayout';

const rs = getResponsiveSize;
const CODE_LENGTH = 6;

export default function TournamentJoinByCodeModal({ visible, onClose }) {
  const { t } = useTranslation();
  const { isTablet, width } = useTournamentLayout();
  const navigation = useNavigation();
  const token = useSelector((s) => s.auth.token);

  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState('');

  const inputRefs = useRef([]);
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    if (visible) {
      setCode('');
      setPreview(null);
      setError('');
      Animated.spring(scaleAnim, {
        toValue: 1, useNativeDriver: true,
        tension: 70, friction: 9
      }).start();
      setTimeout(() => inputRefs.current[0]?.focus(), 300);
    }
  }, [visible, scaleAnim]);

  const handleCharInput = (char, index) => {
    const clean = char.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!clean) return;

    const newCode = code.split('');
    newCode[index] = clean[clean.length - 1];
    const joined = newCode.join('').slice(0, CODE_LENGTH);
    setCode(joined);
    setError('');
    setPreview(null);

    if (index < CODE_LENGTH - 1 && clean) {
      inputRefs.current[index + 1]?.focus();
    }

    if (joined.length === CODE_LENGTH) {
      Keyboard.dismiss();
      searchByCode(joined);
    }
  };

  const handleKeyPress = (e, index) => {
    if (e.nativeEvent.key === 'Backspace') {
      const newCode = code.split('');
      if (newCode[index]) {
        newCode[index] = '';
        setCode(newCode.join(''));
      } else if (index > 0) {
        newCode[index - 1] = '';
        setCode(newCode.join(''));
        inputRefs.current[index - 1]?.focus();
      }
      setPreview(null);
      setError('');
    }
  };

  const searchByCode = async (codeToSearch) => {
    const c = (codeToSearch || code).toUpperCase().trim();
    if (c.length !== CODE_LENGTH) {
      setError(t('tournament.join_code.error_incomplete'));
      return;
    }
    setLoading(true);
    setError('');
    setPreview(null);

    try {
      const res = await fetch(
        `${API_URL}/tournaments/join-by-code/${c}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.message || t('tournament.join_code.error_not_found'));
        return;
      }
      setPreview(data.tournament);
    } catch (err) {
      setError(t('tournament.join_code.error_network'));
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = () => {
    if (!preview) return;
    onClose();
    navigation.navigate('TournamentWaitingRoom', {
      tournamentId: preview._id,
      inviteCode: code.toUpperCase(),
      tournamentName: preview.name
    });
  };

  const codeChars = code.padEnd(CODE_LENGTH, ' ').split('');

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
      >
      <TouchableOpacity
        style={s.overlay}
        activeOpacity={1}
        onPress={() => { Keyboard.dismiss(); onClose(); }}
      >
        <Animated.View
          style={[
            s.card,
            { transform: [{ scale: scaleAnim }] },
            isTablet && { width: Math.min(width * 0.70, MODAL_MAX_WIDTH) },
          ]}
          onStartShouldSetResponder={() => true}
        >
          <View style={s.header}>
            <Text style={s.title}>{t('tournament.join_code.title')}</Text>
            <TouchableOpacity style={s.closeBtn} onPress={onClose}>
              <Ionicons name="close" size={rs(18)} color="#ECE6D6" />
            </TouchableOpacity>
          </View>

          <Text style={s.hint}>
            {t('tournament.join_code.hint')}
          </Text>

          <View style={s.codeInputRow}>
            {codeChars.map((char, i) => (
              <React.Fragment key={i}>
                {i === 3 && <View style={s.codeDash} />}
                <TextInput
                  ref={(ref) => { inputRefs.current[i] = ref; }}
                  style={[
                    s.codeInput,
                    char.trim() && s.codeInputFilled,
                    error && s.codeInputError,
                    isTablet && { width: rs(52), height: rs(62), fontSize: rs(26) },
                  ]}
                  value={char.trim() ? char : ''}
                  onChangeText={(text) => handleCharInput(text, i)}
                  onKeyPress={(e) => handleKeyPress(e, i)}
                  maxLength={1}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  keyboardType="default"
                  returnKeyType="next"
                  selectTextOnFocus
                />
              </React.Fragment>
            ))}
          </View>

          {code.length < CODE_LENGTH && (
            <TouchableOpacity
              style={[s.btnSearch, code.length < CODE_LENGTH && s.btnSearchDisabled]}
              onPress={() => searchByCode(code)}
              disabled={code.length < CODE_LENGTH}
            >
              <Ionicons name="search-outline" size={rs(16)} color="#060B17" />
              <Text style={s.btnSearchText}>{t('tournament.join_code.btn_search')}</Text>
            </TouchableOpacity>
          )}

          {loading && (
            <View style={s.loadingRow}>
              <ActivityIndicator color="#F4B41A" size="small" />
              <Text style={s.loadingText}>{t('tournament.join_code.searching')}</Text>
            </View>
          )}

          {!!error && (
            <View style={s.errorBox}>
              <Ionicons name="warning-outline" size={rs(16)} color="#E74C3C" />
              <Text style={s.errorText}>{error}</Text>
            </View>
          )}

          {preview && (
            <View style={s.previewCard}>
              <View style={s.previewHeader}>
                <Text style={s.previewName} numberOfLines={1}>
                  {preview.name}
                </Text>
                <View style={[
                  s.statusBadge,
                  preview.status === 'in_progress' && { borderColor: '#2ECC71' }
                ]}>
                  <Text style={[
                    s.statusText,
                    preview.status === 'in_progress' && { color: '#2ECC71' }
                  ]}>
                    {preview.status === 'waiting'
                      ? t('tournament.join_code.status_waiting')
                      : t('tournament.join_code.status_in_progress')}
                  </Text>
                </View>
              </View>

              <View style={s.previewGrid}>
                <View style={[s.previewItem, isTablet && { paddingVertical: rs(12) }]}>
                  <Text style={s.previewItemLabel}>{t('tournament.join_code.preview_entry')}</Text>
                  <Text style={s.previewItemValue}>
                    {t('tournament.join_code.preview_entry_val', { amount: preview.entryFee })}
                  </Text>
                </View>
                <View style={[s.previewItem, isTablet && { paddingVertical: rs(12) }]}>
                  <Text style={s.previewItemLabel}>{t('tournament.join_code.preview_players')}</Text>
                  <Text style={s.previewItemValue}>
                    {t('tournament.join_code.preview_players_val', {
                      current: preview.inscrits,
                      total: preview.size
                    })}
                  </Text>
                </View>
                <View style={[s.previewItem, isTablet && { paddingVertical: rs(12) }]}>
                  <Text style={s.previewItemLabel}>{t('tournament.join_code.preview_max_gain')}</Text>
                  <Text style={[s.previewItemValue, { color: '#F4B41A' }]}>
                    {t('tournament.join_code.preview_gain_val', { amount: preview.gainVainqueur })}
                  </Text>
                </View>
              </View>

              <View style={s.progressBg}>
                <View style={[s.progressFill, {
                  width: `${Math.min((preview.inscrits / preview.size) * 100, 100)}%`
                }]} />
              </View>

              {preview.isAlreadyJoined ? (
                <TouchableOpacity style={s.btnJoin} onPress={handleJoin}>
                  <Ionicons name="enter-outline" size={rs(16)} color="#060B17" />
                  <Text style={s.btnJoinText}>{t('tournament.join_code.btn_return')}</Text>
                </TouchableOpacity>
              ) : preview.isFull ? (
                <View style={[s.btnJoin, s.btnJoinFull]}>
                  <Text style={[s.btnJoinText, { color: '#ECE6D660' }]}>
                    {t('tournament.join_code.btn_full')}
                  </Text>
                </View>
              ) : (
                <TouchableOpacity style={s.btnJoin} onPress={handleJoin}>
                  <Ionicons name="trophy-outline" size={rs(16)} color="#060B17" />
                  <Text style={s.btnJoinText}>
                    {t('tournament.join_code.btn_join', { amount: preview.entryFee })}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </Animated.View>
      </TouchableOpacity>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(6,11,23,0.90)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: rs(20),
  },
  card: {
    backgroundColor: '#0D1526',
    borderRadius: rs(18),
    borderWidth: 1,
    borderColor: '#F4B41A40',
    padding: rs(20),
    width: '100%',
    maxWidth: 420,
    gap: rs(14),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontFamily: 'BarlowCondensed-Bold',
    fontSize: rs(20),
    color: '#F4B41A',
  },
  closeBtn: {
    width: rs(30), height: rs(30),
    borderRadius: rs(15),
    backgroundColor: '#1E2A45',
    alignItems: 'center', justifyContent: 'center',
  },
  hint: {
    fontFamily: 'Inter',
    fontSize: rs(13),
    color: '#ECE6D670',
    textAlign: 'center',
  },
  codeInputRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: rs(6),
  },
  codeInput: {
    width: rs(42), height: rs(52),
    borderRadius: rs(10),
    borderWidth: 1.5,
    borderColor: '#1E2A45',
    backgroundColor: '#060B17',
    textAlign: 'center',
    fontFamily: 'BarlowCondensed-Bold',
    fontSize: rs(22),
    color: '#ECE6D6',
  },
  codeInputFilled: {
    borderColor: '#F4B41A',
    color: '#F4B41A',
  },
  codeInputError: {
    borderColor: '#E74C3C',
  },
  codeDash: {
    width: rs(10), height: rs(2),
    backgroundColor: '#F4B41A40',
    borderRadius: rs(1),
    marginHorizontal: rs(2),
  },
  btnSearch: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: rs(8),
    backgroundColor: '#F4B41A',
    borderRadius: rs(12),
    paddingVertical: rs(12),
  },
  btnSearchDisabled: {
    backgroundColor: '#3A2A00',
  },
  btnSearchText: {
    fontFamily: 'BarlowCondensed-Bold',
    fontSize: rs(15),
    color: '#060B17',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: rs(10),
  },
  loadingText: {
    fontFamily: 'Inter',
    fontSize: rs(13),
    color: '#ECE6D680',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(8),
    backgroundColor: '#2A0A0A',
    borderRadius: rs(10),
    padding: rs(12),
    borderWidth: 1,
    borderColor: '#E74C3C40',
  },
  errorText: {
    fontFamily: 'Inter',
    fontSize: rs(13),
    color: '#E74C3C',
    flex: 1,
    lineHeight: rs(18),
  },
  previewCard: {
    backgroundColor: '#060B17',
    borderRadius: rs(12),
    padding: rs(14),
    gap: rs(10),
    borderWidth: 1,
    borderColor: '#1E2A45',
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  previewName: {
    fontFamily: 'BarlowCondensed-Bold',
    fontSize: rs(16),
    color: '#ECE6D6',
    flex: 1,
    marginRight: rs(8),
  },
  statusBadge: {
    borderWidth: 1,
    borderColor: '#F4B41A',
    borderRadius: rs(8),
    paddingHorizontal: rs(8),
    paddingVertical: rs(2),
  },
  statusText: {
    fontFamily: 'BarlowCondensed-Bold',
    fontSize: rs(11),
    color: '#F4B41A',
  },
  previewGrid: {
    flexDirection: 'row',
    gap: rs(8),
  },
  previewItem: {
    flex: 1,
    backgroundColor: '#0D1526',
    borderRadius: rs(8),
    padding: rs(8),
    alignItems: 'center',
  },
  previewItemLabel: {
    fontFamily: 'Inter',
    fontSize: rs(10),
    color: '#ECE6D650',
    marginBottom: rs(2),
  },
  previewItemValue: {
    fontFamily: 'BarlowCondensed-Bold',
    fontSize: rs(13),
    color: '#ECE6D6',
  },
  progressBg: {
    height: rs(4),
    backgroundColor: '#1E2A45',
    borderRadius: rs(2),
  },
  progressFill: {
    height: rs(4),
    backgroundColor: '#F4B41A',
    borderRadius: rs(2),
  },
  btnJoin: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: rs(8),
    backgroundColor: '#F4B41A',
    borderRadius: rs(10),
    paddingVertical: rs(12),
  },
  btnJoinFull: {
    backgroundColor: '#1E2A45',
  },
  btnJoinText: {
    fontFamily: 'BarlowCondensed-Bold',
    fontSize: rs(14),
    color: '#060B17',
  },
});
