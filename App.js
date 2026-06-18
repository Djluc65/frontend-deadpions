import 'react-native-gesture-handler';
import i18n from './src/i18n/index';
import React, { useEffect, useRef } from 'react';
import * as Linking from 'expo-linking';
import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
import { Alert, DevSettings, StyleSheet, Text, TouchableOpacity, View, Platform } from 'react-native';
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
import { API_URL } from './src/config';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DEBUG_SERVER_URL = 'http://127.0.0.1:7777/event';
const DEBUG_SESSION_ID = 'ios-splash-stuck';

// #region debug-point A-E:startup-reporting
const reportDebugEvent = (hypothesisId, location, msg, data = {}) => {
  fetch(DEBUG_SERVER_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: DEBUG_SESSION_ID,
      runId: 'pre-fix',
      hypothesisId,
      location,
      msg: `[DEBUG] ${msg}`,
      data,
      ts: Date.now(),
    }),
  }).catch(() => {});
};
// #endregion

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync().catch(() => {
  /* reloading the app might trigger some race conditions, ignore them */
});
// #region debug-point B:prevent-auto-hide
reportDebugEvent('B', 'App.js:preventAutoHideAsync', 'preventAutoHideAsync called');
// #endregion

const linking = {
  prefixes: [Linking.createURL('/', { scheme: 'deadpions' }), 'deadpions://'],
  config: {
    screens: {
      ResetPassword: 'reset-password/:devToken',
      SalleAttenteLive: 'live/:roomId',
      InviteJoin: 'invite/:code',
      TournamentWaitingRoom: 'tournament/:tournamentId',
      TournamentBracket: 'tournament/:tournamentId/bracket',
      TournamentLobby: 'tournaments',
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
    // #region debug-point D:root-error-boundary
    reportDebugEvent('D', 'App.js:RootErrorBoundary.componentDidCatch', 'root error boundary caught an error', {
      message: String(error?.message || error || ''),
    });
    // #endregion
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

function AppContent() {
  const navigationRef = useNavigationContainerRef();
  const token = useSelector(state => state.auth.token);
  const user = useSelector(state => state.auth.user);
  const splashHiddenRef = useRef(false);

  useEffect(() => {
    // #region debug-point A:app-content-mounted
    reportDebugEvent('A', 'App.js:AppContent.useEffect', 'AppContent mounted', {
      hasToken: Boolean(token),
      hasUser: Boolean(user),
    });
    // #endregion
    Alert.alert = appAlert;
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      // #region debug-point C:splash-timeout-check
      reportDebugEvent('C', 'App.js:AppContent.splashTimeout', 'timeout reached before splash hidden state changed', {
        splashHidden: splashHiddenRef.current,
        navReady: navigationRef.isReady(),
      });
      // #endregion
    }, 3000);

    return () => clearTimeout(timer);
  }, [navigationRef]);

  useEffect(() => {
    if (user && navigationRef.isReady()) {
      const checkPendingInvite = async () => {
        const pendingCode = await AsyncStorage.getItem('pendingInviteCode');
        if (pendingCode) {
          await AsyncStorage.removeItem('pendingInviteCode');
          navigationRef.navigate('InviteJoin', { code: pendingCode });
        }
      };
      checkPendingInvite();
    }
  }, [user, navigationRef]);

  // Push notifications are disabled for now (native module not available)
  // useEffect(() => {
  //   let Notifications;
  //   try {
  //     Notifications = require('expo-notifications');
  //     Notifications.setNotificationHandler({
  //       handleNotification: async () => ({
  //         shouldShowAlert: true,
  //         shouldPlaySound: true,
  //         shouldSetBadge: false,
  //       }),
  //     });
  //   } catch (error) {
  //     console.warn('expo-notifications not available, skipping:', error);
  //     return;
  //   }

  //   const registerForPushNotificationsAsync = async () => {
  //     try {
  //       let expoPushToken;
  //       if (Platform.OS === 'android') {
  //         await Notifications.setNotificationChannelAsync('default', {
  //           name: 'default',
  //           importance: Notifications.AndroidImportance.MAX,
  //           vibrationPattern: [0, 250, 250, 250],
  //           lightColor: '#F4B41A',
  //         });
  //       }

  //       const { status: existingStatus } = await Notifications.getPermissionsAsync();
  //       let finalStatus = existingStatus;
  //       if (existingStatus !== 'granted') {
  //         const { status } = await Notifications.requestPermissionsAsync();
  //         finalStatus = status;
  //       }
  //       if (finalStatus !== 'granted') {
  //         return;
  //       }
  //       expoPushToken = (await Notifications.getExpoPushTokenAsync({
  //         projectId: 'your-project-id', // Replace with your actual Expo project ID
  //       })).data;

  //       if (token && expoPushToken) {
  //         try {
  //           await fetch(`${API_URL}/user/push-token`, {
  //             method: 'POST',
  //             headers: {
  //               'Content-Type': 'application/json',
  //               'Authorization': `Bearer ${token}`,
  //             },
  //             body: JSON.stringify({ expoPushToken }),
  //           });
  //         } catch (error) {
  //           console.error('Error saving push token:', error);
  //         }
  //       }
  //     } catch (error) {
  //       console.warn('Push notification registration failed:', error);
  //     }
  //   };

  //   registerForPushNotificationsAsync();

  //   try {
  //     notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
  //       console.log('Notification received:', notification);
  //     });

  //     responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
  //       const { screen, tournamentId } = response.notification.request.content.data;
  //       if (navigationRef.isReady()) {
  //         if (screen === 'TournamentBracket') {
  //           navigationRef.navigate('TournamentBracket', { tournamentId });
  //         } else if (screen === 'TournamentWaiting') {
  //           navigationRef.navigate('TournamentWaitingRoom', { tournamentId });
  //         } else if (screen === 'TournamentLobby') {
  //           navigationRef.navigate('TournamentLobby');
  //         }
  //       }
  //     });
  //   } catch (error) {
  //     console.warn('Notification listeners setup failed:', error);
  //   }

  //   return () => {
  //     try {
  //       if (notificationListener.current) {
  //         Notifications.removeNotificationSubscription(notificationListener.current);
  //       }
  //       if (responseListener.current) {
  //         Notifications.removeNotificationSubscription(responseListener.current);
  //       }
  //     } catch (error) {
  //       console.warn('Cleanup failed:', error);
  //     }
  //   };
  // }, [token, navigationRef]);

  return (
    <NavigationContainer
      linking={linking}
      ref={navigationRef}
      fallback={<React.Fragment />}
      onReady={() => {
        // #region debug-point C:navigation-ready
        reportDebugEvent('C', 'App.js:NavigationContainer.onReady', 'navigation ready fired', {
          splashHidden: splashHiddenRef.current,
        });
        // #endregion
        if (splashHiddenRef.current) return;
        splashHiddenRef.current = true;
        SplashScreen.hideAsync()
          .then(() => {
            // #region debug-point A:splash-hide-success
            reportDebugEvent('A', 'App.js:SplashScreen.hideAsync', 'splash hide succeeded');
            // #endregion
          })
          .catch((error) => {
            // #region debug-point D:splash-hide-failed
            reportDebugEvent('D', 'App.js:SplashScreen.hideAsync', 'splash hide failed', {
              message: String(error?.message || error || ''),
            });
            // #endregion
          });
      }}
    >
      {/* #region debug-point C:navigation-render */}
      {(() => {
        reportDebugEvent('C', 'App.js:NavigationContainer.render', 'navigation container rendered');
        return null;
      })()}
      {/* #endregion */}
      <LanguageSync />
      <AppAlertHost />
      <RootErrorBoundary>
        <AppNavigator />
      </RootErrorBoundary>
      <StatusBar style="light" />
    </NavigationContainer>
  );
}

export default function App() {
  useKeepAwake();

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
                  <AppContent />
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
