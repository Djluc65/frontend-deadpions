import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { playButtonSound } from '../../utils/soundManager';

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
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 10,
    width: '100%',
  },
  text: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default Button;
