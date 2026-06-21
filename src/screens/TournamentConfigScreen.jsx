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
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
// import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
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
  calculateTournamentPot,
  calculateTournamentWinnerGain,
  DEFAULT_TOURNAMENT_CONFIG,
  estimateRoundDurationMinutes,
  getTournamentRoundsCount,
  sanitizeTournamentName,
  TOURNAMENT_ENTRY_FEE_OPTIONS,
  TOURNAMENT_GAMES_PER_MATCH_OPTIONS,
  TOURNAMENT_MODE_OPTIONS,
  TOURNAMENT_SIZE_OPTIONS,
} from '../utils/tournamentConfig';
import {
  buildTournamentSummaryLinesI18n,
  formatGamesPerMatchSummaryI18n,
  getRoundLabelI18n,
  mapColorOptions,
  mapMoveTimeOptions,
  mapRankOptions,
  mapSchedulingOptions,
  mapStartingPlayerOptions,
  mapTotalTimeOptions,
} from '../utils/tournamentI18n';
import { getResponsiveSize } from '../utils/responsive';
import { useTournamentLayout } from '../utils/tournamentLayout';

const rs = getResponsiveSize;

const SectionCard = ({ title, subtitle, children }) => {
  const { isTablet, contentWidth } = useTournamentLayout();
  return (
  <View style={[
    styles.sectionCard,
    isTablet && { width: contentWidth, alignSelf: 'center', padding: rs(18) },
  ]}>
    <Text style={[styles.sectionTitle, isTablet && { fontSize: rs(18) }]}>{title}</Text>
    {subtitle ? <Text style={[styles.sectionSubtitle, isTablet && { fontSize: rs(14) }]}>{subtitle}</Text> : null}
    {children}
  </View>
  );
};

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
  const { t, i18n } = useTranslation();
  const { isTablet, contentWidth } = useTournamentLayout();
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);
  const safetyTimeoutRef = useRef(null);
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
  const summaryLines = useMemo(
    () => buildTournamentSummaryLinesI18n({ ...config, name: tournamentNamePreview }),
    [config, tournamentNamePreview, i18n.language]
  );
  const roundsCount = useMemo(() => getTournamentRoundsCount(config.size), [config.size]);
  const summaryGames = useMemo(
    () => formatGamesPerMatchSummaryI18n(config.gamesPerMatch),
    [config.gamesPerMatch, i18n.language]
  );
  const moveTimeOptions = useMemo(() => mapMoveTimeOptions(), [i18n.language]);
  const totalTimeOptions = useMemo(() => mapTotalTimeOptions(), [i18n.language]);
  const startingPlayerOptions = useMemo(() => mapStartingPlayerOptions(), [i18n.language]);
  const colorOptions = useMemo(() => mapColorOptions(), [i18n.language]);
  const schedulingOptions = useMemo(() => mapSchedulingOptions(), [i18n.language]);
  const rankOptions = useMemo(() => mapRankOptions(), [i18n.language]);
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
    return () => {
      if (safetyTimeoutRef.current) {
        clearTimeout(safetyTimeoutRef.current);
        safetyTimeoutRef.current = null;
      }
    };
  }, []);

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
        appAlert(t('tournament.bracket.title'), t('tournament.config.error_round_invalid', { round: index + 1 }));
        return false;
      }
      if (new Date(item.scheduledAt).getTime() <= now) {
        appAlert(t('tournament.bracket.title'), t('tournament.config.error_round_past', { round: index + 1 }));
        return false;
      }
    }
    return true;
  };

  const handleSubmit = () => {
    if (isSubmitting) return;
    if (!canAfford) {
      appAlert(t('tournament.bracket.title'), t('tournament.config.error_insufficient'));
      return;
    }
    if (config.size === 32 && [8, 10].includes(config.gamesPerMatch)) {
      appAlert(t('tournament.bracket.title'), t('tournament.config.error_unavailable'));
      return;
    }
    if (!validateSchedule()) {
      return;
    }

    setIsSubmitting(true);
    
    // Safety timeout (30 seconds)
    safetyTimeoutRef.current = setTimeout(() => {
      safetyTimeoutRef.current = null;
      setIsSubmitting(false);
      appAlert(
        t('tournament.config.slow_connection'),
        t('tournament.config.slow_connection_msg'),
        [{ text: t('tournament.common.ok'), onPress: () => navigation.navigate('TournamentLobby') }]
      );
    }, 30000);

    createTournament(
      {
        ...config,
        name: sanitizeTournamentName(config.name),
        roundSchedule: (config.roundSchedule || []).map((item) => ({
          round: item.round,
          scheduledAt: item.scheduledAt instanceof Date ? item.scheduledAt.toISOString() : item.scheduledAt
        }))
      },
      (response) => {
        // Clear safety timeout as soon as we get ACK
        if (safetyTimeoutRef.current) {
          clearTimeout(safetyTimeoutRef.current);
          safetyTimeoutRef.current = null;
        }
        setIsSubmitting(false);

        if (response?.success) {
          if (response.tournament) {
            dispatch(setTournament(response.tournament));
          }
          navigation.replace('TournamentWaitingRoom', {
            tournamentId: response.tournamentId,
            tournamentName: response.tournamentName
          });
        } else {
          appAlert(
            t('tournament.common.error'),
            response?.message || t('common.error')
          );
        }
      }
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
      >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={T.text} />
        </TouchableOpacity>
        <View style={[
          styles.headerTextWrap,
          isTablet && { maxWidth: contentWidth, alignSelf: 'center', width: '100%' },
        ]}>
          <Text style={[styles.title, isTablet && { fontSize: rs(26) }]}>{t('tournament.config.title')}</Text>
          <Text style={[styles.subtitle, isTablet && { fontSize: rs(14) }]}>{t('tournament.config.subtitle')}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={[
        styles.content,
        isTablet && { alignItems: 'center', paddingHorizontal: 0, gap: rs(12) },
      ]}>
        <SectionCard title={t('tournament.config.name_label')}>
          <Text style={styles.fieldLabel}>{t('tournament.config.name_label')}</Text>
          <TextInput
            style={[styles.input, focusedField === 'name' && styles.inputFocused]}
            value={config.name}
            onChangeText={(value) => updateConfig({ name: value })}
            placeholder={t('tournament.config.name_placeholder')}
            placeholderTextColor="rgba(236, 230, 214, 0.5)"
            maxLength={40}
            onFocus={() => setFocusedField('name')}
            onBlur={() => setFocusedField(null)}
          />
          <Text style={styles.helperText}>{t('tournament.config.name_counter', { length: config.name.length })}</Text>
        </SectionCard>

        <SectionCard title={t('tournament.config.section_structure')}>
          <Text style={styles.fieldLabel}>{t('tournament.config.size_label')}</Text>
          <SegmentedRow
            options={TOURNAMENT_SIZE_OPTIONS.map((value) => ({ label: `${value}`, value }))}
            value={config.size}
            onChange={(value) => updateConfig({ size: value })}
          />

          <Text style={styles.fieldLabel}>{t('tournament.config.entry_fee_label')}</Text>
          <SegmentedRow
            options={TOURNAMENT_ENTRY_FEE_OPTIONS.map((value) => ({ label: `${value}`, value }))}
            value={config.entryFee}
            onChange={(value) => updateConfig({ entryFee: value })}
          />

          <View style={styles.inlineInfoCard}>
            <Text style={styles.inlineInfoText}>
              {t('tournament.config.pot_estimated', { amount: totalPot })}
            </Text>
            <Text style={styles.inlineInfoText}>
              {t('tournament.config.winner_estimated', { amount: winnerGain })}
            </Text>
          </View>
        </SectionCard>

        <SectionCard title={t('tournament.config.section_rules')}>
          <Text style={styles.fieldLabel}>{t('tournament.config.mode_label')}</Text>
          <SegmentedRow
            options={TOURNAMENT_MODE_OPTIONS.map((option) => ({
              ...option,
              label: t(`tournament.common.${option.value === 'classic' ? 'classique' : option.value}`)
            }))}
            value={config.gameMode}
            onChange={(value) => updateConfig({ gameMode: value })}
          />

          {config.gameMode === 'chrono' ? (
            <StepSlider
              label={t('tournament.config.time_per_move')}
              options={moveTimeOptions}
              value={config.moveTimeLimit}
              onChange={(value) => updateConfig({ moveTimeLimit: value })}
            />
          ) : null}

          {config.gameMode === 'blitz' ? (
            <StepSlider
              label={t('tournament.config.total_time')}
              options={totalTimeOptions}
              value={config.totalTimeLimit}
              onChange={(value) => updateConfig({ totalTimeLimit: value })}
            />
          ) : null}

          <Text style={styles.fieldLabel}>{t('tournament.config.who_starts_label')}</Text>
          <SegmentedRow
            options={startingPlayerOptions}
            value={config.startingPlayer}
            onChange={(value) => updateConfig({ startingPlayer: value })}
          />

          <Text style={styles.fieldLabel}>{t('tournament.config.pawn_color_label')}</Text>
          <SegmentedRow
            options={colorOptions}
            value={config.pawnColorMode}
            onChange={(value) => updateConfig({ pawnColorMode: value })}
          />

          <Text style={styles.fieldLabel}>{t('tournament.config.win_rule_label')}</Text>
          <Text style={styles.hintText}>{t('tournament.config.options.victory_exact')}</Text>
        </SectionCard>

        <SectionCard title={t('tournament.config.section_format')}>
          <Text style={styles.fieldLabel}>{t('tournament.config.games_count_label')}</Text>
          <SegmentedRow
            options={TOURNAMENT_GAMES_PER_MATCH_OPTIONS.map((value) => ({ label: `${value}`, value }))}
            value={config.gamesPerMatch}
            onChange={(value) => updateConfig({ gamesPerMatch: value })}
            disabledValues={gamesDisabledFor32}
          />
          <Text style={styles.hintText}>{t('tournament.config.games_summary', { summary: summaryGames })}</Text>
          {config.size === 32 ? (
            <Text style={styles.hintText}>{t('tournament.config.games_unavailable')}</Text>
          ) : null}

          <View style={styles.toggleRow}>
            <View style={styles.toggleTextWrap}>
              <Text style={styles.toggleTitle}>{t('tournament.config.third_place_label')}</Text>
              <Text style={styles.toggleDescription}>
                {t('tournament.config.third_place_desc')}
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

        <SectionCard title={t('tournament.config.section_access')}>
          <Text style={styles.fieldLabel}>{t('tournament.config.visibility_label')}</Text>
          <SegmentedRow
            options={[
              { label: t('tournament.common.public'), value: 'public' },
              { label: t('tournament.common.private'), value: 'private' },
            ]}
            value={config.visibility}
            onChange={(value) => updateConfig({ visibility: value })}
          />

          <Text style={styles.fieldLabel}>{t('tournament.config.rank_label')}</Text>
          <SegmentedRow
            options={rankOptions}
            value={config.minimumRanking}
            onChange={(value) => updateConfig({ minimumRanking: value })}
          />
        </SectionCard>

        <SectionCard title={t('tournament.config.section_schedule')}>
          <Text style={styles.fieldLabel}>{t('tournament.config.schedule_mode')}</Text>
          <SegmentedRow
            options={schedulingOptions}
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
                    <Text style={styles.scheduleTitle}>
                      {t('tournament.config.round_label', { label: getRoundLabelI18n(config.size, item.round) })}
                    </Text>
                    <View style={styles.schedulePickersRow}>
                      <View style={styles.schedulePickerBox}>
                        <Text style={styles.schedulePickerLabel}>{t('tournament.config.date_label')}</Text>
                        <TouchableOpacity style={styles.pickerButton} onPress={() => {
                          // For now, just use the default date; we'll add proper pickers later
                          updateRoundSchedule(item.round, { date: new Date(Date.now() + (30 * 60 * 1000)) });
                        }}>
                          <Text style={styles.pickerButtonText}>{formatDateLabel(selectedDate)}</Text>
                        </TouchableOpacity>
                      </View>
                      <View style={styles.schedulePickerBox}>
                        <Text style={styles.schedulePickerLabel}>{t('tournament.config.time_label')}</Text>
                        <TouchableOpacity style={styles.pickerButton} onPress={() => {
                          // For now, just use the default time
                          updateRoundSchedule(item.round, { time: new Date(Date.now() + (30 * 60 * 1000)) });
                        }}>
                          <Text style={styles.pickerButtonText}>{formatTimeLabel(selectedDate)}</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                    <Text style={styles.scheduleMeta}>
                      {t('tournament.config.scheduled_at', {
                        date: formatDateLabel(selectedDate),
                        time: formatTimeLabel(selectedDate)
                      })}
                    </Text>
                    <Text style={styles.scheduleMeta}>
                      {t('tournament.config.round_duration', {
                        minutes: estimates.durationMinutes,
                        matches: estimates.matchesInParallel
                      })}
                    </Text>
                  </View>
                );
              })}
            </View>
          ) : null}
        </SectionCard>

        <View style={[
          styles.summaryCard,
          isTablet && { width: contentWidth, alignSelf: 'center', padding: rs(18) },
        ]}>
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
          <Text style={[styles.errorText, isTablet && { width: contentWidth, alignSelf: 'center' }]}>
            {t('tournament.config.insufficient_balance')}
          </Text>
        ) : null}

        <View style={isTablet ? { width: contentWidth, alignSelf: 'center' } : undefined}>
        <Button
          title={isSubmitting ? t('tournament.config.btn_creating') : t('tournament.config.btn_create')}
          onPress={handleSubmit}
          disabled={!canAfford || isSubmitting}
          style={[styles.primaryButton, isTablet && { paddingVertical: rs(16) }]}
        />
        <Button
          title={t('tournament.config.btn_cancel')}
          onPress={() => navigation.goBack()}
          tone="ghost"
          style={styles.secondaryButton}
        />
        </View>
      </ScrollView>
      </KeyboardAvoidingView>
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
