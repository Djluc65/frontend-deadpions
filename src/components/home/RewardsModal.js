import React, { memo, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, TouchableOpacity, View, Share, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { useAdManager } from '../../ads/AdSystem';
import { useCoinsContext } from '../../context/CoinsContext';
import {
  claimShare,
  ensureDailyReset,
  incrementLiveBonus,
  incrementPremiumRewarded,
  selectHardAiUnlockUntil,
  selectHasTempPremiumPions,
  selectLiveRemaining,
  selectPremiumRewardProgress,
  selectShareClaimedToday,
  unlockHardAi
} from '../../redux/slices/rewardsSlice';
import { appAlert } from '../../services/appAlert';
import { getResponsiveSize } from '../../utils/responsive';
import { modalTheme } from '../../utils/modalTheme';
import { T } from '../../utils/theme';
import { socket } from '../../utils/socket';

const formatDateTime = (ts) => {
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return '';
  }
};

const formatRemaining = (untilTs, t) => {
  const ms = Math.max(0, untilTs - Date.now());
  const totalMin = Math.floor(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h <= 0) return t('rewards.remaining_minutes', { minutes: m });
  return t('rewards.remaining_hours_minutes', { hours: h, minutes: m });
};

const RewardsModal = memo(({ visible, onClose }) => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { t } = useTranslation();
  const { showAds, prepareRewarded, showRewarded, rewardedLoaded, rewardedLoading } = useAdManager();
  const { credit } = useCoinsContext();

  const [busyKey, setBusyKey] = useState(null);

  const shareClaimed = useSelector((state) => selectShareClaimedToday(state, 'generic'));
  const premium = useSelector(selectPremiumRewardProgress);
  const hasTempPremium = useSelector((state) => selectHasTempPremiumPions(state));
  const hardAiUntil = useSelector(selectHardAiUnlockUntil);
  const liveRemaining = useSelector((state) => selectLiveRemaining(state));

  const hardAiActive = typeof hardAiUntil === 'number' && hardAiUntil > Date.now();

  const canUseRewarded = Boolean(showAds);
  const canUseShare = Boolean(Share && typeof Share.share === 'function');

  const grantLiveBonusOnServer = async (userId) => {
    if (!userId) return { ok: false, message: t('rewards.user_required') };
    if (!socket.connected) socket.connect();
    socket.emit('join_user_room', userId);

    return await new Promise((resolve) => {
      try {
        socket.emit('grant_live_room_bonus', { amount: 1 }, (res) => {
          resolve(res || { ok: false, message: t('rewards.invalid_response') });
        });
      } catch {
        resolve({ ok: false, message: t('errors.network') });
      }
    });
  };

  useEffect(() => {
    if (!visible) return;
    dispatch(ensureDailyReset({ nowTs: Date.now() }));
    prepareRewarded();
  }, [visible, dispatch, prepareRewarded]);

  const shareMessage = useMemo(() => {
    const base = t('rewards.share_message_base');
    const url = 'https://play.deadpions.eu';
    return `${base}\n${url}`;
  }, []);

  const handleShare = async () => {
    if (!user) {
      appAlert(t('auth.login_required'), t('rewards.login_required_desc'));
      return;
    }
    dispatch(ensureDailyReset({ nowTs: Date.now() }));
    if (shareClaimed) {
      appAlert(t('rewards.already_received_title'), t('rewards.share_already_claimed'));
      return;
    }
    if (!canUseShare) {
      appAlert(t('rewards.unavailable_title'), t('rewards.share_unavailable'));
      return;
    }

    setBusyKey('share');
    try {
      const result = await Share.share(
        Platform.OS === 'ios'
          ? { message: shareMessage }
          : { message: shareMessage, title: 'DeadPions' }
      );
      const didShare = result?.action === Share.sharedAction;
      if (!didShare) return;
      dispatch(claimShare({ channel: 'generic', nowTs: Date.now() }));
      await credit(50, t('rewards.share_credit_reason'), { source: 'share', channel: 'generic' });
      appAlert(t('rewards.reward_title'), t('rewards.coins_added', { amount: 50 }));
    } catch {
    } finally {
      setBusyKey(null);
    }
  };

  const handleRewardedPremium = async () => {
    if (!user) {
      appAlert(t('auth.login_required'), t('rewards.login_required_desc'));
      return;
    }
    dispatch(ensureDailyReset({ nowTs: Date.now() }));
    if (!canUseRewarded) {
      appAlert(t('rewards.unavailable_title'), t('rewards.rewarded_unavailable'));
      return;
    }
    if (hasTempPremium) {
      appAlert(t('rewards.already_active_title'), t('rewards.premium_active_until', { date: formatDateTime(premium.premiumUntil) }));
      return;
    }
    const next = (premium.watched || 0) + 1;
    const willUnlock = next >= (premium.required || 3);

    setBusyKey('premium');
    try {
      showRewarded({
        amount: 0,
        reason: t('rewards.reward_reason'),
        metadata: { reward: 'premium_pions' },
        onEarned: async () => {
          dispatch(incrementPremiumRewarded({ nowTs: Date.now() }));
          appAlert(
            t('rewards.validated_title'),
            willUnlock
              ? t('rewards.premium_unlocked')
              : t('rewards.progress', { current: next, total: premium.required })
          );
        }
      });
    } finally {
      setBusyKey(null);
    }
  };

  const handleRewardedHardAi = async () => {
    if (!user) {
      appAlert(t('auth.login_required'), t('rewards.login_required_desc'));
      return;
    }
    dispatch(ensureDailyReset({ nowTs: Date.now() }));
    if (!canUseRewarded) {
      appAlert(t('rewards.unavailable_title'), t('rewards.rewarded_unavailable'));
      return;
    }
    if (hardAiActive) {
      appAlert(t('rewards.already_active_title'), t('rewards.hard_ai_active_remaining', { remaining: formatRemaining(hardAiUntil, t) }));
      return;
    }

    setBusyKey('hard_ai');
    try {
      showRewarded({
        amount: 0,
        reason: t('rewards.reward_reason'),
        metadata: { reward: 'ai_hard' },
        onEarned: async () => {
          dispatch(unlockHardAi({ nowTs: Date.now() }));
          appAlert(t('rewards.unlocked_title'), t('rewards.hard_ai_unlocked'));
        }
      });
    } finally {
      setBusyKey(null);
    }
  };

  const handleRewardedLive = async () => {
    if (!user) {
      appAlert(t('auth.login_required'), t('rewards.login_required_desc'));
      return;
    }
    dispatch(ensureDailyReset({ nowTs: Date.now() }));
    if (!canUseRewarded) {
      appAlert(t('rewards.unavailable_title'), t('rewards.rewarded_unavailable'));
      return;
    }

    setBusyKey('live');
    try {
      showRewarded({
        amount: 0,
        reason: 'Récompense engagement',
        metadata: { reward: 'live_extra' },
        onEarned: async () => {
          dispatch(incrementLiveBonus({ nowTs: Date.now() }));
          const userId = user?._id || user?.id;
          const res = await grantLiveBonusOnServer(userId);
          if (res?.ok) {
            appAlert(t('rewards.reward_title'), t('rewards.live_reward_granted'));
          } else {
            appAlert(t('common.error'), res?.message || t('rewards.live_enable_failed'));
          }
        }
      });
    } finally {
      setBusyKey(null);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={modalTheme.overlay} onPress={onClose}>
        <Pressable style={[modalTheme.card, { width: '90%', maxWidth: 520 }]} onPress={() => {}}>
          <View style={{ width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={[modalTheme.title, { marginBottom: 0 }]}>{t('rewards.title')}</Text>
            <TouchableOpacity onPress={onClose} style={{ padding: getResponsiveSize(8) }}>
              <Ionicons name="close" size={getResponsiveSize(22)} color={T.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={{ width: '100%' }} contentContainerStyle={{ paddingTop: getResponsiveSize(14), gap: getResponsiveSize(12) }}>
            <View style={{ width: '100%', backgroundColor: T.bg3, borderRadius: getResponsiveSize(T.radiusMd), padding: getResponsiveSize(14), borderWidth: 1, borderColor: 'rgba(150, 180, 255, 0.18)' }}>
              <Text style={{ color: T.text, fontWeight: '900', marginBottom: getResponsiveSize(6) }}>{t('rewards.share_title')}</Text>
              <Text style={{ color: T.textDim, marginBottom: getResponsiveSize(10) }}>
                {t('rewards.share_desc', { amount: 50 })}
              </Text>
              <TouchableOpacity
                onPress={handleShare}
                disabled={busyKey != null || shareClaimed}
                style={[
                  modalTheme.button,
                  !shareClaimed ? modalTheme.buttonActive : null,
                  { opacity: shareClaimed ? 0.6 : 1 }
                ]}
              >
                {busyKey === 'share' ? (
                  <ActivityIndicator color={shareClaimed ? T.text : '#05060B'} />
                ) : (
                  <Text style={[modalTheme.buttonText, !shareClaimed ? modalTheme.buttonTextActive : null]}>
                    {shareClaimed ? t('rewards.share_claimed') : t('rewards.share_button', { amount: 50 })}
                  </Text>
                )}
              </TouchableOpacity>
            </View>

            <View style={{ width: '100%', backgroundColor: T.bg3, borderRadius: getResponsiveSize(T.radiusMd), padding: getResponsiveSize(14), borderWidth: 1, borderColor: 'rgba(150, 180, 255, 0.18)' }}>
              <Text style={{ color: T.text, fontWeight: '900', marginBottom: getResponsiveSize(6) }}>{t('rewards.premium_title')}</Text>
              <Text style={{ color: T.textDim, marginBottom: getResponsiveSize(10) }}>
                {t('rewards.premium_desc', { required: premium.required || 3 })}
              </Text>
              {typeof premium.premiumUntil === 'number' && premium.premiumUntil > Date.now() && (
                <Text style={{ color: T.gold, fontWeight: '800', marginBottom: getResponsiveSize(10) }}>
                  {t('rewards.active_until', { date: formatDateTime(premium.premiumUntil) })}
                </Text>
              )}
              {!hasTempPremium && (
                <Text style={{ color: T.textMuted, marginBottom: getResponsiveSize(10) }}>
                  {t('rewards.progress', { current: premium.watched, total: premium.required })}
                </Text>
              )}
              <TouchableOpacity
                onPress={handleRewardedPremium}
                disabled={busyKey != null || hasTempPremium}
                style={[
                  modalTheme.button,
                  !hasTempPremium ? modalTheme.buttonActive : null,
                  { opacity: hasTempPremium ? 0.6 : 1 }
                ]}
              >
                {busyKey === 'premium' ? (
                  <ActivityIndicator color={hasTempPremium ? T.text : '#05060B'} />
                ) : (
                  <Text style={[modalTheme.buttonText, !hasTempPremium ? modalTheme.buttonTextActive : null]}>
                    {hasTempPremium 
                      ? t('rewards.already_active') 
                      : (rewardedLoading && !rewardedLoaded ? t('common.loading') : t('rewards.watch_video'))}
                  </Text>
                )}
              </TouchableOpacity>
            </View>

            <View style={{ width: '100%', backgroundColor: T.bg3, borderRadius: getResponsiveSize(T.radiusMd), padding: getResponsiveSize(14), borderWidth: 1, borderColor: 'rgba(150, 180, 255, 0.18)' }}>
              <Text style={{ color: T.text, fontWeight: '900', marginBottom: getResponsiveSize(6) }}>{t('rewards.hard_ai_title')}</Text>
              <Text style={{ color: T.textDim, marginBottom: getResponsiveSize(10) }}>
                {t('rewards.hard_ai_desc')}
              </Text>
              {hardAiActive && (
                <Text style={{ color: T.gold, fontWeight: '800', marginBottom: getResponsiveSize(10) }}>
                  {t('rewards.active_remaining', { remaining: formatRemaining(hardAiUntil, t) })}
                </Text>
              )}
              <TouchableOpacity
                onPress={handleRewardedHardAi}
                disabled={busyKey != null || hardAiActive}
                style={[
                  modalTheme.button,
                  !hardAiActive ? modalTheme.buttonActive : null,
                  { opacity: hardAiActive ? 0.6 : 1 }
                ]}
              >
                {busyKey === 'hard_ai' ? (
                  <ActivityIndicator color={hardAiActive ? T.text : '#05060B'} />
                ) : (
                  <Text style={[modalTheme.buttonText, !hardAiActive ? modalTheme.buttonTextActive : null]}>
                    {hardAiActive 
                      ? t('rewards.already_active') 
                      : (rewardedLoading && !rewardedLoaded ? t('common.loading') : t('rewards.watch_video'))}
                  </Text>
                )}
              </TouchableOpacity>
            </View>

            <View style={{ width: '100%', backgroundColor: T.bg3, borderRadius: getResponsiveSize(T.radiusMd), padding: getResponsiveSize(14), borderWidth: 1, borderColor: 'rgba(150, 180, 255, 0.18)' }}>
              <Text style={{ color: T.text, fontWeight: '900', marginBottom: getResponsiveSize(6) }}>{t('rewards.live_title')}</Text>
              <Text style={{ color: T.textDim, marginBottom: getResponsiveSize(10) }}>
                {t('rewards.live_desc')}
              </Text>
              <Text style={{ color: T.gold, fontWeight: '800', marginBottom: getResponsiveSize(10) }}>
                {t('rewards.live_remaining_today', { count: liveRemaining })}
              </Text>
              <TouchableOpacity
                onPress={handleRewardedLive}
                disabled={busyKey != null}
                style={[modalTheme.button, modalTheme.buttonActive]}
              >
                {busyKey === 'live' ? (
                  <ActivityIndicator color="#05060B" />
                ) : (
                  <Text style={[modalTheme.buttonText, modalTheme.buttonTextActive]}>
                    {rewardedLoading && !rewardedLoaded ? t('common.loading') : t('rewards.watch_video_plus_one')}
                  </Text>
                )}
              </TouchableOpacity>
            </View>

            {!showAds && (
              <Text style={{ color: T.textMuted, textAlign: 'center', marginTop: getResponsiveSize(8) }}>
                {t('rewards.rewarded_unavailable')}
              </Text>
            )}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
});

export default RewardsModal;
