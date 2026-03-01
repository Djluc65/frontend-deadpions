import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { CommonActions } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { getResponsiveSize } from '../utils/responsive';

const ResultatJeuIA = ({ route, navigation }) => {
  const { victoire, difficulte, configIA } = route.params;
  const [stats, setStats] = useState(null);
  const [scaleAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    updateStats();
    
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 6,
      tension: 40,
      useNativeDriver: true
    }).start();
  }, []);

  const updateStats = async () => {
    try {
      const savedStats = await AsyncStorage.getItem('statsIA');
      let statsObj = savedStats ? JSON.parse(savedStats) : {
        facile: { jouees: 0, gagnees: 0 },
        moyen: { jouees: 0, gagnees: 0 },
        difficile: { jouees: 0, gagnees: 0 }
      };

      // Ensure all keys exist
      if (!statsObj.facile) statsObj.facile = { jouees: 0, gagnees: 0 };
      if (!statsObj.moyen) statsObj.moyen = { jouees: 0, gagnees: 0 };
      if (!statsObj.difficile) statsObj.difficile = { jouees: 0, gagnees: 0 };

      // Update current difficulty stats
      if (statsObj[difficulte]) {
        statsObj[difficulte].jouees += 1;
        if (victoire) {
          statsObj[difficulte].gagnees += 1;
        }
      }

      await AsyncStorage.setItem('statsIA', JSON.stringify(statsObj));
      setStats(statsObj[difficulte]);
    } catch (error) {
      console.error('Error updating stats:', error);
    }
  };

  const tauxVictoire = stats ? ((stats.gagnees / stats.jouees) * 100).toFixed(0) : 0;

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.card, { transform: [{ scale: scaleAnim }] }]}>
        <Text style={styles.emoji}>
          {victoire ? '🎉' : '😢'}
        </Text>
        
        <Text style={styles.titre}>
          {victoire ? 'Victoire !' : 'Défaite'}
        </Text>
        
        <Text style={styles.message}>
          {victoire 
            ? 'Félicitations ! Vous avez battu l\'IA !'
            : 'L\'IA a gagné cette fois. Réessayez !'}
        </Text>
        
        {stats && (
          <View style={styles.statsContainer}>
            <Text style={styles.statsLabel}>Mode {difficulte.charAt(0).toUpperCase() + difficulte.slice(1)}</Text>
            <Text style={styles.statsTaux}>{tauxVictoire}% de victoires</Text>
            <Text style={styles.statsParties}>{stats.jouees} parties jouées</Text>
          </View>
        )}
        
        <View style={styles.boutons}>
          <TouchableOpacity
            style={styles.boutonRejouer}
            onPress={() => navigation.replace('Game', { modeJeu: 'ia', configIA })}
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
            <Text style={styles.boutonTexteMenu}>🏠 Menu</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: getResponsiveSize(20)
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: getResponsiveSize(24),
    padding: getResponsiveSize(30),
    width: '100%',
    maxWidth: getResponsiveSize(400),
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: getResponsiveSize(4) },
    shadowOpacity: 0.3,
    shadowRadius: getResponsiveSize(8),
    elevation: 8
  },
  emoji: {
    fontSize: getResponsiveSize(60),
    marginBottom: getResponsiveSize(20)
  },
  titre: {
    fontSize: getResponsiveSize(32),
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: getResponsiveSize(10)
  },
  message: {
    fontSize: getResponsiveSize(18),
    color: '#4b5563',
    textAlign: 'center',
    marginBottom: getResponsiveSize(30)
  },
  statsContainer: {
    backgroundColor: '#f3f4f6',
    padding: getResponsiveSize(20),
    borderRadius: getResponsiveSize(16),
    width: '100%',
    alignItems: 'center',
    marginBottom: getResponsiveSize(30)
  },
  statsLabel: {
    fontSize: getResponsiveSize(14),
    color: '#6b7280',
    textTransform: 'uppercase',
    fontWeight: '600',
    marginBottom: getResponsiveSize(8)
  },
  statsTaux: {
    fontSize: getResponsiveSize(36),
    fontWeight: 'bold',
    color: '#3b82f6',
    marginBottom: getResponsiveSize(4)
  },
  statsParties: {
    fontSize: getResponsiveSize(14),
    color: '#9ca3af'
  },
  boutons: {
    width: '100%',
    gap: getResponsiveSize(12)
  },
  boutonRejouer: {
    backgroundColor: '#3b82f6',
    paddingVertical: getResponsiveSize(16),
    borderRadius: getResponsiveSize(12),
    alignItems: 'center'
  },
  boutonMenu: {
    backgroundColor: '#f3f4f6',
    paddingVertical: getResponsiveSize(16),
    borderRadius: getResponsiveSize(12),
    alignItems: 'center'
  },
  boutonTexte: {
    fontSize: getResponsiveSize(16),
    fontWeight: 'bold',
    color: '#fff'
  },
  boutonTexteMenu: {
    fontSize: getResponsiveSize(16),
    fontWeight: 'bold',
    color: '#374151'
  }
});

export default ResultatJeuIA;
