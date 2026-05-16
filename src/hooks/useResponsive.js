import { useWindowDimensions, Platform } from 'react-native';

export const useResponsive = () => {
  const { width, height } = useWindowDimensions();

  const isMobile = width < 768;
  const isTablet = width >= 768 && width < 1024;
  const isDesktop = Platform.OS === 'web' && width >= 1024;

  return {
    isMobile,
    isTablet,
    isDesktop,
    width,
    height,
  };
};
