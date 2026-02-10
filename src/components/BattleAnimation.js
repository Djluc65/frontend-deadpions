import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, Dimensions, Easing } from 'react-native';
import { Svg, Defs, LinearGradient, Stop, Path, Polygon, Circle } from 'react-native-svg';

const { width } = Dimensions.get('window');

// Images assets (Using existing project assets)
const LION_IMG = require('../../assets/avatars2/lion2.png');
const TIGER_IMG = require('../../assets/avatars2/tigre.png');

const AVATAR_SIZE = 65; // Slightly larger for better visibility

// --- Visual Effects Components ---

const RadiantGlow = ({ color, anim, intensity }) => (
  <Animated.View style={[
    styles.glowContainer,
    {
      backgroundColor: color,
      opacity: anim.interpolate({
        inputRange: [0, 1],
        outputRange: [0.2, 0.6]
      }),
      transform: [
        { 
          scale: Animated.add(anim, intensity).interpolate({
            inputRange: [0, 2],
            outputRange: [1, 1.8] 
          }) 
        }
      ]
    }
  ]} />
);

const FireBreath = ({ anim }) => (
  <Animated.View style={[
    styles.breathContainer, 
    { 
      left: AVATAR_SIZE - 10, 
      opacity: anim,
      transform: [
        { scaleX: anim },
        { translateX: anim.interpolate({ inputRange: [0, 1], outputRange: [-30, 0] }) }
      ]
    }
  ]}>
    <Svg height="50" width="100" viewBox="0 0 100 50">
      <Defs>
        <LinearGradient id="fireGrad" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor="#ffff00" stopOpacity="0.9" />
          <Stop offset="0.4" stopColor="#ff4500" stopOpacity="0.8" />
          <Stop offset="0.8" stopColor="#ff0000" stopOpacity="0.4" />
          <Stop offset="1" stopColor="#ff0000" stopOpacity="0" />
        </LinearGradient>
      </Defs>
      <Path
        d="M0,25 Q40,5 100,25 Q40,45 0,25 Z M10,25 Q40,15 80,25 Q40,35 10,25 Z"
        fill="url(#fireGrad)"
      />
    </Svg>
  </Animated.View>
);

const IceBreath = ({ anim }) => (
  <Animated.View style={[
    styles.breathContainer, 
    { 
      right: AVATAR_SIZE - 20, 
      opacity: anim,
      transform: [
        { scaleX: anim },
        { translateX: anim.interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) }
      ]
    }
  ]}>
    <Svg height="50" width="100" viewBox="0 0 100 50">
      <Defs>
        <LinearGradient id="iceGrad" x1="1" y1="0" x2="0" y2="0">
          <Stop offset="0" stopColor="#ffffff" stopOpacity="0.9" />
          <Stop offset="0.4" stopColor="#00ffff" stopOpacity="0.8" />
          <Stop offset="0.8" stopColor="#0000ff" stopOpacity="0.4" />
          <Stop offset="1" stopColor="#0000ff" stopOpacity="0" />
        </LinearGradient>
      </Defs>
      <Polygon
        points="0,25 90,5 80,25 90,45"
        fill="url(#iceGrad)"
      />
      <Path 
        d="M5,25 L95,15 L70,25 L95,35 Z" 
        fill="rgba(200,255,255,0.6)"
      />
    </Svg>
  </Animated.View>
);

const CollisionEffect = ({ anim }) => (
  <Animated.View style={[
    styles.collisionContainer,
    {
      opacity: anim,
      transform: [
        { scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 2] }) },
        { rotate: anim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] }) }
      ]
    }
  ]}>
    <Svg height="60" width="60" viewBox="0 0 100 100">
      <Defs>
        <LinearGradient id="clashGrad" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#ffff00" stopOpacity="1" />
          <Stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </LinearGradient>
      </Defs>
      <Circle cx="50" cy="50" r="40" fill="url(#clashGrad)" />
      <Polygon points="50,0 60,40 100,50 60,60 50,100 40,60 0,50 40,40" fill="white" opacity="0.8" />
    </Svg>
  </Animated.View>
);

