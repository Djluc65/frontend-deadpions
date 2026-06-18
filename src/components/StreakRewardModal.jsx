// DeadPions — StreakRewardModal.jsx — créé le 2026-06-08
import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Text, Modal, Animated, TouchableOpacity, Platform } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { clearPendingReward } from '../redux/slices/streakSlice';
import { T } from '../utils/theme';
import { getResponsiveSize } from '../utils/responsive';
import { Ionicons } from '@expo/vector-icons';

const StreakRewardModal = () => {
  const dispatch = useDispatch();
  const pendingReward = useSelector((state) => state.streak.pendingReward);
  const springAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (pendingReward) {
      Animated.spring(springAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 50,
        friction: 7
      }).start();
    } else {
      springAnim.setValue(0);
    }
  }, [pendingReward, springAnim]);

  if (!pendingReward) return null;

  const { streak, nomPaquet, coins } = pendingReward;

  const handleClaim = () => {
    Animated.timing(springAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true
    }).start(() => {
      dispatch(clearPendingReward());
    });
  };

  // Icon color based on streak level
  const getIconColor = (s) => {
    if (s >= 50) return '#FFD700'; // Ultime / Or
    if (s >= 25) return '#B9F2FF'; // Diamant / Platine
    if (s >= 10) return '#C0C0C0'; // Argent
    return '#CD7F32'; // Bronze
  };

  return (
    <Modal transparent visible={!!pendingReward} animationType="fade">
      <View style={styles.overlay}>
        <Animated.View style={[
          styles.container,
          {
            transform: [{ scale: springAnim }],
            opacity: springAnim
          }
        ]}>
          <View style={styles.header}>
            <Ionicons name="trophy" size={getResponsiveSize(64)} color={getIconColor(streak)} />
          </View>
          
          <Text style={styles.title}>🏆 {nomPaquet} débloqué !</Text>
          <Text style={styles.subtitle}>Série de {streak} victoires consécutives</Text>
          
          <View style={styles.rewardBox}>
            <Text style={styles.rewardText}>+{coins} coins</Text>
          </View>
          
          <TouchableOpacity style={styles.button} onPress={handleClaim}>
            <Text style={styles.buttonText}>Récupérer</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 9, 15, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: '85%',
    maxWidth: 400,
    backgroundColor: '#060B17',
    borderRadius: 20,
    padding: 24,
    borderWidth: 2,
    borderColor: '#F4B41A',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#F4B41A',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 15,
      },
      android: {
        elevation: 10,
      }
    })
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: getResponsiveSize(24),
    fontWeight: '900',
    color: '#ECE6D6',
    textAlign: 'center',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: getResponsiveSize(16),
    color: '#A8B4C9',
    textAlign: 'center',
    marginBottom: 24,
  },
  rewardBox: {
    backgroundColor: 'rgba(244, 180, 26, 0.15)',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(244, 180, 26, 0.3)',
    marginBottom: 30,
  },
  rewardText: {
    fontSize: getResponsiveSize(32),
    fontWeight: '900',
    color: '#F4B41A',
  },
  button: {
    backgroundColor: '#F4B41A',
    paddingHorizontal: 40,
    paddingVertical: 15,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  buttonText: {
    fontSize: getResponsiveSize(18),
    fontWeight: '900',
    color: '#060B17',
    textTransform: 'uppercase',
  }
});

export default StreakRewardModal;
