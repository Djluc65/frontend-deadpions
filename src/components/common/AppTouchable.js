import React from 'react';
import { TouchableOpacity, Pressable, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { playButtonSound } from '../../utils/soundManager';

/**
 * A wrapper for TouchableOpacity and Pressable that plays a sound on press.
 * Use this instead of TouchableOpacity/Pressable for consistent feedback.
 */
export const AppTouchableOpacity = ({ onPress, children, ...props }) => {
  const handlePress = (event) => {
    // Feedback haptique
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync().catch(() => {});
    }
    
    // Jouer le son
    playButtonSound();
    
    // Appeler l'onPress original
    if (onPress) onPress(event);
  };

  return (
    <TouchableOpacity {...props} onPress={handlePress}>
      {children}
    </TouchableOpacity>
  );
};

export const AppPressable = ({ onPress, children, ...props }) => {
  const handlePress = (event) => {
    // Feedback haptique
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync().catch(() => {});
    }
    
    // Jouer le son
    playButtonSound();
    
    // Appeler l'onPress original
    if (onPress) onPress(event);
  };

  return (
    <Pressable {...props} onPress={handlePress}>
      {children}
    </Pressable>
  );
};

export default AppTouchableOpacity;
