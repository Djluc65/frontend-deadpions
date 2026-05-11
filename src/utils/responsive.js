import { Dimensions, Platform, PixelRatio, useWindowDimensions } from 'react-native';

const BASE_WIDTH = 375; // iPhone 6/7/8 logical width baseline
const TABLET_MIN_DP = 768;
const TABLET_MAX_CONTENT_WIDTH = 820; // cap layout width on tablets to avoid huge scaling

// ─── Web / Desktop constants ───────────────────────────────────────────────────
export const isWeb = Platform.OS === 'web';
export const DESKTOP_BREAKPOINT = 1024; // px — layout desktop activates ici
export const WEB_MAX_CONTENT_WIDTH = 960; // largeur max du contenu sur desktop web

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const _win = Dimensions.get('window');
const SCREEN_WIDTH = (_win && typeof _win.width === 'number') ? _win.width : 375;
const SCREEN_HEIGHT = (_win && typeof _win.height === 'number') ? _win.height : 667;

// Detect tablets more reliably (portrait/landscape) using the smallest dimension.
const isTablet = Math.min(SCREEN_WIDTH, SCREEN_HEIGHT) >= TABLET_MIN_DP;

// Use a capped "content width" on tablets so UI doesn't scale linearly with iPad width.
const CONTENT_WIDTH = isTablet ? Math.min(SCREEN_WIDTH, TABLET_MAX_CONTENT_WIDTH) : SCREEN_WIDTH;

// Keep scaling reasonable across devices.
const scale = clamp(CONTENT_WIDTH / BASE_WIDTH, 0.9, isTablet ? 1.25 : 1.6);

const normalize = (size) => {
  const newSize = size * scale;
  const rounded = PixelRatio.roundToNearestPixel(newSize);
  if (Platform.OS === 'android') return Math.round(rounded) - 2;
  return Math.round(rounded);
};

// Responsive width based on content width (capped on tablets).
const getResponsiveWidth = (percentage, maxWidth = null) => {
  const value = (percentage * CONTENT_WIDTH) / 100;
  if (typeof maxWidth === 'number' && value > maxWidth) return maxWidth;
  return value;
};

// Responsive size for fonts/icons (normalized with caps above).
const getResponsiveSize = (size) => normalize(size);

// ─── Hook réactif (se met à jour au redimensionnement — essentiel sur web) ─────
// Retourne { width, height, isTablet, isDesktop, isWeb, contentWidth, rs }
// rs(size) : version dynamique de getResponsiveSize liée à la largeur courante.
export function useResponsive() {
  const { width, height } = useWindowDimensions();
  const isTabletDynamic = width >= TABLET_MIN_DP;
  const isDesktop = Platform.OS === 'web' && width >= DESKTOP_BREAKPOINT;
  const contentWidth = isDesktop
    ? Math.min(width, WEB_MAX_CONTENT_WIDTH)
    : isTabletDynamic
    ? Math.min(width, TABLET_MAX_CONTENT_WIDTH)
    : width;
  const dynamicScale = clamp(contentWidth / BASE_WIDTH, 0.9, isTabletDynamic ? 1.25 : 1.6);
  const rs = (size) => Math.round(size * dynamicScale);
  return { width, height, isTablet: isTabletDynamic, isDesktop, isWeb, contentWidth, rs };
}

export {
  SCREEN_WIDTH,
  SCREEN_HEIGHT,
  CONTENT_WIDTH,
  isTablet,
  getResponsiveWidth,
  getResponsiveSize,
  normalize,
};
