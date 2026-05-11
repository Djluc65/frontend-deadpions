import React, { useEffect } from 'react';
import { View, Text, Platform, useWindowDimensions, StyleSheet } from 'react-native';
import { AppTouchableOpacity as TouchableOpacity } from '../components/common/AppTouchable';
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
import { getResponsiveSize, DESKTOP_BREAKPOINT } from '../utils/responsive';

const Tab = createBottomTabNavigator();

// ─── Définition des onglets ────────────────────────────────────────────────────
const TAB_DEFS = {
  MaisonTab: { icon: 'home',   label: (t) => t.home_tab  },
  Social:    { icon: 'people', label: (t) => t.social_tab },
  Salle:     { icon: 'easel',  label: (t) => t.room_tab  },
  Magasin:   { icon: 'cart',   label: (t) => t.shop_tab  },
};

const SIDEBAR_WIDTH = 200;

// ─── Barre de navigation desktop web (verticale, à gauche) ───────────────────
const DesktopSidebar = ({ state, navigation, t, notificationsCount, width }) => (
  <View style={[sidebarStyles.bar, { width: SIDEBAR_WIDTH }]}>
    <View style={sidebarStyles.header}>
      <Text style={sidebarStyles.brand}>⬡ DeadPions</Text>
    </View>
    <View style={sidebarStyles.links}>
      {state.routes.map((route, index) => {
        const isFocused = state.index === index;
        const def = TAB_DEFS[route.name];
        if (!def) return null;
        const badge = route.name === 'Social' && notificationsCount > 0 ? notificationsCount : null;
        return (
          <TouchableOpacity
            key={route.key}
            onPress={() => { playButtonSound(); navigation.navigate(route.name); }}
            style={[sidebarStyles.link, isFocused && sidebarStyles.linkActive]}
          >
            <Ionicons name={def.icon} size={20} color={isFocused ? '#f1c40f' : '#ccc'} />
            <Text style={[sidebarStyles.linkText, isFocused && sidebarStyles.linkTextActive]}>
              {def.label(t)}
            </Text>
            {badge !== null && (
              <View style={sidebarStyles.badge}>
                <Text style={sidebarStyles.badgeText}>{badge}</Text>
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  </View>
);

const sidebarStyles = StyleSheet.create({
  bar: {
    position: 'absolute',
    top: 0, left: 0, bottom: 0,
    width: SIDEBAR_WIDTH,
    backgroundColor: 'rgba(4, 28, 85, 0.97)',
    borderRightColor: '#f1c40f',
    borderRightWidth: 2,
    zIndex: 100,
    paddingVertical: 30,
  },
  header: {
    paddingHorizontal: 20,
    marginBottom: 40,
  },
  brand: {
    color: '#f1c40f',
    fontSize: 22,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  links: {
    flex: 1,
    paddingHorizontal: 10,
    gap: 8,
  },
  link: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 12,
  },
  linkActive: {
    backgroundColor: 'rgba(241, 196, 15, 0.15)',
  },
  linkText: {
    color: '#ccc',
    fontSize: 16,
    fontWeight: '400',
  },
  linkTextActive: {
    color: '#f1c40f',
    fontWeight: 'bold',
  },
  badge: {
    backgroundColor: '#e74c3c',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 'auto',
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
});

// ─── Icône onglet mobile ───────────────────────────────────────────────────────
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

// ─── Barre mobile / tablette (bas) ────────────────────────────────────────────
const MobileBottomNav = ({ state, navigation, t, notificationsCount, insets, width, height }) => {
  const isTablet = width >= 768;
  const minDim = Math.min(width, height);
  const maxDim = Math.max(width, height);
  const isIPadMini =
    Platform.OS === 'ios' &&
    minDim >= 740 && minDim <= 760 &&
    maxDim >= 1100 && maxDim <= 1140;

  const tabHeight = (isTablet ? 90 : isIPadMini ? 65 : 40) + insets.bottom;

  return (
    <View
      style={{
        backgroundColor: 'rgba(4, 28, 85, 0.95)',
        height: tabHeight,
        borderTopColor: '#f1c40f',
        borderTopWidth: 1,
        paddingTop: isTablet ? 10 : 4,
        paddingBottom: (isTablet ? 12 : 0) + insets.bottom,
        position: 'absolute',
        bottom: 0, left: 0, right: 0,
        elevation: 0,
        flexDirection: 'row',
      }}
    >
      {state.routes.map((route, index) => {
        const isFocused = state.index === index;
        const def = TAB_DEFS[route.name];
        const badge = route.name === 'Social' && notificationsCount > 0 ? notificationsCount : null;

        return (
          <TouchableOpacity
            key={route.key}
            onPress={() => { playButtonSound(); navigation.navigate(route.name); }}
            style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
          >
            <View style={{ position: 'relative' }}>
              {badge !== null && (
                <View style={{
                  position: 'absolute', top: -4, right: -8,
                  backgroundColor: '#e74c3c', borderRadius: 10,
                  minWidth: 20, height: 20,
                  alignItems: 'center', justifyContent: 'center',
                  paddingHorizontal: 4, zIndex: 1,
                }}>
                  <Text style={{ color: '#fff', fontSize: 12, fontWeight: 'bold' }}>{badge}</Text>
                </View>
              )}
              <CustomTabIcon
                focused={isFocused}
                iconName={def?.icon}
                label={def?.label(t)}
              />
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

// ─── Navigateur principal ──────────────────────────────────────────────────────
const HomeTabNavigator = () => {
  const settings = useSelector(state => state.settings || { language: 'fr' });
  const t = translations[settings.language] || translations.fr;
  const dispatch = useDispatch();
  const { token, user } = useSelector(state => state.auth);
  const notificationsCount = useSelector(state => state.social.notificationsCount);
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const isDesktopWeb = Platform.OS === 'web' && width >= DESKTOP_BREAKPOINT;

  // ── Compteur de demandes d'amis ────────────────────────────────────────────
  useEffect(() => {
    if (token) {
      const fetchRequests = async () => {
        try {
          const res = await fetch(`${API_URL}/friends/requests`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const data = await res.json();
            const count = data.received.filter(r => r.sender).length;
            dispatch(setNotificationsCount(count));
          }
        } catch (error) {
          console.error('Error fetching requests count:', error);
        }
      };
      fetchRequests();
    }
  }, [token, dispatch]);

  // ── Socket : nouvelles demandes ────────────────────────────────────────────
  useEffect(() => {
    if (user && token) {
      const handleConnect = () => socket.emit('join_user_room', user._id);

      if (!socket.connected) socket.connect();
      else handleConnect();

      socket.on('connect', handleConnect);
      const handleNewRequest = () => dispatch(incrementNotificationsCount());
      socket.on('friend_request_received', handleNewRequest);

      return () => {
        socket.off('connect', handleConnect);
        socket.off('friend_request_received', handleNewRequest);
      };
    }
  }, [user, token, dispatch]);

  const renderTabBar = (props) => {
    if (isDesktopWeb) {
      return (
        <DesktopSidebar
          {...props}
          t={t}
          notificationsCount={notificationsCount}
          width={width}
        />
      );
    }
    return (
      <MobileBottomNav
        {...props}
        t={t}
        notificationsCount={notificationsCount}
        insets={insets}
        width={width}
        height={height}
      />
    );
  };

  return (
    <Tab.Navigator
      tabBar={renderTabBar}
      sceneContainerStyle={isDesktopWeb ? { paddingLeft: SIDEBAR_WIDTH } : undefined}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="MaisonTab" component={HomeScreen} />
      <Tab.Screen name="Social"    component={SocialScreen} />
      <Tab.Screen name="Salle"     component={LiveListScreen} />
      <Tab.Screen name="Magasin"   component={ShopScreen} />
    </Tab.Navigator>
  );
};

export default HomeTabNavigator;
