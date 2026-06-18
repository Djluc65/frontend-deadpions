import React, { memo } from 'react';
import { View, Text, Pressable, Image, StyleSheet, Platform, useWindowDimensions } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { getAvatarSource } from '../../utils/avatarUtils';
import { getResponsiveSize } from '../../utils/responsive';
import { SafeAreaView } from 'react-native-safe-area-context';
import { T } from '../../utils/theme';
import StreakBadge from '../StreakBadge';

const rs = (size) => getResponsiveSize(size);

// ─── Palette cyber ────────────────────────────────────────────────────────────
const CYBER = {
  cyan:   '#5BD2FF',
  mag:    '#C875FF',
  glass:  'rgba(10, 14, 28, 0.72)',
  edge:   'rgba(150, 180, 255, 0.18)',
  gold:   T.gold,
  dim:    '#8090B5',
  text:   '#EAF2FF',
};

// ─── Calcule le niveau à partir des coins ────────────────────────────────────
const getLevel = (coins = 0) => Math.max(1, Math.floor(Math.sqrt(coins / 50)) + 1);

// ─── Bouton tactile réutilisable ──────────────────────────────────────────────
const HeaderTouchable = ({ onPress, onPlaySound, children, style, hitSlop }) => {
  const handlePress = () => {
    if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {});
    if (onPlaySound) onPlaySound();
    if (onPress) onPress();
  };

  return (
    <Pressable
      onPress={handlePress}
      hitSlop={hitSlop || { top: rs(20), bottom: rs(20), left: rs(20), right: rs(20) }}
      pressRetentionOffset={{ top: rs(20), bottom: rs(20), left: rs(20), right: rs(20) }}
      android_ripple={{ color: 'rgba(91,210,255,0.15)', borderless: true, radius: 28, foreground: true }}
      style={style}
    >
      {({ pressed }) => (
        <View style={{ opacity: pressed ? 0.65 : 1, transform: [{ scale: pressed ? 0.94 : 1 }] }}>
          {children}
        </View>
      )}
    </Pressable>
  );
};

// ─── Composant principal ──────────────────────────────────────────────────────
const HomeHeader = memo(({ user, navigation, onSearch, onSettings, onRewards, onPlaySound }) => {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const isTablet  = width >= 768;
  const isDesktop = Platform.OS === 'web' && width >= 1024;

  const coins = Number.isFinite(user?.coins) ? user.coins : (user?.coins || 0);
  const coinsText = coins >= 1_000_000
    ? (coins / 1_000_000).toFixed(1) + 'M'
    : coins >= 1_000
    ? (coins / 1_000).toFixed(1) + 'k'
    : coins.toString();
  const level = getLevel(coins);
  const pseudo = user?.pseudo || t('home.welcome');

  const goProfileOrLogin = () => {
    if (!user) { navigation.navigate('Login'); return; }
    navigation.navigate('Profile');
  };

  // Avatar : image ou initiale dans un cercle dégradé
  const avatarSource = getAvatarSource(user?.avatar);
  const initial = pseudo ? pseudo[0].toUpperCase() : '?';

  const avatarSize = rs(isTablet ? 44 : 38);

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <View style={[styles.row, isDesktop && styles.rowDesktop]}>

        {/* ── Pill avatar + pseudo + niveau ── */}
        <HeaderTouchable
          onPress={goProfileOrLogin}
          onPlaySound={onPlaySound}
          hitSlop={{ top: rs(12), bottom: rs(12), left: rs(12), right: rs(8) }}
        >
          <View style={styles.userPill}>
            {/* Avatar */}
            <View style={[styles.avatarWrap, { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 }]}>
              {avatarSource ? (
                <Image
                  source={avatarSource}
                  style={{ width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 }}
                />
              ) : (
                <Text style={[styles.avatarInitial, { fontSize: rs(isTablet ? 17 : 15) }]}>{initial}</Text>
              )}
            </View>
            {/* Texte */}
            <View style={styles.userTexts}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: rs(4) }}>
                <Text style={[styles.pseudo, isTablet && { fontSize: rs(14) }]} numberOfLines={1} ellipsizeMode="tail">
                  {pseudo}
                </Text>
                <StreakBadge />
              </View>
              <Text style={styles.levelText}>LV.{level}</Text>
            </View>
          </View>
        </HeaderTouchable>

        {/* ── Spacer ── */}
        <View style={{ flex: 1 }} />

        {/* ── Pill coins ── */}
        <View style={styles.coinsPill}>
          <View style={styles.coinsDot} />
          <Text style={styles.coinsNum}>{coinsText}</Text>
        </View>

        {/* ── Boutons actions ── */}
        <View style={styles.actions}>
          <HeaderTouchable
            onPress={onRewards}
            onPlaySound={onPlaySound}
            hitSlop={{ top: rs(18), bottom: rs(18), left: rs(10), right: rs(6) }}
          >
            <View style={styles.iconBtn}>
              <Ionicons name="gift-outline" size={rs(isTablet ? 22 : 20)} color={CYBER.text} />
            </View>
          </HeaderTouchable>

          <HeaderTouchable
            onPress={onSearch}
            onPlaySound={onPlaySound}
            hitSlop={{ top: rs(18), bottom: rs(18), left: rs(6), right: rs(6) }}
          >
            <View style={styles.iconBtn}>
              <Ionicons name="search-outline" size={rs(isTablet ? 22 : 20)} color={CYBER.text} />
            </View>
          </HeaderTouchable>

          <HeaderTouchable
            onPress={onSettings}
            onPlaySound={onPlaySound}
            hitSlop={{ top: rs(18), bottom: rs(18), left: rs(6), right: rs(14) }}
          >
            <View style={styles.iconBtn}>
              <Ionicons name="settings-outline" size={rs(isTablet ? 22 : 20)} color={CYBER.text} />
            </View>
          </HeaderTouchable>
        </View>

      </View>
    </SafeAreaView>
  );
});

