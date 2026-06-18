// DeadPions — StreakBadge.jsx — créé le 2026-06-08
import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { useSelector } from 'react-redux';
import { getResponsiveSize } from '../utils/responsive';
import { T } from '../utils/theme';

const StreakBadge = ({ streakOverride }) => {
  const currentStreak = useSelector((state) => state.streak.currentStreak);
  const streak = streakOverride !== undefined ? streakOverride : currentStreak;

  if (streak <= 0) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.icon}>🔥</Text>
      <Text style={styles.count}>{streak}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(230, 57, 70, 0.15)', // T.red alpha
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(230, 57, 70, 0.3)',
  },
  icon: {
    fontSize: getResponsiveSize(14),
    marginRight: 4,
  },
  count: {
    fontSize: getResponsiveSize(14),
    fontWeight: '900',
    color: '#ECE6D6',
  }
});

export default StreakBadge;
