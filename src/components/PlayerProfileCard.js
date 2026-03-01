import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { API_URL } from '../config';
import { getAvatarSource } from '../utils/avatarUtils';
import { getResponsiveSize } from '../utils/responsive';

const PlayerProfileCard = ({ player, isMe, style }) => {
  if (!player) return null;

  let avatarSource = getAvatarSource(player.avatar);
  if (!avatarSource) {
      avatarSource = { uri: 'https://i.pravatar.cc/150' };
  }

  return (
    <View style={[styles.card, isMe ? styles.meCard : styles.opponentCard, style]}>
      <Image source={avatarSource} style={styles.avatar} />
      <View style={styles.info}>
        <Text style={styles.pseudo} numberOfLines={1}>{player.pseudo || 'Joueur'}</Text>
        <Text style={styles.coins}>{player.coins} 🪙</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: getResponsiveSize(30),
    padding: getResponsiveSize(5),
    paddingRight: getResponsiveSize(15),
    marginHorizontal: getResponsiveSize(5),
    minWidth: getResponsiveSize(120),
    borderWidth: getResponsiveSize(1),
    borderColor: 'rgba(255,255,255,0.1)',
  },
  meCard: {
      borderColor: '#4CAF50',
  },
  opponentCard: {
      borderColor: '#FF5252',
  },
  avatar: {
    width: getResponsiveSize(40),
    height: getResponsiveSize(40),
    borderRadius: getResponsiveSize(20),
    marginRight: getResponsiveSize(8),
    borderWidth: getResponsiveSize(1),
    borderColor: '#fff',
  },
  info: {
      flex: 1,
  },
  pseudo: {
    color: '#fff',
    fontSize: getResponsiveSize(12),
    fontWeight: 'bold',
  },
  coins: {
    color: '#FFD700',
    fontSize: getResponsiveSize(11),
    fontWeight: 'bold',
  },
});

export default PlayerProfileCard;