const styles = StyleSheet.create({
  safe: {
    backgroundColor: 'transparent',
    borderBottomWidth: 0,
    zIndex: 1000,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: rs(14),
    paddingVertical: rs(8),
    gap: rs(8),
  },
  rowDesktop: {
    maxWidth: 1100,
    alignSelf: 'center',
    width: '100%',
  },

  // ── Pill utilisateur ──────────────────────────────────────────────────────
  userPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CYBER.glass,
    borderWidth: 1,
    borderColor: CYBER.edge,
    borderRadius: rs(24),
    paddingHorizontal: rs(8),
    paddingVertical: rs(5),
    gap: rs(8),
    maxWidth: rs(180),
  },
  avatarWrap: {
    backgroundColor: 'rgba(91, 210, 255, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: CYBER.cyan,
  },
  avatarInitial: {
    color: CYBER.cyan,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  userTexts: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: rs(1),
    flexShrink: 1,
  },
  pseudo: {
    color: CYBER.text,
    fontSize: rs(13),
    fontWeight: '800',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  levelText: {
    color: CYBER.cyan,
    fontSize: rs(10),
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  // ── Pill coins ────────────────────────────────────────────────────────────
  coinsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CYBER.glass,
    borderWidth: 1,
    borderColor: T.goldBorderStrong,
    borderRadius: rs(20),
    paddingHorizontal: rs(10),
    paddingVertical: rs(5),
    gap: rs(5),
  },
  coinsDot: {
    width: rs(7),
    height: rs(7),
    borderRadius: rs(4),
    backgroundColor: T.gold,
    shadowColor: T.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 4,
    elevation: 3,
  },
  coinsNum: {
    color: T.gold,
    fontSize: rs(13),
    fontWeight: '800',
    letterSpacing: 0.3,
  },

  // ── Boutons icône ─────────────────────────────────────────────────────────
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(6),
  },
  iconBtn: {
    width: rs(34),
    height: rs(34),
    borderRadius: rs(10),
    backgroundColor: CYBER.glass,
    borderWidth: 1,
    borderColor: CYBER.edge,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default HomeHeader;
