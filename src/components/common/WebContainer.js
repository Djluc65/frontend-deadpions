import React from 'react';
import { View, Platform, useWindowDimensions } from 'react-native';
import { DESKTOP_BREAKPOINT, WEB_MAX_CONTENT_WIDTH } from '../../utils/responsive';

/**
 * WebContainer — centre le contenu avec un max-width sur desktop web.
 * Sur mobile / tablette / natif : composant transparent (pas de style ajouté).
 *
 * Props :
 *   maxWidth  — largeur max du contenu (défaut : WEB_MAX_CONTENT_WIDTH = 960)
 *   style     — style appliqué au View extérieur (optionnel)
 *   innerStyle— style appliqué au View intérieur (optionnel)
 */
const WebContainer = ({ children, style, innerStyle, maxWidth = WEB_MAX_CONTENT_WIDTH }) => {
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= DESKTOP_BREAKPOINT;

  if (!isDesktop) return <>{children}</>;

  return (
    <View style={[{ flex: 1, alignItems: 'center', width: '100%' }, style]}>
      <View style={[{ flex: 1, width: '100%', maxWidth }, innerStyle]}>
        {children}
      </View>
    </View>
  );
};

export default WebContainer;
