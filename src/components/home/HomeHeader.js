import React, { memo } from 'react';
import { View, Text, Pressable, Image, StyleSheet, Platform, useWindowDimensions } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { API_URL } from '../../config';
import { getAvatarSource } from '../../utils/avatarUtils';
import { getResponsiveSize } from '../../utils/responsive';
import { SafeAreaView } from 'react-native-safe-area-context';
import { T } from '../../utils/theme';
import GlowWrapper from '../ui/GlowWrapper';

const rs = (size) => getResponsiveSize(size);

// Composant réutilisable optimisé pour la réactivité tactile
const HeaderTouchable = ({ onPress, onPlaySound, children, style, hitSlop }) => {
  const handlePress = () => {
    // Feedback haptique non-bloquant (fire & forget)
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync().catch(() => {});
    }
    
    // Son non-bloquant
    if (onPlaySound) {
      onPlaySound();
    }
    
    // Action immédiate
    if (onPress) onPress();
  };

  return (
    <Pressable
      onPress={handlePress}
      // Zone tactile étendue (HitSlop)
      hitSlop={hitSlop || { top: rs(20), bottom: rs(20), left: rs(20), right: rs(20) }}
      // Maintient l'état pressé même si le doigt glisse un peu en dehors
      pressRetentionOffset={{ top: rs(20), bottom: rs(20), left: rs(20), right: rs(20) }}
      // Ripple Android
      android_ripple={{ 
        color: 'rgba(255, 255, 255, 0.15)', 
        borderless: true, 
        radius: 30,
        foreground: true
      }}
      // Le style du conteneur Pressable reste FIXE (pas de scale ici) pour ne pas réduire la zone tactile
      style={style}
    >
      {({ pressed }) => (
        <View style={{
          // Les effets visuels sont appliqués sur l'enfant uniquement
          opacity: pressed ? 0.6 : 1,
          transform: [{ scale: pressed ? 0.96 : 1 }]
        }}>
          {children}
        </View>
      )}
    </Pressable>
  );
};

const HomeHeader = memo(({ user, t, navigation, onSearch, onSettings, onRewards, onPlaySound }) => {
  const { width } = useWindowDimensions();
  const isIPad = Platform.OS === 'ios' && Platform.isPad;
  const isTabletLayout = !isIPad && width >= 768;
  const coinsText = Number.isFinite(user?.coins) ? user.coins.toLocaleString('fr-FR') : `${user?.coins || 0}`;

  const goProfileOrLogin = () => {
    if (!user) {
      navigation.navigate('Login');
      return;
    }
    navigation.navigate('Profile');
  };

  const headerContentStyle = {
    paddingHorizontal: rs(20),
    paddingVertical: isTabletLayout ? rs(8) : rs(0),
    minHeight: isTabletLayout ? rs(60) : rs(60),
    maxWidth: isTabletLayout ? 500 : '100%',
    alignSelf: 'center',
  };

  return (
    <View style={styles.headerOuter}>
      <SafeAreaView edges={['top']} style={styles.safeHeader}>
      <View style={[styles.headerContent, headerContentStyle]}>
        <View style={[styles.headerRow, isTabletLayout && styles.tabletHeaderRow]}>
          <View style={styles.userInfo}>
            <HeaderTouchable 
              onPress={goProfileOrLogin}
              onPlaySound={onPlaySound}
              hitSlop={{ top: rs(30), bottom: rs(30), left: rs(30), right: rs(30) }}
            >
              {(() => {
                const source = getAvatarSource(user?.avatar);
                return source ? (
                  <Image source={source} style={[styles.avatar, isTabletLayout && styles.avatarTablet]} />
                ) : (
                  <Ionicons name="person-circle-outline" size={rs(isTabletLayout ? 52 : 45)} color="#fff" />
                );
              })()}
            </HeaderTouchable>
            
            <View style={styles.userText}>
              <HeaderTouchable 
                onPress={goProfileOrLogin}
                onPlaySound={onPlaySound}
                hitSlop={{ top: rs(15), bottom: rs(15), left: rs(15), right: rs(15) }}
              >
                <Text
                  style={[styles.welcome, isTabletLayout && styles.welcomeTablet]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {user?.pseudo || t.welcome}
                </Text>
              </HeaderTouchable>
              <Text
                style={[styles.coins, isTabletLayout && styles.coinsTablet]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                💰 {coinsText}
              </Text>
            </View>
          </View>

          <View style={styles.headerIcons}>
            <GlowWrapper style={styles.glowIconWrapper} intensity={0.4}>
              <HeaderTouchable
                onPress={onRewards}
                onPlaySound={onPlaySound}
                hitSlop={{ top: rs(30), bottom: rs(30), left: rs(30), right: rs(30) }}
                style={styles.iconButton}
              >
                <Ionicons name="gift-outline" size={rs(isTabletLayout ? 26 : 28)} color="#fff" />
              </HeaderTouchable>
            </GlowWrapper>

            <GlowWrapper style={styles.glowIconWrapper} intensity={0.4}>
              <HeaderTouchable 
                onPress={onSearch}
                onPlaySound={onPlaySound}
                hitSlop={{ top: rs(30), bottom: rs(30), left: rs(30), right: rs(30) }}
                style={styles.iconButton}
              >
                <Ionicons name="search-outline" size={rs(isTabletLayout ? 26 : 28)} color="#fff" />
              </HeaderTouchable>
            </GlowWrapper>
            
            <HeaderTouchable 
              onPress={onSettings}
              onPlaySound={onPlaySound}
              hitSlop={{ top: rs(30), bottom: rs(30), left: rs(30), right: rs(30) }}
              style={styles.iconButton}
            >
              <Ionicons name="settings-outline" size={rs(isTabletLayout ? 26 : 28)} color="#fff" />
            </HeaderTouchable>
          </View>
        </View>
      </View>
      </SafeAreaView>
    </View>
  );
});

const styles = StyleSheet.create({
  headerOuter: {
    borderBottomWidth: 1.5,
    borderBottomColor: T.gold,
    shadowColor: T.gold,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 14,
    zIndex: 1000,
  },
  safeHeader: {
    backgroundColor: T.bg1,
  },
  headerContent: {},
  headerRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tabletHeaderRow: {
    maxWidth: 460,
    alignSelf: 'center',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(10),
    flex: 1,
    minWidth: 0,
    paddingRight: rs(10),
  },
  avatar: {
    width: rs(42),
    height: rs(42),
    borderRadius: rs(21),
    borderWidth: 2,
    borderColor: T.gold,
  },
  avatarTablet: {
    width: rs(50),
    height: rs(50),
    borderRadius: rs(25),
  },
  userText: {
    justifyContent: 'center',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: rs(2),
    flex: 1,
    minWidth: 0,
  },
  welcome: {
    color: T.text,
    fontSize: rs(16),
    fontWeight: '800',
    letterSpacing: 0.2,
    textTransform: 'uppercase',
  },
  welcomeTablet: {
    fontSize: rs(15),
  },
  coins: {
    color: T.gold,
    fontSize: rs(15),
    fontWeight: '700',
  },
  coinsTablet: {
    fontSize: rs(14),
  },
  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(12),
    flexShrink: 0,
  },
  glowIconWrapper: {
    borderRadius: rs(12),
    padding: 1.5,
  },
  iconButton: {
    padding: rs(8),
    borderRadius: T.radiusMd,
    backgroundColor: T.bg2,
    borderWidth: 1,
    borderColor: T.borderSoft,
  },
});

export default HomeHeader;
