import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { T } from '../../utils/theme';
import { getResponsiveSize } from '../../utils/responsive';

/**
 * GlowWrapper - A reusable component that adds an animated glowing border
 * to its children, mimicking the "animated-glowing-search-bar" effect.
 */
const GlowWrapper = ({ children, style, glowColor1 = T.gold, glowColor2 = '#cf30aa', intensity = 0.6 }) => {
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 4000,
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
    <View style={[styles.container, style]}>
      {/* Animated Glowing Layer */}
      <Animated.View style={[styles.glowLayer, { transform: [{ rotate: spin }], opacity: intensity }]}>
        <LinearGradient
          colors={['transparent', glowColor1, 'transparent', glowColor2, 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
      
      {/* Inner Content Wrapper */}
      <View style={styles.innerContent}>
        {children}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 1.5, // Space for the glowing border
    borderRadius: getResponsiveSize(T.radiusMd),
    overflow: 'hidden',
  },
  glowLayer: {
    position: 'absolute',
    width: '180%', // Larger to ensure coverage during rotation
    height: '180%',
    zIndex: 0,
  },
  innerContent: {
    zIndex: 1,
    width: '100%',
    borderRadius: getResponsiveSize(T.radiusMd - 1.5),
    backgroundColor: T.bg1, // Ensure content has a solid background to cover the center of the glow
    overflow: 'hidden',
  },
});

export default GlowWrapper;
