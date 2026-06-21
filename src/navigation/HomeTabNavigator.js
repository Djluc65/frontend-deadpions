import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Platform, useWindowDimensions, StyleSheet, Modal, Pressable, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
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
              <Ionicons name={def.icon} size={20} color={isFocused ? T.gold : '#ccc'} />
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
    backgroundColor: T.goldSoft,
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
const CustomTabIcon = ({ focused, iconName, label, cyberActive }) => {
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const activeColor = cyberActive || T.gold;
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', width: isTablet ? 100 : 60 }}>
      <Ionicons
        name={iconName}
        size={getResponsiveSize(isTablet ? 32 : 24)}
        color={focused ? activeColor : '#8090B5'}
      />
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.7}
        style={{
          color: focused ? activeColor : '#8090B5',
          fontSize: getResponsiveSize(isTablet ? 12 : 11),
          fontWeight: '700',
          marginTop: getResponsiveSize(isTablet ? 4 : 2),
          letterSpacing: 0.3,
          textTransform: 'uppercase',
        }}
      >
        {label}
      </Text>
    </View>
  );
};

// ─── Palette cyber (nav) ──────────────────────────────────────────────────────
const NAV_CYBER = {
  cyan:   '#5BD2FF',
  glass:  'rgba(10, 14, 28, 0.95)',
  edge:   'rgba(150, 180, 255, 0.18)',
  dim:    '#8090B5',
};

// ─── Taille du bouton central ──────────────────────────────────────────────────
const CENTER_BTN_SIZE = getResponsiveSize(50);
const CENTER_BTN_LIFT = getResponsiveSize(16); // élévation au-dessus du dock

