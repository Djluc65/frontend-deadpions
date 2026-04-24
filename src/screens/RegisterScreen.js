import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ImageBackground, TouchableWithoutFeedback, Keyboard, Platform } from 'react-native';
import { AppTouchableOpacity as TouchableOpacity } from '../components/common/AppTouchable';
import { useDispatch } from 'react-redux';
import { AntDesign } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
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
  if (message.toLowerCase().includes('canceled the authorization attempt')) return true;
  if (message.toLowerCase().includes("canceled")) return true;
  return false;
};

const RegisterScreen = ({ navigation }) => {
  const [pseudo, setPseudo] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const dispatch = useDispatch();

  const cleanEnv = (value) => (typeof value === 'string' ? value.trim() : undefined);
  const googleWebClientId = cleanEnv(process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID);
  const googleIosClientId = cleanEnv(process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID);
  const googleAndroidClientId = cleanEnv(process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID);

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId: googleWebClientId,
    iosClientId: googleIosClientId,
    androidClientId: googleAndroidClientId,
  });

  const showGoogleAuth = Platform.OS === 'android';
  const googleConfigured = Boolean(googleAndroidClientId);

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
        navigation.reset({
          index: 0,
          routes: [{ name: 'Home' }],
        });
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

  const handleRegister = async () => {
    Keyboard.dismiss();
    if (!pseudo || !email || !password || !confirmPassword) {
        appAlert('Erreur', 'Veuillez remplir tous les champs');
        return;
    }
    if (password !== confirmPassword) {
      appAlert('Erreur', 'Les mots de passe ne correspondent pas');
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
        
        appAlert('Succès', 'Compte créé ! Bienvenue ' + data.pseudo);
        navigation.reset({
            index: 0,
            routes: [{ name: 'Home' }],
        });
      } else {
        appAlert('Erreur', data.message || "Erreur lors de l'inscription");
      }
    } catch (error) {
      console.error(error);
      appAlert('Erreur', 'Impossible de se connecter au serveur');
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <ImageBackground 
        source={require('../../assets/images/Background2-4.png')} 
        style={styles.background}
        resizeMode="cover"
      >
        <View style={styles.container}>
          <Text style={styles.title}>Inscription</Text>
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
                    appAlert('Erreur', e?.message || 'La connexion Google a échoué');
                  }
                }}
                style={!googleConfigured ? styles.googleButtonDisabled : undefined}
                textStyle={{ color: '#fff' }}
              />
            </View>
          )}
          <Input 
            placeholder="Pseudo" 
            value={pseudo} 
            onChangeText={setPseudo} 
            maxLength={7}
          />
          <Input 
            placeholder="Email" 
            value={email} 
            onChangeText={setEmail} 
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <Input placeholder="Mot de passe" value={password} onChangeText={setPassword} secureTextEntry />
          <Input placeholder="Confirmer mot de passe" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry />
          
          <Button title="S'inscrire" onPress={handleRegister} />
          <Button 
            title="Retour" 
            onPress={() => navigation.goBack()} 
            style={{ backgroundColor: 'transparent' }}
          />
        </View>
      </ImageBackground>
    </TouchableWithoutFeedback>
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
    padding: getResponsiveSize(20),
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  title: {
    fontSize: getResponsiveSize(32),
    color: '#fff',
    fontWeight: 'bold',
    marginBottom: getResponsiveSize(30),
    textAlign: 'center',
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    padding: getResponsiveSize(15),
    borderRadius: getResponsiveSize(8),
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

export default RegisterScreen;
