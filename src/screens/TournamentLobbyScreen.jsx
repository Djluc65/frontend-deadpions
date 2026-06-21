
// DeadPions — TournamentLobbyScreen.jsx — 2026-06-19
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  TextInput, StyleSheet, Alert, ActivityIndicator,
  RefreshControl, SafeAreaView
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useSelector, useDispatch } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { socket } from '../utils/socket';
import { setTournament } from '../redux/slices/tournamentSlice';
import { API_URL } from '../config';
import { appAlert } from '../services/appAlert';
import TournamentJoinByCodeModal from '../components/TournamentJoinByCodeModal';
import { getResponsiveSize } from '../utils/responsive';
import { useTournamentLayout, CARD_MAX_WIDTH } from '../utils/tournamentLayout';

const rs = getResponsiveSize;

function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric'
  });
}

// ─────────────────────────────────────────────────────
// ONGLETS
// ─────────────────────────────────────────────────────
const TAB_KEYS = ['mesCreations', 'disponibles', 'passes'];

const TAB_LABEL_KEYS = {
  mesCreations: 'tournament.lobby.tab_mine',
  disponibles: 'tournament.lobby.tab_available',
  passes: 'tournament.lobby.tab_past',
};

const STATUS_COLORS = {
  waiting: '#F4B41A',
  in_progress: '#2ECC71',
  finished: '#7F8C8D',
  cancelled: '#E74C3C',
};

