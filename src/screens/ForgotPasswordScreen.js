import React, { useState } from 'react';
import { View, Text, StyleSheet, ImageBackground, Alert, TouchableOpacity, TouchableWithoutFeedback, Keyboard } from 'react-native';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import { API_URL } from '../config';
import { getResponsiveSize } from '../utils/responsive';

const ForgotPasswordScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendResetLink = async () => {
    if (!email) {
      Alert.alert('Erreur', 'Veuillez entrer votre email');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        Alert.alert(
          'Succès',
          'Un code de réinitialisation a été envoyé à votre adresse email.',
          [
            { 
              text: 'Saisir le code', 
              onPress: () => navigation.navigate('ResetPassword', { 
                email, 
                // En dev, on peut passer le code si le backend le renvoie pour faciliter le test
                devToken: data.resetToken 
              }) 
            }
          ]
        );
      } else {
        Alert.alert('Erreur', data.message || "Impossible d'envoyer l'email");
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Erreur', 'Erreur serveur');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ImageBackground 
      source={require('../../assets/images/Background2-4.png')} 
      style={styles.background}
      resizeMode="cover"
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.container}>
          <Text style={styles.title}>Mot de passe oublié</Text>
          <Text style={styles.subtitle}>Entrez votre email pour recevoir un lien de réinitialisation.</Text>
          
          <Input 
            placeholder="Email"
            value={email} 
            onChangeText={setEmail} 
            keyboardType="email-address"
            autoCapitalize="none"
          />
          
          <Button 
            title={loading ? "Envoi..." : "Envoyer"} 
            onPress={handleSendResetLink} 
            disabled={loading}
          />
          
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backButtonText}>Retour à la connexion</Text>
          </TouchableOpacity>
        </View>
      </TouchableWithoutFeedback>
    </ImageBackground>
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
    fontSize: getResponsiveSize(28),
    color: '#fff',
    fontWeight: 'bold',
    marginBottom: getResponsiveSize(10),
    textAlign: 'center',
  },
  subtitle: {
    fontSize: getResponsiveSize(16),
    color: '#ccc',
    marginBottom: getResponsiveSize(30),
    textAlign: 'center',
  },
  backButton: {
    marginTop: getResponsiveSize(20),
    alignItems: 'center',
  },
  backButtonText: {
    color: '#fff',
    textDecorationLine: 'underline',
  }
});

export default ForgotPasswordScreen;
