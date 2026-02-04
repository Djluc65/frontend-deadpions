import React, { memo } from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';

const GameCard = memo(({ title, onPress, color, children, style, onPlaySound }) => (
  <TouchableOpacity
    style={[styles.card, { borderColor: color }, style]}
    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
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
    height: 120,
    width: '48%',
    borderRadius: 15,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 1)',
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default GameCard;
