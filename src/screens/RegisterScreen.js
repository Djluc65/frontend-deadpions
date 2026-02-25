import React, { useState } from 'react';
import { View, Text, StyleSheet, ImageBackground, Alert, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { useDispatch } from 'react-redux';
import { loginSuccess } from '../redux/slices/authSlice';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import { API_URL } from '../config';

const RegisterScreen = ({ navigation }) => {
  const [pseudo, setPseudo] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const dispatch = useDispatch();

  const handleRegister = async () => {
    Keyboard.dismiss();
    if (!pseudo || !email || !password || !confirmPassword) {
        Alert.alert('Erreur', 'Veuillez remplir tous les champs');
        return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Erreur', 'Les mots de passe ne correspondent pas');
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
        
        Alert.alert('Succès', 'Compte créé ! Bienvenue ' + data.pseudo);
        navigation.reset({
            index: 0,
            routes: [{ name: 'Home' }],
        });
      } else {
        Alert.alert('Erreur', data.message || "Erreur lors de l'inscription");
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Erreur', 'Impossible de se connecter au serveur');
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
          <Input placeholder="Pseudo" value={pseudo} onChangeText={setPseudo} />
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
    padding: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  title: {
    fontSize: 32,
    color: '#fff',
    fontWeight: 'bold',
    marginBottom: 30,
    textAlign: 'center',
  },
});

export default RegisterScreen;
