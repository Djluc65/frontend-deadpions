import React from 'react';
import Svg, { Circle, Path, G, Defs, RadialGradient, Stop, LinearGradient, Ellipse } from 'react-native-svg';

// ─── Color Palettes ────────────────────────────────────────────────────────────
export const PION_COLORS = {
  red: {
    primary: '#CC0000',
    light: '#FF3333',
    dark: '#880000',
    glow: '#FF000066',
    rim: '#3D0000',
    text: '#FFD0D0',
  },
  blue: {
    primary: '#0044CC',
    light: '#0099FF',
    dark: '#002288',
    glow: '#0066FF66',
    rim: '#001144',
    text: '#D0E8FF',
  },
  bg: '#0A0A0F',
  card: '#13131A',
  gold: '#FFD700',
  chrome: '#C0C0C0',
  surface: '#1A1A24',
};

// ─── SVG Pion Faces ────────────────────────────────────────────────────────────

function SkullFace({ color }) {
  const c = PION_COLORS[color];
  return (
    <G>
      {/* Skull shape */}
      <Path d="M24 10 C12 10, 6 18, 6 26 C6 32, 8 36, 12 38 L12 42 L20 42 L20 38 L28 38 L28 42 L36 42 L36 38 C40 36, 42 32, 42 26 C42 18, 36 10, 24 10Z" fill={c.light} />
      {/* Eyes */}
      <Ellipse cx="17" cy="26" rx="5" ry="6" fill={c.rim} />
      <Ellipse cx="31" cy="26" rx="5" ry="6" fill={c.rim} />
      <Ellipse cx="17" cy="26" rx="2.5" ry="3" fill="#FF4400" />
      <Ellipse cx="31" cy="26" rx="2.5" ry="3" fill="#FF4400" />
      {/* Nose */}
      <Path d="M21 33 L24 36 L27 33 Z" fill={c.rim} />
      {/* Teeth */}
      <Path d="M16 38 L16 42 L18 42 L18 38Z" fill="white" />
      <Path d="M20 38 L20 42 L22 42 L22 38Z" fill="white" />
      <Path d="M26 38 L26 42 L28 42 L28 38Z" fill="white" />
      <Path d="M30 38 L30 42 L32 42 L32 38Z" fill="white" />
    </G>
  );
}

function BullFace({ color }) {
  const c = PION_COLORS[color];
  return (
    <G>
      {/* Horns */}
      <Path d="M10 14 C6 8, 4 4, 8 2 C10 4, 12 8, 14 14Z" fill={c.dark} />
      <Path d="M38 14 C42 8, 44 4, 40 2 C38 4, 36 8, 34 14Z" fill={c.dark} />
      {/* Head */}
      <Ellipse cx="24" cy="28" rx="16" ry="18" fill={c.light} />
      {/* Eyes */}
      <Circle cx="17" cy="24" r="4" fill={c.rim} />
      <Circle cx="31" cy="24" r="4" fill={c.rim} />
      <Circle cx="17" cy="24" r="2" fill="#FF2200" />
      <Circle cx="31" cy="24" r="2" fill="#FF2200" />
      {/* Muzzle */}
      <Ellipse cx="24" cy="35" rx="9" ry="7" fill={c.dark} />
      {/* Nostrils */}
      <Ellipse cx="20" cy="35" rx="2.5" ry="3" fill={c.rim} />
      <Ellipse cx="28" cy="35" rx="2.5" ry="3" fill={c.rim} />
      {/* Ring */}
      <Path d="M21 40 C21 43, 27 43, 27 40" stroke={c.chrome} strokeWidth="2" fill="none" />
    </G>
  );
}

