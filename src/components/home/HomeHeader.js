import React, { memo } from 'react';
import { View, Text, Pressable, Image, StyleSheet, Platform, useWindowDimensions } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { API_URL } from '../../config';
import { getAvatarSource } from '../../utils/avatarUtils';
import { getResponsiveSize } from '../../utils/responsive';
import { SafeAreaView } from 'react-native-safe-area-context';

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

const HomeHeader = memo(({ user, t, navigation, onSearch, onSettings, onPlaySound }) => {
  const { width } = useWindowDimensions();
  const isIPad = Platform.OS === 'ios' && Platform.isPad;
  const isTabletLayout = !isIPad && width >= 768;

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
                <Text style={[styles.welcome, isTabletLayout && styles.welcomeTablet]}>{user?.pseudo || t.welcome}</Text>
              </HeaderTouchable>
              <Text style={[styles.coins, isTabletLayout && styles.coinsTablet]}>💰 {user?.coins || 0}</Text>
            </View>
          </View>

          <View style={styles.headerIcons}>
            <HeaderTouchable 
              onPress={onSearch}
              onPlaySound={onPlaySound}
              hitSlop={{ top: rs(30), bottom: rs(30), left: rs(30), right: rs(30) }}
              style={styles.iconButton}
            >
              <Ionicons name="search-outline" size={rs(isTabletLayout ? 26 : 28)} color="#fff" />
            </HeaderTouchable>
            
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
  );
});

const styles = StyleSheet.create({
  safeHeader: {
    backgroundColor: 'rgba(4, 28, 85, 0.95)',
    borderBottomWidth: rs(1),
    borderBottomColor: '#f1c40f',
    zIndex: 1000,
    elevation: 5,
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
  },
  avatar: {
    width: rs(45),
    height: rs(45),
    borderRadius: rs(22.5),
    borderWidth: rs(2),
    borderColor: '#fff',
  },
  avatarTablet: {
    width: rs(52),
    height: rs(52),
    borderRadius: rs(26),
  },
  userText: {
    justifyContent: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(10),
  },
  welcome: {
    color: '#fff',
    fontSize: rs(18),
    fontWeight: 'bold',
  },
  welcomeTablet: {
    fontSize: rs(16),
  },
  coins: {
    color: '#f1c40f',
    fontSize: rs(18),
    fontWeight: 'bold',
  },
  coinsTablet: {
    fontSize: rs(16),
  },
  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(15),
  },
  iconButton: {
    padding: rs(8),
  },
});

export default HomeHeader;
