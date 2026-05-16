import React, { useEffect, useRef } from 'react';
import { View, TextInput, Animated, StyleSheet, Easing, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { T } from '../../utils/theme';
import { getResponsiveSize } from '../../utils/responsive';

/**
 * AnimatedSearchBar - React Native version of the glowing animated search bar.
 * Replicates the "conic-gradient" glow effect using rotating gradients and shadows.
 */
const AnimatedSearchBar = ({
  value,
  onChangeText,
  placeholder,
  showLeftIcon = true,
  leftIconName = 'search',
  leftIconColor = T.textMuted,
  showRightIcon = true,
  rightIconName = 'options-outline',
  rightIconColor = T.gold,
  onRightIconPress,
  outerStyle,
  innerStyle,
  inputStyle,
  ...props
}) => {
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 3000, // Faster rotation for better effect
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={[styles.outerContainer, outerStyle]}>
      {/* Animated Glowing Borders (Conic-like effect) */}
      <Animated.View style={[styles.glowLayer, { transform: [{ rotate: spin }] }]}>
        <LinearGradient
          colors={['#402fb5', 'transparent', '#cf30aa', 'transparent', '#402fb5']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      <View style={[styles.innerContainer, innerStyle]}>
        {showLeftIcon ? (
          <Ionicons 
            name={leftIconName} 
            size={getResponsiveSize(20)} 
            color={leftIconColor} 
            style={styles.leftIcon} 
          />
        ) : null}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder || "Rechercher..."}
          placeholderTextColor={T.textMuted}
          style={[styles.input, inputStyle]}
          autoCorrect={false}
          autoCapitalize="none"
          {...props}
        />
        {showRightIcon ? (
          onRightIconPress ? (
            <TouchableOpacity
              onPress={onRightIconPress}
              style={styles.rightIconContainer}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name={rightIconName} size={getResponsiveSize(18)} color={rightIconColor} />
            </TouchableOpacity>
          ) : (
            <View style={styles.rightIconContainer}>
              <Ionicons name={rightIconName} size={getResponsiveSize(18)} color={rightIconColor} />
            </View>
          )
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    height: getResponsiveSize(54),
    width: '100%',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 2, // Space for the glow border
    borderRadius: getResponsiveSize(14),
    overflow: 'hidden',
  },
  glowLayer: {
    position: 'absolute',
    width: '200%',
    height: '200%',
    opacity: 0.8,
  },
  innerContainer: {
    flex: 1,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#010201', // Pure black like the reference
    borderRadius: getResponsiveSize(12),
    paddingHorizontal: getResponsiveSize(16),
    zIndex: 1,
  },
  leftIcon: {
    marginRight: getResponsiveSize(12),
  },
  input: {
    flex: 1,
    color: '#fff',
    fontSize: getResponsiveSize(16),
    height: '100%',
  },
  rightIconContainer: {
    padding: getResponsiveSize(6),
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: getResponsiveSize(8),
    marginLeft: getResponsiveSize(8),
  },
});

export default AnimatedSearchBar;