function LionFace({ color }) {
  const c = PION_COLORS[color];
  return (
    <G>
      {/* Mane petals */}
      {[0,30,60,90,120,150,180,210,240,270,300,330].map((angle, i) => (
        <Path
          key={i}
          d={`M24 24 L${24 + 18 * Math.cos((angle * Math.PI) / 180)} ${24 + 18 * Math.sin((angle * Math.PI) / 180)} L${24 + 18 * Math.cos(((angle + 15) * Math.PI) / 180)} ${24 + 18 * Math.sin(((angle + 15) * Math.PI) / 180)} Z`}
          fill={i % 2 === 0 ? c.primary : c.dark}
        />
      ))}
      {/* Face */}
      <Circle cx="24" cy="24" r="13" fill={c.light} />
      {/* Eyes */}
      <Ellipse cx="19" cy="21" rx="3" ry="3.5" fill={c.rim} />
      <Ellipse cx="29" cy="21" rx="3" ry="3.5" fill={c.rim} />
      <Ellipse cx="19" cy="21" rx="1.5" ry="2" fill="#FFAA00" />
      <Ellipse cx="29" cy="21" rx="1.5" ry="2" fill="#FFAA00" />
      {/* Nose */}
      <Path d="M21 27 L24 25 L27 27 L24 30Z" fill={c.rim} />
      {/* Whiskers */}
      <Path d="M8 27 L18 28" stroke={c.chrome} strokeWidth="1" />
      <Path d="M8 29 L18 30" stroke={c.chrome} strokeWidth="1" />
      <Path d="M40 27 L30 28" stroke={c.chrome} strokeWidth="1" />
      <Path d="M40 29 L30 30" stroke={c.chrome} strokeWidth="1" />
      {/* Mouth */}
      <Path d="M19 31 C20 34, 22 35, 24 34 C26 35, 28 34, 29 31" stroke={c.rim} strokeWidth="1.5" fill="none" />
    </G>
  );
}

function DragonFace({ color }) {
  const c = PION_COLORS[color];
  return (
    <G>
      {/* Horns */}
      <Path d="M16 8 C14 2, 18 0, 20 4 L18 12Z" fill={c.dark} />
      <Path d="M32 8 C34 2, 30 0, 28 4 L30 12Z" fill={c.dark} />
      {/* Scales background */}
      <Ellipse cx="24" cy="27" rx="18" ry="20" fill={c.primary} />
      {/* Scale pattern */}
      {[0,1,2,3,4,5,6,7,8,9].map(i => (
        <Path
          key={i}
          d={`M${8 + (i % 4) * 9} ${12 + Math.floor(i / 4) * 8} C${8 + (i % 4) * 9} ${8 + Math.floor(i / 4) * 8}, ${12 + (i % 4) * 9} ${8 + Math.floor(i / 4) * 8}, ${12 + (i % 4) * 9} ${12 + Math.floor(i / 4) * 8}Z`}
          fill={c.dark}
          opacity="0.5"
        />
      ))}
      {/* Eyes */}
      <Ellipse cx="17" cy="23" rx="5" ry="4" fill="#110000" />
      <Ellipse cx="31" cy="23" rx="5" ry="4" fill="#110000" />
      <Ellipse cx="17" cy="23" rx="2" ry="3" fill="#FF6600" />
      <Ellipse cx="31" cy="23" rx="2" ry="3" fill="#FF6600" />
      {/* Snout */}
      <Ellipse cx="24" cy="34" rx="8" ry="6" fill={c.dark} />
      {/* Nostrils */}
      <Ellipse cx="21" cy="33" rx="2" ry="2.5" fill="#FF2200" />
      <Ellipse cx="27" cy="33" rx="2" ry="2.5" fill="#FF2200" />
      {/* Teeth */}
      <Path d="M18 38 L20 43 L22 38Z" fill="white" />
      <Path d="M26 38 L28 43 L30 38Z" fill="white" />
      {/* Fire */}
      <Path d="M20 43 C22 47, 24 48, 26 43 C23 46, 25 44, 22 43Z" fill="#FF4400" opacity="0.8" />
    </G>
  );
}

function WolfFace({ color }) {
  const c = PION_COLORS[color];
  return (
    <G>
      {/* Ears */}
      <Path d="M10 14 L14 4 L20 14Z" fill={c.primary} />
      <Path d="M38 14 L34 4 L28 14Z" fill={c.primary} />
      <Path d="M11 13 L14 6 L19 13Z" fill={c.dark} />
      <Path d="M37 13 L34 6 L29 13Z" fill={c.dark} />
      {/* Head */}
      <Ellipse cx="24" cy="26" rx="16" ry="16" fill={c.light} />
      {/* Eyes */}
      <Ellipse cx="17" cy="22" rx="4" ry="4.5" fill="#111" />
      <Ellipse cx="31" cy="22" rx="4" ry="4.5" fill="#111" />
      <Ellipse cx="17" cy="22" rx="2" ry="2.5" fill="#FFFF00" />
      <Ellipse cx="31" cy="22" rx="2" ry="2.5" fill="#FFFF00" />
      <Circle cx="17" cy="22" r="1" fill="#111" />
      <Circle cx="31" cy="22" r="1" fill="#111" />
      {/* Snout */}
      <Ellipse cx="24" cy="33" rx="9" ry="7" fill={c.primary} />
      <Ellipse cx="24" cy="29" rx="5" ry="3" fill="#DDD" />
      {/* Nose */}
      <Ellipse cx="24" cy="30" rx="3" ry="2" fill="#111" />
      {/* Snarl */}
      <Path d="M17 37 L20 40 L22 37Z" fill="white" />
      <Path d="M26 37 L28 40 L31 37Z" fill="white" />
      <Path d="M16 36 Q24 40 32 36" stroke={c.rim} strokeWidth="1.5" fill="none" />
    </G>
  );
}

