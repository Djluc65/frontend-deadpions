import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ImageBackground, Alert, TouchableWithoutFeedback, Keyboard } from 'react-native';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import { API_URL } from '../config';
import { validatePassword } from '../utils/validation';
import { getResponsiveSize } from '../utils/responsive';

const ResetPasswordScreen = ({ route, navigation }) => {
  const { email, devToken } = route.params || {};
  const [resetCode, setResetCode] = useState(devToken || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (devToken) {
      setResetCode(devToken);
    }
  }, [devToken]);

  const handleResetPassword = async () => {
    if (!resetCode || !newPassword || !confirmPassword) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Erreur', 'Les mots de passe ne correspondent pas');
      return;
    }

    const validation = validatePassword(newPassword);
    if (!validation.isValid) {
      Alert.alert('Mot de passe trop faible', validation.message);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/auth/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, token: resetCode, newPassword }),
      });

      const data = await response.json();

      if (response.ok) {
        Alert.alert(
          'Succès',
          'Votre mot de passe a été réinitialisé avec succès.',
          [
            { 
              text: 'Se connecter', 
              onPress: () => navigation.navigate('Login') 
            }
          ]
        );
      } else {
        Alert.alert('Erreur', data.message || "Erreur lors de la réinitialisation");
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
          <Text style={styles.title}>Réinitialisation</Text>
          <Text style={styles.subtitle}>Entrez le code reçu par email ({email}) et votre nouveau mot de passe.</Text>
          
          <Input 
            placeholder="Code à 6 chiffres"
            value={resetCode} 
            onChangeText={setResetCode} 
            keyboardType="number-pad"
            maxLength={6}
          />
          
          <Input 
            placeholder="Nouveau mot de passe" 
            value={newPassword} 
            onChangeText={setNewPassword} 
            secureTextEntry 
          />

          <Input 
            placeholder="Confirmer mot de passe" 
            value={confirmPassword} 
            onChangeText={setConfirmPassword} 
            secureTextEntry 
          />
          
          <Button 
            title={loading ? "Chargement..." : "Valider"} 
            onPress={handleResetPassword} 
            disabled={loading}
          />
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
});

export default ResetPasswordScreen;
