import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ImageBackground, TouchableWithoutFeedback, Keyboard } from 'react-native';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import { API_URL } from '../config';
import { validatePassword } from '../utils/validation';
import { getResponsiveSize } from '../utils/responsive';
import { appAlert } from '../services/appAlert';
import { T } from '../utils/theme';
import { useTranslation } from 'react-i18next';

const ResetPasswordScreen = ({ route, navigation }) => {
  const { t } = useTranslation();
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
      appAlert(t('common.error'), t('auth.fill_all_fields'));
      return;
    }

    if (newPassword !== confirmPassword) {
      appAlert(t('common.error'), t('auth.error_passwords_mismatch'));
      return;
    }

    const validation = validatePassword(newPassword);
    if (!validation.isValid) {
      appAlert(
        t('validation.weak_password_title'),
        t(validation.messageKey, validation.messageParams)
      );
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
        appAlert(
          t('common.success'),
          t('auth.reset_success_desc'),
          [
            { 
              text: t('common.login_action'), 
              onPress: () => navigation.navigate('Login') 
            }
          ]
        );
      } else {
        appAlert(t('common.error'), data.message || t('errors.generic'));
      }
    } catch (error) {
      console.error(error);
      appAlert(t('common.error'), t('errors.server'));
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
          <Text style={styles.title}>{t('auth.reset_screen_title')}</Text>
          <Text style={styles.subtitle}>{t('auth.reset_subtitle', { email })}</Text>
          
          <Input 
            placeholder={t('auth.reset_code_placeholder')}
            value={resetCode} 
            onChangeText={setResetCode} 
            keyboardType="number-pad"
            maxLength={6}
          />
          
          <Input 
            placeholder={t('auth.new_password_placeholder')} 
            value={newPassword} 
            onChangeText={setNewPassword} 
            secureTextEntry 
          />

          <Input 
            placeholder={t('auth.password_confirm')} 
            value={confirmPassword} 
            onChangeText={setConfirmPassword} 
            secureTextEntry 
          />
          
          <Button 
            title={loading ? t('common.loading') : t('common.confirm')} 
            onPress={handleResetPassword} 
            disabled={loading}
          />
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
  subtitle: {
    fontSize: getResponsiveSize(14),
    color: T.textDim,
    marginBottom: getResponsiveSize(28),
    textAlign: 'center',
    lineHeight: getResponsiveSize(20),
  },
});

export default ResetPasswordScreen;
