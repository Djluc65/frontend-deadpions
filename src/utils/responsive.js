import { Dimensions, Platform, PixelRatio } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Detect if device is a tablet based on width
// Typically tablets have a width > 768px
const isTablet = SCREEN_WIDTH >= 768;

const scale = SCREEN_WIDTH / 375; // Standard iPhone 6/7/8 width as base

const normalize = (size) => {
  const newSize = size * scale;
  if (Platform.OS === 'ios') {
    return Math.round(PixelRatio.roundToNearestPixel(newSize));
  } else {
    return Math.round(PixelRatio.roundToNearestPixel(newSize)) - 2;
  }
};

// Function to get responsive width with a max cap for tablets
const getResponsiveWidth = (percentage, maxWidth = null) => {
  const value = (percentage * SCREEN_WIDTH) / 100;
  if (maxWidth && value > maxWidth) {
    return maxWidth;
  }
  return value;
};

// Function to get responsive size for fonts/icons with a max scale for tablets
// This prevents elements from becoming cartoonishly large on iPad
const getResponsiveSize = (size) => {
  if (isTablet) {
    return size * 1.5; // Scale up a bit for tablet, but not linearly with width
  }
  return normalize(size);
};

export {
  SCREEN_WIDTH,
  SCREEN_HEIGHT,
  isTablet,
  getResponsiveWidth,
  getResponsiveSize,
  normalize
};
