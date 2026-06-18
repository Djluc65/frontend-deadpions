// DeadPions — TournamentConfigScreen.jsx — créé le 2026-06-16
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
// import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import { T, TY } from '../utils/theme';
import Button from '../components/common/Button';
import { appAlert } from '../services/appAlert';
import { socket } from '../utils/socket';
import { setTournament } from '../redux/slices/tournamentSlice';
import { useTournamentSocket } from '../hooks/useTournamentSocket';
import {
  buildAutomaticTournamentName,
  buildDefaultRoundSchedule,
  buildTournamentSummaryLines,
  calculateTournamentPot,
  calculateTournamentWinnerGain,
  DEFAULT_TOURNAMENT_CONFIG,
  estimateRoundDurationMinutes,
  formatGamesPerMatchSummary,
  getRoundLabel,
  getTournamentRoundsCount,
  sanitizeTournamentName,
  TOURNAMENT_COLOR_OPTIONS,
  TOURNAMENT_ENTRY_FEE_OPTIONS,
  TOURNAMENT_GAMES_PER_MATCH_OPTIONS,
  TOURNAMENT_MODE_OPTIONS,
  TOURNAMENT_MOVE_TIME_OPTIONS,
  TOURNAMENT_RANK_OPTIONS,
  TOURNAMENT_SCHEDULING_OPTIONS,
  TOURNAMENT_SIZE_OPTIONS,
  TOURNAMENT_STARTING_PLAYER_OPTIONS,
  TOURNAMENT_TOTAL_TIME_OPTIONS,
  TOURNAMENT_VICTORY_RULE_OPTIONS,
  TOURNAMENT_VISIBILITY_OPTIONS,
} from '../utils/tournamentConfig';

const SectionCard = ({ title, subtitle, children }) => (
  <View style={styles.sectionCard}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
    {children}
  </View>
);

const SegmentedRow = ({ options, value, onChange, disabledValues = [] }) => (
  <View style={styles.segmentedRow}>
    {options.map((option) => {
      const isActive = value === option.value;
      const isDisabled = disabledValues.includes(option.value);
      return (
        <TouchableOpacity
          key={String(option.value)}
          activeOpacity={0.9}
          disabled={isDisabled}
          style={[
            styles.segmentButton,
            isActive && styles.segmentButtonActive,
            isDisabled && styles.segmentButtonDisabled
          ]}
          onPress={() => onChange(option.value)}
        >
          <Text style={[
            styles.segmentButtonText,
            isActive && styles.segmentButtonTextActive,
            isDisabled && styles.segmentButtonTextDisabled
          ]}>
            {option.label}
          </Text>
        </TouchableOpacity>
      );
    })}
  </View>
);

