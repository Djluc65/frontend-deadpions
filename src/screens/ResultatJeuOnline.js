import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ImageBackground } from 'react-native';
import { T } from '../utils/theme';
import { CommonActions } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { getResponsiveSize } from '../utils/responsive';
import { useAdManager } from '../ads/AdSystem';

const ResultatJeuOnline = ({ route, navigation }) => {
  const { victoire, gains, montantPari, adversaire, raisonDefaite, raisonVictoire, timeouts } = route.params;
  const user = useSelector(state => state.auth.user);
  const { showAds, showRewarded } = useAdManager();
  const canShowRewardedCta = !victoire && showAds;

  return (
    <ImageBackground
      source={require('../../assets/images/Background2-4.png')}
      style={styles.container}
    >
      <View style={styles.bgOverlay} pointerEvents="none" />
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
            <Text style={styles.gainsInfo}>(95% de {(montantPari * 2).toLocaleString()} coins)</Text>
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

        {canShowRewardedCta && (
          <TouchableOpacity style={styles.boutonRewarded} onPress={showRewarded}>
            <Text style={styles.boutonRewardedTexte}>🎁 Regarder une pub — +10 coins</Text>
          </TouchableOpacity>
        )}

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
  bgOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(5,9,15,0.55)',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: getResponsiveSize(24),
  },
  card: {
    backgroundColor: T.bg2,
    borderRadius: getResponsiveSize(T.radiusXl),
    padding: getResponsiveSize(28),
    alignItems: 'center',
    width: '100%',
    maxWidth: getResponsiveSize(400),
    borderWidth: 1.5,
    borderColor: T.gold,
    ...T.shadowCard,
  },
  emoji: {
    fontSize: getResponsiveSize(72),
    marginBottom: getResponsiveSize(14),
  },
  titre: {
    fontSize: getResponsiveSize(30),
    fontWeight: '900',
    color: T.text,
    marginBottom: getResponsiveSize(6),
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  adversaire: {
    fontSize: getResponsiveSize(14),
    color: T.textMuted,
    marginBottom: getResponsiveSize(20),
  },
  gainsContainer: {
    backgroundColor: 'rgba(46,194,126,0.1)',
    borderRadius: getResponsiveSize(T.radiusMd),
    padding: getResponsiveSize(18),
    width: '100%',
    alignItems: 'center',
    marginBottom: getResponsiveSize(20),
    borderWidth: 1,
    borderColor: 'rgba(46,194,126,0.3)',
  },
  gainsLabel: {
    fontSize: getResponsiveSize(13),
    color: T.green,
    marginBottom: getResponsiveSize(6),
    fontWeight: '600',
  },
  gainsMontant: {
    fontSize: getResponsiveSize(34),
    fontWeight: '900',
    color: T.green,
    marginBottom: getResponsiveSize(4),
  },
  gainsInfo: {
    fontSize: getResponsiveSize(11),
    color: T.textMuted,
  },
  perteContainer: {
    backgroundColor: 'rgba(230,57,70,0.1)',
    borderRadius: getResponsiveSize(T.radiusMd),
    padding: getResponsiveSize(18),
    width: '100%',
    alignItems: 'center',
    marginBottom: getResponsiveSize(20),
    borderWidth: 1,
    borderColor: 'rgba(230,57,70,0.3)',
  },
  perteLabel: {
    fontSize: getResponsiveSize(13),
    color: T.red,
    marginBottom: getResponsiveSize(6),
    fontWeight: '600',
  },
  perteMontant: {
    fontSize: getResponsiveSize(34),
    fontWeight: '900',
    color: T.red,
  },
  soldeContainer: {
    marginBottom: getResponsiveSize(20),
    alignItems: 'center',
  },
  soldeLabel: {
    fontSize: getResponsiveSize(14),
    color: T.textDim,
    marginBottom: getResponsiveSize(4),
  },
  soldeMontant: {
    fontSize: getResponsiveSize(22),
    fontWeight: '800',
    color: T.gold,
  },
  boutonRewarded: {
    width: '100%',
    backgroundColor: T.gold,
    paddingVertical: getResponsiveSize(10),
    borderRadius: getResponsiveSize(T.radiusMd),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: getResponsiveSize(10),
    borderWidth: 1,
    borderColor: T.goldDeep,
    ...T.shadowBtn,
  },
  boutonRewardedTexte: {
    color: '#1B1305',
    fontSize: getResponsiveSize(13),
    fontWeight: '800',
    textAlign: 'center',
  },
  boutons: {
    flexDirection: 'row',
    gap: getResponsiveSize(10),
    width: '100%',
  },
  boutonRejouer: {
    flex: 1,
    backgroundColor: T.blue,
    paddingVertical: getResponsiveSize(13),
    borderRadius: getResponsiveSize(T.radiusMd),
    alignItems: 'center',
    ...T.shadowBtn,
  },
  boutonMenu: {
    flex: 1,
    backgroundColor: T.bg3,
    paddingVertical: getResponsiveSize(13),
    borderRadius: getResponsiveSize(T.radiusMd),
    alignItems: 'center',
    borderWidth: 1,
    borderColor: T.borderSoft,
  },
  boutonTexte: {
    color: T.text,
    fontSize: getResponsiveSize(14),
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  raisonContainer: {
    backgroundColor: 'rgba(46,194,126,0.1)',
    padding: getResponsiveSize(12),
    borderRadius: getResponsiveSize(T.radiusSm),
    marginBottom: getResponsiveSize(14),
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(46,194,126,0.3)',
  },
  raisonDefaite: {
    backgroundColor: 'rgba(230,57,70,0.1)',
    borderColor: 'rgba(230,57,70,0.3)',
  },
  raisonTexte: {
    fontSize: getResponsiveSize(13),
    fontWeight: '700',
    color: T.green,
    textAlign: 'center',
  },
  raisonTexteDefaite: {
    color: T.red,
  },
});

export default ResultatJeuOnline;
