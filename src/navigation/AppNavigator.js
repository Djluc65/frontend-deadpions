import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { useSelector } from 'react-redux';
import { View, ActivityIndicator } from 'react-native';
import { socket } from '../utils/socket';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Écrans
import WaitingScreen from '../screens/WaitingScreen';
import HomeTabNavigator from './HomeTabNavigator';
import GameScreen from '../screens/GameScreen';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import ProfileScreen from '../screens/ProfileScreen';
import ChatScreen from '../screens/ChatScreen';
import ConfigurationJeuIA from '../screens/ConfigurationJeuIA';
import ResultatJeuIA from '../screens/ResultatJeuIA';
// ConfigurationJeuEnLigne removed (deprecated)
import ResultatJeuOnline from '../screens/ResultatJeuOnline';
import LiveConfigScreen from '../screens/ConfigurationSalleLive';
import LiveWaitingScreen from '../screens/SalleAttenteLive';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import ResetPasswordScreen from '../screens/ResetPasswordScreen';
import InfoScreen from '../screens/InfoScreen';
import AssistantScreen from '../screens/AssistantScreen';
import PremiumPionsScreen from '../screens/PremiumPionsScreen';
import AdSystem from '../ads/AdSystem';

const Stack = createStackNavigator();

import GlobalInviteListener from '../components/GlobalInviteListener';
import SessionController from '../components/SessionController';

function InviteJoinScreen({ route, navigation }) {
  const user = useSelector(state => state.auth.user);
  const code = route?.params?.code;

  React.useEffect(() => {
    if (!user) {
      AsyncStorage.setItem('pendingInviteCode', code || '').finally(() => {
        navigation.replace('Login');
      });
      return;
    }
    if (!code || typeof code !== 'string') {
      navigation.replace('Home');
      return;
    }
    if (!socket.connected) socket.connect();

    const handleSuccess = (data) => {
      cleanup();
      if (data?.type === 'custom') {
        navigation.replace('Game', { mode: 'online_custom', gameId: data.gameId });
      } else if (data?.config) {
        navigation.replace('SalleAttenteLive', { configSalle: data.config, roomId: data.gameId });
      } else if (data?.gameId) {
        navigation.replace('SalleAttenteLive', { roomId: data.gameId });
      } else {
        navigation.replace('Home');
      }
    };

    const handleError = () => {
      cleanup();
      navigation.replace('Home');
    };

    const cleanup = () => {
      socket.off('join_code_success', handleSuccess);
      socket.off('join_code_error', handleError);
    };

    socket.on('join_code_success', handleSuccess);
    socket.on('join_code_error', handleError);

    socket.emit('join_by_code', { code: code.trim().toUpperCase(), userId: user._id || user.id });

    return cleanup;
  }, [user, code, navigation]);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#041c55' }}>
      <ActivityIndicator size="large" color="#f1c40f" />
    </View>
  );
}

function AppNavigator() {
  return (
    <AdSystem>
      <SessionController />
      <Stack.Navigator initialRouteName="Waiting" screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Waiting" component={WaitingScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
        <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
        <Stack.Screen name="Home" component={HomeTabNavigator} />
        <Stack.Screen name="Profile" component={ProfileScreen} />
        <Stack.Screen name="Chat" component={ChatScreen} />
        <Stack.Screen name="ConfigurationJeuIA" component={ConfigurationJeuIA} />
        <Stack.Screen name="ResultatJeuIA" component={ResultatJeuIA} />
        {/* ConfigurationJeuEnLigne removed */}
        <Stack.Screen name="ResultatJeuOnline" component={ResultatJeuOnline} />
        <Stack.Screen name="ConfigurationSalleLive" component={LiveConfigScreen} />
        <Stack.Screen name="SalleAttenteLive" component={LiveWaitingScreen} />
        <Stack.Screen name="InviteJoin" component={InviteJoinScreen} />
        <Stack.Screen name="Game" component={GameScreen} />
        <Stack.Screen name="Info" component={InfoScreen} />
        <Stack.Screen name="Assistant" component={AssistantScreen} />
        <Stack.Screen name="PremiumPions" component={PremiumPionsScreen} />
      </Stack.Navigator>
      <GlobalInviteListener />
    </AdSystem>
  );
}

export default AppNavigator;
