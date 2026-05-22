import React from 'react';
import { View, Text, StyleSheet, ScrollView, ImageBackground, TouchableOpacity, Image, Linking, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { getResponsiveSize } from '../utils/responsive';
import { T } from '../utils/theme';
import { appAlert } from '../services/appAlert';

const InfoScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const version = "1.0.2 (Early Access)";

  const openLink = async (url) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (!supported) {
        if (url.startsWith('mailto:')) {
          appAlert(t('info.cannot_open'), t('info.no_email_app'));
          return;
        }
        appAlert(t('info.cannot_open'), t('info.unsupported_link', { url }));
        return;
      }
      await Linking.openURL(url);
    } catch (e) {
      if (url.startsWith('mailto:')) {
        appAlert(t('info.cannot_open'), t('info.cannot_open_email_app'));
        return;
      }
      appAlert(t('common.error'), t('info.cannot_open_link'));
    }
  };

  const sections = [
    {
      title: t('info.rules_title'),
      icon: "game-controller-outline",
      content: t('info.rules_content')
    },
    {
      title: t('info.help_title'),
      icon: "chatbubbles-outline",
      content: t('info.help_content'),
      action: () => navigation.navigate('Assistant'),
      actionLabel: t('info.help_action')
    },
    {
      title: t('info.about_title'),
      icon: "information-circle-outline",
      content: t('info.about_content')
    },
    {
      title: t('info.contact_title'),
      icon: "headset-outline",
      content: t('info.contact_content'),
      subActions: [
        {
          label: "deadpions@gmail.com",
          link: "mailto:deadpions@gmail.com",
          icon: "mail"
        },
        {
          label: "WhatsApp: +33 7 58 57 11 87",
          link: "https://wa.me/33758571187",
          icon: "logo-whatsapp"
        }
      ]
    },
    {
      title: t('info.legal_title'),
      icon: "document-text-outline",
      action: () => openLink('https://deadpions.eu'),
      actionLabel: t('info.legal_action')
    }
  ];

  return (
    <ImageBackground
      source={require('../../assets/images/Background2-4.png')}
      style={styles.background}
      resizeMode="cover"
    >
      <View style={styles.bgOverlay} pointerEvents="none" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={getResponsiveSize(28)} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('info.screen_title')}</Text>
        <View style={{ width: getResponsiveSize(28) }} /> 
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.logoContainer}>
          <Image 
            source={require('../../assets/images/LogoDeadPions2.png')} 
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.appName}>DeadPions</Text>
          <Text style={styles.version}>v{version}</Text>
        </View>

        {sections.map((section, index) => (
          <View key={index} style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name={section.icon} size={getResponsiveSize(24)} color="#f1c40f" style={styles.icon} />
              <Text style={styles.cardTitle}>{section.title}</Text>
            </View>
            {section.content && (
              <Text style={styles.cardContent}>{section.content}</Text>
            )}
            {section.action && (
              <TouchableOpacity style={styles.actionButton} onPress={section.action}>
                <Text style={styles.actionButtonText}>{section.actionLabel}</Text>
                <Ionicons name="chevron-forward" size={getResponsiveSize(16)} color="#041c55" />
              </TouchableOpacity>
            )}
            {section.subActions && section.subActions.map((sub, idx) => (
              <TouchableOpacity key={idx} style={[styles.actionButton, { marginTop: getResponsiveSize(10) }]} onPress={() => openLink(sub.link)}>
                <Ionicons name={sub.icon} size={getResponsiveSize(20)} color="#041c55" style={{marginRight: getResponsiveSize(10)}} />
                <Text style={styles.actionButtonText}>{sub.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ))}

        <View style={styles.footer}>
          <Text style={styles.copyright}>{t('info.copyright')}</Text>
        </View>
      </ScrollView>
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
    backgroundColor: T.bg0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: getResponsiveSize(Platform.OS === 'ios' ? 60 : 40),
    paddingHorizontal: getResponsiveSize(20),
    paddingBottom: getResponsiveSize(18),
    backgroundColor: T.bg1,
    borderBottomWidth: 1,
    borderBottomColor: T.borderSoft,
  },
  backButton: {
    padding: getResponsiveSize(8),
    borderRadius: T.radiusMd,
    backgroundColor: T.bg2,
    borderWidth: 1,
    borderColor: T.borderSoft,
  },
  headerTitle: {
    color: T.text,
    fontSize: getResponsiveSize(20),
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  container: {
    padding: getResponsiveSize(18),
    paddingBottom: getResponsiveSize(40),
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: getResponsiveSize(28),
  },
  logo: {
    width: getResponsiveSize(100),
    height: getResponsiveSize(100),
    marginBottom: getResponsiveSize(10),
  },
  appName: {
    color: T.gold,
    fontSize: getResponsiveSize(28),
    fontWeight: '900',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  version: {
    color: T.textMuted,
    fontSize: getResponsiveSize(13),
    marginTop: getResponsiveSize(5),
  },
  card: {
    backgroundColor: T.bg2,
    borderRadius: getResponsiveSize(T.radiusMd),
    padding: getResponsiveSize(18),
    marginBottom: getResponsiveSize(16),
    borderWidth: 1,
    borderColor: T.borderSoft,
    ...T.shadowCard,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: getResponsiveSize(10),
  },
  icon: {
    marginRight: getResponsiveSize(10),
  },
  cardTitle: {
    color: T.text,
    fontSize: getResponsiveSize(17),
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.2,
  },
  cardContent: {
    color: T.textDim,
    fontSize: getResponsiveSize(14),
    lineHeight: getResponsiveSize(21),
  },
  actionButton: {
    backgroundColor: T.gold,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: getResponsiveSize(10),
    paddingHorizontal: getResponsiveSize(16),
    borderRadius: getResponsiveSize(T.radiusMd),
    marginTop: getResponsiveSize(14),
    alignSelf: 'flex-start',
    ...T.shadowBtn,
  },
  actionButtonText: {
    color: '#1B1305',
    fontWeight: '800',
    marginRight: getResponsiveSize(5),
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  footer: {
    alignItems: 'center',
    marginTop: getResponsiveSize(20),
  },
  copyright: {
    color: T.textMuted,
    fontSize: getResponsiveSize(12),
  },
});

export default InfoScreen;
