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
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { playButtonSound } from '../../utils/soundManager';
import { getResponsiveSize } from '../../utils/responsive';
import { modalTheme } from '../../utils/modalTheme';
import { T } from '../../utils/theme';

// Safe import for expo-camera to prevent crash if native module is missing
let CameraView, useCameraPermissions;
try {
  const CameraModule = require('expo-camera');
  CameraView = CameraModule.CameraView;
  useCameraPermissions = CameraModule.useCameraPermissions;
} catch (e) {
  // Silent catch
}

const CODE_LENGTH = 6;

const JoinByCodeModal = memo(({ visible, onClose, socket, appAlert }) => {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const navigation = useNavigation();
  const user = useSelector(state => state.auth.user);
  
  // Safe hook call
  const [permission, requestPermission] = useCameraPermissions ? useCameraPermissions() : [null, null];
  
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  
  const inputRef = useRef(null);
  const cleanupRef = useRef(null);

  useEffect(() => {
    if (visible) {
      setCode('');
      setError('');
      setLoading(false);
      setShowScanner(false);
      setTimeout(() => inputRef.current?.focus(), 300);
    } else {
      cleanupRef.current?.();
    }
  }, [visible]);

  const handleBarCodeScanned = ({ data }) => {
    if (!showScanner) return;
    
    // Extract code from deadpions://invite/XXXXXX or just XXXXXX
    let scannedCode = data;
    if (data.includes('invite/')) {
        scannedCode = data.split('invite/')[1]?.split('?')[0];
    }
    
    if (scannedCode && scannedCode.length === CODE_LENGTH) {
        setShowScanner(false);
        setCode(scannedCode.toUpperCase());
        playButtonSound();
        handleJoin(scannedCode.toUpperCase());
    }
  };

  const startScan = async () => {
    if (!CameraView || !requestPermission) {
        appAlert(t('join_code.unavailable_title'), t('join_code.unavailable_desc'));
        return;
    }
    if (!permission?.granted) {
        const res = await requestPermission();
        if (!res.granted) {
            appAlert(t('join_code.permission_title'), t('join_code.permission_desc'));
            return;
        }
    }
    setShowScanner(true);
    playButtonSound();
  };

  const canScan = Platform.OS !== 'web' && !!CameraView;

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
      setError(typeof message === 'string' ? message : t('join_code.invalid_code'));
    };

    socket.on('join_code_success', handleSuccess);
    socket.on('join_code_error', handleError);

    const handleGenericError = (msg) => {
      setLoading(false);
      setError(typeof msg === 'string' ? msg : t('errors.generic'));
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

  const handleJoin = useCallback((overrideCode) => {
    Keyboard.dismiss();
    const finalCode = String(overrideCode ?? code).trim().toUpperCase();
    if (finalCode.length !== CODE_LENGTH) {
      setError(t('join_code.error_length', { length: CODE_LENGTH }));
      return;
    }
    if (!socket) {
      setError(t('errors.server_unavailable'));
      return;
    }
    const userId = user?._id || user?.id;
    if (!userId) {
      setError(t('auth.login_required'));
      return;
    }
    playButtonSound();
    setLoading(true);
    setError('');
    cleanupRef.current = registerListeners();
    socket.emit('join_by_code', { code: finalCode, userId });
    const timeout = setTimeout(() => {
      cleanupRef.current?.();
      setLoading(false);
      setError(t('errors.timeout'));
    }, 15000);
    const originalCleanup = cleanupRef.current;
    cleanupRef.current = () => {
      clearTimeout(timeout);
      originalCleanup?.();
    };
  }, [code, socket, registerListeners, user?._id, user?.id, t]);

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
            <Text style={styles.title}>{t('live_room.join_with_code')}</Text>
          </View>
          <Text style={styles.subtitle}>
            {t('join_code.subtitle', { length: CODE_LENGTH })}
          </Text>

          {canScan && (
            <TouchableOpacity 
              style={styles.scanButton} 
              onPress={startScan}
            >
              <Ionicons name="qr-code-outline" size={20} color="#041c55" />
              <Text style={styles.scanButtonText}>{t('join_code.scan_qr')}</Text>
            </TouchableOpacity>
          )}

          {showScanner && CameraView && (
            <View style={styles.scannerOverlay}>
              <CameraView
                style={styles.scanner}
                onBarcodeScanned={handleBarCodeScanned}
                barcodeScannerSettings={{
                  barcodeTypes: ['qr'],
                }}
              >
                <View style={styles.scannerHeader}>
                    <TouchableOpacity onPress={() => setShowScanner(false)} style={styles.closeScanner}>
                        <Ionicons name="close" size={24} color="#fff" />
                    </TouchableOpacity>
                    <Text style={styles.scannerTitle}>{t('join_code.scan_title')}</Text>
                </View>
                <View style={styles.scanFrame} />
                <Text style={styles.scannerHint}>{t('join_code.scan_hint')}</Text>
              </CameraView>
            </View>
          )}

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
                <Text style={styles.joinButtonText}>{t('join_code.join_button')}</Text>
              </>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.closeButton, loading && styles.closeButtonDisabled]}
            onPress={handleClose}
            disabled={loading}
          >
            <Text style={styles.closeButtonText}>{t('common.close')}</Text>
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
    paddingHorizontal: getResponsiveSize(18),
    paddingVertical: getResponsiveSize(20),
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
    ...modalTheme.subtitle,
    textAlign: 'center',
    marginBottom: getResponsiveSize(20),
  },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1c40f',
    paddingHorizontal: getResponsiveSize(16),
    paddingVertical: getResponsiveSize(10),
    borderRadius: getResponsiveSize(T.radiusMd),
    marginBottom: getResponsiveSize(20),
    gap: getResponsiveSize(8),
    ...T.shadowBtn,
  },
  scanButtonText: {
    color: '#1B1305',
    fontWeight: '800',
    fontSize: getResponsiveSize(13),
  },
  scannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
    zIndex: 100,
    borderRadius: getResponsiveSize(T.radiusMd),
    overflow: 'hidden',
  },
  scanner: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scannerHeader: {
    position: 'absolute',
    top: 20,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  closeScanner: {
    padding: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
  },
  scannerTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 15,
  },
  scanFrame: {
    width: 200,
    height: 200,
    borderWidth: 2,
    borderColor: '#f1c40f',
    borderRadius: 20,
    backgroundColor: 'transparent',
  },
  scannerHint: {
    color: '#fff',
    marginTop: 20,
    fontSize: 14,
    fontWeight: '600',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
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
    width: getResponsiveSize(38),
    height: getResponsiveSize(46),
    borderRadius: getResponsiveSize(T.radiusSm),
    borderWidth: 2,
    borderColor: T.borderSoft,
    backgroundColor: T.bg3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  codeBoxFilled: {
    borderColor: T.gold,
    backgroundColor: 'rgba(244,180,26,0.12)',
  },
  codeBoxFocused: {
    borderColor: T.text,
    backgroundColor: T.bg3,
  },
  codeBoxText: {
    color: T.text,
    fontSize: getResponsiveSize(18),
    fontWeight: '900',
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
    backgroundColor: 'rgba(230,57,70,0.1)',
    borderRadius: getResponsiveSize(T.radiusSm),
    borderWidth: 1,
    borderColor: 'rgba(230,57,70,0.3)',
    paddingHorizontal: getResponsiveSize(12),
    paddingVertical: getResponsiveSize(8),
    width: '100%',
  },
  errorText: {
    color: T.red,
    fontSize: getResponsiveSize(13),
    flexShrink: 1,
  },
  joinButton: {
    ...modalTheme.button,
    backgroundColor: T.gold,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginBottom: getResponsiveSize(12),
    ...T.shadowBtn,
  },
  joinButtonDisabled: {
    opacity: 0.45,
  },
  joinButtonText: {
    color: '#1B1305',
    fontWeight: '800',
    fontSize: getResponsiveSize(14),
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
