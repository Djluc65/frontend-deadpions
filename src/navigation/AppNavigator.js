import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';

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

const Stack = createStackNavigator();

import GlobalInviteListener from '../components/GlobalInviteListener';

function AppNavigator() {
  return (
    <>
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
        <Stack.Screen name="Game" component={GameScreen} />
        <Stack.Screen name="Info" component={InfoScreen} />
        <Stack.Screen name="Assistant" component={AssistantScreen} />
      </Stack.Navigator>
      <GlobalInviteListener />
    </>
  );
}

export default AppNavigator;
