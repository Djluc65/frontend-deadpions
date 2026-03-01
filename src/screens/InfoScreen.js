import React from 'react';
import { View, Text, StyleSheet, ScrollView, ImageBackground, TouchableOpacity, Image, Linking, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { translations } from '../utils/translations';
import { getResponsiveSize } from '../utils/responsive';

const InfoScreen = ({ navigation }) => {
  const settings = useSelector(state => state.settings || { language: 'fr' });
  const t = translations[settings.language] || translations.fr;
  const version = "1.0.0 (Early Access)";

  const openLink = (url) => {
    Linking.openURL(url).catch(err => console.error("Couldn't load page", err));
  };

  const sections = [
    {
      title: "Règles du Jeu",
      icon: "game-controller-outline",
      content: "Le but est d'aligner exactement 5 pions de votre couleur (ni plus, ni moins) horizontalement, verticalement ou en diagonale. Le premier joueur à réussir cet alignement remporte la partie."
    },
    {
      title: "Besoin d'aide ?",
      icon: "chatbubbles-outline",
      content: "Posez vos questions à notre Assistant IA pour comprendre les règles ou obtenir des conseils.",
      action: () => navigation.navigate('Assistant'),
      actionLabel: "Parler à l'Assistant"
    },
    {
      title: "À Propos",
      icon: "information-circle-outline",
      content: "DeadPions est un jeu de stratégie développé avec passion. Affrontez vos amis, des joueurs du monde entier ou notre IA."
    },
    {
      title: "Contact & Support",
      icon: "headset-outline",
      content: "Besoin d'aide ? Contactez-nous directement :",
      subActions: [
        { 
          label: "deadpions@gmail.com", 
          link: "mailto:deadpions@gmail.com", 
          icon: "mail" 
        },
        { 
          label: "WhatsApp: +33 7 52 97 77 11", 
          link: "https://wa.me/33752977711", 
          icon: "logo-whatsapp" 
        }
      ]
    },
    {
      title: "Mentions Légales",
      icon: "document-text-outline",
      action: () => openLink('https://deadpions.com/terms'), // Placeholder
      actionLabel: "Conditions d'utilisation"
    }
  ];

  return (
    <ImageBackground 
      source={require('../../assets/images/Background2-4.png')} 
      style={styles.background}
      resizeMode="cover"
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={getResponsiveSize(28)} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Informations</Text>
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
          <Text style={styles.copyright}>© 2024 DeadPions. Tous droits réservés.</Text>
        </View>
      </ScrollView>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: getResponsiveSize(Platform.OS === 'ios' ? 60 : 40),
    paddingHorizontal: getResponsiveSize(20),
    paddingBottom: getResponsiveSize(20),
    backgroundColor: 'rgba(4, 28, 85, 0.9)',
    borderBottomWidth: getResponsiveSize(1),
    borderBottomColor: '#f1c40f',
  },
  backButton: {
    padding: getResponsiveSize(5),
  },
  headerTitle: {
    color: '#fff',
    fontSize: getResponsiveSize(20),
    fontWeight: 'bold',
  },
  container: {
    padding: getResponsiveSize(20),
    paddingBottom: getResponsiveSize(40),
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: getResponsiveSize(30),
  },
  logo: {
    width: getResponsiveSize(100),
    height: getResponsiveSize(100),
    marginBottom: getResponsiveSize(10),
  },
  appName: {
    color: '#f1c40f',
    fontSize: getResponsiveSize(28),
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: getResponsiveSize(-1), height: getResponsiveSize(1) },
    textShadowRadius: getResponsiveSize(10),
  },
  version: {
    color: '#bdc3c7',
    fontSize: getResponsiveSize(14),
    marginTop: getResponsiveSize(5),
  },
  card: {
    backgroundColor: 'rgba(4, 28, 85, 0.8)',
    borderRadius: getResponsiveSize(15),
    padding: getResponsiveSize(20),
    marginBottom: getResponsiveSize(20),
    borderWidth: getResponsiveSize(1),
    borderColor: 'rgba(241, 196, 15, 0.3)',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: getResponsiveSize(2),
    },
    shadowOpacity: 0.25,
    shadowRadius: getResponsiveSize(3.84),
    elevation: 5,
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
    color: '#fff',
    fontSize: getResponsiveSize(18),
    fontWeight: 'bold',
  },
  cardContent: {
    color: '#ecf0f1',
    fontSize: getResponsiveSize(15),
    lineHeight: getResponsiveSize(22),
  },
  actionButton: {
    backgroundColor: '#f1c40f',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: getResponsiveSize(10),
    paddingHorizontal: getResponsiveSize(15),
    borderRadius: getResponsiveSize(8),
    marginTop: getResponsiveSize(15),
    alignSelf: 'flex-start',
  },
  actionButtonText: {
    color: '#041c55',
    fontWeight: 'bold',
    marginRight: getResponsiveSize(5),
  },
  footer: {
    alignItems: 'center',
    marginTop: getResponsiveSize(20),
  },
  copyright: {
    color: '#7f8c8d',
    fontSize: getResponsiveSize(12),
  },
});

export default InfoScreen;
