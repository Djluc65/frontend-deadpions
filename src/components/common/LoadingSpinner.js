import React from 'react';
import { View, ActivityIndicator, StyleSheet, Modal, Text } from 'react-native';
import { useSelector } from 'react-redux';

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
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    marginTop: 15,
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10
  }
});

export default LoadingSpinner;
