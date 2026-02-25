import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity, TouchableWithoutFeedback, Keyboard, Platform } from 'react-native';
import { Image } from 'expo-image';
import { useDispatch, useSelector } from 'react-redux';
import { AntDesign } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { loginStart, loginSuccess, loginFailure } from '../redux/slices/authSlice';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import { API_URL } from '../config';

WebBrowser.maybeCompleteAuthSession();

const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const dispatch = useDispatch();

  // Configuration Google Auth
  // IMPORTANT: Remplacez ces IDs par vos propres Client IDs depuis Google Cloud Console
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
  });

  useEffect(() => {
    if (response?.type === 'success') {
      const { id_token } = response.params;
      handleGoogleLogin(id_token);
    } else if (response?.type === 'error') {
      Alert.alert('Erreur', 'La connexion Google a échoué');
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
        Alert.alert('Erreur', data.message || "Erreur lors de la connexion Google");
      }
    } catch (error) {
      console.error(error);
      dispatch(loginFailure(error.message));
      Alert.alert('Erreur', 'Impossible de se connecter au serveur');
    }
  };

  const handleLogin = async () => {
    Keyboard.dismiss();
    if (!email || !password) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs');
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
        Alert.alert('Erreur', data.message || "Erreur lors de la connexion");
      }
    } catch (error) {
      console.error(error);
      dispatch(loginFailure(error.message));
      Alert.alert('Erreur', 'Impossible de se connecter au serveur');
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
        <View style={styles.container}>
          <Text style={styles.title}>Connexion</Text>
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
          
          <TouchableOpacity 
            style={styles.googleButton} 
            onPress={() => {
              promptAsync();
            }}
            disabled={!request}
          >
            <AntDesign name="google" size={24} color="black" />
            <Text style={styles.googleButtonText}>Se connecter avec Google</Text>
          </TouchableOpacity>

          <Button 
            title="S'inscrire" 
            onPress={() => navigation.navigate('Register')} 
            style={{ backgroundColor: 'transparent', borderWidth: 1, borderColor: '#fff' }}
          />

          {!API_URL.includes('railway') && (
            <Text style={{ color: '#00ff00', textAlign: 'center', marginTop: 20, fontWeight: 'bold' }}>
              🔌 MODE LOCAL ({API_URL})
            </Text>
          )}
        </View>
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
    justifyContent: 'center',
    padding: 20,
    backgroundColor: 'rgba(0,0,0,0.5)', // Overlay for better readability
  },
  title: {
    fontSize: 32,
    color: '#fff',
    fontWeight: 'bold',
    marginBottom: 30,
    textAlign: 'center',
  },
  forgotPasswordContainer: {
    alignSelf: 'flex-end',
    marginBottom: 20,
    marginTop: -10,
  },
  forgotPasswordText: {
    color: '#fff',
    textDecorationLine: 'underline',
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginTop: 15,
    marginBottom: 15,
  },
  googleButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
});

export default LoginScreen;
