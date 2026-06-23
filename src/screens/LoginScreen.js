import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableWithoutFeedback, Keyboard, Platform, KeyboardAvoidingView, ScrollView, useWindowDimensions } from 'react-native';
import { AppTouchableOpacity as TouchableOpacity } from '../components/common/AppTouchable';
import { Image } from 'expo-image';
import { useDispatch, useSelector } from 'react-redux';
import { AntDesign } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import * as AppleAuthentication from 'expo-apple-authentication';
import Constants, { ExecutionEnvironment } from 'expo-constants';
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
  if (code === 'ASAuthorizationErrorCanceled') return true;
  if (code === 1001) return true;
  if (message.toLowerCase().includes('canceled the authorization attempt')) return true;
  if (message.toLowerCase().includes("canceled")) return true;
  return false;
};

const LoginScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const isDesktop = Platform.OS === 'web' && width >= DESKTOP_BREAKPOINT;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const dispatch = useDispatch();

  const cleanEnv = (value) => (typeof value === 'string' ? value.trim() : undefined);
  const googleWebClientId = cleanEnv(process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID);
  const googleIosClientId = cleanEnv(process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID);
  const googleAndroidClientId = cleanEnv(process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID);
  const googleIosGuid = googleIosClientId?.split('.apps.googleusercontent.com')?.[0];
  const googleRedirectNative = Platform.OS === 'ios' && googleIosGuid
    ? `com.googleusercontent.apps.${googleIosGuid}:/oauthredirect`
    : undefined;

  // Configuration Google Auth
  // IMPORTANT: Remplacez ces IDs par vos propres Client IDs depuis Google Cloud Console
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest(
    {
      clientId: googleWebClientId,
      iosClientId: googleIosClientId,
      androidClientId: googleAndroidClientId,
    },
    // Force le bon redirect URI natif iOS (expo-auth-session v6 génère sinon com.deadpions.app:/oauthredirect)
    googleRedirectNative ? { native: googleRedirectNative } : {}
  );

  const showAppleAuth = Platform.OS === 'ios';
  const showGoogleAuth = Platform.OS === 'android' || Platform.OS === 'ios' || Platform.OS === 'web';
  const googleConfigured = Platform.OS === 'android'
    ? Boolean(googleAndroidClientId)
    : Platform.OS === 'ios' 
      ? Boolean(googleIosClientId)
      : Boolean(googleWebClientId);

  useEffect(() => {
    if (response?.type === 'success') {
      const { id_token } = response.params;
      handleGoogleLogin(id_token);
    } else if (response?.type === 'error') {
      appAlert(t('common.error'), t('auth.google_login_failed'));
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
        navigation.replace('Home');
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

  const handleAppleLogin = async () => {
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      dispatch(loginStart());

      // Envoyer le token d'identité au backend
      const res = await fetch(`${API_URL}/auth/apple-login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          identityToken: credential.identityToken,
          user: credential.user, // ID stable de l'utilisateur
          email: credential.email,
          fullName: credential.fullName,
        }),
      });

      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        // Fallback si le backend n'est pas encore prêt : on simule une erreur ou on gère gracieusement
        throw new Error(t('auth.apple_service_unavailable'));
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
        navigation.replace('Home');
      } else {
        dispatch(loginFailure(data.message));
        appAlert(t('common.error'), data.message || t('auth.apple_login_failed'));
      }

    } catch (e) {
      if (isUserCancelledAuth(e)) return;
      console.error(e);
      dispatch(loginFailure(e.message));
      appAlert(t('common.error'), e.message || t('auth.apple_login_failed'));
    }
  };

  const handleLogin = async () => {
    Keyboard.dismiss();
    if (!email || !password) {
      appAlert(t('common.error'), t('auth.fill_all_fields'));
      return;
    }

    dispatch(loginStart());
    
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await response.text();
        console.error("Non-JSON response from login:", text);
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
        navigation.replace('Home');
      } else {
        dispatch(loginFailure(data.message));
        appAlert(t('common.error'), data.message || t('errors.generic'));
      }
    } catch (error) {
      console.error(error);
      dispatch(loginFailure(error.message));
      appAlert(t('common.error'), t('errors.server_unavailable'));
    }
  };

  return (
    <View style={styles.background}>
      <Image
        source={require('../../assets/images/Background2-4.png')}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
      />
      <View style={styles.bgOverlay} pointerEvents="none" />
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <KeyboardAvoidingView
          style={styles.container}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? getResponsiveSize(64) : 0}
        >
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={[styles.formContainer, isTablet && styles.formContainerTablet, isDesktop && styles.formContainerDesktop]}>
              <Text style={[styles.title, isTablet && styles.titleTablet]}>{t('auth.login')}</Text>

              {showGoogleAuth && (
                <View style={{ width: '100%', marginBottom: getResponsiveSize(10), zIndex: 10 }}>
                  <Button
                    title={t('auth.login_with_google')}
                    onPress={async () => {
                      if (!googleConfigured) {
                        appAlert(t('common.configuration'), t('auth.google_not_configured_android'));
                        return;
                      }
                      // Expo Go: redirect URI incompatible avec Google OAuth
                      const isExpoGo = Constants.appOwnership === 'expo' ||
                        Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
                      if (isExpoGo) {
                        appAlert(t('common.info'), t('auth.google_unavailable_dev'));
                        return;
                      }
                      try {
                        await promptAsync({});
                      } catch (e) {
                        if (isUserCancelledAuth(e)) return;
                        console.error(e);
                        const message = typeof e?.message === 'string' ? e.message : '';
                        if (message.toLowerCase().includes('redirect') || message.toLowerCase().includes('mismatch')) {
                          appAlert(t('common.error'), t('auth.google_oauth_misconfigured'));
                          return;
                        }
                        appAlert(t('common.error'), e?.message || t('auth.google_login_failed'));
                      }
                    }}
                    style={!googleConfigured ? styles.googleButtonDisabled : undefined}
                    textStyle={{ color: '#fff' }}
                  />
                </View>
              )}

            <View style={{ width: '100%', zIndex: 20 }}>
              <Input 
                placeholder={t('auth.email')}
                value={email} 
                onChangeText={setEmail} 
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                textContentType="emailAddress"
                innerStyle={{ backgroundColor: '#05060B' }}
              />
              <Input 
                placeholder={t('auth.password')}
                value={password} 
                onChangeText={setPassword} 
                secureTextEntry 
                autoComplete="password"
                textContentType="password"
                innerStyle={{ backgroundColor: '#05060B' }}
              />
            </View>
            
            <TouchableOpacity 
              onPress={() => navigation.navigate('ForgotPassword')}
              style={styles.forgotPasswordContainer}
            >
              <Text style={styles.forgotPasswordText}>{t('auth.forgot_password')}</Text>
            </TouchableOpacity>

            <Button title={t('common.login_action')} onPress={handleLogin} />
            
            {showAppleAuth && (
              <TouchableOpacity
                style={[styles.appleButton, isTablet && styles.appleButtonTablet]}
                onPress={handleAppleLogin}
                activeOpacity={0.85}
              >
                <Text style={styles.appleButtonText}>
                  {' '}  {t('auth.login_with_apple')}
                </Text>
              </TouchableOpacity>
            )}

            <Button 
              title={t('auth.register')}
              onPress={() => navigation.navigate('Register')} 
              tone="ghost"
              style={{ borderWidth: getResponsiveSize(1.5), borderColor: T.gold }}
              textStyle={{ color: T.gold }}
            />
            {!API_URL.includes('railway') && (
              <Text style={{ color: '#00ff00', textAlign: 'center', marginTop: getResponsiveSize(20), fontWeight: 'bold' }}>
                {t('common.local_mode', { url: API_URL })}
              </Text>
            )}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
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
    backgroundColor: T.bg0,
  },
  container: {
    flex: 1,
    padding: getResponsiveSize(20),
    backgroundColor: T.overlayLight,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
    marginBottom: getResponsiveSize(28),
    textAlign: 'center',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  titleTablet: {
    fontSize: getResponsiveSize(30),
  },
  forgotPasswordContainer: {
    alignSelf: 'flex-end',
    marginBottom: getResponsiveSize(14),
    marginTop: getResponsiveSize(-4),
  },
  forgotPasswordText: {
    color: T.gold,
    fontSize: getResponsiveSize(13),
    fontWeight: '600',
  },
  appleButton: {
    width: '100%',
    height: getResponsiveSize(50),
    marginTop: getResponsiveSize(10),
    marginBottom: getResponsiveSize(4),
    backgroundColor: '#fff',
    borderRadius: getResponsiveSize(8),
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  appleButtonTablet: {
    height: getResponsiveSize(52),
  },
  appleButtonText: {
    color: '#000',
    fontSize: getResponsiveSize(16),
    fontWeight: '600',
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: T.bg2,
    padding: getResponsiveSize(14),
    borderRadius: T.radiusMd,
    marginTop: getResponsiveSize(10),
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

export default LoginScreen;
