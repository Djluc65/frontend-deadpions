import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, ImageBackground, Image, useWindowDimensions, Platform } from 'react-native';
import { AppTouchableOpacity as TouchableOpacity } from '../components/common/AppTouchable';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { socket } from '../utils/socket';
import { API_URL } from '../config';
import { getAvatarSource as getBaseAvatarSource } from '../utils/avatarUtils';

import { getResponsiveSize } from '../utils/responsive';
import { T } from '../utils/theme';
import AnimatedSearchBar from '../components/ui/AnimatedSearchBar';

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
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const isDesktop = Platform.OS === 'web' && width >= 1024;
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
      <View style={styles.bgOverlay} pointerEvents="none" />
      <View style={[styles.header, isTablet && styles.headerTablet, isDesktop && styles.headerDesktop]}>
        <Text style={styles.title}>Salles Live</Text>
        <View style={{ paddingHorizontal: getResponsiveSize(20), marginBottom: getResponsiveSize(15) }}>
            <AnimatedSearchBar
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Rechercher une salle..."
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
        numColumns={isDesktop ? 3 : isTablet ? 2 : 1}
        key={isDesktop ? 'lives-3col' : isTablet ? 'lives-2col' : 'lives-1col'}
        columnWrapperStyle={(isTablet || isDesktop) ? styles.columnWrapper : undefined}
        contentContainerStyle={[styles.listContent, isTablet && styles.listContentTablet, isDesktop && styles.listContentDesktop]}
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
  bgOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(5,9,15,0.55)',
  },
  container: {
    flex: 1,
    paddingTop: getResponsiveSize(50),
    backgroundColor: T.bg0,
  },
  header: {
    paddingHorizontal: getResponsiveSize(16),
    marginBottom: getResponsiveSize(16),
  },
  headerTablet: {
    maxWidth: 700,
    width: '100%',
    alignSelf: 'center',
  },
  headerDesktop: {
    maxWidth: 1100,
    width: '100%',
    alignSelf: 'center',
  },
  title: {
    fontSize: getResponsiveSize(26),
    fontWeight: '900',
    color: T.text,
    marginBottom: getResponsiveSize(14),
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: T.bg2,
    borderRadius: getResponsiveSize(T.radiusMd),
    paddingHorizontal: getResponsiveSize(14),
    height: getResponsiveSize(46),
    marginBottom: getResponsiveSize(12),
    borderWidth: 1,
    borderColor: T.borderSoft,
  },
  searchIcon: {
    marginRight: getResponsiveSize(10),
  },
  searchInput: {
    flex: 1,
    color: T.text,
    fontSize: getResponsiveSize(15),
  },
  filters: {
    flexDirection: 'row',
    gap: getResponsiveSize(8),
  },
  filterChip: {
    paddingVertical: getResponsiveSize(6),
    paddingHorizontal: getResponsiveSize(14),
    borderRadius: getResponsiveSize(T.radiusPill),
    backgroundColor: T.bg2,
    borderWidth: 1,
    borderColor: T.borderSoft,
  },
  filterChipActive: {
    backgroundColor: T.red,
    borderColor: T.red,
  },
  filterText: {
    color: T.textDim,
    fontSize: getResponsiveSize(13),
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.2,
  },
  filterTextActive: {
    color: '#fff',
    fontWeight: '800',
  },
  listContent: {
    paddingHorizontal: getResponsiveSize(16),
    paddingBottom: getResponsiveSize(100),
  },
  listContentTablet: {
    maxWidth: 900,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: getResponsiveSize(20),
  },
  listContentDesktop: {
    maxWidth: 1100,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: getResponsiveSize(24),
  },
  columnWrapper: {
    justifyContent: 'space-between',
    gap: getResponsiveSize(14),
  },
  card: {
    backgroundColor: T.bg2,
    borderRadius: getResponsiveSize(T.radiusMd),
    padding: getResponsiveSize(14),
    marginBottom: getResponsiveSize(14),
    borderWidth: 1,
    borderColor: T.borderSoft,
    ...T.shadowCard,
    flex: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: getResponsiveSize(14),
  },
  badgeContainer: {
    flexDirection: 'row',
    gap: getResponsiveSize(6),
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: getResponsiveSize(8),
    paddingVertical: getResponsiveSize(4),
    borderRadius: getResponsiveSize(T.radiusSm),
  },
  badgeWaiting: {
    backgroundColor: 'rgba(244,180,26,0.15)',
    borderWidth: 1,
    borderColor: T.gold,
  },
  badgeLive: {
    backgroundColor: 'rgba(230,57,70,0.15)',
    borderWidth: 1,
    borderColor: T.red,
  },
  indicator: {
    width: getResponsiveSize(6),
    height: getResponsiveSize(6),
    borderRadius: getResponsiveSize(3),
    backgroundColor: T.red,
    marginRight: getResponsiveSize(5),
  },
  badgeText: {
    fontSize: getResponsiveSize(10),
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    color: T.textDim,
  },
  spectators: {
    fontSize: getResponsiveSize(11),
    color: T.textMuted,
    fontWeight: '600',
  },
  playersContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: getResponsiveSize(14),
    paddingHorizontal: getResponsiveSize(8),
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
    borderWidth: 2,
    borderColor: T.border,
  },
  playerName: {
    fontSize: getResponsiveSize(13),
    fontWeight: '700',
    color: T.text,
    textAlign: 'center',
  },
  playerCountry: {
    fontSize: getResponsiveSize(11),
    marginTop: getResponsiveSize(2),
    color: T.textMuted,
  },
  vsContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  vsText: {
    fontSize: getResponsiveSize(20),
    fontWeight: '900',
    color: T.red,
    letterSpacing: 0.5,
  },
  divider: {
    height: 1,
    backgroundColor: T.borderSoft,
    marginBottom: getResponsiveSize(12),
  },
  joinButton: {
    backgroundColor: T.bg3,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: getResponsiveSize(10),
    borderRadius: getResponsiveSize(T.radiusMd),
    gap: getResponsiveSize(8),
    borderWidth: 1,
    borderColor: T.borderSoft,
  },
  joinButtonActive: {
    backgroundColor: T.blue,
    borderColor: T.blue,
    shadowColor: T.blue,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  joinButtonText: {
    color: T.text,
    fontWeight: '700',
    fontSize: getResponsiveSize(12),
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  joinButtonTextActive: {
    fontSize: getResponsiveSize(13),
    color: '#fff',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: getResponsiveSize(50),
  },
  emptyText: {
    color: T.textMuted,
    marginTop: getResponsiveSize(10),
    fontSize: getResponsiveSize(15),
  },
});

export default LiveListScreen;
