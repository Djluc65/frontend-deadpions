import React from 'react';
import { View, ActivityIndicator, StyleSheet, Modal, Text } from 'react-native';
import { useSelector } from 'react-redux';

import { getResponsiveSize } from '../../utils/responsive';

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
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(4, 28, 85, 0.85)', // Bleu nuit DeadPions avec transparence
    zIndex: 9999,
  },
  contentContainer: {
    padding: getResponsiveSize(20),
    borderRadius: getResponsiveSize(10),
    alignItems: 'center',
    justifyContent: 'center',
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
