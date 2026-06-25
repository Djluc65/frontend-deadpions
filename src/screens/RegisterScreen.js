import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ImageBackground, TouchableWithoutFeedback, Keyboard, Platform, useWindowDimensions } from 'react-native';
import { AppTouchableOpacity as TouchableOpacity } from '../components/common/AppTouchable';
import { useDispatch } from 'react-redux';
import { AntDesign } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import Constants from 'expo-constants';
import { useGoogleAuthRequest, isGoogleOAuthConfigError } from '../hooks/useGoogleAuthRequest';
import { loginStart, loginSuccess, loginFailure } from '../redux/slices/authSlice';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import { API_URL } from '../config';
import { getResponsiveSize, DESKTOP_BREAKPOINT } from '../utils/responsive';
import { appAlert } from '../services/appAlert';
import { T } from '../utils/theme';
import { useTranslation } from 'react-i18next';

WebBrowser.maybeCompleteAuthSession();

const isUserCancelledAuth = (error) => {
  const code = error?.code ?? error?.error ?? null;
  const message = typeof error?.message === 'string' ? error.message : '';
  if (code === 'ERR_CANCELED') return true;
  if (code === 'ERR_REQUEST_CANCELED') return true;
  if (message.toLowerCase().includes('canceled the authorization attempt')) return true;
  if (message.toLowerCase().includes("canceled")) return true;
  return false;
};

const RegisterScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const isDesktop = Platform.OS === 'web' && width >= DESKTOP_BREAKPOINT;
  const [pseudo, setPseudo] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const dispatch = useDispatch();

  const { response, promptAsync, googleConfigured } = useGoogleAuthRequest();

  const showGoogleAuth = Platform.OS === 'android';

  useEffect(() => {
    if (response?.type === 'success') {
      const { id_token } = response.params;
      handleGoogleLogin(id_token);
    } else if (response?.type === 'error') {
      if (isGoogleOAuthConfigError(response)) {
        appAlert(t('common.error'), t('auth.google_sha1_mismatch'));
      } else {
        appAlert(t('common.error'), t('auth.google_login_failed'));
      }
    }
  }, [response]);

  const handleGoogleLogin = async (idToken) => {
    dispatch(loginStart());
    try {
      const res = await fetch(`${API_URL}/auth/google-login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ idToken }),
      });

      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await res.text();
        console.error("Non-JSON response from google login:", text);
        throw new Error(t('errors.invalid_server_response_html'));
      }

      const data = await res.json();

      if (res.ok) {
        dispatch(loginSuccess({
          user: { 
            _id: data._id,
            email: data.email, 
            pseudo: data.pseudo,
            coins: data.coins,
            avatar: data.avatar,
            country: data.country,
            stats: data.stats,
            isPremium: data.isPremium,
            isEarlyAccess: data.isEarlyAccess,
            earlyAccessEndDate: data.earlyAccessEndDate,
            subscriptionEndDate: data.subscriptionEndDate,
            dailyCreatedRooms: data.dailyCreatedRooms
          },
          token: data.token,
          refreshToken: data.refreshToken
        }));
        navigation.reset({
          index: 0,
          routes: [{ name: 'Home' }],
        });
      } else {
        dispatch(loginFailure(data.message));
        appAlert(t('common.error'), data.message || t('auth.google_login_failed'));
      }
    } catch (error) {
      console.error(error);
      dispatch(loginFailure(error.message));
      appAlert(t('common.error'), t('errors.server_unavailable'));
    }
  };

  const handleRegister = async () => {
    Keyboard.dismiss();
    if (!pseudo || !email || !password || !confirmPassword) {
        appAlert(t('common.error'), t('auth.fill_all_fields'));
        return;
    }
    if (password !== confirmPassword) {
      appAlert(t('common.error'), t('auth.error_passwords_mismatch'));
      return;
    }
    
    try {
      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ pseudo, email, password }),
      });

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await response.text();
        console.error("Non-JSON response from register:", text);
        throw new Error(t('errors.invalid_server_response_html'));
      }

      const data = await response.json();

      if (response.ok) {
        dispatch(loginSuccess({
            user: { 
              _id: data._id,
              email: data.email, 
              pseudo: data.pseudo,
              coins: data.coins,
              avatar: data.avatar,
              country: data.country,
              stats: data.stats,
              isPremium: data.isPremium,
              isEarlyAccess: data.isEarlyAccess,
              earlyAccessEndDate: data.earlyAccessEndDate,
              subscriptionEndDate: data.subscriptionEndDate,
              dailyCreatedRooms: data.dailyCreatedRooms
            },
            token: data.token,
            refreshToken: data.refreshToken
        }));
        
        appAlert(t('common.success'), t('auth.account_created_welcome', { pseudo: data.pseudo }));
        navigation.reset({
            index: 0,
            routes: [{ name: 'Home' }],
        });
      } else {
        appAlert(t('common.error'), data.message || t('errors.generic'));
      }
    } catch (error) {
      console.error(error);
      appAlert(t('common.error'), t('errors.server_unavailable'));
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <ImageBackground
        source={require('../../assets/images/Background2-4.png')}
        style={styles.background}
        resizeMode="cover"
      >
        <View style={styles.bgOverlay} pointerEvents="none" />
        <View style={styles.container}>
          <View style={[styles.formContainer, isTablet && styles.formContainerTablet, isDesktop && styles.formContainerDesktop]}>
          <Text style={[styles.title, isTablet && styles.titleTablet]}>{t('auth.register')}</Text>
          {showGoogleAuth && (
            <View style={{ width: '100%', marginBottom: getResponsiveSize(10) }}>
              <Button
                title={t('auth.login_with_google')}
                onPress={async () => {
                  if (!googleConfigured) {
                    appAlert(t('common.configuration'), t('auth.google_not_configured_android'));
                    return;
                  }
                  try {
                    const useProxy = Constants.appOwnership === 'expo';
                    await promptAsync({ useProxy });
                  } catch (e) {
                    if (isUserCancelledAuth(e)) return;
                    console.error(e);
                    appAlert(t('common.error'), e?.message || t('auth.google_login_failed'));
                  }
                }}
                style={!googleConfigured ? styles.googleButtonDisabled : undefined}
                textStyle={{ color: '#fff' }}
              />
            </View>
          )}
          <Input 
            placeholder={t('auth.username')}
            value={pseudo} 
            onChangeText={setPseudo} 
            maxLength={7}
            innerStyle={{ backgroundColor: '#05060B' }}
          />
          <Input 
            placeholder={t('auth.email')}
            value={email} 
            onChangeText={setEmail} 
            keyboardType="email-address"
            autoCapitalize="none"
            innerStyle={{ backgroundColor: '#05060B' }}
          />
          <Input placeholder={t('auth.password')} value={password} onChangeText={setPassword} secureTextEntry innerStyle={{ backgroundColor: '#05060B' }} />
          <Input placeholder={t('auth.password_confirm')} value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry innerStyle={{ backgroundColor: '#05060B' }} />
          
          <Button title={t('auth.register')} onPress={handleRegister} />
          <Button 
            title={t('common.back')} 
            onPress={() => navigation.goBack()} 
            tone="ghost"
            style={{ borderWidth: 0 }}
            textStyle={{ color: T.textMuted }}
          />
          </View>
        </View>
      </ImageBackground>
    </TouchableWithoutFeedback>
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
    backgroundColor: T.bg0,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: getResponsiveSize(20),
    backgroundColor: T.overlayLight,
  },
  formContainer: {
    width: '100%',
  },
  formContainerTablet: {
    maxWidth: 480,
    alignSelf: 'center',
  },
  formContainerDesktop: {
    maxWidth: 440,
    alignSelf: 'center',
    backgroundColor: T.bg2,
    borderRadius: T.radiusLg,
    padding: 32,
    borderWidth: 1,
    borderColor: T.border,
    ...T.shadowCard,
  },
  title: {
    fontSize: getResponsiveSize(34),
    color: T.text,
    fontWeight: '900',
    marginBottom: getResponsiveSize(24),
    textAlign: 'center',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  titleTablet: {
    fontSize: getResponsiveSize(30),
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: T.bg2,
    padding: getResponsiveSize(14),
    borderRadius: T.radiusMd,
    marginBottom: getResponsiveSize(10),
    borderWidth: 1,
    borderColor: T.borderSoft,
  },
  googleButtonDisabled: {
    opacity: 0.5,
  },
  googleButtonText: {
    color: T.text,
    fontSize: getResponsiveSize(15),
    fontWeight: '700',
    marginLeft: getResponsiveSize(10),
  },
});

export default RegisterScreen;
