import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { API_URL } from '../config';
import { getAvatarSource } from '../utils/avatarUtils';

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
    borderRadius: 30,
    padding: 5,
    paddingRight: 15,
    marginHorizontal: 5,
    minWidth: 120,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  meCard: {
      borderColor: '#4CAF50',
  },
  opponentCard: {
      borderColor: '#FF5252',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#fff',
  },
  info: {
      flex: 1,
  },
  pseudo: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  coins: {
    color: '#FFD700',
    fontSize: 11,
    fontWeight: 'bold',
  },
});

export default PlayerProfileCard;
