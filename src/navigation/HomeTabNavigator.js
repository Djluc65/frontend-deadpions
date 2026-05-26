import React, { useEffect } from 'react';
import { View, Text, Platform, useWindowDimensions, StyleSheet } from 'react-native';
import { AppTouchableOpacity as TouchableOpacity } from '../components/common/AppTouchable';
import { T } from '../utils/theme';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector, useDispatch } from 'react-redux';
import { API_URL } from '../config';
import socket from '../services/socket';
import { setNotificationsCount, incrementNotificationsCount } from '../redux/slices/socialSlice';
import { playButtonSound } from '../utils/soundManager';
import { useTranslation } from 'react-i18next';
import Constants from 'expo-constants';

import HomeScreen from '../screens/HomeScreen';
import { getResponsiveSize, DESKTOP_BREAKPOINT } from '../utils/responsive';

const Tab = createBottomTabNavigator();

// ─── Définition des onglets ────────────────────────────────────────────────────
const TAB_DEFS = {
  MaisonTab: { icon: 'home',   labelKey: 'tabs.home'   },
  Social:    { icon: 'people', labelKey: 'tabs.social' },
  Salle:     { icon: 'easel',  labelKey: 'tabs.room'   },
  Magasin:   { icon: 'cart',   labelKey: 'tabs.shop'   },
};

const SIDEBAR_WIDTH = 200;

// ─── Barre de navigation desktop web (verticale, à gauche) ───────────────────
const DesktopSidebar = ({ state, navigation, notificationsCount, width }) => {
  const { t } = useTranslation();
  return (
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
                {t(def.labelKey)}
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
};

const sidebarStyles = StyleSheet.create({
  bar: {
    position: 'absolute',
    top: 0, left: 0, bottom: 0,
    width: SIDEBAR_WIDTH,
    backgroundColor: T.bg1,
    borderRightColor: T.border,
    borderRightWidth: 1,
    // zIndex: 100,
    paddingVertical: 30,
    borderBottomWidth: 1.5,
        borderBottomColor: T.gold,
        borderTopWidth: 1.5,
        borderTopColor: 'rgba(255,230,120,0.45)',
        shadowColor: T.gold,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius: 10,
        elevation: 14,
        zIndex: 1000,
  },
  header: {
    paddingHorizontal: 20,
    marginBottom: 40,
  },
  brand: {
    color: T.gold,
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  links: {
    flex: 1,
    paddingHorizontal: 10,
    gap: 4,
  },
  link: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: T.radiusMd,
    gap: 12,
  },
  linkActive: {
    backgroundColor: 'rgba(244,180,26,0.12)',
  },
  linkText: {
    color: T.textDim,
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.2,
    textTransform: 'uppercase',
  },
  linkTextActive: {
    color: T.gold,
    fontWeight: '800',
  },
  badge: {
    backgroundColor: T.red,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 'auto',
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
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
        color={focused ? T.gold : T.textMuted}
      />
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.7}
        style={{
          color: focused ? T.gold : T.textMuted,
          fontSize: getResponsiveSize(isTablet ? 10 : 11),
          fontWeight: '700',
          marginTop: getResponsiveSize(2),
          letterSpacing: 0.3,
          textTransform: 'uppercase',
        }}
      >
        {label}
      </Text>
    </View>
  );
};

// ─── Barre mobile / tablette (bas) ────────────────────────────────────────────
const MobileBottomNav = ({ state, navigation, notificationsCount, insets, width, height }) => {
  const { t } = useTranslation();
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
        backgroundColor: T.bg1,
        height: tabHeight,
        borderTopColor: T.gold,
        borderTopWidth: 1.5,
        paddingTop: isTablet ? 10 : 4,
        paddingBottom: (isTablet ? 12 : 0) + insets.bottom,
        position: 'absolute',
        bottom: 0, left: 0, right: 0,
        flexDirection: 'row',
        // Box shadow global 1.5px
        shadowColor: T.gold,
        shadowOffset: { width: 0, height: 6  },
        shadowOpacity: 0.35,
        shadowRadius: 1.5,
        elevation: 14,
        zIndex: 1000,
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
                label={def?.labelKey ? t(def.labelKey) : ''}
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
  const dispatch = useDispatch();
  const { token, user } = useSelector(state => state.auth);
  const notificationsCount = useSelector(state => state.social.notificationsCount);
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const isDesktopWeb = Platform.OS === 'web' && width >= DESKTOP_BREAKPOINT;
  const isAndroidEmulator = Platform.OS === 'android' && Constants.isDevice === false;

  // ── Compteur de demandes d'amis ────────────────────────────────────────────
  useEffect(() => {
    if (isAndroidEmulator) return;
    if (token) {
      const fetchRequests = async () => {
        try {
          const res = await fetch(`${API_URL}/friends/requests`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const contentType = res.headers.get('content-type') || '';
            if (!contentType.includes('application/json')) return;
            const data = await res.json();
            const received = Array.isArray(data?.received) ? data.received : [];
            const count = received.filter(r => r?.sender).length;
            dispatch(setNotificationsCount(count));
          }
        } catch (error) {
          console.error('Error fetching requests count:', error);
        }
      };
      fetchRequests();
    }
  }, [token, dispatch, isAndroidEmulator]);

  // ── Socket : nouvelles demandes ────────────────────────────────────────────
  useEffect(() => {
    if (isAndroidEmulator) return;
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
  }, [user, token, dispatch, isAndroidEmulator]);

  const renderTabBar = (props) => {
    if (isDesktopWeb) {
      return (
        <DesktopSidebar
          {...props}
          notificationsCount={notificationsCount}
          width={width}
        />
      );
    }
    return (
      <MobileBottomNav
        {...props}
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
      <Tab.Screen name="Social" getComponent={() => require('../screens/SocialScreen').default} />
      <Tab.Screen name="Salle" getComponent={() => require('../screens/LiveListScreen').default} />
      <Tab.Screen name="Magasin" getComponent={() => require('../screens/ShopScreen').default} />
    </Tab.Navigator>
  );
};

export default HomeTabNavigator;
