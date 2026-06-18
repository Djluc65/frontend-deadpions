// DeadPions — TournamentLobbyScreen.jsx — lobby avec recherche, filtres et suppression
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  TextInput, StyleSheet, Alert, ActivityIndicator,
  RefreshControl, SafeAreaView
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSelector, useDispatch } from 'react-redux';
import { socket } from '../utils/socket';
import { setTournament } from '../redux/slices/tournamentSlice';
import { API_URL } from '../config';
import { T, TY } from '../utils/theme';
import { Ionicons } from '@expo/vector-icons';
import { appAlert } from '../services/appAlert';
import Button from '../components/common/Button';

// ─── Carte tournoi ────────────────────────────────────
function TournamentCard({ item, currentUserId, onSupprimer, onRejoindre, onVoirBracket }) {
  const isCreator = item.creatorUserId === currentUserId;
  const isFull = item.inscrits >= item.size;
  const isInProgress = item.status === 'in_progress';

  const modeLabel = {
    classique: 'Classique',
    chrono: 'Chrono',
    blitz: 'Blitz'
  }[item.mode] || 'Classique';

  const progressPct = Math.min((item.inscrits / item.size) * 100, 100);

  return (
    <View style={styles.card}>
      {/* Header : nom + pot */}
      <View style={styles.cardHeader}>
        <Text style={styles.tournamentName} numberOfLines={1}>{item.name}</Text>
        <View style={styles.potBadge}>
          <Text style={styles.potText}>Pot : {item.potTotal}</Text>
        </View>
      </View>

      {/* Sous-titre */}
      <Text style={styles.cardSubtitle}>
        Mise : {item.entryFee} coins • {modeLabel}
        {isInProgress ? '  🟢 En cours' : ''}
      </Text>

      {/* Visibilité + rang */}
      <View style={styles.metaRow}>
        <Text style={styles.metaText}>
          {item.visibilite === 'prive' || item.visibilite === 'private' ? '🔒 Privé' : 'Public'}
        </Text>
        <Text style={styles.metaText}>
          {item.rangMinimum === 'tous' || item.rangMinimum === 'all' ? 'Tous niveaux' : `${item.rangMinimum} et +`}
        </Text>
      </View>

      {/* Barre de progression */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progressPct}%`}]} />
        </View>
        <Text style={styles.progressText}>
          {item.inscrits} / {item.size} inscrits
        </Text>
      </View>

      {/* Gain vainqueur */}
      <Text style={styles.gainText}>
        🏆 Gain vainqueur : {item.gainVainqueur} coins
      </Text>

      {/* Boutons */}
      <View style={styles.cardActions}>
        {isInProgress ? (
          <TouchableOpacity
            style={styles.btnRejoindre}
            onPress={() => onVoirBracket(item._id)}
          >
            <Text style={styles.btnRejoindreText}>BRACKET</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.btnRejoindre, isFull && styles.btnDisabled]}
            onPress={() => !isFull && onRejoindre(item)}
            disabled={isFull}
          >
            <Text style={styles.btnRejoindreText}>
              {isFull ? 'COMPLET' : 'SALLE D\'ATTENTE'}
            </Text>
          </TouchableOpacity>
        )}

        {/* Bouton suppression visible uniquement pour le créateur */}
        {isCreator && !isInProgress && (
          <TouchableOpacity
            style={styles.btnSupprimer}
            onPress={() => onSupprimer(item)}
          >
            <Text style={styles.btnSupprimerText}>🗑️</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// ─── Écran principal ──────────────────────────────────
const TAILLES = ['2', '4', '8', '16', '32'];

export default function TournamentLobbyScreen({ navigation }) {
  const dispatch = useDispatch();
  const currentUser = useSelector(state => state.auth.user);
  const token = useSelector(state => state.auth.token);
  const currentUserId = currentUser?._id || currentUser?.id;
  const cleanupRef = useRef(null);

  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [filterSize, setFilterSize] = useState(null);  // null = tous

  // ─── Chargement initial via REST ────────────────────────
  const fetchTournaments = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const params = new URLSearchParams();
      if (filterSize) params.append('size', filterSize);
      if (search.trim()) params.append('search', search.trim());

      const response = await fetch(`${API_URL}/tournaments?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setTournaments(data.tournaments);
      }
    } catch (err) {
      console.error('[Lobby] fetchTournaments:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filterSize, search, token]);

  // Recharger à chaque focus de l'écran
  useFocusEffect(
    useCallback(() => {
      fetchTournaments();
    }, [fetchTournaments])
  );

  // Recharger quand le filtre taille change
  useEffect(() => {
    fetchTournaments();
  }, [filterSize]);

  // ─── Mises à jour temps réel via Socket.IO ───────────────
  useEffect(() => {
    if (!socket.connected) socket.connect();

    // Nouveau tournoi créé
    const onAdded = ({ tournament }) => {
      const tailleOk = !filterSize || tournament.size === parseInt(filterSize);
      const searchOk = !search.trim() ||
        tournament.name.toLowerCase().includes(search.trim().toLowerCase());
      if (tailleOk && searchOk) {
        setTournaments(prev => {
          if (prev.find(t => t._id === tournament._id)) return prev;
          return [tournament, ...prev];
        });
      }
    };

    // Tournoi mis à jour (nouveau joueur inscrit)
    const onUpdated = ({ tournamentId, inscrits, status }) => {
      setTournaments(prev => prev.map(t =>
        t._id === tournamentId ? { ...t, inscrits, status } : t
      ));
    };

    // Tournoi supprimé
    const onRemoved = ({ tournamentId }) => {
      setTournaments(prev => prev.filter(t => t._id !== tournamentId));
    };

    // Tournoi annulé (24h écoulées)
    const onCancelled = ({ tournamentId, tournamentName, message }) => {
      setTournaments(prev => prev.filter(t => t._id !== tournamentId));
      if (message) appAlert('Tournoi annulé', message);
    };

    socket.on('lobby_tournament_added', onAdded);
    socket.on('lobby_tournament_updated', onUpdated);
    socket.on('lobby_tournament_removed', onRemoved);
    socket.on('tournament_cancelled', onCancelled);

    cleanupRef.current = setTimeout(() => {
      socket.off('lobby_tournament_added', onAdded);
      socket.off('lobby_tournament_updated', onUpdated);
      socket.off('lobby_tournament_removed', onRemoved);
      socket.off('tournament_cancelled', onCancelled);
    }, 15000);

    return () => {
      socket.off('lobby_tournament_added', onAdded);
      socket.off('lobby_tournament_updated', onUpdated);
      socket.off('lobby_tournament_removed', onRemoved);
      socket.off('tournament_cancelled', onCancelled);
      clearTimeout(cleanupRef.current);
    };
  }, [filterSize, search]);

  // ─── Recherche (debounce 400 ms) ───────────────────────
  const searchTimeout = useRef(null);
  const handleSearch = (text) => {
    setSearch(text);
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      fetchTournaments();
    }, 400);
  };

  // ─── Suppression ───────────────────────────────────────
  const handleSupprimer = (item) => {
    Alert.alert(
      'Supprimer le tournoi',
      `Voulez-vous supprimer "${item.name}" ?\n\nTous les participants seront remboursés.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await fetch(`${API_URL}/tournaments/${item._id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
              });
              const data = await response.json();
              if (!data.success) {
                appAlert('Erreur', data.message || 'Impossible de supprimer');
              }
            } catch (err) {
              appAlert('Erreur', err.message || 'Erreur réseau');
            }
          }
        }
      ]
    );
  };

  // ─── Rejoindre ─────────────────────────────────────────
  const handleRejoindre = (item) => {
    if (item.visibilite === 'prive' || item.visibilite === 'private') {
      Alert.prompt(
        'Tournoi privé',
        'Entrez le code d\'invitation (6 chiffres) :',
        [
          { text: 'Annuler', style: 'cancel' },
          {
            text: 'Rejoindre',
            onPress: (code) => {
              dispatch(setTournament(item));
              navigation.navigate('TournamentWaitingRoom', {
                tournamentId: item._id,
                inviteCode: code
              });
            }
          }
        ],
        'plain-text'
      );
    } else {
      dispatch(setTournament(item));
      navigation.navigate('TournamentWaitingRoom', {
        tournamentId: item._id
      });
    }
  };

  // ─── Voir bracket ───────────────────────────────────────
  const handleVoirBracket = (tournamentId) => {
    navigation.navigate('TournamentBracket', { tournamentId });
  };

  // ─── État vide ──────────────────────────────────────────
  const renderEmpty = () => {
    if (loading) return null;
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="trophy-outline" size={64} color="rgba(255,255,255,0.1)" />
        <Text style={styles.emptyText}>Aucun tournoi disponible pour le moment.</Text>
        <Button
          title="CRÉER UN TOURNOI"
          tone="ghost"
          onPress={() => navigation.navigate('TournamentConfig')}
          style={{ marginTop: 20 }}
        />
      </View>
    );
  };

  // ─── Render ─────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={T.text} />
          </TouchableOpacity>
          <Text style={styles.title}>TOURNOIS</Text>
          <TouchableOpacity
            style={styles.btnPlus}
            onPress={() => navigation.navigate('TournamentConfig')}
          >
            <Ionicons name="add-circle" size={32} color={T.gold} />
          </TouchableOpacity>
        </View>

        {/* Barre de recherche */}
        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={16} color="#A8B4C9" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher un tournoi..."
            placeholderTextColor="#ECE6D660"
            value={search}
            onChangeText={handleSearch}
            returnKeyType="search"
            onSubmitEditing={() => fetchTournaments()}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => { setSearch(''); fetchTournaments(); }}>
              <Ionicons name="close-circle" size={16} color="#ECE6D6" />
            </TouchableOpacity>
          )}
        </View>

        {/* Filtres de taille */}
        <View style={styles.filterRow}>
          {TAILLES.map(t => (
            <TouchableOpacity
              key={t}
              style={[styles.filterBtn, filterSize === t && styles.filterBtnActive]}
              onPress={() => setFilterSize(prev => prev === t ? null : t)}
            >
              <Text style={[
                styles.filterText,
                filterSize === t && styles.filterTextActive
              ]}>
                {t}j
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Liste */}
        {loading ? (
          <ActivityIndicator
            size="large"
            color={T.gold}
            style={{ marginTop: 60 }}
          />
        ) : (
          <FlatList
            data={tournaments}
            keyExtractor={item => item._id}
            renderItem={({ item }) => (
              <TournamentCard
                item={item}
                currentUserId={currentUserId}
                onSupprimer={handleSupprimer}
                onRejoindre={handleRejoindre}
                onVoirBracket={handleVoirBracket}
              />
            )}
            ListEmptyComponent={renderEmpty}
            contentContainerStyle={
              tournaments.length === 0 ? styles.listEmpty : styles.list
            }
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => fetchTournaments(true)}
                tintColor={T.gold}
              />
            }
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

// ─── Styles ─────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#060B17',
  },
  container: {
    flex: 1,
    backgroundColor: '#060B17',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  backButton: {
    marginRight: 15,
  },
  title: {
    ...TY.heading,
    fontSize: 26,
    color: '#ECE6D6',
    letterSpacing: 1,
  },
  btnPlus: {
    padding: 5,
  },

  // Recherche
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0D1526',
    borderRadius: 12,
    marginHorizontal: 20,
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchInput: {
    flex: 1,
    color: '#ECE6D6',
    fontFamily: 'Inter',
    fontSize: 14,
  },

  // Filtres
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 10,
    marginBottom: 16,
  },
  filterBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#1A2035',
    borderWidth: 1,
    borderColor: '#2A3050',
  },
  filterBtnActive: {
    backgroundColor: '#F4B41A',
    borderColor: '#F4B41A',
  },
  filterText: {
    color: '#A8B4C9',
    fontFamily: 'BarlowCondensed-Bold',
    fontSize: 14,
  },
  filterTextActive: {
    color: '#060B17',
  },

  // Liste
  list: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  listEmpty: {
    flex: 1,
  },

  // Card
  card: {
    backgroundColor: '#0D1526',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#1E2A45',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  potBadge: {
    backgroundColor: 'rgba(244, 180, 26, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(244, 180, 26, 0.2)',
  },
  potText: {
    fontFamily: 'BarlowCondensed-Bold',
    fontSize: 12,
    color: '#F4B41A',
  },
  cardSubtitle: {
    fontFamily: 'Inter',
    fontSize: 13,
    color: '#A8B4C9',
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  metaText: {
    fontFamily: 'Inter',
    fontSize: 12,
    color: '#ECE6D660',
  },
  progressContainer: {
    gap: 4,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#1E2A45',
    borderRadius: 3,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#F4B41A',
    borderRadius: 3,
  },
  progressText: {
    fontFamily: 'Inter',
    fontSize: 12,
    color: '#6A7791',
    textAlign: 'right',
    marginBottom: 6,
  },
  gainText: {
    fontFamily: 'BarlowCondensed-Bold',
    fontSize: 14,
    color: '#F4B41A',
    marginBottom: 12,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 10,
  },
  btnRejoindre: {
    flex: 1,
    backgroundColor: '#F4B41A',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  btnDisabled: {
    backgroundColor: '#3A3010',
  },
  btnRejoindreText: {
    fontFamily: 'BarlowCondensed-Bold',
    fontSize: 15,
    color: '#060B17',
  },
  btnSupprimer: {
    backgroundColor: '#2A1515',
    borderRadius: 10,
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E74C3C',
  },
  btnSupprimerText: {
    fontSize: 18,
  },

  // État vide
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
  },
  emptyText: {
    fontFamily: 'Inter',
    fontSize: 15,
    color: '#6A7791',
    marginTop: 15,
    textAlign: 'center',
  },
});