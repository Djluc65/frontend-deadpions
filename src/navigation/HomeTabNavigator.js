import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSelector, useDispatch } from 'react-redux';
import { API_URL } from '../config';
import socket from '../services/socket';
import { setNotificationsCount, incrementNotificationsCount } from '../redux/slices/socialSlice';

import HomeScreen from '../screens/HomeScreen';
import SocialScreen from '../screens/SocialScreen';
import ShopScreen from '../screens/ShopScreen';
import LiveListScreen from '../screens/LiveListScreen';
import { translations } from '../utils/translations';

const Tab = createBottomTabNavigator();

const CustomTabIcon = ({ focused, iconName, label }) => {
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      <Ionicons name={iconName} size={24} color={focused ? '#f1c40f' : '#fff'} />
      <Text style={{ 
        color: focused ? '#f1c40f' : '#fff', 
        fontSize: 12, 
        fontWeight: 'bold',
        marginTop: 2
      }}>
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
          height: 70,
          borderTopColor: '#f1c40f',
          borderTopWidth: 1,
          paddingTop: 10,
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
      />
      <Tab.Screen 
        name="Salle" 
        component={LiveListScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <CustomTabIcon focused={focused} iconName="easel" label={t.room_tab} />
          ),
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
      />
    </Tab.Navigator>
  );
};

export default HomeTabNavigator;
