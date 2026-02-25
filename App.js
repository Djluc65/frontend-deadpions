import React from 'react';
import * as Linking from 'expo-linking';
import { NavigationContainer } from '@react-navigation/native';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { store, persistor } from './src/redux/store';
import { StatusBar } from 'expo-status-bar';
import AppNavigator from './src/navigation/AppNavigator';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './src/utils/queryClient';
import { StripeProviderWrapper } from './src/components/StripeProviderWrapper';
import LoadingSpinner from './src/components/common/LoadingSpinner';
import { CoinsProvider } from './src/context/CoinsContext';

const linking = {
  prefixes: [Linking.createURL('/'), 'deadpions://'],
  config: {
    screens: {
      ResetPassword: 'reset-password/:devToken',
      SalleAttenteLive: 'live/:roomId',
    },
  },
};

export default function App() {
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
                <NavigationContainer linking={linking} fallback={<React.Fragment />}>
                  <AppNavigator />
                  <StatusBar style="light" />
                </NavigationContainer>
              </CoinsProvider>
            </QueryClientProvider>
          </PersistGate>
        </Provider>
      </StripeProviderWrapper>
    </GestureHandlerRootView>
  );
}
