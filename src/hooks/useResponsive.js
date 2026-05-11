import { useWindowDimensions } from 'react-native';

/**
 * Hook to get responsive layout information based on window dimensions.
 * Breakpoints:
 * - Mobile: < 600px
 * - Tablet: 600px - 1024px
 * - Desktop: > 1024px
 */
export const useResponsive = () => {
  const { width, height } = useWindowDimensions();

  const isMobile = width < 600;
  const isTablet = width >= 600 && width <= 1024;
  const isDesktop = width > 1024;

  return {
    isMobile,
    isTablet,
    isDesktop,
    width,
    height,
  };
};