function SerpentFace({ color }) {
  const c = PION_COLORS[color];
  return (
    <G>
      {/* Hood */}
      <Ellipse cx="24" cy="20" rx="19" ry="16" fill={c.dark} />
      {/* Hood pattern */}
      <Ellipse cx="24" cy="21" rx="14" ry="12" fill={c.primary} />
      {/* Monocle patterns */}
      <Ellipse cx="17" cy="19" rx="6" ry="8" fill={c.dark} opacity="0.6" />
      <Ellipse cx="31" cy="19" rx="6" ry="8" fill={c.dark} opacity="0.6" />
      {/* Face */}
      <Ellipse cx="24" cy="30" rx="10" ry="12" fill={c.light} />
      {/* Eyes */}
      <Ellipse cx="19" cy="26" rx="4" ry="5" fill="#000" />
      <Ellipse cx="29" cy="26" rx="4" ry="5" fill="#000" />
      <Path d="M18 26 L19 22 L20 26Z" fill="#FF4400" />
      <Path d="M28 26 L29 22 L30 26Z" fill="#FF4400" />
      {/* Scales */}
      <Path d="M20 32 C22 30, 26 30, 28 32 C26 34, 22 34, 20 32Z" fill={c.dark} opacity="0.5" />
      <Path d="M20 36 C22 34, 26 34, 28 36 C26 38, 22 38, 20 36Z" fill={c.dark} opacity="0.5" />
      {/* Forked tongue */}
      <Path d="M22 40 L24 46 L23 48" stroke="#FF0000" strokeWidth="1.5" fill="none" />
      <Path d="M26 40 L24 46 L25 48" stroke="#FF0000" strokeWidth="1.5" fill="none" />
    </G>
  );
}

export default function PionSVG({
  type,
  color,
  size = 80,
}) {
  const c = PION_COLORS[color] || PION_COLORS.red;
  const safeType = type || 'skull';
  const gradId = `grad_${safeType}_${color}`;
  const glowId = `glow_${safeType}_${color}`;
  const rimId = `rim_${safeType}_${color}`;

  const FaceComponent = {
    skull: SkullFace,
    bull: BullFace,
    lion: LionFace,
    dragon: DragonFace,
    wolf: WolfFace,
    serpent: SerpentFace,
  }[safeType] || SkullFace;

  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Defs>
        <RadialGradient id={glowId} cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor={c.light} stopOpacity="0.4" />
          <Stop offset="100%" stopColor={c.primary} stopOpacity="0" />
        </RadialGradient>
        <RadialGradient id={gradId} cx="40%" cy="35%" r="65%">
          <Stop offset="0%" stopColor={c.light} />
          <Stop offset="60%" stopColor={c.primary} />
          <Stop offset="100%" stopColor={c.dark} />
        </RadialGradient>
        <LinearGradient id={rimId} x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#444" />
          <Stop offset="40%" stopColor="#888" />
          <Stop offset="100%" stopColor="#222" />
        </LinearGradient>
      </Defs>

      {/* Outer glow */}
      <Circle cx="24" cy="24" r="24" fill={`url(#${glowId})`} />
      {/* Chrome rim */}
      <Circle cx="24" cy="24" r="22" fill={`url(#${rimId})`} />
      {/* Inner shadow */}
      <Circle cx="24" cy="25" r="19" fill={c.rim} opacity="0.5" />
      {/* Main coin */}
      <Circle cx="24" cy="24" r="19" fill={`url(#${gradId})`} />
      {/* Shine */}
      <Ellipse cx="18" cy="16" rx="6" ry="4" fill="white" opacity="0.2" transform="rotate(-30, 18, 16)" />

      {/* Face */}
      <FaceComponent color={color} />

      {/* Rim engravings - lightning bolts */}
      <Path d="M4 20 L6 17 L5 20 L7 17" stroke={c.light} strokeWidth="0.5" opacity="0.7" />
      <Path d="M41 28 L43 25 L42 28 L44 25" stroke={c.light} strokeWidth="0.5" opacity="0.7" />
    </Svg>
  );
}
