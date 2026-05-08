import React, { useEffect } from 'react';
import { View, Text, Platform, useWindowDimensions } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector, useDispatch } from 'react-redux';
import { API_URL } from '../config';
import socket from '../services/socket';
import { setNotificationsCount, incrementNotificationsCount } from '../redux/slices/socialSlice';
import { playButtonSound } from '../utils/soundManager';

import HomeScreen from '../screens/HomeScreen';
import SocialScreen from '../screens/SocialScreen';
import ShopScreen from '../screens/ShopScreen';
import LiveListScreen from '../screens/LiveListScreen';
import { translations } from '../utils/translations';
import { getResponsiveSize } from '../utils/responsive';

const Tab = createBottomTabNavigator();

const CustomTabIcon = ({ focused, iconName, label }) => {
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', width: isTablet ? 80 : 60 }}>
      <Ionicons
        name={iconName}
        size={getResponsiveSize(isTablet ? 26 : 24)}
        color={focused ? '#f1c40f' : '#fff'}
      />
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.7}
        style={{
          color: focused ? '#f1c40f' : '#fff',
          fontSize: getResponsiveSize(isTablet ? 11 : 12),
          fontWeight: 'bold',
          marginTop: getResponsiveSize(2),
        }}
      >
        {label}
      </Text>
    </View>
  );
};

const HomeTabNavigator = () => {
  const settings = useSelector(state => state.settings || { language: 'fr' });
  const t = translations[settings.language] || translations.fr;
  const dispatch = useDispatch();
  const { token, user } = useSelector(state => state.auth);
  const notificationsCount = useSelector(state => state.social.notificationsCount);
  const { width, height } = useWindowDimensions();
  const isTablet = width >= 768;
  const minDim = Math.min(width, height);
  const maxDim = Math.max(width, height);
  const isIPadMini =
    Platform.OS === 'ios' &&
    minDim >= 740 &&
    minDim <= 760 &&
    maxDim >= 1100 &&
    maxDim <= 1140;
  const insets = useSafeAreaInsets();

  // Fetch initial notifications count
  useEffect(() => {
    if (token) {
      const fetchRequests = async () => {
        try {
          const res = await fetch(`${API_URL}/friends/requests`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (res.ok) {
            const data = await res.json();
            // Count received requests that are not from deleted users
            const count = data.received.filter(r => r.sender).length;
            dispatch(setNotificationsCount(count));
          }
        } catch (error) {
          console.error("Error fetching requests count:", error);
        }
      };
      fetchRequests();
    }
  }, [token, dispatch]);

  // Socket listener for new requests
  useEffect(() => {
    if (user && token) {
      const handleConnect = () => {
        socket.emit('join_user_room', user._id);
      };

      if (!socket.connected) {
        socket.connect();
      } else {
        handleConnect();
      }

      socket.on('connect', handleConnect);

      const handleNewRequest = () => {
        dispatch(incrementNotificationsCount());
      };

      socket.on('friend_request_received', handleNewRequest);

      return () => {
        socket.off('connect', handleConnect);
        socket.off('friend_request_received', handleNewRequest);
      };
    }
  }, [user, token, dispatch]);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: 'rgba(4, 28, 85, 0.95)',
          height: (isTablet ? 90 : (isIPadMini ? 65 : 40)) + insets.bottom,
          borderTopColor: '#f1c40f',
          borderTopWidth: 1,
          paddingTop: isTablet ? 10 : 4,
          paddingBottom: (isTablet ? 12 : 0) + insets.bottom,
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          elevation: 0, // for android to remove shadow if needed
        },
      }}
    >
      <Tab.Screen 
        name="MaisonTab" 
        component={HomeScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <CustomTabIcon focused={focused} iconName="home" label={t.home_tab} />
          ),
        }}
        listeners={{
          tabPress: () => playButtonSound(),
        }}
      />
      <Tab.Screen 
        name="Social" 
        component={SocialScreen}
        options={{
          tabBarBadge: notificationsCount > 0 ? notificationsCount : null,
          tabBarBadgeStyle: { backgroundColor: '#e74c3c', color: 'white' },
          tabBarIcon: ({ focused }) => (
            <CustomTabIcon focused={focused} iconName="people" label={t.social_tab} />
          ),
        }}
        listeners={{
          tabPress: () => playButtonSound(),
        }}
      />
      <Tab.Screen 
        name="Salle" 
        component={LiveListScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <CustomTabIcon focused={focused} iconName="easel" label={t.room_tab} />
          ),
        }}
        listeners={{
          tabPress: () => playButtonSound(),
        }}
      />
      <Tab.Screen 
        name="Magasin" 
        component={ShopScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <CustomTabIcon focused={focused} iconName="cart" label={t.shop_tab} />
          ),
        }}
        listeners={{
          tabPress: () => playButtonSound(),
        }}
      />
    </Tab.Navigator>
  );
};

export default HomeTabNavigator;
