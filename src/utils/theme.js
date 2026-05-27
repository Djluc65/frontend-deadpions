// DeadPions design token system — dark theme (default)
// Translate from tokens.jsx (web) → React Native StyleSheet compatible values

const clamp01 = (n) => Math.max(0, Math.min(1, n));

const hexToRgb = (hex) => {
  if (typeof hex !== 'string') return null;
  const raw = hex.replace('#', '').trim();
  if (raw.length === 3) {
    const r = parseInt(raw[0] + raw[0], 16);
    const g = parseInt(raw[1] + raw[1], 16);
    const b = parseInt(raw[2] + raw[2], 16);
    return { r, g, b };
  }
  if (raw.length === 6) {
    const r = parseInt(raw.slice(0, 2), 16);
    const g = parseInt(raw.slice(2, 4), 16);
    const b = parseInt(raw.slice(4, 6), 16);
    return { r, g, b };
  }
  return null;
};

export const alpha = (color, opacity) => {
  const a = clamp01(opacity);
  if (typeof color !== 'string') return `rgba(0,0,0,${a})`;
  if (color.startsWith('rgba(') || color.startsWith('rgb(')) return color;
  const rgb = hexToRgb(color);
  if (!rgb) return `rgba(0,0,0,${a})`;
  return `rgba(${rgb.r},${rgb.g},${rgb.b},${a})`;
};

const GOLD = '#F4B41A';
const CYAN = '#5BD2FF';
const MAGENTA = '#C875FF';

export const T = {
  // Surfaces
  bg0: '#05090F',
  bg1: '#0B1322',
  bg2: '#121E33',
  bg3: '#1A2A47',

  // Borders
  border: alpha(GOLD, 0.18),
  borderSoft: 'rgba(236,230,214,0.08)',
  borderMid: '#2A3550',

  // Extended accents
  goldDim: '#8A6A10',

  // Text
  text: '#ECE6D6',
  textDim: '#A8B4C9',
  textMuted: '#6A7791',

  // Accents
  gold: GOLD,
  goldDeep: '#B98410',
  goldSoft: alpha(GOLD, 0.12),
  goldSoft2: alpha(GOLD, 0.06),
  goldBorder: alpha(GOLD, 0.18),
  goldBorderStrong: alpha(GOLD, 0.25),
  goldGlow: alpha(GOLD, 0.35),
  cyan: CYAN,
  cyanSoft: alpha(CYAN, 0.12),
  cyanSoft2: alpha(CYAN, 0.06),
  cyanBorder: alpha(CYAN, 0.18),
  cyanBorderStrong: alpha(CYAN, 0.35),
  cyanGlow: alpha(CYAN, 0.45),
  magenta: MAGENTA,
  magentaSoft: alpha(MAGENTA, 0.12),
  magentaSoft2: alpha(MAGENTA, 0.06),
  magentaBorder: alpha(MAGENTA, 0.18),
  magentaBorderStrong: alpha(MAGENTA, 0.35),
  magentaGlow: alpha(MAGENTA, 0.45),
  red: '#E63946',
  green: '#2EC27E',
  blue: '#4DA3FF',
  purple: '#A78BFA',
  danger: '#E63946',

  // Overlays
  overlay: 'rgba(5,9,15,0.78)',
  overlayLight: 'rgba(5,9,15,0.55)',

  // Board
  boardLight: '#1A2A47',
  boardDark: '#0F1A2E',

  // Pawn colors
  pawnGold: '#F4B41A',
  pawnRed: '#E63946',
  pawnGreen: '#2EC27E',
  pawnBlue: '#4DA3FF',

  // Radii
  radiusSm: 8,
  radiusMd: 12,
  radiusLg: 16,
  radiusXl: 20,
  radiusPill: 999,

  // Shadows (RN format)
  shadowCard: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.32,
    shadowRadius: 12,
    elevation: 8,
  },
  shadowGold: {
    shadowColor: GOLD,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  shadowBtn: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.28,
    shadowRadius: 6,
    elevation: 5,
  },
};

// Typography helpers (apply to Text styles)
export const TY = {
  // Barlow Condensed equivalent — use fontWeight '800' + letterSpacing
  display: {
    fontWeight: '900',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: T.text,
  },
  heading: {
    fontWeight: '800',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    color: T.text,
  },
  label: {
    fontWeight: '700',
    letterSpacing: 0.2,
    textTransform: 'uppercase',
    color: T.textDim,
  },
  body: {
    fontWeight: '400',
    color: T.text,
  },
  caption: {
    fontWeight: '600',
    fontSize: 11,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: T.gold,
  },
};
