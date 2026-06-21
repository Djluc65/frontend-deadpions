// DeadPions — tournamentLayout.js — responsive tournoi

import { useWindowDimensions } from 'react-native';

export const TABLET_BREAKPOINT = 768;
export const DESKTOP_BREAKPOINT = 1024;

export const CONTENT_MAX_WIDTH = 680;
export const CARD_MAX_WIDTH = 640;
export const MODAL_MAX_WIDTH = 520;

export function useTournamentLayout() {
  const { width, height } = useWindowDimensions();
  const isTablet = width >= TABLET_BREAKPOINT;
  const isDesktop = width >= DESKTOP_BREAKPOINT;

  const contentWidth = isTablet
    ? Math.min(width * 0.78, CONTENT_MAX_WIDTH)
    : width;

  const hPadding = isTablet ? 0 : 16;
  const fontScale = isTablet ? 1.08 : 1;
  const pillSize = isTablet ? 52 : 44;

  return {
    width,
    height,
    isTablet,
    isDesktop,
    contentWidth,
    hPadding,
    fontScale,
    pillSize,
    centeredContainer: {
      width: isTablet ? contentWidth : '100%',
      alignSelf: isTablet ? 'center' : 'stretch',
    },
  };
}
