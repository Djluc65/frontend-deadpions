import React, { memo } from 'react';
import { View, Text, Pressable, Image, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { API_URL } from '../../config';
import { getAvatarSource } from '../../utils/avatarUtils';

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
      hitSlop={hitSlop || { top: 20, bottom: 20, left: 20, right: 20 }}
      // Maintient l'état pressé même si le doigt glisse un peu en dehors
      pressRetentionOffset={{ top: 20, bottom: 20, left: 20, right: 20 }}
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
          hitSlop={{ top: 30, bottom: 30, left: 30, right: 30 }}
        >
          {(() => {
            const source = getAvatarSource(user?.avatar);
            return source ? (
              <Image source={source} style={styles.avatar} />
            ) : (
              <Ionicons name="person-circle-outline" size={45} color="#fff" />
            );
          })()}
        </HeaderTouchable>
        
        <View style={styles.userText}>
          <HeaderTouchable 
            onPress={() => navigation.navigate('Profile')}
            onPlaySound={onPlaySound}
            hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
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
          hitSlop={{ top: 30, bottom: 30, left: 30, right: 30 }}
          style={styles.iconButton}
        >
          <Ionicons name="search-outline" size={28} color="#fff" />
        </HeaderTouchable>
        
        <HeaderTouchable 
          onPress={onSettings}
          onPlaySound={onPlaySound}
          hitSlop={{ top: 30, bottom: 30, left: 30, right: 30 }}
          style={styles.iconButton}
        >
          <Ionicons name="settings-outline" size={28} color="#fff" />
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
    padding: 20,
    paddingTop: 50,
    backgroundColor: 'rgba(4, 28, 85, 0.95)',
    borderBottomWidth: 1,
    borderBottomColor: '#f1c40f',
    zIndex: 1000, // Assure que le header est au-dessus du contenu scrollable
    elevation: 5, // Pour Android
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatar: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    borderWidth: 2,
    borderColor: '#fff',
  },
  userText: {
    justifyContent: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  welcome: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  coins: {
    color: '#f1c40f',
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  iconButton: {
    padding: 8, // Augmenté pour atteindre ~44px avec l'icône de 28px
  },
});

export default HomeHeader;
