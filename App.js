import 'react-native-gesture-handler';
import React from 'react';
import * as Linking from 'expo-linking';
import { NavigationContainer } from '@react-navigation/native';
import { Alert, Platform } from 'react-native';
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
import * as SplashScreen from 'expo-splash-screen';
import AppAlertHost from './src/components/AppAlertHost';
import { appAlert } from './src/services/appAlert';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync().catch(() => {
  /* reloading the app might trigger some race conditions, ignore them */
});

const linking = {
  prefixes: [Linking.createURL('/'), 'deadpions://'],
  config: {
    screens: {
      ResetPassword: 'reset-password/:devToken',
      SalleAttenteLive: 'live/:roomId',
      InviteJoin: 'invite/:code',
    },
  },
};

export default function App() {
  const [attChecked, setAttChecked] = React.useState(Platform.OS !== 'ios');

  React.useEffect(() => {
    Alert.alert = appAlert;
    
    // Request App Tracking Transparency permission on app launch (iOS only)
    const requestTrackingPermission = async () => {
      if (Platform.OS !== 'ios') {
        setAttChecked(true);
        return;
      }
      try {
        const mod = await import('expo-tracking-transparency');
        const { getTrackingPermissionsAsync, requestTrackingPermissionsAsync, TrackingStatus } = mod;
        const res = await getTrackingPermissionsAsync();
        let status = res?.status ?? res;
        const isNotDetermined =
          status === 'not-determined' ||
          status === TrackingStatus?.NotDetermined ||
          status === 0;
        if (isNotDetermined) {
          const req = await requestTrackingPermissionsAsync();
          status = req?.status ?? req;
        }
      } catch (e) {
        console.warn('ATT request failed:', e);
      } finally {
        setAttChecked(true);
      }
    };
    
    // Request ATT permission immediately on app launch
    requestTrackingPermission();
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
                {attChecked ? (
                  <NavigationContainer linking={linking} fallback={<React.Fragment />}>
                    <AppAlertHost />
                    <AppNavigator />
                    <StatusBar style="light" />
                  </NavigationContainer>
                ) : (
                  <LoadingSpinner />
                )}
              </CoinsProvider>
            </QueryClientProvider>
          </PersistGate>
        </Provider>
      </StripeProviderWrapper>
    </GestureHandlerRootView>
  );
}
