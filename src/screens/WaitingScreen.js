import React, { useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { Image } from 'expo-image';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSelector, useDispatch } from 'react-redux';
import { updateAccessToken, logout } from '../redux/slices/authSlice';
import { API_URL } from '../config';
import { Asset } from 'expo-asset';
import { getResponsiveSize, isTablet, SCREEN_WIDTH, SCREEN_HEIGHT } from '../utils/responsive';
import * as SplashScreen from 'expo-splash-screen';

const WaitingScreen = ({ navigation }) => {
  const { token, refreshToken } = useSelector((state) => state.auth);
  const dispatch = useDispatch();

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
          const payload = { checked: true, status: 'not_applicable', authorized: false, at: Date.now() };
          globalThis.__ATT_STATUS__ = payload;
          if (globalThis.__ATT_LISTENERS__ instanceof Set) {
            for (const fn of globalThis.__ATT_LISTENERS__) {
              try { fn(payload); } catch (_) {}
            }
          }
          try { await AsyncStorage.setItem('att_status_payload', JSON.stringify(payload)); } catch (_) {}
          return;
        }

        await new Promise((r) => setTimeout(r, 350));
        const mod = await import('expo-tracking-transparency');
        const { getTrackingPermissionsAsync, requestTrackingPermissionsAsync, TrackingStatus } = mod;
        const res = await getTrackingPermissionsAsync();
        let status = res?.status ?? res;
        const isNotDetermined =
          status === 'not-determined' ||
          status === TrackingStatus?.NotDetermined ||
          status === 0;
        if (isNotDetermined) {
          const req = await requestTrackingPermissionsAsync();
          status = req?.status ?? req;
        }

        const authorized =
          status === 'authorized' ||
          status === 'granted' ||
          status === TrackingStatus?.Authorized;

        const payload = { checked: true, status, authorized, at: Date.now() };
        globalThis.__ATT_STATUS__ = payload;
        if (globalThis.__ATT_LISTENERS__ instanceof Set) {
          for (const fn of globalThis.__ATT_LISTENERS__) {
            try { fn(payload); } catch (_) {}
          }
        }
        try { await AsyncStorage.setItem('att_status_payload', JSON.stringify(payload)); } catch (_) {}
      } catch (_) {
        const payload = { checked: true, status: 'error', authorized: false, at: Date.now() };
        globalThis.__ATT_STATUS__ = payload;
        if (globalThis.__ATT_LISTENERS__ instanceof Set) {
          for (const fn of globalThis.__ATT_LISTENERS__) {
            try { fn(payload); } catch (_) {}
          }
        }
        try { await AsyncStorage.setItem('att_status_payload', JSON.stringify(payload)); } catch (_) {}
      }
    };
    hideSplash();
  }, []);

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

      // Petit délai minimal si tout est allé trop vite pour éviter le flash
      const elapsed = Date.now() - startTime;
      if (elapsed < 500) await new Promise(r => setTimeout(r, 500 - elapsed));

      if (authResult.valid) {
          navigation.replace('Home');
      } else {
          dispatch(logout());
          navigation.replace('Login');
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
      <View style={styles.container}>
        <Image 
          source={require('../../assets/images/LogoDeadPions2.png')} 
          style={styles.logo}
          contentFit="contain"
          transition={200}
        />
        <ActivityIndicator size="large" color="#ffffff" style={styles.loader} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
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
    width: isTablet ? SCREEN_WIDTH * 0.5 : SCREEN_WIDTH * 0.8,
    height: isTablet ? SCREEN_WIDTH * 0.5 : SCREEN_WIDTH * 0.8,
    bottom: SCREEN_HEIGHT * 0.2,
  },
  loader: {
    marginTop: getResponsiveSize(50),
  },
});

export default WaitingScreen;
