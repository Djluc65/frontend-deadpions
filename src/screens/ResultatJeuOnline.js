import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ImageBackground } from 'react-native';
import { CommonActions } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { getResponsiveSize } from '../utils/responsive';

const ResultatJeuOnline = ({ route, navigation }) => {
  const { victoire, gains, montantPari, adversaire, raisonDefaite, raisonVictoire, timeouts } = route.params;
  const user = useSelector(state => state.auth.user);

  return (
    <ImageBackground 
      source={require('../../assets/images/Background2-4.png')} 
      style={styles.container}
    >
      <View style={styles.card}>
        <Text style={styles.emoji}>{victoire ? '🏆' : '😢'}</Text>
        <Text style={styles.titre}>{victoire ? 'VICTOIRE !' : 'DÉFAITE'}</Text>
        <Text style={styles.adversaire}>Contre {adversaire?.pseudo || 'Adversaire'}</Text>

        {raisonVictoire === 'timeout_adverse' && (
            <View style={styles.raisonContainer}>
                <Text style={styles.raisonTexte}>
                    ⏰ Votre adversaire a dépassé le temps limite 5 fois
                </Text>
            </View>
        )}
        
        {raisonDefaite === 'timeout' && (
            <View style={[styles.raisonContainer, styles.raisonDefaite]}>
                <Text style={[styles.raisonTexte, styles.raisonTexteDefaite]}>
                    ⏰ Vous avez dépassé le temps limite {timeouts || 5} fois
                </Text>
            </View>
        )}

        {victoire ? (
          <View style={styles.gainsContainer}>
            <Text style={styles.gainsLabel}>Vous avez gagné :</Text>
            <Text style={styles.gainsMontant}>+🪙 {gains.toLocaleString()}</Text>
            <Text style={styles.gainsInfo}>(90% de {(montantPari * 2).toLocaleString()} coins)</Text>
          </View>
        ) : (
          <View style={styles.perteContainer}>
            <Text style={styles.perteLabel}>Vous avez perdu :</Text>
            <Text style={styles.perteMontant}>-🪙 {montantPari.toLocaleString()}</Text>
          </View>
        )}

        <View style={styles.soldeContainer}>
            <Text style={styles.soldeLabel}>Nouveau solde :</Text>
            <Text style={styles.soldeMontant}>🪙 {user?.coins?.toLocaleString()}</Text>
        </View>

        <View style={styles.boutons}>
          <TouchableOpacity 
            style={styles.boutonRejouer} 
            onPress={() => navigation.navigate('Home')}
          >
            <Text style={styles.boutonTexte}>🔄 Rejouer</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.boutonMenu} 
            onPress={() => navigation.dispatch(
              CommonActions.reset({
                index: 0,
                routes: [{ name: 'Home' }],
              })
            )}
          >
            <Text style={styles.boutonTexte}>🏠 Menu</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: getResponsiveSize(24),
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: getResponsiveSize(20),
    padding: getResponsiveSize(32),
    alignItems: 'center',
    width: '100%',
    maxWidth: getResponsiveSize(400),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: getResponsiveSize(4)},
    shadowOpacity: 0.1,
    shadowRadius: getResponsiveSize(12),
    elevation: 8,
  },
  emoji: {
    fontSize: getResponsiveSize(80),
    marginBottom: getResponsiveSize(16),
  },
  titre: {
    fontSize: getResponsiveSize(32),
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: getResponsiveSize(8),
  },
  adversaire: {
    fontSize: getResponsiveSize(16),
    color: '#6b7280',
    marginBottom: getResponsiveSize(24),
  },
  gainsContainer: {
    backgroundColor: '#d1fae5',
    borderRadius: getResponsiveSize(12),
    padding: getResponsiveSize(20),
    width: '100%',
    alignItems: 'center',
    marginBottom: getResponsiveSize(24),
  },
  gainsLabel: {
    fontSize: getResponsiveSize(14),
    color: '#065f46',
    marginBottom: getResponsiveSize(8),
  },
  gainsMontant: {
    fontSize: getResponsiveSize(36),
    fontWeight: 'bold',
    color: '#059669',
    marginBottom: getResponsiveSize(4),
  },
  gainsInfo: {
    fontSize: getResponsiveSize(12),
    color: '#065f46',
  },
  perteContainer: {
    backgroundColor: '#fee2e2',
    borderRadius: getResponsiveSize(12),
    padding: getResponsiveSize(20),
    width: '100%',
    alignItems: 'center',
    marginBottom: getResponsiveSize(24),
  },
  perteLabel: {
    fontSize: getResponsiveSize(14),
    color: '#991b1b',
    marginBottom: getResponsiveSize(8),
  },
  perteMontant: {
    fontSize: getResponsiveSize(36),
    fontWeight: 'bold',
    color: '#dc2626',
  },
  soldeContainer: {
    marginBottom: getResponsiveSize(24),
    alignItems: 'center',
  },
  soldeLabel: {
    fontSize: getResponsiveSize(16),
    color: '#4b5563',
    marginBottom: getResponsiveSize(4),
  },
  soldeMontant: {
    fontSize: getResponsiveSize(24),
    fontWeight: 'bold',
    color: '#111827',
  },
  boutons: {
    flexDirection: 'row',
    gap: getResponsiveSize(12),
    width: '100%',
  },
  boutonRejouer: {
    flex: 1,
    backgroundColor: '#3b82f6',
    paddingVertical: getResponsiveSize(14),
    borderRadius: getResponsiveSize(12),
    alignItems: 'center',
  },
  boutonMenu: {
    flex: 1,
    backgroundColor: '#6b7280',
    paddingVertical: getResponsiveSize(14),
    borderRadius: getResponsiveSize(12),
    alignItems: 'center',
  },
  boutonTexte: {
    color: '#fff',
    fontSize: getResponsiveSize(16),
    fontWeight: 'bold',
  },
  raisonContainer: {
    backgroundColor: '#ecfccb',
    padding: getResponsiveSize(12),
    borderRadius: getResponsiveSize(8),
    marginBottom: getResponsiveSize(16),
    width: '100%',
    alignItems: 'center',
  },
  raisonDefaite: {
      backgroundColor: '#fee2e2',
  },
  raisonTexte: {
      fontSize: getResponsiveSize(14),
      fontWeight: '600',
      color: '#3f6212',
      textAlign: 'center'
  },
  raisonTexteDefaite: {
      color: '#991b1b',
  },
});

export default ResultatJeuOnline;
