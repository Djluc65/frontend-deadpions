import React from 'react';
import { View, ActivityIndicator, StyleSheet, Modal, Text } from 'react-native';
import { useSelector } from 'react-redux';

import { getResponsiveSize } from '../../utils/responsive';
import { modalTheme } from '../../utils/modalTheme';

/**
 * Composant de chargement global connecté au Redux Store.
 * Affiche un overlay semi-transparent avec un spinner et un message optionnel.
 * Style cohérent avec l'univers DeadPions (Fond sombre bleuté, Spinner Or).
 */
const LoadingSpinner = () => {
  const { isLoading, loadingMessage } = useSelector(state => state.ui);

  return (
    <Modal
      transparent={true}
      animationType="fade"
      visible={isLoading}
      onRequestClose={() => {}} // Bloque le bouton retour sur Android
      statusBarTranslucent={true} // Couvre aussi la barre d'état
    >
      <View style={styles.container}>
        <View style={styles.contentContainer}>
          <ActivityIndicator size="large" color="#f1c40f" />
          {loadingMessage && (
            <Text style={styles.text}>{loadingMessage}</Text>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    ...modalTheme.overlay,
    zIndex: 9999,
  },
  contentContainer: {
    backgroundColor: modalTheme.card.backgroundColor,
    borderRadius: modalTheme.card.borderRadius,
    padding: modalTheme.card.padding,
    alignItems: modalTheme.card.alignItems,
    justifyContent: 'center',
    shadowColor: modalTheme.card.shadowColor,
    shadowOffset: modalTheme.card.shadowOffset,
    shadowOpacity: modalTheme.card.shadowOpacity,
    shadowRadius: modalTheme.card.shadowRadius,
    elevation: modalTheme.card.elevation,
    borderWidth: modalTheme.card.borderWidth,
    borderColor: modalTheme.card.borderColor
  },
  text: {
    marginTop: getResponsiveSize(15),
    color: '#ffffff',
    fontSize: getResponsiveSize(16),
    fontWeight: '600',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: getResponsiveSize(-1), height: getResponsiveSize(1) },
    textShadowRadius: getResponsiveSize(10)
  }
});

export default LoadingSpinner;