const BattleAnimation = () => {
  // --- Animation Values ---
  const moveAnim = useRef(new Animated.Value(0)).current;   // 0: Start, 1: Center Clash
  const popAnim = useRef(new Animated.Value(0)).current;    // 0: Normal, 1: Heads Out
  const breathAnim = useRef(new Animated.Value(0)).current; // 0: No breath, 1: Attack
  const collisionAnim = useRef(new Animated.Value(0)).current; // 0: None, 1: Explosion
  const pulseAnim = useRef(new Animated.Value(0)).current;  // Continuous glow

  useEffect(() => {
    // 1. Continuous Pulse Loop
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0, duration: 1000, useNativeDriver: true })
      ])
    ).start();

    // 2. Main Battle Sequence Loop
    const battleLoop = Animated.loop(
      Animated.sequence([
        // State 0: Idle at corners
        Animated.delay(1000),

        // Phase 1: Approach (1.2s - Fluid Ease In Out)
        Animated.timing(moveAnim, {
          toValue: 1,
          duration: 1200,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),

        // Phase 2: Clash & Heads Emerge (Pop)
        Animated.parallel([
          Animated.timing(popAnim, {
            toValue: 1,
            duration: 400,
            easing: Easing.out(Easing.back(1.5)), // Bounce effect
            useNativeDriver: true,
          }),
          // Trigger Attacks slightly after pop
          Animated.sequence([
             Animated.delay(100),
             Animated.timing(breathAnim, {
               toValue: 1,
               duration: 300,
               useNativeDriver: true,
             })
          ])
        ]),

        // Phase 3: Collision Explosion
        Animated.sequence([
          Animated.timing(collisionAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
          Animated.timing(collisionAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
        ]),

        // Hold / Struggle
        Animated.delay(800),

        // Phase 4: Retreat
        Animated.parallel([
          Animated.timing(moveAnim, {
            toValue: 0,
            duration: 800,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(popAnim, {
            toValue: 0,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(breathAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          })
        ]),

        // Rest before next loop
        Animated.delay(500),
      ])
    );

    battleLoop.start();

    return () => battleLoop.stop();
  }, []);

  // --- Interpolations ---

  // Movement: From edges to center
  // Distance: (Screen Width / 2) - (Avatar Size) - (Safety Margin)
  const maxTravel = (width / 2) - AVATAR_SIZE - 20; 
  
  const lionTranslateX = moveAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-maxTravel * 0.5, 30], // Start further left, end near center
  });

  const tigerTranslateX = moveAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [maxTravel * 0.5, -30], // Start further right, end near center
  });

  // Scale Heads (Pop)
  const imageScale = popAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.5],
  });

  // Tilt heads during attack
  const lionRotate = popAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '-15deg'],
  });
  const tigerRotate = popAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '15deg'],
  });

  return (
    <View style={styles.container}>
      {/* --- LION (Left / Red) --- */}
      <Animated.View style={[
        styles.fighterContainer,
        {
          transform: [
            { translateX: lionTranslateX },
            { rotate: lionRotate }
          ]
        }
      ]}>
        <RadiantGlow color="#ff4500" anim={pulseAnim} intensity={popAnim} />
        
        <View style={[styles.badge, styles.lionBadge]} />
        
        <View style={styles.imageContainer}>
          <Animated.Image 
            source={LION_IMG} 
            style={[styles.avatar, { transform: [{ scale: imageScale }] }]} 
            resizeMode="cover" 
          />
        </View>
        <FireBreath anim={breathAnim} />
      </Animated.View>

      {/* --- Collision Center --- */}
      <View style={styles.centerZone}>
        <CollisionEffect anim={collisionAnim} />
      </View>

      {/* --- TIGER (Right / Blue) --- */}
      <Animated.View style={[
        styles.fighterContainer,
        {
          transform: [
            { translateX: tigerTranslateX },
            { rotate: tigerRotate }
          ]
        }
      ]}>
        <RadiantGlow color="#00bfff" anim={pulseAnim} intensity={popAnim} />
        
        <View style={[styles.badge, styles.tigerBadge]} />
        
        <View style={styles.imageContainer}>
          <Animated.Image 
            source={TIGER_IMG} 
            style={[styles.avatar, { transform: [{ scale: imageScale }, { scaleX: -1 }] }]} 
            resizeMode="cover" 
          />
        </View>
        <IceBreath anim={breathAnim} />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center', // Center alignment
    alignItems: 'center',
    height: 120,
    width: '100%',
    marginTop: 20,
    marginBottom: 10,
    top: 120,
    overflow: 'visible', // Allow effects to spill out
  },
  fighterContainer: {
    width: AVATAR_SIZE + 10,
    height: AVATAR_SIZE + 10,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    marginHorizontal: 10, // Initial spacing
  },
  centerZone: {
    position: 'absolute',
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 30, // Top of everything
  },
  collisionContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageContainer: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.9)',
    zIndex: 2,
    backgroundColor: '#1a1a1a',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  badge: {
    position: 'absolute',
    width: AVATAR_SIZE + 6,
    height: AVATAR_SIZE + 6,
    borderRadius: (AVATAR_SIZE + 6) / 2,
    zIndex: 1,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 5,
  },
  lionBadge: {
    backgroundColor: 'rgba(220, 20, 60, 0.4)',
    borderWidth: 1,
    borderColor: '#ff4d4d',
    shadowColor: '#ff0000',
  },
  tigerBadge: {
    backgroundColor: 'rgba(30, 144, 255, 0.4)',
    borderWidth: 1,
    borderColor: '#4da6ff',
    shadowColor: '#0066ff',
  },
  glowContainer: {
    position: 'absolute',
    width: AVATAR_SIZE + 20,
    height: AVATAR_SIZE + 20,
    borderRadius: (AVATAR_SIZE + 20) / 2,
    zIndex: 0,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 15,
    elevation: 8,
    shadowColor: '#fff',
  },
  breathContainer: {
    position: 'absolute',
    top: AVATAR_SIZE / 2 - 25, // Centered vertically relative to avatar
    zIndex: 20,
    width: 100,
    height: 50,
    justifyContent: 'center',
    overflow: 'visible',
  },
});

export default BattleAnimation;
