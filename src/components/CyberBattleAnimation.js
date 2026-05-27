/**
 * CyberBattleAnimation — Animation de combat cyber X vs O
 * Reproduit fidèlement le design : X cyan (gauche) vs O magenta (droite),
 * orbe central lumineux, éclairs, grille perspective, particules flottantes.
 */
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing, useWindowDimensions, Platform } from 'react-native';
import Svg, { Defs, Line, Path, RadialGradient, Stop, Circle as SvgCircle } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';

// ─── Palette ──────────────────────────────────────────────────────────────────
const C = {
  cyan:    '#5BD2FF',
  cyanDp:  '#1A6A99',
  mag:     '#C875FF',
  magDp:   '#6A2B99',
  white:   '#FFFFFF',
  grid:    'rgba(91, 210, 255, 0.18)',
  gridH:   'rgba(91, 210, 255, 0.10)',
};

// ─── Positions des particules (relatives à la largeur du container) ───────────
const PARTICLE_DEFS = [
  { xR: 0.11, yR: 0.26, color: C.cyan,  size: 7,  rot: 45 },
  { xR: 0.21, yR: 0.14, color: C.mag,   size: 5,  rot: 30 },
  { xR: 0.30, yR: 0.38, color: C.cyan,  size: 4,  rot: 60 },
  { xR: 0.14, yR: 0.56, color: C.mag,   size: 6,  rot: 15 },
  { xR: 0.76, yR: 0.20, color: C.cyan,  size: 6,  rot: 55 },
  { xR: 0.87, yR: 0.33, color: C.mag,   size: 5,  rot: 20 },
  { xR: 0.68, yR: 0.44, color: C.cyan,  size: 4,  rot: 40 },
  { xR: 0.84, yR: 0.55, color: C.mag,   size: 7,  rot: 10 },
  { xR: 0.50, yR: 0.10, color: C.cyan,  size: 4,  rot: 45 },
  { xR: 0.44, yR: 0.18, color: C.mag,   size: 3,  rot: 30 },
];