const StepSlider = ({ label, options, value, onChange }) => {
  const activeIndex = Math.max(0, options.findIndex((option) => option.value === value));

  return (
    <View style={styles.sliderWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.sliderTrack}>
        <View style={[styles.sliderFill, { width: `${(activeIndex / Math.max(1, options.length - 1)) * 100}%` }]} />
      </View>
      <View style={styles.sliderOptionsRow}>
        {options.map((option, index) => {
          const isActive = activeIndex === index;
          return (
            <TouchableOpacity
              key={`${label}-${option.label}`}
              activeOpacity={0.9}
              style={styles.sliderOption}
              onPress={() => onChange(option.value)}
            >
              <View style={[styles.sliderDot, isActive && styles.sliderDotActive]} />
              <Text style={[styles.sliderOptionText, isActive && styles.sliderOptionTextActive]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const SummaryLine = ({ icon, text, highlight = false }) => (
  <View style={styles.summaryLine}>
    <Text style={styles.summaryIcon}>{icon}</Text>
    <Text style={[styles.summaryText, highlight && styles.summaryTextHighlight]}>{text}</Text>
  </View>
);

const formatDateLabel = (value) => {
  const date = value instanceof Date ? value : new Date(value);
  return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
};

const formatTimeLabel = (value) => {
  const date = value instanceof Date ? value : new Date(value);
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
};

const TournamentConfigScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);
  const cleanupRef = useRef([]);
  const submitTimeoutRef = useRef(null);
  const [config, setConfig] = useState(DEFAULT_TOURNAMENT_CONFIG);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const { createTournament } = useTournamentSocket();

  const canAfford = (user?.coins || 0) >= config.entryFee;
  const totalPot = useMemo(() => calculateTournamentPot(config.size, config.entryFee), [config.entryFee, config.size]);
  const winnerGain = useMemo(() => calculateTournamentWinnerGain(totalPot), [totalPot]);
  const tournamentNamePreview = useMemo(() => {
    return sanitizeTournamentName(config.name) || buildAutomaticTournamentName(user?.pseudo);
  }, [config.name, user?.pseudo]);
  const summaryLines = useMemo(() => buildTournamentSummaryLines({ ...config, name: tournamentNamePreview }), [config, tournamentNamePreview]);
  const roundsCount = useMemo(() => getTournamentRoundsCount(config.size), [config.size]);
  const summaryGames = useMemo(() => formatGamesPerMatchSummary(config.gamesPerMatch), [config.gamesPerMatch]);
  const gamesDisabledFor32 = config.size === 32 ? [8, 10] : [];

  useEffect(() => {
    if (config.size < 8 && config.enableThirdPlaceMatch) {
      setConfig((prev) => ({ ...prev, enableThirdPlaceMatch: false }));
    }
    if (config.size === 32 && [8, 10].includes(config.gamesPerMatch)) {
      setConfig((prev) => ({ ...prev, gamesPerMatch: 6 }));
    }
  }, [config.enableThirdPlaceMatch, config.gamesPerMatch, config.size]);

  useEffect(() => {
    if (config.schedulingMode !== 'programme') return;
    setConfig((prev) => ({
      ...prev,
      roundSchedule: buildDefaultRoundSchedule(prev)
    }));
  }, [config.gameMode, config.gamesPerMatch, config.moveTimeLimit, config.schedulingMode, config.size, config.totalTimeLimit]);

  useEffect(() => {
    const registerListeners = () => {
      const handleCreated = (tournament) => {
        if (!tournament?._id) return;
        if (submitTimeoutRef.current) {
          clearTimeout(submitTimeoutRef.current);
          submitTimeoutRef.current = null;
        }
        setIsSubmitting(false);
        dispatch(setTournament(tournament));
        navigation.replace('TournamentWaitingRoom', { tournamentId: tournament._id });
      };

      const handleError = (message) => {
        if (submitTimeoutRef.current) {
          clearTimeout(submitTimeoutRef.current);
          submitTimeoutRef.current = null;
        }
        setIsSubmitting(false);
        appAlert('Tournoi', typeof message === 'string' ? message : 'Impossible de creer le tournoi');
      };

      socket.on('tournament_created', handleCreated);
      socket.on('tournament_error', handleError);

      const cleanup = () => {
        socket.off('tournament_created', handleCreated);
        socket.off('tournament_error', handleError);
      };

      cleanupRef.current.push(cleanup);
      const timeoutId = setTimeout(cleanup, 15000);
      cleanupRef.current.push(() => clearTimeout(timeoutId));
    };

    registerListeners();
    const renewId = setInterval(() => {
      cleanupRef.current.forEach((fn) => fn());
      cleanupRef.current = [];
      registerListeners();
    }, 14000);
    cleanupRef.current.push(() => clearInterval(renewId));

    return () => {
      if (submitTimeoutRef.current) {
        clearTimeout(submitTimeoutRef.current);
        submitTimeoutRef.current = null;
      }
      cleanupRef.current.forEach((fn) => fn());
      cleanupRef.current = [];
    };
  }, [dispatch, navigation]);

  const updateConfig = (patch) => {
    setConfig((prev) => ({ ...prev, ...patch }));
  };

  const updateRoundSchedule = (round, patch) => {
    setConfig((prev) => {
      const current = Array.isArray(prev.roundSchedule) ? prev.roundSchedule : [];
      const next = current.map((item) => {
        if (item.round !== round) return item;
        const nextDate = new Date(item.scheduledAt || Date.now());
        if (patch.date) {
          nextDate.setFullYear(patch.date.getFullYear(), patch.date.getMonth(), patch.date.getDate());
        }
        if (patch.time) {
          nextDate.setHours(patch.time.getHours(), patch.time.getMinutes(), 0, 0);
        }
        return { ...item, scheduledAt: nextDate };
      });
      return { ...prev, roundSchedule: next };
    });
  };

  const validateSchedule = () => {
    if (config.schedulingMode !== 'programme') return true;
    const now = Date.now();
    const schedule = Array.isArray(config.roundSchedule) ? config.roundSchedule : [];
    for (let index = 0; index < schedule.length; index += 1) {
      const item = schedule[index];
      if (!item?.scheduledAt || Number.isNaN(new Date(item.scheduledAt).getTime())) {
        appAlert('Tournoi', `La date du Round ${index + 1} est invalide`);
        return false;
      }
      if (new Date(item.scheduledAt).getTime() <= now) {
        appAlert('Tournoi', `La date du Round ${index + 1} est depassee`);
        return false;
      }
    }
    return true;
  };

  const handleSubmit = () => {
    if (isSubmitting) return;
    if (!canAfford) {
      appAlert('Tournoi', 'Solde insuffisant pour creer ce tournoi.');
      return;
    }
    if (config.size === 32 && [8, 10].includes(config.gamesPerMatch)) {
      appAlert('Tournoi', 'Indisponible pour 32 joueurs (duree excessive).');
      return;
    }
    if (!validateSchedule()) {
      return;
    }

    setIsSubmitting(true);
    if (submitTimeoutRef.current) {
      clearTimeout(submitTimeoutRef.current);
    }
    submitTimeoutRef.current = setTimeout(() => {
      submitTimeoutRef.current = null;
      setIsSubmitting(false);
      appAlert('Tournoi', 'Aucune reponse du serveur apres 15 secondes. Reessayez.');
    }, 15000);
    createTournament({
      ...config,
      name: sanitizeTournamentName(config.name),
      roundSchedule: (config.roundSchedule || []).map((item) => ({
        round: item.round,
        scheduledAt: item.scheduledAt instanceof Date ? item.scheduledAt.toISOString() : item.scheduledAt
      }))
    });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={T.text} />
        </TouchableOpacity>
        <View style={styles.headerTextWrap}>
          <Text style={styles.title}>Configuration du tournoi</Text>
          <Text style={styles.subtitle}>Meme logique visuelle que le mode amis, adaptee au bracket.</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <SectionCard title="Nom du tournoi">
          <Text style={styles.fieldLabel}>Nom du tournoi</Text>
          <TextInput
            style={[styles.input, focusedField === 'name' && styles.inputFocused]}
            value={config.name}
            onChangeText={(value) => updateConfig({ name: value })}
            placeholder="Ex : Championnat DeadPions #1"
            placeholderTextColor="rgba(236, 230, 214, 0.5)"
            maxLength={40}
            onFocus={() => setFocusedField('name')}
            onBlur={() => setFocusedField(null)}
          />
          <Text style={styles.helperText}>{config.name.length}/40</Text>
        </SectionCard>

        <SectionCard title="Structure du tournoi">
          <Text style={styles.fieldLabel}>Taille du tournoi</Text>
          <SegmentedRow
            options={TOURNAMENT_SIZE_OPTIONS.map((value) => ({ label: `${value}`, value }))}
            value={config.size}
            onChange={(value) => updateConfig({ size: value })}
          />

          <Text style={styles.fieldLabel}>Mise d entree</Text>
          <SegmentedRow
            options={TOURNAMENT_ENTRY_FEE_OPTIONS.map((value) => ({ label: `${value}`, value }))}
            value={config.entryFee}
            onChange={(value) => updateConfig({ entryFee: value })}
          />

          <View style={styles.inlineInfoCard}>
            <Text style={styles.inlineInfoText}>Pot total estime : {totalPot} coins</Text>
            <Text style={styles.inlineInfoText}>Gain vainqueur : {winnerGain} coins</Text>
          </View>
        </SectionCard>

        <SectionCard title="Regles de jeu">
          <Text style={styles.fieldLabel}>Mode de partie</Text>
          <SegmentedRow
            options={TOURNAMENT_MODE_OPTIONS}
            value={config.gameMode}
            onChange={(value) => updateConfig({ gameMode: value })}
          />

          {config.gameMode === 'chrono' ? (
            <StepSlider
              label="Temps par coup"
              options={TOURNAMENT_MOVE_TIME_OPTIONS}
              value={config.moveTimeLimit}
              onChange={(value) => updateConfig({ moveTimeLimit: value })}
            />
          ) : null}

          {config.gameMode === 'blitz' ? (
            <StepSlider
              label="Temps total par joueur"
              options={TOURNAMENT_TOTAL_TIME_OPTIONS}
              value={config.totalTimeLimit}
              onChange={(value) => updateConfig({ totalTimeLimit: value })}
            />
          ) : null}

          <Text style={styles.fieldLabel}>Qui commence ?</Text>
          <SegmentedRow
            options={TOURNAMENT_STARTING_PLAYER_OPTIONS}
            value={config.startingPlayer}
            onChange={(value) => updateConfig({ startingPlayer: value })}
          />

          <Text style={styles.fieldLabel}>Couleur des pions</Text>
          <SegmentedRow
            options={TOURNAMENT_COLOR_OPTIONS}
            value={config.pawnColorMode}
            onChange={(value) => updateConfig({ pawnColorMode: value })}
          />

          <Text style={styles.fieldLabel}>Regle de victoire</Text>
          <SegmentedRow
            options={TOURNAMENT_VICTORY_RULE_OPTIONS}
            value={config.victoryRule}
            onChange={(value) => updateConfig({ victoryRule: value })}
          />
        </SectionCard>

        <SectionCard title="Format d elimination">
          <Text style={styles.fieldLabel}>Nombre de parties par affrontement</Text>
          <SegmentedRow
            options={TOURNAMENT_GAMES_PER_MATCH_OPTIONS.map((value) => ({ label: `${value}`, value }))}
            value={config.gamesPerMatch}
            onChange={(value) => updateConfig({ gamesPerMatch: value })}
            disabledValues={gamesDisabledFor32}
          />
          <Text style={styles.hintText}>{summaryGames}</Text>
          {config.size === 32 ? (
            <Text style={styles.hintText}>Indisponible pour 32 joueurs (duree excessive) pour 8 et 10 parties.</Text>
          ) : null}

          <View style={styles.toggleRow}>
            <View style={styles.toggleTextWrap}>
              <Text style={styles.toggleTitle}>Partie de 3e place</Text>
              <Text style={styles.toggleDescription}>
                Un match supplementaire entre les deux demi-finalistes elimines pour departager la 3e et la 4e place.
              </Text>
            </View>
            <Switch
              value={config.enableThirdPlaceMatch}
              disabled={config.size < 8}
              onValueChange={(value) => updateConfig({ enableThirdPlaceMatch: value })}
              trackColor={{ false: T.bg3, true: T.goldSoft }}
              thumbColor={config.enableThirdPlaceMatch ? T.gold : T.textMuted}
            />
          </View>
        </SectionCard>

        <SectionCard title="Acces et confidentialite">
          <Text style={styles.fieldLabel}>Visibilite du tournoi</Text>
          <SegmentedRow
            options={TOURNAMENT_VISIBILITY_OPTIONS}
            value={config.visibility}
            onChange={(value) => updateConfig({ visibility: value })}
          />

          <Text style={styles.fieldLabel}>Niveau de classement requis</Text>
          <SegmentedRow
            options={TOURNAMENT_RANK_OPTIONS}
            value={config.minimumRanking}
            onChange={(value) => updateConfig({ minimumRanking: value })}
          />
        </SectionCard>

        <SectionCard title="Programmation des rounds">
          <Text style={styles.fieldLabel}>Mode de demarrage des rounds</Text>
          <SegmentedRow
            options={TOURNAMENT_SCHEDULING_OPTIONS}
            value={config.schedulingMode}
            onChange={(value) => updateConfig({
              schedulingMode: value,
              roundSchedule: value === 'programme' ? buildDefaultRoundSchedule(config) : []
            })}
          />

          {config.schedulingMode === 'programme' ? (
            <View style={styles.scheduleWrap}>
              {(config.roundSchedule || []).slice(0, roundsCount).map((item) => {
                const estimates = estimateRoundDurationMinutes(config, item.round);
                const selectedDate = item?.scheduledAt ? new Date(item.scheduledAt) : new Date(Date.now() + (30 * 60 * 1000)); // Default to 30 minutes from now
                return (
                  <View key={`round-${item.round}`} style={styles.scheduleCard}>
                    <Text style={styles.scheduleTitle}>{getRoundLabel(config.size, item.round)}</Text>
                    <View style={styles.schedulePickersRow}>
                      <View style={styles.schedulePickerBox}>
                        <Text style={styles.schedulePickerLabel}>Date</Text>
                        <TouchableOpacity style={styles.pickerButton} onPress={() => {
                          // For now, just use the default date; we'll add proper pickers later
                          updateRoundSchedule(item.round, { date: new Date(Date.now() + (30 * 60 * 1000)) });
                        }}>
                          <Text style={styles.pickerButtonText}>{formatDateLabel(selectedDate)}</Text>
                        </TouchableOpacity>
                      </View>
                      <View style={styles.schedulePickerBox}>
                        <Text style={styles.schedulePickerLabel}>Heure</Text>
                        <TouchableOpacity style={styles.pickerButton} onPress={() => {
                          // For now, just use the default time
                          updateRoundSchedule(item.round, { time: new Date(Date.now() + (30 * 60 * 1000)) });
                        }}>
                          <Text style={styles.pickerButtonText}>{formatTimeLabel(selectedDate)}</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                    <Text style={styles.scheduleMeta}>
                      Programme : {formatDateLabel(selectedDate)} a {formatTimeLabel(selectedDate)}
                    </Text>
                    <Text style={styles.scheduleMeta}>
                      Duree estimee du round : ~{estimates.durationMinutes} min pour {estimates.matchesInParallel} matchs en parallele
                    </Text>
                  </View>
                );
              })}
            </View>
          ) : null}
        </SectionCard>

        <View style={styles.summaryCard}>
          <SummaryLine icon="🏆" text={summaryLines[0]} />
          <SummaryLine icon="⏱" text={summaryLines[1]} />
          <SummaryLine icon="🎨" text={summaryLines[2]} />
          <SummaryLine icon="🎯" text={summaryLines[3]} />
          <SummaryLine icon="🔒" text={summaryLines[4]} />
          <SummaryLine icon="💰" text={summaryLines[5]} />
          <SummaryLine icon="•" text={summaryLines[6]} />
          <SummaryLine icon="•" text={summaryLines[7]} highlight />
        </View>

        {!canAfford ? (
          <Text style={styles.errorText}>Votre solde actuel ne couvre pas cette mise.</Text>
        ) : null}

        <Button
          title={isSubmitting ? 'Creation en cours...' : 'Creer le tournoi'}
          onPress={handleSubmit}
          disabled={!canAfford || isSubmitting}
          style={styles.primaryButton}
        />
        <Button
          title="Annuler"
          onPress={() => navigation.goBack()}
          tone="ghost"
          style={styles.secondaryButton}
        />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#060B17',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: T.borderSoft,
  },
  backButton: {
    marginRight: 14,
  },
  headerTextWrap: {
    flex: 1,
  },
  title: {
    ...TY.heading,
    fontSize: 22,
    color: '#ECE6D6',
  },
  subtitle: {
    color: '#A8B4C9',
    fontSize: 12,
    marginTop: 4,
  },
  content: {
    padding: 16,
    paddingBottom: 36,
    gap: 16,
  },
  sectionCard: {
    backgroundColor: '#0D1526',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: T.borderSoft,
    padding: 16,
  },
  sectionTitle: {
    ...TY.heading,
    fontSize: 16,
    marginBottom: 4,
  },
  sectionSubtitle: {
    color: T.textDim,
    fontSize: 12,
    marginBottom: 10,
  },
  fieldLabel: {
    ...TY.label,
    fontSize: 12,
    marginTop: 10,
    marginBottom: 8,
  },
  input: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: T.borderSoft,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#ECE6D6',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  inputFocused: {
    borderColor: '#5BD2FF',
    shadowColor: '#5BD2FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  helperText: {
    color: 'rgba(236, 230, 214, 0.5)',
    fontSize: 11,
    textAlign: 'right',
    marginTop: 6,
  },
  segmentedRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  segmentButton: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: T.cyanBorderStrong,
    backgroundColor: 'rgba(10, 14, 28, 0.92)',
  },
  segmentButtonActive: {
    backgroundColor: '#5BD2FF',
    borderColor: '#5BD2FF',
  },
  segmentButtonDisabled: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderColor: T.borderSoft,
  },
  segmentButtonText: {
    color: T.textDim,
    fontSize: 12,
    fontWeight: '700',
  },
  segmentButtonTextActive: {
    color: '#05060B',
  },
  segmentButtonTextDisabled: {
    color: T.textMuted,
  },
  inlineInfoCard: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 12,
    padding: 12,
    marginTop: 14,
  },
  inlineInfoText: {
    color: '#ECE6D6',
    fontSize: 13,
    marginBottom: 4,
  },
  sliderWrap: {
    marginTop: 10,
  },
  sliderTrack: {
    height: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginTop: 6,
    overflow: 'hidden',
  },
  sliderFill: {
    height: 4,
    backgroundColor: '#F4B41A',
  },
  sliderOptionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  sliderOption: {
    alignItems: 'center',
    flex: 1,
    paddingHorizontal: 2,
  },
  sliderDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: T.gold,
    backgroundColor: '#060B17',
    marginBottom: 6,
  },
  sliderDotActive: {
    backgroundColor: '#F4B41A',
  },
  sliderOptionText: {
    color: T.textMuted,
    fontSize: 10,
    textAlign: 'center',
  },
  sliderOptionTextActive: {
    color: '#F4B41A',
    fontWeight: '800',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  toggleTextWrap: {
    flex: 1,
    paddingRight: 12,
  },
  toggleTitle: {
    color: '#ECE6D6',
    fontSize: 14,
    fontWeight: '700',
  },
  toggleDescription: {
    color: '#A8B4C9',
    fontSize: 12,
    marginTop: 4,
  },
  hintText: {
    color: '#A8B4C9',
    fontSize: 12,
    marginTop: 8,
  },
  scheduleWrap: {
    marginTop: 8,
    gap: 12,
  },
  scheduleCard: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: T.borderSoft,
    padding: 12,
  },
  scheduleTitle: {
    color: '#F4B41A',
    fontWeight: '800',
    marginBottom: 10,
  },
  schedulePickersRow: {
    flexDirection: 'row',
    gap: 10,
  },
  schedulePickerBox: {
    flex: 1,
    backgroundColor: '#0A1020',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: T.borderSoft,
  },
  schedulePickerLabel: {
    color: '#A8B4C9',
    fontSize: 11,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  pickerButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#0D1526',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: T.borderSoft,
  },
  pickerButtonText: {
    color: '#ECE6D6',
    fontSize: 14,
    textAlign: 'center',
  },
  scheduleMeta: {
    color: '#ECE6D6',
    fontSize: 12,
    marginTop: 8,
  },
  summaryCard: {
    backgroundColor: '#0D1526',
    borderWidth: 1,
    borderColor: '#F4B41A',
    borderRadius: 12,
    padding: 16,
  },
  summaryLine: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryIcon: {
    width: 22,
    color: '#F4B41A',
  },
  summaryText: {
    flex: 1,
    color: '#ECE6D6',
    fontSize: 14,
  },
  summaryTextHighlight: {
    color: '#F4B41A',
    fontWeight: '800',
  },
  errorText: {
    color: T.red,
    textAlign: 'center',
    fontSize: 12,
  },
  primaryButton: {
    height: 48,
    marginTop: 2,
  },
  secondaryButton: {
    height: 46,
  },
});

export default TournamentConfigScreen;
