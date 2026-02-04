import React, { memo } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { API_URL } from '../../config';

const HomeHeader = memo(({ user, t, navigation, onSearch, onSettings, onLogout, onPlaySound }) => {
  return (
    <View style={styles.header}>
      <View style={styles.userInfo}>
        <TouchableOpacity 
          hitSlop={{ top: 30, bottom: 30, left: 30, right: 30 }}
          onPress={async () => {
            if (onPlaySound) await onPlaySound();
            navigation.navigate('Profile');
          }}>
          {user?.avatar ? (
            <Image 
              source={
                user.avatar.startsWith('http') 
                  ? { uri: user.avatar } 
                  : user.avatar.startsWith('/uploads')
                    ? { uri: `${API_URL.replace('/api', '')}${user.avatar}` }
                    : { uri: user.avatar }
              } 
              style={styles.avatar} 
            />
          ) : (
            <Ionicons name="person-circle-outline" size={45} color="#fff" />
          )}
        </TouchableOpacity>
        <View style={styles.userText}>
          <TouchableOpacity 
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            onPress={async () => {
              if (onPlaySound) await onPlaySound();
              navigation.navigate('Profile');
            }}>
            <Text style={styles.welcome}>{user?.pseudo || t.welcome}</Text>
          </TouchableOpacity>
          <Text style={styles.coins}>💰 {user?.coins || 0}</Text>
        </View>
      </View>

      <View style={styles.headerIcons}>
        <TouchableOpacity 
          hitSlop={{ top: 30, bottom: 30, left: 30, right: 30 }}
          onPress={async () => {
            if (onPlaySound) await onPlaySound();
            if (onSearch) onSearch();
          }} style={styles.iconButton}>
          <Ionicons name="search-outline" size={28} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity 
          hitSlop={{ top: 30, bottom: 30, left: 30, right: 30 }}
          onPress={async () => {
            if (onPlaySound) await onPlaySound();
            if (onSettings) onSettings();
          }} style={styles.iconButton}>
          <Ionicons name="settings-outline" size={28} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity 
          hitSlop={{ top: 30, bottom: 30, left: 30, right: 30 }}
          onPress={async () => {
            if (onPlaySound) await onPlaySound();
            if (onLogout) onLogout();
          }} style={styles.iconButton}>
          <Ionicons name="log-out-outline" size={28} color="#ff6b6b" />
        </TouchableOpacity>
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
    padding: 5,
  },
});

export default HomeHeader;
