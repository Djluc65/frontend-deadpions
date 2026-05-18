import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, StyleSheet, ActivityIndicator, Platform, Text, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSelector, useDispatch } from 'react-redux';
import { updateAccessToken, logout } from '../redux/slices/authSlice';
import { API_URL } from '../config';
import { Asset } from 'expo-asset';
import { getResponsiveSize, isTablet, SCREEN_WIDTH, SCREEN_HEIGHT } from '../utils/responsive';
import * as SplashScreen from 'expo-splash-screen';
import { useTranslation } from 'react-i18next';

const WaitingScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const { token, refreshToken } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const [attGateVisible, setAttGateVisible] = useState(false);
  const attResolveRef = useRef(null);
  const attGatePromiseRef = useRef(null);
  const attApiRef = useRef(null);
  const attInitResolveRef = useRef(null);
  const attInitPromiseRef = useRef(null);

  if (!attInitPromiseRef.current) {
    attInitPromiseRef.current = new Promise((resolve) => { attInitResolveRef.current = resolve; });
  }

  const normalizeAttStatus = useCallback((rawStatus) => {
    const status = typeof rawStatus === 'string' ? rawStatus : (rawStatus?.status ?? rawStatus);
    const s = (typeof status === 'string' ? status : '')
      .toLowerCase()
      .trim()
      .replace(/[\s_]+/g, '-');

    if (s === 'undetermined' || s === 'not-determined' || s === 'notdetermined') return 'undetermined';
    if (s === 'authorized' || s === 'granted' || s === 'allowed') return 'authorized';
    if (s === 'denied' || s === 'restricted') return 'denied';
    return s || 'unknown';
  }, []);

  const pushAttPayload = useCallback(async (payload) => {
    globalThis.__ATT_STATUS__ = payload;
    if (globalThis.__ATT_LISTENERS__ instanceof Set) {
      for (const fn of globalThis.__ATT_LISTENERS__) {
        try { fn(payload); } catch (_) {}
      }
    }
    try { await AsyncStorage.setItem('att_status_payload', JSON.stringify(payload)); } catch (_) {}
  }, []);

  const resolveAttGate = useCallback(() => {
    if (typeof attResolveRef.current === 'function') {
      try { attResolveRef.current(true); } catch (_) {}
    }
    attResolveRef.current = null;
    attGatePromiseRef.current = null;
  }, []);

  useEffect(() => {
    // Hide splash screen once WaitingScreen is mounted
    const hideSplash = async () => {
      try {
        await SplashScreen.hideAsync();
      } catch (e) {
        // ignore error
      }

      try {
        if (Platform.OS !== 'ios') {
          await pushAttPayload({ checked: true, status: 'not_applicable', authorized: false, at: Date.now() });
          return;
        }

        const mod = await import('expo-tracking-transparency');
        const { getTrackingPermissionsAsync, requestTrackingPermissionsAsync, TrackingStatus } = mod;
        attApiRef.current = { getTrackingPermissionsAsync, requestTrackingPermissionsAsync, TrackingStatus };

        const res = await getTrackingPermissionsAsync();
        const status = res?.status ?? res;
        const normalized = normalizeAttStatus(status);
        console.log('[ATT] initial status =', status);

        if (normalized === 'undetermined') {
          if (!attGatePromiseRef.current) {
            attGatePromiseRef.current = new Promise((resolve) => { attResolveRef.current = resolve; });
          }
          setAttGateVisible(true);
          return;
        }

        const authorized = normalized === 'authorized';

        await pushAttPayload({ checked: true, status, authorized, at: Date.now() });
      } catch (_) {
        await pushAttPayload({ checked: true, status: 'error', authorized: false, at: Date.now() });
      } finally {
        if (typeof attInitResolveRef.current === 'function') {
          try { attInitResolveRef.current(true); } catch (_) {}
        }
        attInitResolveRef.current = null;
      }
    };
    hideSplash();
  }, [pushAttPayload, normalizeAttStatus]);

  const acceptAtt = useCallback(async () => {
    try {
      const api = attApiRef.current;
      if (!api?.requestTrackingPermissionsAsync) {
        await pushAttPayload({ checked: true, status: 'error', authorized: false, at: Date.now() });
        setAttGateVisible(false);
        resolveAttGate();
        return;
      }

      const req = await api.requestTrackingPermissionsAsync();
      const status = req?.status ?? req;
      console.log('[ATT] request result =', status);
      const authorized = normalizeAttStatus(status) === 'authorized';

      await pushAttPayload({ checked: true, status, authorized, at: Date.now() });
    } catch (_) {
      await pushAttPayload({ checked: true, status: 'error', authorized: false, at: Date.now() });
    } finally {
      setAttGateVisible(false);
      resolveAttGate();
    }
  }, [pushAttPayload, resolveAttGate, normalizeAttStatus]);

  const skipAtt = useCallback(async () => {
    await pushAttPayload({ checked: true, status: 'skipped', authorized: false, at: Date.now() });
    setAttGateVisible(false);
    resolveAttGate();
  }, [pushAttPayload, resolveAttGate]);

  useEffect(() => {
    let isMounted = true;
    const initializeApp = async () => {
      const startTime = Date.now();

      // 1. Préchargement des assets critiques en parallèle
      const loadAssets = async () => {
          try {
            await Promise.all([
                Asset.loadAsync(require('../../assets/images/Background2-4.png')),
                Asset.loadAsync(require('../../assets/images/LogoDeadPions2.png')),
            ]);
          } catch (e) {
              console.warn("Erreur chargement assets:", e);
          }
      };

      // 2. Vérification Auth
      const authPromise = (async () => {
        // Capture token and refreshToken values at start
        const currentToken = token;
        const currentRefreshToken = refreshToken;

        if (!currentToken || !currentRefreshToken) {
            return { valid: false };
        }
        try {
            const response = await fetch(`${API_URL}/auth/me`, {
                headers: { Authorization: `Bearer ${currentToken}` }
            });
            if (response.ok) return { valid: true };

            // Refresh attempt
            const refreshResponse = await fetch(`${API_URL}/auth/refresh-token`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refreshToken: currentRefreshToken })
            });

            if (refreshResponse.ok) {
                const data = await refreshResponse.json();
                dispatch(updateAccessToken(data.token));
                return { valid: true };
            }
        } catch (e) {
            console.log('Auth check error', e);
        }
        return { valid: false };
      })();

      // Attendre la fin des deux (Assets + Auth)
      const [_, authResult] = await Promise.all([
          loadAssets(),
          authPromise
      ]);
      
      if (!isMounted) return;

      if (attInitPromiseRef.current) {
        try { await attInitPromiseRef.current; } catch (_) {}
      }

      if (attGatePromiseRef.current) {
        try { await attGatePromiseRef.current; } catch (_) {}
      }

      // Petit délai minimal si tout est allé trop vite pour éviter le flash
      const elapsed = Date.now() - startTime;
      if (elapsed < 500) await new Promise(r => setTimeout(r, 500 - elapsed));

      if (authResult.valid) {
          navigation.replace('Home');
      } else {
          dispatch(logout());
          navigation.replace('Home');
      }
    };

    initializeApp();
    return () => { isMounted = false; };
  }, [dispatch, navigation]); // Removed token and refreshToken from dependencies to prevent double run on token refresh

  return (
    <View style={styles.background}>
      <Image
        source={require('../../assets/images/Background2-4.png')}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
      />
      <View style={styles.bgOverlay} pointerEvents="none" />
      <View style={styles.container}>
        <Image 
          source={require('../../assets/images/LogoDeadPions2.png')} 
          style={styles.logo}
          contentFit="contain"
          transition={200}
        />
        <ActivityIndicator size="large" color="#ffffff" style={styles.loader} />
      </View>
      {attGateVisible && (
        <View style={styles.attOverlay}>
          <View style={styles.attCard}>
            <Text style={styles.attTitle}>{t('att.title')}</Text>
            <Text style={styles.attText}>
              {t('att.desc')}
            </Text>
            <Text style={styles.attHint}>
              {t('att.hint')}
            </Text>
            <View style={styles.attButtons}>
              <TouchableOpacity style={styles.attBtnSecondary} onPress={skipAtt} activeOpacity={0.9}>
                <Text style={styles.attBtnSecondaryText}>{t('common.later')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.attBtnPrimary} onPress={acceptAtt} activeOpacity={0.9}>
                <Text style={styles.attBtnPrimaryText}>{t('common.continue')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  bgOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(5,9,15,0.55)',
  },
  background: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: '#000000', // Fallback color to ensure white spinner is visible if image loads slowly
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: SCREEN_WIDTH * (isTablet ? 0.5 : 0.8),
    height: SCREEN_WIDTH * (isTablet ? 0.5 : 0.8),
    bottom: SCREEN_HEIGHT * 0.2,
  },
  loader: {
    marginTop: getResponsiveSize(50),
  },
  attOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  attCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: 'rgba(20, 20, 20, 0.95)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  attTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 8,
  },
  attText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 10,
  },
  attHint: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 14,
  },
  attButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  attBtnPrimary: {
    flex: 1,
    backgroundColor: '#0A84FF',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  attBtnPrimaryText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 14,
  },
  attBtnSecondary: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  attBtnSecondaryText: {
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '700',
    fontSize: 14,
  },
});

export default WaitingScreen;
