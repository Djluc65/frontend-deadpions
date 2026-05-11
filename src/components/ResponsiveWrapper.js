import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { useResponsive } from '../hooks/useResponsive';

/**
 * Wrapper component to handle responsive layout.
 * On desktop, it centers the content with a max-width of 480px.
 * On mobile/tablet, it renders normally.
 */
const ResponsiveWrapper = ({ children, style }) => {
  const { isDesktop } = useResponsive();

  if (Platform.OS === 'web' && isDesktop) {
    return (
      <View style={styles.desktopContainer}>
        <View style={[styles.contentWrapper, style]}>
          {children}
        </View>
      </View>
    );
  }

  return <View style={[{ flex: 1 }, style]}>{children}</View>;
};

const styles = StyleSheet.create({
  desktopContainer: {
    flex: 1,
    backgroundColor: '#000', // Optional: background color for the space outside the wrapper
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentWrapper: {
    width: '100%',
    maxWidth: 480,
    height: '100%',
    backgroundColor: '#fff', // Ensure content has a background
    // Add a shadow or border to distinguish the container on desktop
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
});

export default ResponsiveWrapper;
