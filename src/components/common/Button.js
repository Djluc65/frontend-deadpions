import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { playButtonSound } from '../../utils/soundManager';
import { getResponsiveSize } from '../../utils/responsive';

const Button = ({ title, onPress, loading, style, textStyle }) => {
  const handlePress = async () => {
    await playButtonSound();
    if (onPress) onPress();
  };

  return (
    <TouchableOpacity 
      style={[styles.button, style]} 
      onPress={handlePress} 
      disabled={loading}
    >
      {loading ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <Text style={[styles.text, textStyle]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#3498db',
    padding: getResponsiveSize(15),
    borderRadius: getResponsiveSize(8),
    alignItems: 'center',
    marginVertical: getResponsiveSize(10),
    width: '100%',
  },
  text: {
    color: '#fff',
    fontSize: getResponsiveSize(16),
    fontWeight: 'bold',
  },
});

export default Button;