// ─── CyberBattleAnimation ─────────────────────────────────────────────────────
const CyberBattleAnimation = React.memo(() => {
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;

  // Hauteur responsive : 34% de la largeur, plafonné à 240
  const H = Math.round(Math.min(width * 0.36, 240));

  // Tailles des pions
  const xFontSize  = Math.round(H * 0.72);
  const oSize      = Math.round(H * 0.58);
  const oBorderW   = Math.max(9, Math.round(oSize * 0.095));
  const orbR       = Math.round(H * 0.10);      // rayon orbe
  const orbGlowR   = orbR * 3.2;               // rayon halo
  const cx         = width  / 2;               // centre X
  const cy         = H      * 0.41;            // centre Y (vertical)

  // ── Valeurs animées ─────────────────────────────────────────────────────────
  const xSlide        = useRef(new Animated.Value(0)).current;   // offset translateX X (part de 0 → se lance)
  const oSlide        = useRef(new Animated.Value(0)).current;
  const orbScale      = useRef(new Animated.Value(0.5)).current;
  const orbOpacity    = useRef(new Animated.Value(0)).current;
  const lightningOp   = useRef(new Animated.Value(0)).current;
  const raysOp        = useRef(new Animated.Value(0)).current;
  const collisionOp   = useRef(new Animated.Value(0)).current;

  // Particules
  const particleAnims = useRef(
    PARTICLE_DEFS.map(() => ({
      y:  new Animated.Value(0),
      op: new Animated.Value(0.7 + Math.random() * 0.3),
    }))
  ).current;

  // ── Séquence principale (boucle) ────────────────────────────────────────────
  useEffect(() => {
    // ── Éclairs (boucle indépendante) ─────────────────────────────────────────
    const lightLoop = Animated.loop(
      Animated.sequence([
        Animated.delay(1400),
        Animated.timing(lightningOp, { toValue: 1,   duration: 70,  useNativeDriver: true }),
        Animated.timing(lightningOp, { toValue: 0.2, duration: 120, useNativeDriver: true }),
        Animated.timing(lightningOp, { toValue: 0.9, duration: 55,  useNativeDriver: true }),
        Animated.timing(lightningOp, { toValue: 0,   duration: 250, useNativeDriver: true }),
      ])
    );

    // ── Rayons (boucle) ────────────────────────────────────────────────────────
    const raysLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(raysOp, { toValue: 0.55, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(raysOp, { toValue: 0.15, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );

    // ── Orbe pulse (boucle) ────────────────────────────────────────────────────
    const orbPulse = Animated.loop(
      Animated.sequence([
        Animated.timing(orbScale, { toValue: 1.18, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(orbScale, { toValue: 0.88, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );

    // ── Séquence combat ────────────────────────────────────────────────────────
    const battleLoop = Animated.loop(
      Animated.sequence([
        // Repos initial
        Animated.delay(600),

        // Phase 1 : X et O s'approchent
        Animated.parallel([
          Animated.spring(xSlide, { toValue: 1,  tension: 55, friction: 9, useNativeDriver: true }),
          Animated.spring(oSlide, { toValue: -1, tension: 55, friction: 9, useNativeDriver: true }),
        ]),

        // Phase 2 : Orbe + rayons apparaissent
        Animated.parallel([
          Animated.spring(orbScale,   { toValue: 1,  tension: 80, friction: 6, useNativeDriver: true }),
          Animated.timing(orbOpacity, { toValue: 1,  duration: 350, useNativeDriver: true }),
          Animated.timing(raysOp,     { toValue: 0.4,duration: 350, useNativeDriver: true }),
        ]),

        // Phase 3 : Collision
        Animated.sequence([
          Animated.timing(collisionOp, { toValue: 1, duration: 90,  useNativeDriver: true }),
          Animated.timing(collisionOp, { toValue: 0, duration: 220, useNativeDriver: true }),
        ]),

        // Phase 4 : Maintien (combat)
        Animated.delay(1200),

        // Phase 5 : Retraite
        Animated.parallel([
          Animated.timing(xSlide,     { toValue: 0, duration: 750, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
          Animated.timing(oSlide,     { toValue: 0, duration: 750, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
          Animated.timing(orbOpacity, { toValue: 0, duration: 500, useNativeDriver: true }),
          Animated.timing(raysOp,     { toValue: 0, duration: 400, useNativeDriver: true }),
        ]),

        Animated.delay(500),
      ])
    );

    // ── Particules (chacune boucle indépendamment) ─────────────────────────────
    const particleLoops = particleAnims.map((p, i) => {
      const dur = 1600 + i * 280;
      return Animated.loop(
        Animated.sequence([
          Animated.parallel([
            Animated.timing(p.y,  { toValue: -(10 + (i % 4) * 5), duration: dur, useNativeDriver: true }),
            Animated.timing(p.op, { toValue: 0.15,                 duration: dur, useNativeDriver: true }),
          ]),
          Animated.parallel([
            Animated.timing(p.y,  { toValue: 0,   duration: dur, useNativeDriver: true }),
            Animated.timing(p.op, { toValue: 0.8, duration: dur, useNativeDriver: true }),
          ]),
        ])
      );
    });

    battleLoop.start();
    lightLoop.start();
    raysLoop.start();
    orbPulse.start();
    particleLoops.forEach((l, i) => setTimeout(() => l.start(), i * 180));

    return () => {
      battleLoop.stop();
      lightLoop.stop();
      raysLoop.stop();
      orbPulse.stop();
      particleLoops.forEach(l => l.stop());
    };
  }, []);

  // ── Interpolations de position ───────────────────────────────────────────────
  // X part à xPosLeft, approche de xApproach
  const edgePad     = width * (isTablet ? 0.04 : 0.085);
  const xPosLeft    = edgePad;
  const xApproach   = cx - xFontSize * 0.62;
  const xTranslate  = xSlide.interpolate({
    inputRange: [0, 1],
    outputRange: [0, xApproach - xPosLeft],
    extrapolate: 'clamp',
  });

  // O part à oPosRight, approche du centre
  const oPosLeft    = width - oSize - edgePad;
  const oApproach   = cx + oSize * 0.05;
  const oTranslate  = oSlide.interpolate({
    inputRange: [-1, 0],
    outputRange: [oApproach - oPosLeft, 0],
    extrapolate: 'clamp',
  });

  // Scale X/O lors de la collision
  const xScale = collisionOp.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 1.12, 1.06] });
  const oScale = collisionOp.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 1.12, 1.06] });

  // ── Grille perspective (SVG) ─────────────────────────────────────────────────
  const gridTop  = H * 0.62;
  const vpX      = cx;
  const vpY      = gridTop;

  // Lignes horizontales
  const numH = 6;
  const hLines = Array.from({ length: numH }, (_, i) => {
    const t    = (i + 1) / (numH + 1);
    const y    = gridTop + (H - gridTop) * t;
    const half = (0.25 + t * 0.75) * width * 0.5;
    return { y, x1: cx - half, x2: cx + half };
  });

  // Lignes radiales (du point de fuite)
  const numR  = 11;
  const rLines = Array.from({ length: numR }, (_, i) => {
    const t = i / (numR - 1);
    return { x1: vpX, y1: vpY, x2: t * width, y2: H };
  });

  // ── Rayons autour de l'orbe (SVG, 12 rayons) ─────────────────────────────────
  const numRays = 12;
  const rayLen  = orbR * 2.8;
  const rayDist = orbR * 1.5;
  const rays = Array.from({ length: numRays }, (_, i) => {
    const angle = (i / numRays) * 2 * Math.PI;
    return {
      x1: cx + Math.cos(angle) * rayDist,
      y1: cy + Math.sin(angle) * rayDist,
      x2: cx + Math.cos(angle) * (rayDist + rayLen),
      y2: cy + Math.sin(angle) * (rayDist + rayLen),
    };
  });

  // ── Chemins éclairs (du centre vers X et O) ───────────────────────────────────
  const lX = cx, lY = cy;
  const lightningPaths = [
    // vers X (gauche)
    `M ${lX} ${lY} L ${lX - 38} ${lY - 18} L ${lX - 22} ${lY + 8} L ${lX - 62} ${lY + 12} L ${lX - 45} ${lY - 6}`,
    // vers O (droite)
    `M ${lX} ${lY} L ${lX + 40} ${lY - 16} L ${lX + 18} ${lY + 10} L ${lX + 58} ${lY + 8}`,
    // vers le haut
    `M ${lX} ${lY} L ${lX + 12} ${lY - 32} L ${lX - 8} ${lY - 20} L ${lX + 6} ${lY - 52}`,
    // court vers bas-gauche
    `M ${lX} ${lY} L ${lX - 20} ${lY + 22} L ${lX - 8} ${lY + 14}`,
    // court vers bas-droite
    `M ${lX} ${lY} L ${lX + 18} ${lY + 20} L ${lX + 6} ${lY + 10}`,
  ];

  return (
    <View
      pointerEvents="none"
      style={[styles.container, { height: H }]}
    >
      {/* ── Grille perspective ── */}
      <Svg style={StyleSheet.absoluteFill} width={width} height={H}>
        {hLines.map((l, i) => (
          <Line
            key={`h${i}`}
            x1={l.x1} y1={l.y} x2={l.x2} y2={l.y}
            stroke={C.cyan}
            strokeWidth={0.85}
            opacity={0.10 + i * 0.035}
          />
        ))}
        {rLines.map((l, i) => (
          <Line
            key={`r${i}`}
            x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
            stroke={C.cyan}
            strokeWidth={0.7}
            opacity={0.10}
          />
        ))}
      </Svg>

      {/* ── Particules flottantes ── */}
      {PARTICLE_DEFS.map((p, i) => (
        <Animated.View
          key={i}
          style={{
            position: 'absolute',
            left: Math.round(p.xR * width) - p.size / 2,
            top:  Math.round(p.yR * H)     - p.size / 2,
            width:  p.size,
            height: p.size,
            backgroundColor: p.color,
            transform: [
              { rotate: `${p.rot}deg` },
              { translateY: particleAnims[i].y },
            ],
            opacity: particleAnims[i].op,
            shadowColor: p.color,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.95,
            shadowRadius: 5,
          }}
        />
      ))}

      {/* ── Rayons orbe (SVG animé) ── */}
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: raysOp }]} pointerEvents="none">
        <Svg width={width} height={H}>
          {rays.map((r, i) => (
            <Line
              key={i}
              x1={r.x1} y1={r.y1} x2={r.x2} y2={r.y2}
              stroke={i % 2 === 0 ? C.cyan : C.mag}
              strokeWidth={1.1}
              opacity={0.75}
            />
          ))}
        </Svg>
      </Animated.View>

      {/* ── Halo orbe (LinearGradient) ── */}
      <Animated.View
        style={{
          position: 'absolute',
          left:   cx      - orbGlowR,
          top:    cy      - orbGlowR,
          width:  orbGlowR * 2,
          height: orbGlowR * 2,
          borderRadius: orbGlowR,
          transform: [{ scale: orbScale }],
          opacity: orbOpacity,
        }}
      >
        <LinearGradient
          colors={[
            'rgba(91, 210, 255, 0.75)',
            'rgba(91, 210, 255, 0.28)',
            'rgba(91, 210, 255, 0.0)',
          ]}
          style={{ flex: 1, borderRadius: orbGlowR }}
        />
      </Animated.View>

      {/* ── Noyau orbe ── */}
      <Animated.View
        style={{
          position: 'absolute',
          left:   cx   - orbR,
          top:    cy   - orbR,
          width:  orbR * 2,
          height: orbR * 2,
          borderRadius: orbR,
          backgroundColor: '#B8EEFF',
          transform: [{ scale: orbScale }],
          opacity: orbOpacity,
          shadowColor: C.cyan,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 1,
          shadowRadius: orbR * 2.5,
          elevation: 10,
        }}
      />

      {/* ── Éclairs (SVG animé) ── */}
      <Animated.View
        style={[StyleSheet.absoluteFill, { opacity: lightningOp }]}
        pointerEvents="none"
      >
        <Svg width={width} height={H}>
          {lightningPaths.map((d, i) => (
            <Path
              key={i}
              d={d}
              stroke="rgba(255, 255, 255, 0.95)"
              strokeWidth={i < 2 ? 1.8 : 1.2}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
        </Svg>
      </Animated.View>

      {/* ── Flash collision ── */}
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: 'rgba(255, 255, 255, 0.08)',
            opacity: collisionOp,
          },
        ]}
        pointerEvents="none"
      />

      {/* ── X (gauche) — ombre 3D + face ── */}
      <Animated.View
        style={{
          position: 'absolute',
          left: xPosLeft,
          top:  H * 0.04,
          transform: [{ translateX: xTranslate }, { scale: xScale }],
        }}
      >
        {/* Ombre 3D (décalée) */}
        <Text
          style={[
            styles.xText,
            {
              fontSize: xFontSize,
              color: C.cyanDp,
              textShadowColor: 'transparent',
              position: 'absolute',
              left: 5,
              top:  6,
            },
          ]}
        >
          X
        </Text>
        {/* Face lumineuse */}
        <Text
          style={[
            styles.xText,
            {
              fontSize: xFontSize,
              color: C.cyan,
              textShadowColor: C.cyan,
              textShadowRadius: 22,
            },
          ]}
        >
          X
        </Text>
      </Animated.View>

      {/* ── O (droite) — ombre 3D + anneau ── */}
      <Animated.View
        style={{
          position: 'absolute',
          left: oPosLeft,
          top:  H * 0.06,
          transform: [{ translateX: oTranslate }, { scale: oScale }],
        }}
      >
        {/* Ombre 3D */}
        <View
          style={[
            styles.oRing,
            {
              width:        oSize,
              height:       oSize,
              borderRadius: oSize / 2,
              borderWidth:  oBorderW,
              borderColor:  C.magDp,
              position:     'absolute',
              left:  5,
              top:   6,
            },
          ]}
        />
        {/* Anneau lumineux */}
        <View
          style={[
            styles.oRing,
            {
              width:        oSize,
              height:       oSize,
              borderRadius: oSize / 2,
              borderWidth:  oBorderW,
              borderColor:  C.mag,
              shadowColor:  C.mag,
            },
          ]}
        />
      </Animated.View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    width: '100%',
    overflow: 'hidden',
    position: 'relative',
  },
  xText: {
    fontWeight: '900',
    letterSpacing: -4,
    textShadowOffset: { width: 0, height: 0 },
    transform: [{ rotate: '-4deg' }],
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  oRing: {
    backgroundColor: 'transparent',
    shadowOffset:  { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius:  18,
    elevation:     10,
  },
});

export default CyberBattleAnimation;
