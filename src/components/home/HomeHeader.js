import React, { memo } from 'react';
import { View, Text, Pressable, Image, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { API_URL } from '../../config';
import { getAvatarSource } from '../../utils/avatarUtils';
import { getResponsiveSize } from '../../utils/responsive';

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
      hitSlop={hitSlop || { top: getResponsiveSize(20), bottom: getResponsiveSize(20), left: getResponsiveSize(20), right: getResponsiveSize(20) }}
      // Maintient l'état pressé même si le doigt glisse un peu en dehors
      pressRetentionOffset={{ top: getResponsiveSize(20), bottom: getResponsiveSize(20), left: getResponsiveSize(20), right: getResponsiveSize(20) }}
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
  return (
    <View style={styles.header}>
      <View style={styles.userInfo}>
        <HeaderTouchable 
          onPress={() => navigation.navigate('Profile')}
          onPlaySound={onPlaySound}
          hitSlop={{ top: getResponsiveSize(30), bottom: getResponsiveSize(30), left: getResponsiveSize(30), right: getResponsiveSize(30) }}
        >
          {(() => {
            const source = getAvatarSource(user?.avatar);
            return source ? (
              <Image source={source} style={styles.avatar} />
            ) : (
              <Ionicons name="person-circle-outline" size={getResponsiveSize(45)} color="#fff" />
            );
          })()}
        </HeaderTouchable>
        
        <View style={styles.userText}>
          <HeaderTouchable 
            onPress={() => navigation.navigate('Profile')}
            onPlaySound={onPlaySound}
            hitSlop={{ top: getResponsiveSize(15), bottom: getResponsiveSize(15), left: getResponsiveSize(15), right: getResponsiveSize(15) }}
          >
            <Text style={styles.welcome}>{user?.pseudo || t.welcome}</Text>
          </HeaderTouchable>
          <Text style={styles.coins}>💰 {user?.coins || 0}</Text>
        </View>
      </View>

      <View style={styles.headerIcons}>
        <HeaderTouchable 
          onPress={onSearch}
          onPlaySound={onPlaySound}
          hitSlop={{ top: getResponsiveSize(30), bottom: getResponsiveSize(30), left: getResponsiveSize(30), right: getResponsiveSize(30) }}
          style={styles.iconButton}
        >
          <Ionicons name="search-outline" size={getResponsiveSize(28)} color="#fff" />
        </HeaderTouchable>
        
        <HeaderTouchable 
          onPress={onSettings}
          onPlaySound={onPlaySound}
          hitSlop={{ top: getResponsiveSize(30), bottom: getResponsiveSize(30), left: getResponsiveSize(30), right: getResponsiveSize(30) }}
          style={styles.iconButton}
        >
          <Ionicons name="settings-outline" size={getResponsiveSize(28)} color="#fff" />
        </HeaderTouchable>
        

      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: getResponsiveSize(20),
    paddingTop: getResponsiveSize(50),
    backgroundColor: 'rgba(4, 28, 85, 0.95)',
    borderBottomWidth: getResponsiveSize(1),
    borderBottomColor: '#f1c40f',
    zIndex: 1000, // Assure que le header est au-dessus du contenu scrollable
    elevation: 5, // Pour Android
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: getResponsiveSize(10),
  },
  avatar: {
    width: getResponsiveSize(45),
    height: getResponsiveSize(45),
    borderRadius: getResponsiveSize(22.5),
    borderWidth: getResponsiveSize(2),
    borderColor: '#fff',
  },
  userText: {
    justifyContent: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: getResponsiveSize(10),
  },
  welcome: {
    color: '#fff',
    fontSize: getResponsiveSize(18),
    fontWeight: 'bold',
  },
  coins: {
    color: '#f1c40f',
    fontSize: getResponsiveSize(18),
    fontWeight: 'bold',
  },
  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: getResponsiveSize(15),
  },
  iconButton: {
    padding: getResponsiveSize(8), // Augmenté pour atteindre ~44px avec l'icône de 28px
  },
});

export default HomeHeader;