function TabBar({ activeTab, counts, onSelect, t, isTablet, centeredContainer }) {
  return (
    <View style={[tabStyles.tabBar, isTablet && { ...centeredContainer, marginHorizontal: 0 }]}>
      {TAB_KEYS.map((tabKey, i) => {
        const isActive = activeTab === tabKey;
        const count = counts[tabKey] || 0;
        return (
          <TouchableOpacity
            key={tabKey}
            style={[
              tabStyles.tabBtn,
              isActive && tabStyles.tabBtnActive,
              i === 0 && tabStyles.tabBtnFirst,
              i === TAB_KEYS.length - 1 && tabStyles.tabBtnLast
            ]}
            onPress={() => onSelect(tabKey)}
            activeOpacity={0.8}
          >
            {/* Badge */}
            {count > 0 && (
              <View style={[tabStyles.tabBadge, isActive && tabStyles.tabBadgeActive]}>
                <Text style={[tabStyles.tabBadgeText, isActive && tabStyles.tabBadgeTextActive]}>
                  {count}
                </Text>
              </View>
            )}
            <Text style={[tabStyles.tabLabel, isActive && tabStyles.tabLabelActive]}>
              {t(TAB_LABEL_KEYS[tabKey])}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ─────────────────────────────────────────────────────
// CARTE TOURNOI
// ─────────────────────────────────────────────────────
function TournamentCard({
  item, sectionKey, currentUserId,
  onSupprimer, onRejoindre, onVoirBracket, onVoirResultat, t,
  isTablet,
}) {
  const isCreator = item.creatorUserId === currentUserId;
  const isFull = item.inscrits >= item.size;
  const isWaiting = item.status === 'waiting';
  const isInProgress = item.status === 'in_progress';
  const isPasse = item.status === 'finished' || item.status === 'cancelled';
  const progressPct = Math.min((item.inscrits / item.size) * 100, 100);
  const statusColor = STATUS_COLORS[item.status] || STATUS_COLORS.waiting;
  const modeKey = ({ classic: 'classique', classique: 'classique', chrono: 'chrono', blitz: 'blitz' })[item.mode] || 'classique';

  return (
    <View style={isTablet ? { width: CARD_MAX_WIDTH, alignSelf: 'center' } : undefined}>
    <View style={[c.card, isPasse && c.cardPasse, isTablet && { marginHorizontal: 0, padding: rs(18) }]}>
      {/* Ligne 1 : nom + statut */}
      <View style={c.row}>
        <Text style={[c.nom, isPasse && c.nomPasse]} numberOfLines={1}>
          {item.name}
        </Text>
        <View style={[c.statusBadge, { borderColor: statusColor }]}>
          <Text style={[c.statusText, { color: statusColor }]}>
            {t(`tournament.common.${item.status}`, { defaultValue: t('tournament.common.waiting') })}
          </Text>
        </View>
      </View>

      {/* Ligne 2 : mise + mode + taille / pot */}
      <View style={c.row}>
        <Text style={c.sub}>
          {item.entryFee} {t('tournament.common.coins')} • {t(`tournament.common.${modeKey}`)}
          {' '}• {t('tournament.lobby.size_filter', { size: item.size })}
        </Text>
        <View style={c.potBadge}>
          <Text style={c.potText}>{t('tournament.common.pot', { amount: item.potTotal })}</Text>
        </View>
      </View>

      {/* Ligne 3 : visibilité + rang */}
      <View style={c.row}>
        <Text style={c.meta}>
          {item.visibilite === 'prive' || item.visibilite === 'private'
            ? t('tournament.common.private')
            : t('tournament.common.public')}
        </Text>
        <Text style={c.meta}>
          {item.rangMinimum === 'tous' || item.rangMinimum === 'all'
            ? t('tournament.common.all_levels')
            : t(`tournament.config.options.rank_${item.rangMinimum}`, {
              defaultValue: t('tournament.common.rank_plus', { rank: item.rangMinimum })
            })}
        </Text>
      </View>

      {/* Barre de progression (sauf passés) */}
      {!isPasse && (
        <>
          <View style={c.progressBg}>
            <View style={[c.progressFill, { width: `${progressPct}%` }]} />
          </View>
          <View style={c.row}>
            <Text style={c.inscrit}>
              {t('tournament.common.inscribed', { current: item.inscrits, total: item.size })}
            </Text>
            <Text style={c.gain}>{t('tournament.common.winner_gain', { amount: item.gainVainqueur })}</Text>
          </View>
        </>
      )}

      {/* Date pour les passés */}
      {isPasse && (
        <Text style={c.dateText}>
          {item.status === 'finished'
            ? t('tournament.lobby.finished_at', { date: formatDate(item.updatedAt) })
            : t('tournament.lobby.cancelled_at', { date: formatDate(item.updatedAt) })}
        </Text>
      )}

      {/* Actions */}
      <View style={c.actions}>
        {isWaiting && sectionKey !== 'mesCreations' && !isFull && (
          <TouchableOpacity style={c.btnPrimary} onPress={() => onRejoindre(item)}>
            <Text style={c.btnPrimaryText}>{t('tournament.lobby.btn_waiting_room')}</Text>
          </TouchableOpacity>
        )}

        {isWaiting && (isFull || sectionKey === 'mesCreations') && (
          <TouchableOpacity style={c.btnOutline} onPress={() => onVoirBracket(item._id)}>
            <Text style={c.btnOutlineText}>{t('tournament.lobby.btn_see_room')}</Text>
          </TouchableOpacity>
        )}

        {isInProgress && (
          <TouchableOpacity style={c.btnPrimary} onPress={() => onVoirBracket(item._id)}>
            <Text style={c.btnPrimaryText}>{t('tournament.lobby.btn_bracket')}</Text>
          </TouchableOpacity>
        )}

        {isPasse && (
          <TouchableOpacity style={c.btnGhost} onPress={() => onVoirResultat(item._id)}>
            <Text style={c.btnGhostText}>{t('tournament.lobby.btn_results')}</Text>
          </TouchableOpacity>
        )}

        {isCreator && !isInProgress && !isPasse && (
          <TouchableOpacity style={c.btnDelete} onPress={() => onSupprimer(item)}>
            <Text style={c.btnDeleteIcon}>🗑</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────
// ÉTAT VIDE PAR ONGLET
// ─────────────────────────────────────────────────────
function EmptyTab({ sectionKey, onCreer, t }) {
  const config = {
    mesCreations: {
      icon: '🏆',
      textKey: 'tournament.lobby.empty_mine',
      cta: true
    },
    disponibles: {
      icon: '🎯',
      textKey: 'tournament.lobby.empty_available',
      cta: true
    },
    passes: {
      icon: '📋',
      textKey: 'tournament.lobby.empty_past',
      cta: false
    }
  }[sectionKey];

  return (
    <View style={e.container}>
      <Text style={e.icon}>{config.icon}</Text>
      <Text style={e.text}>{t(config.textKey)}</Text>
      {config.cta && (
        <TouchableOpacity style={e.btn} onPress={onCreer}>
          <Text style={e.btnText}>{t('tournament.lobby.btn_create')}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─────────────────────────────────────────────────────
// ÉCRAN PRINCIPAL
// ─────────────────────────────────────────────────────
const TAILLES = ['4', '8', '16', '32'];

export default function TournamentLobbyScreen({ navigation }) {
  const { t } = useTranslation();
  const { isTablet, centeredContainer, contentWidth } = useTournamentLayout();
  const dispatch = useDispatch();
  const currentUser = useSelector(state => state.auth.user);
  const token = useSelector(state => state.auth.token);
  const cleanupRef = useRef(null);
  const searchRef = useRef(null);

  const [mesCreations, setMesCreations] = useState([]);
  const [disponibles, setDisponibles] = useState([]);
  const [passes, setPasses] = useState([]);

  const [activeTab, setActiveTab] = useState('mesCreations');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [filterTaille, setFilterTaille] = useState(null);
  const [joinByCodeVisible, setJoinByCodeVisible] = useState(false);

  // ─── Fetch ───────────────────────────────────────────
  const fetchAll = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterTaille) params.append('size', filterTaille);
      if (search.trim()) params.append('search', search.trim());

      const response = await fetch(`${API_URL}/tournaments?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setMesCreations(data.mesCreations || []);
        setDisponibles(data.disponibles || []);
        setPasses(data.passes || []);
      }
    } catch (err) {
      console.error('[Lobby] fetch:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filterTaille, search, token]);

  useFocusEffect(
    useCallback(() => { fetchAll(); }, [fetchAll])
  );
  useEffect(() => { fetchAll(); }, [filterTaille]);

  // ─── Socket temps réel ───────────────────────────────
  useEffect(() => {
    if (!socket.connected) socket.connect();

    const onAdded = ({ tournament: tData }) => {
      const tailleOk = !filterTaille ||
        tData.size === parseInt(filterTaille);
      const searchOk = !search.trim() ||
        tData.name.toLowerCase().includes(search.trim().toLowerCase());
      if (!tailleOk || !searchOk) return;

      if (tData.creatorUserId === currentUser?._id) {
        setMesCreations(prev =>
          prev.find(x => x._id === tData._id) ? prev : [tData, ...prev]);
      } else {
        setDisponibles(prev =>
          prev.find(x => x._id === tData._id) ? prev : [tData, ...prev]);
      }
    };

    const onUpdated = ({ tournamentId, inscrits, status }) => {
      const upd = arr => arr.map(t =>
        t._id === tournamentId ? { ...t, inscrits, status } : t
      );
      setMesCreations(upd);
      setDisponibles(upd);
      if (status === 'in_progress') {
        setDisponibles(prev => prev.filter(t => t._id !== tournamentId));
      }
    };

    const onRemoved = ({ tournamentId }) => {
      const rm = arr => arr.filter(t => t._id !== tournamentId);
      setMesCreations(rm);
      setDisponibles(rm);
    };

    const onCancelled = ({ tournamentId, message }) => {
      const rm = arr => arr.filter(t => t._id !== tournamentId);
      setMesCreations(rm);
      setDisponibles(rm);
      if (message) appAlert(t('tournament.notifications.cancelled_title'), message);
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
  }, [socket, filterTaille, search, currentUser]);

  // ─── Recherche debounce ───────────────────────────────
  const handleSearch = text => {
    setSearch(text);
    clearTimeout(searchRef.current);
    searchRef.current = setTimeout(() => fetchAll(), 400);
  };

  // ─── Suppression ─────────────────────────────────────
  const handleSupprimer = item => {
    Alert.alert(
      t('tournament.lobby.delete_title'),
      t('tournament.lobby.delete_confirm', { name: item.name }),
      [
        { text: t('tournament.common.cancel'), style: 'cancel' },
        {
          text: t('tournament.common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await fetch(`${API_URL}/tournaments/${item._id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
              });
              const data = await response.json();
              if (!data.success)
                Alert.alert(t('tournament.common.error'), data.message || t('common.error'));
            } catch (err) {
              Alert.alert(t('tournament.common.error'), err.message || t('tournament.join_code.error_network'));
            }
          }
        }
      ]
    );
  };

  // ─── Navigation ────────────────────────────────────────
  const handleRejoindre = item => {
    if (item.visibilite === 'prive' || item.visibilite === 'private') {
      Alert.prompt(
        t('tournament.lobby.private_title'),
        t('tournament.lobby.private_code_label'),
        [
          { text: t('tournament.common.cancel'), style: 'cancel' },
          {
            text: t('tournament.common.join'),
            onPress: code => {
              dispatch(setTournament(item));
              navigation.navigate('TournamentWaitingRoom', { tournamentId: item._id, inviteCode: code });
            }
          }
        ],
        'plain-text'
      );
    } else {
      dispatch(setTournament(item));
      navigation.navigate('TournamentWaitingRoom', { tournamentId: item._id });
    }
  };

  const goCreer = () => navigation.navigate('TournamentConfig');
  const gooBracket = id => navigation.navigate('TournamentBracket', { tournamentId: id });
  const gooResultat = id => navigation.navigate('TournamentBracket', { tournamentId: id });

  // ─── Données de l'onglet actif ─────────────────────────
  const dataMap = {
    mesCreations,
    disponibles,
    passes
  };
  const activeData = dataMap[activeTab] || [];

  const counts = {
    mesCreations: mesCreations.length,
    disponibles: disponibles.length,
    passes: passes.length
  };

  // ─── Render ────────────────────────────────────────────
  return (
    <SafeAreaView style={l.safe}>
      <View style={l.container}>
        {/* ─── Header ─── */}
        <View style={[l.header, isTablet && { paddingHorizontal: 0 }]}>
          <View style={[
            { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' },
            isTablet && centeredContainer,
          ]}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={l.backButton}>
              <Text style={l.back}>←</Text>
            </TouchableOpacity>
            <Text style={[l.titre, isTablet && { fontSize: rs(30) }]}>{t('tournament.lobby.title')}</Text>
            <View style={l.headerRight}>
              <TouchableOpacity
                style={l.btnCode}
                onPress={() => setJoinByCodeVisible(true)}
              >
                <Ionicons name="keypad-outline" size={rs(18)} color="#F4B41A" />
              </TouchableOpacity>
              <TouchableOpacity style={l.btnPlus} onPress={goCreer}>
                <Text style={l.btnPlusText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* ─── Barre de recherche ─── */}
        <View style={[{ paddingHorizontal: isTablet ? 0 : 16 }, isTablet && { alignItems: 'center' }]}>
          <View style={[l.searchBox, isTablet && { width: contentWidth, marginHorizontal: 0 }]}>
            <Text style={l.searchIcon}>🔍</Text>
            <TextInput
              style={[l.searchInput, isTablet && { fontSize: rs(15) }]}
              placeholder={t('tournament.lobby.search_placeholder')}
              placeholderTextColor="#ECE6D640"
              value={search}
              onChangeText={handleSearch}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => { setSearch(''); fetchAll(); }}>
                <Text style={l.searchClear}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* ─── Filtres taille ─── */}
        <View style={[l.filtresRow, isTablet && { ...centeredContainer, paddingHorizontal: 0 }]}>
          {TAILLES.map(taille => (
            <TouchableOpacity
              key={taille}
              style={[
                l.pill,
                filterTaille === taille && l.pillActive,
                isTablet && { paddingHorizontal: rs(18), paddingVertical: rs(9) },
              ]}
              onPress={() => setFilterTaille(p => p === taille ? null : taille)}
            >
              <Text style={[
                l.pillText,
                filterTaille === taille && l.pillTextActive,
                isTablet && { fontSize: rs(15) },
              ]}>
                {t('tournament.lobby.size_filter', { size: taille })}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ─── Onglets 3 colonnes ─── */}
        <TabBar
          activeTab={activeTab}
          counts={counts}
          onSelect={setActiveTab}
          t={t}
          isTablet={isTablet}
          centeredContainer={centeredContainer}
        />

        {/* ─── Contenu de l'onglet actif ─── */}
        {loading ? (
          <ActivityIndicator size="large" color="#F4B41A" style={{ marginTop: 60 }} />
        ) : (
          <FlatList
            data={activeData}
            keyExtractor={item => item._id}
            renderItem={({ item }) => (
              <TournamentCard
                item={item}
                sectionKey={activeTab}
                currentUserId={currentUser?._id}
                onSupprimer={handleSupprimer}
                onRejoindre={handleRejoindre}
                onVoirBracket={gooBracket}
                onVoirResultat={gooResultat}
                t={t}
                isTablet={isTablet}
              />
            )}
            ListEmptyComponent={
              <EmptyTab sectionKey={activeTab} onCreer={goCreer} t={t} />
            }
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => fetchAll(true)}
                tintColor="#F4B41A"
              />
            }
            contentContainerStyle={[
              activeData.length === 0 ? l.listEmpty : l.listContent,
              isTablet && { paddingHorizontal: 0, alignItems: 'center' },
            ]}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

      <TournamentJoinByCodeModal
        visible={joinByCodeVisible}
        onClose={() => setJoinByCodeVisible(false)}
      />
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────

// Layout global
const l = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#060B17' },
  container: { flex: 1, backgroundColor: '#060B17' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 15, paddingBottom: 15 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  backButton: { marginRight: 15 },
  back: { color: '#ECE6D6', fontSize: 24 },
  titre: { fontFamily: 'BarlowCondensed-Bold', fontSize: 26, color: '#ECE6D6', letterSpacing: 1, flex: 1 },
  btnCode: {
    width: 36, height: 36,
    borderRadius: 18,
    backgroundColor: '#0D1526',
    borderWidth: 1,
    borderColor: '#F4B41A60',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPlus: { backgroundColor: '#F4B41A', width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  btnPlusText: { color: '#060B17', fontSize: 22, fontWeight: 'bold', lineHeight: 26 },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0D1526', borderRadius: 12, marginHorizontal: 16, marginBottom: 12, paddingHorizontal: 12, paddingVertical: 8 },
  searchIcon: { fontSize: 15, marginRight: 8 },
  searchInput: { flex: 1, color: '#ECE6D6', fontFamily: 'Inter', fontSize: 14 },
  searchClear: { color: '#ECE6D6', fontSize: 16, paddingLeft: 8 },
  filtresRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 12 },
  pill: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: '#1A2035', borderWidth: 1, borderColor: '#2A3050' },
  pillActive: { backgroundColor: '#F4B41A', borderColor: '#F4B41A' },
  pillText: { color: '#ECE6D6', fontFamily: 'BarlowCondensed-Bold', fontSize: 14 },
  pillTextActive: { color: '#060B17' },
  listContent: { paddingHorizontal: 16, paddingBottom: 40 },
  listEmpty: { flex: 1 }
});

// Onglets
const tabStyles = StyleSheet.create({
  tabBar: { flexDirection: 'row', marginHorizontal: 16, marginBottom: 16, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#1E2A45' },
  tabBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 10, paddingHorizontal: 4, backgroundColor: '#0D1526', borderRightWidth: 1, borderRightColor: '#1E2A45', minHeight: 56, position: 'relative' },
  tabBtnFirst: { borderTopLeftRadius: 11, borderBottomLeftRadius: 11 },
  tabBtnLast: { borderTopRightRadius: 11, borderBottomRightRadius: 11, borderRightWidth: 0 },
  tabBtnActive: { backgroundColor: '#F4B41A' },
  tabLabel: { fontFamily: 'BarlowCondensed-Bold', fontSize: 12, color: '#ECE6D680', textAlign: 'center', letterSpacing: 0.3 },
  tabLabelActive: { color: '#060B17' },
  tabBadge: { position: 'absolute', top: 5, right: 6, backgroundColor: '#1E2A45', borderRadius: 9, minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  tabBadgeActive: { backgroundColor: '#060B17' },
  tabBadgeText: { fontFamily: 'BarlowCondensed-Bold', fontSize: 11, color: '#F4B41A' },
  tabBadgeTextActive: { color: '#F4B41A' }
});

// Cards
const c = StyleSheet.create({
  card: { backgroundColor: '#0D1526', borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#1E2A45' },
  cardPasse: { borderColor: '#1A1A2A' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  nom: { fontFamily: 'BarlowCondensed-Bold', fontSize: 19, color: '#ECE6D6', flex: 1, marginRight: 8 },
  nomPasse: { color: '#ECE6D660' },
  sub: { fontFamily: 'Inter', fontSize: 12, color: '#ECE6D870' },
  meta: { fontFamily: 'Inter', fontSize: 12, color: '#ECE6D650' },
  potBadge: { backgroundColor: '#F4B41A', borderRadius: 7, paddingHorizontal: 9, paddingVertical: 2 },
  potText: { fontFamily: 'BarlowCondensed-Bold', fontSize: 12, color: '#060B17' },
  statusBadge: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  statusText: { fontFamily: 'BarlowCondensed-Bold', fontSize: 11 },
  progressBg: { height: 4, backgroundColor: '#1E2A45', borderRadius: 2, marginVertical: 6 },
  progressFill: { height: 4, backgroundColor: '#F4B41A', borderRadius: 2 },
  inscrit: { fontFamily: 'Inter', fontSize: 12, color: '#ECE6D660' },
  gain: { fontFamily: 'BarlowCondensed-Bold', fontSize: 13, color: '#F4B41A' },
  dateText: { fontFamily: 'Inter', fontSize: 12, color: '#ECE6D650', marginTop: 2, marginBottom: 6 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  btnPrimary: { flex: 1, backgroundColor: '#F4B41A', borderRadius: 10, paddingVertical: 11, alignItems: 'center' },
  btnPrimaryText: { fontFamily: 'BarlowCondensed-Bold', fontSize: 14, color: '#060B17' },
  btnOutline: { flex: 1, borderWidth: 1, borderColor: '#F4B41A', borderRadius: 10, paddingVertical: 11, alignItems: 'center' },
  btnOutlineText: { fontFamily: 'BarlowCondensed-Bold', fontSize: 14, color: '#F4B41A' },
  btnGhost: { flex: 1, borderWidth: 1, borderColor: '#ECE6D640', borderRadius: 10, paddingVertical: 11, alignItems: 'center' },
  btnGhostText: { fontFamily: 'BarlowCondensed-Bold', fontSize: 13, color: '#ECE6D680' },
  btnDelete: { backgroundColor: '#2A1515', borderRadius: 10, width: 42, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E74C3C' },
  btnDeleteIcon: { fontSize: 17 }
});

// État vide
const e = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80, paddingHorizontal: 32 },
  icon: { fontSize: 56, marginBottom: 16, opacity: 0.3 },
  text: { fontFamily: 'Inter', fontSize: 15, color: '#ECE6D650', textAlign: 'center', marginBottom: 28 },
  btn: { borderWidth: 1, borderColor: '#ECE6D6', borderRadius: 12, paddingVertical: 13, paddingHorizontal: 28 },
  btnText: { fontFamily: 'BarlowCondensed-Bold', fontSize: 15, color: '#ECE6D6', letterSpacing: 1 }
});
