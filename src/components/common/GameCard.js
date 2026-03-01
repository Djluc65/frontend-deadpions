import React, { memo } from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { getResponsiveSize } from '../../utils/responsive';

const GameCard = memo(({ title, onPress, color, children, style, onPlaySound }) => (
  <TouchableOpacity
    style={[styles.card, { borderColor: color }, style]}
    hitSlop={{ top: getResponsiveSize(10), bottom: getResponsiveSize(10), left: getResponsiveSize(10), right: getResponsiveSize(10) }}
    onPress={async () => {
      if (onPlaySound) await onPlaySound();
      if (onPress) onPress();
    }}
  >
    {children ? (
      children
    ) : (
      <Text style={[styles.cardTitle, { color: color }]}>{title}</Text>
    )}
  </TouchableOpacity>
));

const styles = StyleSheet.create({
  card: {
    height: getResponsiveSize(120),
    width: '48%',
    borderRadius: getResponsiveSize(15),
    borderWidth: getResponsiveSize(2),
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 1)',
  },
  cardTitle: {
    fontSize: getResponsiveSize(24),
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default GameCard;
