import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, ImageBackground, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { socket } from '../utils/socket';
import { API_URL } from '../config';
import { getAvatarSource as getBaseAvatarSource } from '../utils/avatarUtils';

import { getResponsiveSize } from '../utils/responsive';

// Helper pour les avatars
const getAvatarSource = (avatar) => {
    const source = getBaseAvatarSource(avatar);
    if (source) return source;
    // Fallback default image since local avatar files are missing
    return require('../../assets/images/LogoDeadPions-nobg.png');
};

/**
 * Écran pour lister les salles live disponibles.
 * Permet de voir et rejoindre une salle en tant que spectateur.
 */
const LiveListScreen = () => {
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const user = useSelector(state => state.auth.user);
  const [searchQuery, setSearchQuery] = useState('');
  const [lives, setLives] = useState([]); // Liste des lives
  const [filter, setFilter] = useState('all'); // 'all', 'bet', 'friendly'

  const loadLives = () => {
      socket.emit('get_active_live_games');
  };

  useEffect(() => {
    if (isFocused) {
        loadLives();
        const interval = setInterval(loadLives, 5000); // Rafraîchir toutes les 5s
        return () => clearInterval(interval);
    }
  }, [isFocused]);

  useEffect(() => {
      const handleLiveGames = (games) => {
          setLives(games);
      };

      socket.on('active_live_games', handleLiveGames);
      
      return () => {
          socket.off('active_live_games', handleLiveGames);
      };
  }, []);

  const filteredLives = lives.filter(live => {
    const p1Name = live.players.black?.pseudo || 'Inconnu';
    const p2Name = live.players.white?.pseudo || 'Inconnu';
    const matchName = `${p1Name} vs ${p2Name}`;

    const matchesSearch = matchName.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesFilter = filter === 'all' || 
                          (filter === 'bet' && live.betAmount > 0) || 
                          (filter === 'friendly' && live.betAmount === 0);
                          
    return matchesSearch && matchesFilter;
  });

  const renderLiveItem = ({ item }) => {
    const p1 = item.players.black;
    const p2 = item.players.white;
    
    const isParticipant = (p1 && (p1._id === user?._id || p1.id === user?._id)) || (p2 && (p2._id === user?._id || p2.id === user?._id));
    const canJoin = !isParticipant && item.status === 'waiting' && !p2;

    const handlePress = () => {
        if (isParticipant || canJoin) {
            if (item.status === 'active') {
                navigation.navigate('Game', { mode: 'live', gameId: item.id });
            } else {
                navigation.navigate('SalleAttenteLive', { configSalle: item.config });
            }
        } else {
            navigation.navigate('Game', { mode: 'spectator', gameId: item.id });
        }
    };

    return (
      <TouchableOpacity 
        style={styles.card}
        onPress={handlePress}
      >
        <View style={styles.cardHeader}>
          <View style={styles.badgeContainer}>
              <View style={[styles.badge, item.status === 'waiting' ? styles.badgeWaiting : styles.badgeLive]}>
                  <View style={[styles.indicator, item.status === 'waiting' ? styles.indicatorWaiting : null]} />
                  <Text style={[styles.badgeText, item.status === 'waiting' ? styles.textWaiting : null]}>
                      {item.status === 'waiting' ? 'EN ATTENTE' : 'EN DIRECT'}
                  </Text>
              </View>
              <View style={[styles.badge, { backgroundColor: item.betAmount > 0 ? 'rgba(241, 196, 15, 0.1)' : 'rgba(59, 130, 246, 0.1)', borderColor: item.betAmount > 0 ? '#f1c40f' : '#3b82f6', borderWidth: getResponsiveSize(1) }]}>
                  <Text style={[styles.badgeText, { color: item.betAmount > 0 ? '#f1c40f' : '#3b82f6' }]}>
                      {item.betAmount > 0 ? `${item.betAmount} 💰` : 'Amical'}
                  </Text>
              </View>
          </View>
          <Text style={styles.spectators}>
              👥 {item.spectatorCount || 0} • ⏱️ {item.timeControl ? `${item.timeControl}s` : '∞'}
          </Text>
        </View>
        
        <View style={styles.playersContainer}>
             <View style={styles.playerInfo}>
                 <Image source={getAvatarSource(p1?.avatar)} style={styles.avatarSmall} />
                 <Text style={styles.playerName} numberOfLines={1}>{p1?.pseudo || 'Joueur 1'}</Text>
                 <Text style={styles.playerCountry}>{p1?.country || '🏳️'}</Text>
             </View>

             <View style={styles.vsContainer}>
                <Text style={styles.vsText}>VS</Text>
             </View>

             <View style={styles.playerInfo}>
                 {p2 ? (
                    <>
                        <Image source={getAvatarSource(p2?.avatar)} style={styles.avatarSmall} />
                        <Text style={styles.playerName} numberOfLines={1}>{p2?.pseudo || 'Joueur 2'}</Text>
                        <Text style={styles.playerCountry}>{p2?.country || '🏳️'}</Text>
                    </>
                 ) : (
                    <View style={styles.waitingSlot}>
                        <Ionicons name="help-outline" size={getResponsiveSize(24)} color="#6b7280" />
                        <Text style={styles.waitingText}>En attente...</Text>
                    </View>
                 )}
             </View>
        </View>
        
        <View style={styles.divider} />
        
        <TouchableOpacity 
            style={[styles.joinButton, canJoin && styles.joinButtonActive]}
            onPress={handlePress}
        >
            <Text style={[styles.joinButtonText, canJoin && styles.joinButtonTextActive]}>
                {isParticipant ? 'RETOURNER À LA PARTIE' : canJoin ? 'REJOINDRE (JOUEUR)' : 'REGARDER LE MATCH'}
            </Text>
            <Ionicons name={canJoin ? "game-controller" : "eye"} size={getResponsiveSize(16)} color={canJoin ? "#fff" : "#fff"} />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <ImageBackground 
      source={require('../../assets/images/Background2-4.png')} 
      style={styles.container}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Salles Live</Text>
        <View style={styles.searchContainer}>
            <Ionicons name="search" size={getResponsiveSize(20)} color="#9ca3af" style={styles.searchIcon} />
            <TextInput
                style={styles.searchInput}
                placeholder="Rechercher un joueur..."
                placeholderTextColor="#9ca3af"
                value={searchQuery}
                onChangeText={setSearchQuery}
            />
        </View>
        
        <View style={styles.filters}>
            <TouchableOpacity 
                style={[styles.filterChip, filter === 'all' && styles.filterChipActive]}
                onPress={() => setFilter('all')}
            >
                <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>Tous</Text>
            </TouchableOpacity>
            <TouchableOpacity 
                style={[styles.filterChip, filter === 'bet' && styles.filterChipActive]}
                onPress={() => setFilter('bet')}
            >
                <Text style={[styles.filterText, filter === 'bet' && styles.filterTextActive]}>Mise 💰</Text>
            </TouchableOpacity>
            <TouchableOpacity 
                style={[styles.filterChip, filter === 'friendly' && styles.filterChipActive]}
                onPress={() => setFilter('friendly')}
            >
                <Text style={[styles.filterText, filter === 'friendly' && styles.filterTextActive]}>Amical 🤝</Text>
            </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={filteredLives}
        renderItem={renderLiveItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
            <View style={styles.emptyState}>
                <Ionicons name="videocam-off-outline" size={getResponsiveSize(48)} color="rgba(255,255,255,0.3)" />
                <Text style={styles.emptyText}>Aucun live en cours</Text>
            </View>
        }
      />
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: getResponsiveSize(50),
  },
  header: {
    paddingHorizontal: getResponsiveSize(20),
    marginBottom: getResponsiveSize(20),
  },
  title: {
    fontSize: getResponsiveSize(28),
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: getResponsiveSize(15),
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: getResponsiveSize(12),
    paddingHorizontal: getResponsiveSize(15),
    height: getResponsiveSize(50),
    marginBottom: getResponsiveSize(15),
    borderWidth: getResponsiveSize(1),
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  searchIcon: {
    marginRight: getResponsiveSize(10),
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: getResponsiveSize(16),
  },
  filters: {
    flexDirection: 'row',
    gap: getResponsiveSize(10),
  },
  filterChip: {
    paddingVertical: getResponsiveSize(6),
    paddingHorizontal: getResponsiveSize(16),
    borderRadius: getResponsiveSize(20),
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: getResponsiveSize(1),
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  filterChipActive: {
    backgroundColor: '#ef4444',
    borderColor: '#ef4444',
  },
  filterText: {
    color: '#d1d5db',
    fontSize: getResponsiveSize(14),
    fontWeight: '500',
  },
  filterTextActive: {
    color: '#fff',
    fontWeight: 'bold',
  },
  listContent: {
    paddingHorizontal: getResponsiveSize(20),
    paddingBottom: getResponsiveSize(100),
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: getResponsiveSize(16),
    padding: getResponsiveSize(16),
    marginBottom: getResponsiveSize(16),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: getResponsiveSize(2) },
    shadowOpacity: 0.1,
    shadowRadius: getResponsiveSize(4),
    elevation: getResponsiveSize(3),
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: getResponsiveSize(15),
  },
  badgeContainer: {
    flexDirection: 'row',
    gap: getResponsiveSize(8),
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: getResponsiveSize(8),
    paddingVertical: getResponsiveSize(4),
    borderRadius: getResponsiveSize(8),
  },
  badgeWaiting: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    borderWidth: getResponsiveSize(1),
    borderColor: '#f59e0b',
  },
  badgeLive: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderWidth: getResponsiveSize(1),
    borderColor: '#ef4444',
  },
  indicator: {
    width: getResponsiveSize(6),
    height: getResponsiveSize(6),
    borderRadius: getResponsiveSize(3),
    backgroundColor: '#ef4444',
    marginRight: getResponsiveSize(6),
  },
  badgeText: {
    fontSize: getResponsiveSize(10),
    fontWeight: 'bold',
  },
  spectators: {
    fontSize: getResponsiveSize(12),
    color: '#6b7280',
    fontWeight: '600',
  },
  playersContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: getResponsiveSize(15),
      paddingHorizontal: getResponsiveSize(10),
  },
  playerInfo: {
      alignItems: 'center',
      width: '40%',
  },
  avatarSmall: {
      width: getResponsiveSize(50),
      height: getResponsiveSize(50),
      borderRadius: getResponsiveSize(25),
      marginBottom: getResponsiveSize(8),
      borderWidth: getResponsiveSize(2),
      borderColor: '#e5e7eb',
  },
  playerName: {
      fontSize: getResponsiveSize(14),
      fontWeight: 'bold',
      color: '#1f2937',
      textAlign: 'center',
  },
  playerCountry: {
      fontSize: getResponsiveSize(12),
      marginTop: getResponsiveSize(2),
  },
  vsContainer: {
      justifyContent: 'center',
      alignItems: 'center',
  },
  vsText: {
      fontSize: getResponsiveSize(20),
      fontWeight: '900',
      color: '#ef4444',
      fontStyle: 'italic',
  },
  divider: {
    height: getResponsiveSize(1),
    backgroundColor: '#f3f4f6',
    marginBottom: getResponsiveSize(12),
  },
  joinButton: {
    backgroundColor: '#041c55',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: getResponsiveSize(10),
    borderRadius: getResponsiveSize(8),
    gap: getResponsiveSize(8),
  },
  joinButtonActive: {
    backgroundColor: '#2563eb', // Bleu plus vif pour rejoindre
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: getResponsiveSize(2) },
    shadowOpacity: 0.3,
    shadowRadius: getResponsiveSize(4),
    elevation: getResponsiveSize(3),
  },
  joinButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: getResponsiveSize(12),
  },
  joinButtonTextActive: {
    fontSize: getResponsiveSize(13),
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: getResponsiveSize(50),
  },
  emptyText: {
    color: 'rgba(255, 255, 255, 0.5)',
    marginTop: getResponsiveSize(10),
    fontSize: getResponsiveSize(16),
  },
});

export default LiveListScreen;
