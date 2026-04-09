import React, { memo, useState, useEffect, useRef, useCallback } from 'react';
import {
  Modal,
  Pressable,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Keyboard,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { playButtonSound } from '../../utils/soundManager';
import { getResponsiveSize } from '../../utils/responsive';
import { modalTheme } from '../../utils/modalTheme';

const CODE_LENGTH = 6;

const JoinByCodeModal = memo(({ visible, onClose, socket, navigation, appAlert, t }) => {
  const user = useSelector(state => state.auth.user);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef(null);
  const cleanupRef = useRef(null);

  useEffect(() => {
    if (visible) {
      setCode('');
      setError('');
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 300);
    } else {
      cleanupRef.current?.();
    }
  }, [visible]);

  const registerListeners = useCallback(() => {
    if (!socket) return () => {};

    const handleSuccess = (data) => {
      cleanupRef.current?.();
      setLoading(false);
      onClose();
      if (data?.type === 'live') {
        navigation.navigate('SalleAttenteLive', {
          configSalle: data.config,
          roomId: data.gameId,
          roomCode: data.roomCode,
          role: data.role,
          players: data.players,
          betAmount: data.betAmount,
          timeControl: data.timeControl,
        });
        return;
      }

      if (data?.type === 'custom') {
        navigation.navigate('Game', {
          mode: 'online_custom',
          gameId: data.gameId,
          players: data.players,
          currentTurn: data.currentTurn ?? 'black',
          betAmount: data.betAmount,
          timeControl: data.timeControl,
          gameType: data.mode,
          tournamentSettings: data.tournamentSettings ?? null,
          inviteCode: data.inviteCode ?? null,
          isWaiting: false,
        });
        return;
      }

      navigation.navigate('Home');
    };

    const handleError = (message) => {
      cleanupRef.current?.();
      setLoading(false);
      setError(typeof message === 'string' ? message : 'Code invalide ou partie introuvable.');
    };

    socket.on('join_code_success', handleSuccess);
    socket.on('join_code_error', handleError);

    const handleGenericError = (msg) => {
      setLoading(false);
      setError(typeof msg === 'string' ? msg : 'Une erreur est survenue.');
    };
    socket.on('error', handleGenericError);

    return () => {
      socket.off('join_code_success', handleSuccess);
      socket.off('join_code_error', handleError);
      socket.off('error', handleGenericError);
    };
  }, [socket, navigation, onClose]);

  const handleChangeText = (text) => {
    const cleaned = text.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, CODE_LENGTH);
    setCode(cleaned);
    if (error) setError('');
  };

  const handleJoin = useCallback(() => {
    Keyboard.dismiss();
    if (code.trim().length !== CODE_LENGTH) {
      setError(`Le code doit contenir exactement ${CODE_LENGTH} caractères.`);
      return;
    }
    if (!socket) {
      setError('Connexion au serveur indisponible. Réessayez.');
      return;
    }
    const userId = user?._id || user?.id;
    if (!userId) {
      setError('Vous devez être connecté.');
      return;
    }
    playButtonSound();
    setLoading(true);
    setError('');
    cleanupRef.current = registerListeners();
    socket.emit('join_by_code', { code: code.trim().toUpperCase(), userId });
    const timeout = setTimeout(() => {
      cleanupRef.current?.();
      setLoading(false);
      setError('Le serveur ne répond pas. Vérifiez votre connexion.');
    }, 15000);
    const originalCleanup = cleanupRef.current;
    cleanupRef.current = () => {
      clearTimeout(timeout);
      originalCleanup?.();
    };
  }, [code, socket, registerListeners, user?._id, user?.id]);

  const handleClose = useCallback(() => {
    if (loading) return;
    cleanupRef.current?.();
    setLoading(false);
    setCode('');
    setError('');
    playButtonSound();
    onClose();
  }, [loading, onClose]);

  const renderCodeBoxes = () => {
    return Array.from({ length: CODE_LENGTH }).map((_, i) => {
      const char = code[i] ?? '';
      const isFocus = !loading && code.length === i;
      return (
        <View
          key={i}
          style={[
            styles.codeBox,
            char && styles.codeBoxFilled,
            isFocus && styles.codeBoxFocused,
          ]}
        >
          <Text style={styles.codeBoxText}>{char}</Text>
        </View>
      );
    });
  };

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={handleClose}
    >
      <Pressable style={styles.overlay} onPress={handleClose}>
        <Pressable style={styles.card} onPress={() => {}}>
          <View style={styles.header}>
            <Ionicons
              name="key-outline"
              size={getResponsiveSize(26)}
              color="#f1c40f"
            />
            <Text style={styles.title}>Rejoindre avec un code</Text>
          </View>
          <Text style={styles.subtitle}>
            Entrez le code à {CODE_LENGTH} caractères reçu de votre ami.
          </Text>
          <View style={styles.codeInputWrapper}>
            <TouchableOpacity
              activeOpacity={1}
              style={styles.codeBoxesRow}
              onPress={() => !loading && inputRef.current?.focus()}
            >
              {renderCodeBoxes()}
            </TouchableOpacity>
            <TextInput
              ref={inputRef}
              value={code}
              onChangeText={handleChangeText}
              maxLength={CODE_LENGTH}
              autoCapitalize="characters"
              autoCorrect={false}
              keyboardType={Platform.OS === 'ios' ? 'default' : 'visible-password'}
              style={styles.hiddenInput}
              editable={!loading}
              onSubmitEditing={handleJoin}
            />
          </View>
          {!!error && (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle-outline" size={getResponsiveSize(16)} color="#e74c3c" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}
          <TouchableOpacity
            style={[
              styles.joinButton,
              (loading || code.length !== CODE_LENGTH) && styles.joinButtonDisabled,
            ]}
            onPress={handleJoin}
            disabled={loading || code.length !== CODE_LENGTH}
          >
            {loading ? (
              <ActivityIndicator color="#041c55" size="small" />
            ) : (
              <>
                <Ionicons
                  name="enter-outline"
                  size={getResponsiveSize(20)}
                  color="#041c55"
                  style={{ marginRight: getResponsiveSize(8) }}
                />
                <Text style={styles.joinButtonText}>Rejoindre la partie</Text>
              </>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.closeButton, loading && styles.closeButtonDisabled]}
            onPress={handleClose}
            disabled={loading}
          >
            <Text style={styles.closeButtonText}>
              {t?.close ?? 'Fermer'}
            </Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
});

const styles = StyleSheet.create({
  overlay: {
    ...modalTheme.overlay,
  },
  card: {
    ...modalTheme.card,
    alignItems: 'center',
    paddingHorizontal: getResponsiveSize(24),
    paddingVertical: getResponsiveSize(28),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: getResponsiveSize(6),
    gap: getResponsiveSize(10),
  },
  title: {
    ...modalTheme.title,
    marginBottom: 0,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: getResponsiveSize(13),
    textAlign: 'center',
    marginBottom: getResponsiveSize(24),
    lineHeight: getResponsiveSize(19),
  },
  codeInputWrapper: {
    width: '100%',
    alignItems: 'center',
    marginBottom: getResponsiveSize(20),
  },
  codeBoxesRow: {
    flexDirection: 'row',
    gap: getResponsiveSize(8),
  },
  codeBox: {
    width: getResponsiveSize(42),
    height: getResponsiveSize(52),
    borderRadius: getResponsiveSize(8),
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  codeBoxFilled: {
    borderColor: '#f1c40f',
    backgroundColor: 'rgba(241,196,15,0.12)',
  },
  codeBoxFocused: {
    borderColor: '#ffffff',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  codeBoxText: {
    color: '#ffffff',
    fontSize: getResponsiveSize(22),
    fontWeight: 'bold',
    letterSpacing: 0,
  },
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    width: 1,
    height: 1,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: getResponsiveSize(6),
    marginBottom: getResponsiveSize(14),
    backgroundColor: 'rgba(231,76,60,0.12)',
    borderRadius: getResponsiveSize(8),
    paddingHorizontal: getResponsiveSize(12),
    paddingVertical: getResponsiveSize(8),
    width: '100%',
  },
  errorText: {
    color: '#e74c3c',
    fontSize: getResponsiveSize(13),
    flexShrink: 1,
  },
  joinButton: {
    ...modalTheme.button,
    backgroundColor: '#f1c40f',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginBottom: getResponsiveSize(12),
  },
  joinButtonDisabled: {
    opacity: 0.45,
  },
  joinButtonText: {
    color: '#041c55',
    fontWeight: 'bold',
    fontSize: getResponsiveSize(15),
  },
  closeButton: {
    ...modalTheme.buttonBase,
    ...modalTheme.buttonDestructive,
    width: '100%',
  },
  closeButtonDisabled: {
    opacity: 0.4,
  },
  closeButtonText: {
    ...modalTheme.buttonTextBase,
    ...modalTheme.buttonTextOnDark,
  },
});

export default JoinByCodeModal;
