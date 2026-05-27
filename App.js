import 'react-native-gesture-handler';
import i18n from './src/i18n/index';
import React from 'react';
import * as Linking from 'expo-linking';
import { NavigationContainer } from '@react-navigation/native';
import { Alert, DevSettings, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useKeepAwake } from 'expo-keep-awake';
import { Provider, useSelector } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { store, persistor } from './src/redux/store';
import { StatusBar } from 'expo-status-bar';
import AppNavigator from './src/navigation/AppNavigator';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './src/utils/queryClient';
import { StripeProviderWrapper } from './src/components/StripeProviderWrapper';
import { CoinsProvider } from './src/context/CoinsContext';
import * as SplashScreen from 'expo-splash-screen';
import AppAlertHost from './src/components/AppAlertHost';
import { appAlert } from './src/services/appAlert';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync().catch(() => {
  /* reloading the app might trigger some race conditions, ignore them */
});

const linking = {
  prefixes: [Linking.createURL('/', { scheme: 'deadpions' }), 'deadpions://'],
  config: {
    screens: {
      ResetPassword: 'reset-password/:devToken',
      SalleAttenteLive: 'live/:roomId',
      InviteJoin: 'invite/:code',
    },
  },
};

function LanguageSync() {
  const language = useSelector((state) => state.settings?.language);

  React.useEffect(() => {
    if (language && i18n.language !== language) {
      i18n.changeLanguage(language);
    }
  }, [language]);

  return null;
}

class RootErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error) {
    try {
      console.error('[RootErrorBoundary]', error);
    } catch {}
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>Une erreur est survenue</Text>
        <Text style={styles.errorBody} numberOfLines={6}>
          {String(this.state.error?.message || this.state.error || '')}
        </Text>
        <TouchableOpacity
          style={styles.errorButton}
          onPress={() => {
            try {
              DevSettings.reload();
            } catch {}
          }}
        >
          <Text style={styles.errorButtonText}>Recharger</Text>
        </TouchableOpacity>
      </View>
    );
  }
}

export default function App() {
  useKeepAwake();

  React.useEffect(() => {
    Alert.alert = appAlert;
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StripeProviderWrapper
        publishableKey={process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY}
        merchantIdentifier="merchant.com.deadpions"
      >
        <Provider store={store}>
          <PersistGate loading={null} persistor={persistor}>
            <QueryClientProvider client={queryClient}>
              <CoinsProvider>
                <SafeAreaProvider>
                  <NavigationContainer linking={linking} fallback={<React.Fragment />}>
                    <LanguageSync />
                    <AppAlertHost />
                    <RootErrorBoundary>
                      <AppNavigator />
                    </RootErrorBoundary>
                    <StatusBar style="light" />
                  </NavigationContainer>
                </SafeAreaProvider>
              </CoinsProvider>
            </QueryClientProvider>
          </PersistGate>
        </Provider>
      </StripeProviderWrapper>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#041c55'
  },
  errorTitle: {
    color: '#f1c40f',
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 12,
    textAlign: 'center'
  },
  errorBody: {
    color: '#fff',
    fontSize: 14,
    opacity: 0.9,
    textAlign: 'center',
    marginBottom: 16
  },
  errorButton: {
    backgroundColor: '#f1c40f',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10
  },
  errorButtonText: {
    color: '#041c55',
    fontWeight: '800'
  }
});
