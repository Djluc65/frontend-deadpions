import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Platform, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getResponsiveSize } from '../utils/responsive';
import { useTranslation } from 'react-i18next';

/**
 * Banner to prompt user to install the PWA.
 * Only shown on Web when the 'beforeinstallprompt' event is fired.
 */
const PwaInstallBanner = () => {
  const { t } = useTranslation();
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [visible, setVisible] = useState(false);
  const slideAnim = useRef(new Animated.Value(-100)).current;

  useEffect(() => {
    if (Platform.OS !== 'web') return;

    const handleBeforeInstallPrompt = (e) => {
      // Prevent Chrome 67 and earlier from automatically showing the prompt
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
      // Show the banner
      setVisible(true);
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }).start();
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    
    // Show the install prompt
    deferredPrompt.prompt();
    
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to the install prompt: ${outcome}`);
    
    // We've used the prompt, and can't use it again, throw it away
    setDeferredPrompt(null);
    hideBanner();
  };

  const hideBanner = () => {
    Animated.timing(slideAnim, {
      toValue: -100,
      duration: 300,
      useNativeDriver: true,
    }).start(() => setVisible(false));
  };

  if (!visible || Platform.OS !== 'web') return null;

  return (
    <Animated.View style={[styles.container, { transform: [{ translateY: slideAnim }] }]}>
      <View style={styles.content}>
        <Ionicons name="download-outline" size={24} color="#f1c40f" />
        <View style={styles.textContainer}>
          <Text style={styles.title}>{t('pwa.install_title')}</Text>
          <Text style={styles.subtitle}>{t('pwa.install_subtitle')}</Text>
        </View>
        <TouchableOpacity style={styles.installButton} onPress={handleInstall}>
          <Text style={styles.installButtonText}>{t('pwa.install_button')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.closeButton} onPress={hideBanner}>
          <Ionicons name="close" size={20} color="#ccc" />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '#041c55',
    padding: getResponsiveSize(12),
    zIndex: 9999,
    borderBottomWidth: 2,
    borderBottomColor: '#f1c40f',
    // Shadow for elevation
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 5,
    elevation: 10,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: 800,
    alignSelf: 'center',
    width: '100%',
  },
  textContainer: {
    flex: 1,
    marginLeft: 12,
  },
  title: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: getResponsiveSize(14),
  },
  subtitle: {
    color: '#ccc',
    fontSize: getResponsiveSize(11),
  },
  installButton: {
    backgroundColor: '#f1c40f',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginLeft: 12,
  },
  installButtonText: {
    color: '#041c55',
    fontWeight: 'bold',
    fontSize: getResponsiveSize(13),
  },
  closeButton: {
    marginLeft: 12,
    padding: 4,
  },
});

export default PwaInstallBanner;
