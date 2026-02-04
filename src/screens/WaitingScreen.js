import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { useSelector, useDispatch } from 'react-redux';
import { updateAccessToken, logout } from '../redux/slices/authSlice';
import { API_URL } from '../config';
import { Asset } from 'expo-asset';

const { width, height } = Dimensions.get('window');

const WaitingScreen = ({ navigation }) => {
  const { token, refreshToken } = useSelector((state) => state.auth);
  const dispatch = useDispatch();

  useEffect(() => {
    const initializeApp = async () => {
      const startTime = Date.now();

      // 1. Préchargement des assets critiques en parallèle
      const assetPromises = [
        Asset.loadAsync(require('../../assets/images/Background2-4.png')),
        Asset.loadAsync(require('../../assets/images/LogoDeadPions2.png')),
      ];

      // 2. Vérification Auth
      const authPromise = (async () => {
        if (!token || !refreshToken) {
            return { valid: false };
        }
        try {
            const response = await fetch(`${API_URL}/auth/me`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.ok) return { valid: true };

            // Refresh attempt
            const refreshResponse = await fetch(`${API_URL}/auth/refresh-token`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refreshToken })
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
          Promise.all(assetPromises),
          authPromise
      ]);
      
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
  }, [token, refreshToken, dispatch, navigation]);

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
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: width * 0.8,
    height: width * 0.8,
    bottom: height * 0.2,
  },
  loader: {
    marginTop: 50,
  },
});

export default WaitingScreen;
