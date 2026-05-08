import React, { memo } from 'react';
import { TouchableOpacity, Text, StyleSheet, useWindowDimensions } from 'react-native';
import { getResponsiveSize } from '../../utils/responsive';

const GameCard = memo(({ title, onPress, color, children, style, onPlaySound }) => {
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  
  return (
  <TouchableOpacity
    style={[
      styles.card, 
      { borderColor: color }, 
      isTablet && styles.cardTablet,
      style,
    ]}
    activeOpacity={0.7}
    hitSlop={{ top: getResponsiveSize(10), bottom: getResponsiveSize(10), left: getResponsiveSize(10), right: getResponsiveSize(10) }}
    pressRetentionOffset={{ top: getResponsiveSize(30), bottom: getResponsiveSize(30), left: getResponsiveSize(30), right: getResponsiveSize(30) }}
    delayPressIn={0}
    onPress={async () => {
      try {
        if (onPlaySound) {
          Promise.resolve(onPlaySound()).catch(() => {});
        }
      } catch (_) {}
      try {
        if (onPress) onPress();
      } catch (_) {}
    }}
  >
    {children ? (
      children
    ) : (
      <Text style={[styles.cardTitle, { color: color }]}>{title}</Text>
    )}
  </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minHeight: getResponsiveSize(140),
    width: '48%',
    borderRadius: getResponsiveSize(12),
    borderWidth: getResponsiveSize(2),
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 1)',
  },
  cardTablet: {
    minHeight: getResponsiveSize(160),
    borderRadius: getResponsiveSize(16),
  },
  cardTitle: {
    fontSize: getResponsiveSize(24),
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default GameCard;
