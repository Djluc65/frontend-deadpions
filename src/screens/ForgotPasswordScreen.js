import React, { useState } from 'react';
import { View, Text, StyleSheet, ImageBackground, TouchableWithoutFeedback, Keyboard, useWindowDimensions } from 'react-native';
import { AppTouchableOpacity as TouchableOpacity } from '../components/common/AppTouchable';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import { API_URL } from '../config';
import { getResponsiveSize } from '../utils/responsive';
import { appAlert } from '../services/appAlert';
import { T } from '../utils/theme';

const ForgotPasswordScreen = ({ navigation }) => {
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendResetLink = async () => {
    if (!email) {
      appAlert('Erreur', 'Veuillez entrer votre email');
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
        appAlert(
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
        appAlert('Erreur', data.message || "Impossible d'envoyer l'email");
      }
    } catch (error) {
      console.error(error);
      appAlert('Erreur', 'Erreur serveur');
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
      <View style={styles.bgOverlay} pointerEvents="none" />
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.container}>
          <View style={[styles.formContainer, isTablet && styles.formContainerTablet]}>
            <Text style={[styles.title, isTablet && styles.titleTablet]}>Mot de passe oublié</Text>
            <Text style={[styles.subtitle, isTablet && styles.subtitleTablet]}>
              Entrez votre email pour recevoir un lien de réinitialisation.
            </Text>
          
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
        </View>
      </TouchableWithoutFeedback>
    </ImageBackground>
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
    alignItems: 'center',
  },
  formContainer: {
    width: '100%',
  },
  formContainerTablet: {
    maxWidth: 480,
    alignSelf: 'center',
  },
  title: {
    fontSize: getResponsiveSize(30),
    color: T.text,
    fontWeight: '900',
    marginBottom: getResponsiveSize(10),
    textAlign: 'center',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  titleTablet: {
    fontSize: getResponsiveSize(28),
  },
  subtitle: {
    fontSize: getResponsiveSize(14),
    color: T.textDim,
    marginBottom: getResponsiveSize(28),
    textAlign: 'center',
    lineHeight: getResponsiveSize(20),
  },
  subtitleTablet: {
    fontSize: getResponsiveSize(15),
  },
  backButton: {
    marginTop: getResponsiveSize(20),
    alignItems: 'center',
  },
  backButtonText: {
    color: T.gold,
    fontSize: getResponsiveSize(14),
    fontWeight: '600',
  },
});

export default ForgotPasswordScreen;