// ─── Barre mobile / tablette (bas) — glass dock cyber ─────────────────────────
const MobileBottomNav = ({ state, navigation, notificationsCount, insets, width, height }) => {
  const { t } = useTranslation();
  const isTablet = width >= 768;

  const dockInner = isTablet ? 76 : 56;
  const bottomPad = Math.max(insets.bottom, 0);
  const dockBottom = Math.max(bottomPad + (isTablet ? 16 : 8), isTablet ? 30 : 20);

  // Position verticale du bouton central : centré sur le dock + élévation
  const centerBtnSize = isTablet ? getResponsiveSize(64) : CENTER_BTN_SIZE;
  const centerBtnLift = isTablet ? getResponsiveSize(20) : CENTER_BTN_LIFT;
  const centerBtnBottom = dockInner / 2 - centerBtnSize / 2 + centerBtnLift;

  const [quickVisible, setQuickVisible] = useState(false);
  const sheetAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(sheetAnim, {
      toValue: quickVisible ? 1 : 0,
      duration: quickVisible ? 220 : 180,
      useNativeDriver: true,
    }).start();
  }, [quickVisible, sheetAnim]);

  const quickItems = useMemo(() => ([
    { key: 'online',   icon: 'globe-outline',            label: t('home.play_online')  },
    { key: 'computer', icon: 'hardware-chip-outline',    label: t('home.play_computer') },
    { key: 'friends',  icon: 'people-outline',           label: t('home.play_friends') },
    { key: 'tournament', icon: 'trophy-outline',         label: "Tournois" },
    { key: 'local',    icon: 'game-controller-outline',  label: t('home.play_local') },
    { key: 'rewards',  icon: 'gift-outline',             label: t('rewards.title') },
  ]), [t]);

  const handleCenterPress = () => {
    playButtonSound();
    setQuickVisible(true);
  };

  const handleQuick = (key) => {
    playButtonSound();
    setQuickVisible(false);
    if (key === 'tournament') {
      navigation.navigate('TournamentLobby');
    } else {
      navigation.navigate('MaisonTab', { quickAction: key });
    }
  };

  return (
    // Wrapper external : overflow visible pour que le bouton dépasse vers le haut
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        left: isTablet ? 40 : 14,
        right: isTablet ? 40 : 14,
        bottom: dockBottom,
        height: dockInner + centerBtnLift + centerBtnSize / 2,
        zIndex: 1000,
      }}
    >
      {/* ── Dock en verre ── */}
      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: dockInner,
          flexDirection: 'row',
          backgroundColor: NAV_CYBER.glass,
          borderRadius: isTablet ? 30 : 22,
          borderWidth: 1,
          borderColor: NAV_CYBER.edge,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.55,
          shadowRadius: 18,
          elevation: 20,
          overflow: 'hidden',
        }}
      >
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;
          const def = TAB_DEFS[route.name];
          const badge = route.name === 'Social' && notificationsCount > 0 ? notificationsCount : null;

          return (
            <React.Fragment key={route.key}>
              {/* Slot vide au centre (entre index 1=Social et index 2=Salle) */}
              {index === 2 && (
                <View style={{ flex: 1 }} pointerEvents="none" />
              )}

              <TouchableOpacity
                onPress={() => { playButtonSound(); navigation.navigate(route.name); }}
                style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
              >
                {/* Barre active en haut */}
                {isFocused && (
                  <View style={{
                    position: 'absolute',
                    top: 0,
                    width: '40%',
                    height: isTablet ? 3 : 2,
                    borderRadius: isTablet ? 3 : 2,
                    backgroundColor: NAV_CYBER.cyan,
                    shadowColor: NAV_CYBER.cyan,
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: 0.9,
                    shadowRadius: 6,
                  }} />
                )}
                <View style={{ position: 'relative' }}>
                  {badge !== null && (
                    <View style={{
                      position: 'absolute', top: -4, right: -8,
                      backgroundColor: '#e74c3c', borderRadius: isTablet ? 12 : 10,
                      minWidth: isTablet ? 22 : 18, height: isTablet ? 22 : 18,
                      alignItems: 'center', justifyContent: 'center',
                      paddingHorizontal: 3, zIndex: 1,
                    }}>
                      <Text style={{ color: '#fff', fontSize: isTablet ? 12 : 10, fontWeight: '700' }}>{badge}</Text>
                    </View>
                  )}
                  <CustomTabIcon
                    focused={isFocused}
                    iconName={def?.icon}
                    label={def?.labelKey ? t(def.labelKey) : ''}
                    cyberActive={NAV_CYBER.cyan}
                  />
                </View>
              </TouchableOpacity>
            </React.Fragment>
          );
        })}
      </View>

      {/* ── Bouton central JOUER — flotte au-dessus du dock ── */}
      <TouchableOpacity
        onPress={handleCenterPress}
        activeOpacity={0.82}
        style={{
          position: 'absolute',
          width: centerBtnSize,
          height: centerBtnSize,
          left: '50%',
          marginLeft: -centerBtnSize / 2,
          bottom: centerBtnBottom,
          borderRadius: getResponsiveSize(isTablet ? 18 : 14),
          elevation: 28,
          shadowColor: '#5BD2FF',
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.75,
          shadowRadius: 18,
          zIndex: 10,
        }}
      >
        <LinearGradient
          colors={['#5BD2FF', '#C875FF']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            flex: 1,
            borderRadius: getResponsiveSize(isTablet ? 18 : 14),
            alignItems: 'center',
            justifyContent: 'center',
            // Inner highlights (iOS)
            shadowColor: 'rgba(255,255,255,0.4)',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 1,
            shadowRadius: 0,
          }}
        >
          <Ionicons
            name="game-controller"
            size={getResponsiveSize(isTablet ? 28 : 22)}
            color="#05060B"
          />
        </LinearGradient>
      </TouchableOpacity>

      <Modal
        transparent
        visible={quickVisible}
        animationType="none"
        onRequestClose={() => setQuickVisible(false)}
      >
        <Pressable style={quickStyles.overlay} onPress={() => setQuickVisible(false)}>
          <Pressable style={quickStyles.sheetHit} onPress={() => {}}>
            <Animated.View
              style={[
                quickStyles.sheet,
                {
                  paddingBottom: Math.max(bottomPad, 12) + 14,
                  transform: [
                    {
                      translateY: sheetAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [360, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              <View style={quickStyles.row}>
                {quickItems.slice(0, 5).map((it) => (
                  <TouchableOpacity
                    key={it.key}
                    onPress={() => handleQuick(it.key)}
                    style={quickStyles.action}
                  >
                    <View style={quickStyles.actionIcon}>
                      <Ionicons name={it.icon} size={22} color="#5BD2FF" />
                    </View>
                    <Text style={quickStyles.actionText} numberOfLines={1}>{it.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity onPress={() => handleQuick('rewards')} style={quickStyles.rewardsBtn}>
                <Ionicons name="gift-outline" size={20} color="#05060B" />
                <Text style={quickStyles.rewardsText} numberOfLines={1}>{t('rewards.title')}</Text>
              </TouchableOpacity>
            </Animated.View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};

const quickStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 6, 11, 0.78)',
    justifyContent: 'flex-end',
  },
  sheetHit: {
    width: '100%',
  },
  sheet: {
    backgroundColor: 'rgba(10, 14, 28, 0.92)',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(150, 180, 255, 0.18)',
    paddingTop: 14,
    paddingHorizontal: 14,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'space-between',
  },
  action: {
    width: '48%',
    backgroundColor: 'rgba(10, 14, 28, 0.92)',
    borderWidth: 2,
    borderColor: 'rgba(91, 210, 255, 0.6)',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    shadowColor: '#5BD2FF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 14,
    elevation: 14,
  },
  actionIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(91, 210, 255, 0.14)',
    borderWidth: 1.5,
    borderColor: 'rgba(91, 210, 255, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: {
    color: '#EAF2FF',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    flex: 1,
  },
  rewardsBtn: {
    marginTop: 12,
    backgroundColor: '#5BD2FF',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderWidth: 1.5,
    borderColor: '#5BD2FF',
    shadowColor: '#5BD2FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 10,
  },
  rewardsText: {
    color: '#05060B',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
});

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
