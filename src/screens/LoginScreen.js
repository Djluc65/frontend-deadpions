import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableWithoutFeedback, Keyboard, Platform, KeyboardAvoidingView, ScrollView } from 'react-native';
import { AppTouchableOpacity as TouchableOpacity } from '../components/common/AppTouchable';
import { Image } from 'expo-image';
import { useDispatch, useSelector } from 'react-redux';
import { AntDesign } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import * as AppleAuthentication from 'expo-apple-authentication';
import Constants from 'expo-constants';
import { loginStart, loginSuccess, loginFailure } from '../redux/slices/authSlice';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import { API_URL } from '../config';
import { getResponsiveSize } from '../utils/responsive';
import { appAlert } from '../services/appAlert';

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
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const dispatch = useDispatch();

  const cleanEnv = (value) => (typeof value === 'string' ? value.trim() : undefined);
  const googleWebClientId = cleanEnv(process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID);
  const googleIosClientId = cleanEnv(process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID);
  const googleAndroidClientId = cleanEnv(process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID);

  // Configuration Google Auth
  // IMPORTANT: Remplacez ces IDs par vos propres Client IDs depuis Google Cloud Console
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId: googleWebClientId,
    iosClientId: googleIosClientId,
    androidClientId: googleAndroidClientId,
  });

  const showAppleAuth = Platform.OS === 'ios';
  const showGoogleAuth = Platform.OS === 'android' || Platform.OS === 'ios';
  const googleConfigured = Platform.OS === 'android'
    ? Boolean(googleAndroidClientId)
    : Boolean(googleIosClientId);

  useEffect(() => {
    if (response?.type === 'success') {
      const { id_token } = response.params;
      handleGoogleLogin(id_token);
    } else if (response?.type === 'error') {
      appAlert('Erreur', 'La connexion Google a échoué');
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
        throw new Error("Erreur serveur: Réponse invalide (HTML reçue)");
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
        appAlert('Erreur', data.message || "Erreur lors de la connexion Google");
      }
    } catch (error) {
      console.error(error);
      dispatch(loginFailure(error.message));
      appAlert('Erreur', 'Impossible de se connecter au serveur');
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
        throw new Error("Le service de connexion Apple n'est pas encore disponible sur le serveur.");
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
        appAlert('Erreur', data.message || "Erreur lors de la connexion Apple");
      }

    } catch (e) {
      if (isUserCancelledAuth(e)) return;
      console.error(e);
      dispatch(loginFailure(e.message));
      appAlert('Erreur', e.message || "Impossible de se connecter avec Apple");
    }
  };

  const handleLogin = async () => {
    Keyboard.dismiss();
    if (!email || !password) {
      appAlert('Erreur', 'Veuillez remplir tous les champs');
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
        throw new Error("Erreur serveur: Réponse invalide (HTML reçue)");
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
        appAlert('Erreur', data.message || "Erreur lors de la connexion");
      }
    } catch (error) {
      console.error(error);
      dispatch(loginFailure(error.message));
      appAlert('Erreur', 'Impossible de se connecter au serveur');
    }
  };

  return (
    <View style={styles.background}>
      <Image 
        source={require('../../assets/images/Background2-4.png')} 
        style={StyleSheet.absoluteFill}
        contentFit="cover"
      />
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
            <Text style={styles.title}>Connexion</Text>

            {showGoogleAuth && (
              <View style={{ width: '100%', marginBottom: getResponsiveSize(10) }}>
                <Button
                  title="Continuer avec Google"
                  onPress={async () => {
                    if (!googleConfigured) {
                      appAlert('Configuration', 'Google Sign-In n’est pas configuré pour Android.');
                      return;
                    }
                    try {
                      const useProxy = Constants.appOwnership === 'expo';
                      await promptAsync({ useProxy });
                    } catch (e) {
                      if (isUserCancelledAuth(e)) return;
                      console.error(e);
                      const message = typeof e?.message === 'string' ? e.message : '';
                      if (message.toLowerCase().includes('redirect') || message.toLowerCase().includes('mismatch')) {
                        appAlert('Erreur', 'Google OAuth est mal configuré (package/SHA-1/redirect).');
                        return;
                      }
                      appAlert('Erreur', e?.message || 'La connexion Google a échoué');
                    }
                  }}
                  style={!googleConfigured ? styles.googleButtonDisabled : undefined}
                  textStyle={{ color: '#fff' }}
                />
              </View>
            )}

            <Input 
              placeholder="Email"
              value={email} 
              onChangeText={setEmail} 
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              textContentType="emailAddress"
            />
            <Input 
              placeholder="Mot de passe" 
              value={password} 
              onChangeText={setPassword} 
              secureTextEntry 
              autoComplete="password"
              textContentType="password"
            />
            
            <TouchableOpacity 
              onPress={() => navigation.navigate('ForgotPassword')}
              style={styles.forgotPasswordContainer}
            >
              <Text style={styles.forgotPasswordText}>Mot de passe oublié ?</Text>
            </TouchableOpacity>

            <Button title="Se connecter" onPress={handleLogin} />
            
            {showAppleAuth && (
              <AppleAuthentication.AppleAuthenticationButton
                buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
                buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
                cornerRadius={getResponsiveSize(8)}
                style={styles.appleButton}
                onPress={handleAppleLogin}
              />
            )}

            <Button 
              title="S'inscrire" 
              onPress={() => navigation.navigate('Register')} 
              style={{ backgroundColor: 'transparent', borderWidth: getResponsiveSize(1), borderColor: '#fff' }}
            />
            {!API_URL.includes('railway') && (
              <Text style={{ color: '#00ff00', textAlign: 'center', marginTop: getResponsiveSize(20), fontWeight: 'bold' }}>
                🔌 MODE LOCAL ({API_URL})
              </Text>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
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
    padding: getResponsiveSize(20),
    backgroundColor: 'rgba(0,0,0,0.5)', // Overlay for better readability
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: getResponsiveSize(32),
    color: '#fff',
    fontWeight: 'bold',
    marginBottom: getResponsiveSize(30),
    textAlign: 'center',
  },
  forgotPasswordContainer: {
    alignSelf: 'flex-end',
    marginBottom: getResponsiveSize(15),
    marginTop: getResponsiveSize(-10),
  },
  forgotPasswordText: {
    color: '#fff',
    textDecorationLine: 'underline',
    fontSize: getResponsiveSize(14),
  },
  appleButton: {
    width: '100%',
    height: getResponsiveSize(50), // Matches typical button height
    marginTop: getResponsiveSize(15),
    marginBottom: getResponsiveSize(5), // Slight spacing before Google button
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    padding: getResponsiveSize(15),
    borderRadius: getResponsiveSize(8),
    marginTop: getResponsiveSize(15),
    marginBottom: getResponsiveSize(15),
  },
  googleButtonDisabled: {
    opacity: 0.6,
  },
  googleButtonText: {
    color: '#000',
    fontSize: getResponsiveSize(16),
    fontWeight: 'bold',
    marginLeft: getResponsiveSize(10),
  },
});

export default LoginScreen;
