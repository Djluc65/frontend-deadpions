import React, { memo, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, TouchableOpacity, View, Share, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
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

const formatRemaining = (untilTs) => {
  const ms = Math.max(0, untilTs - Date.now());
  const totalMin = Math.floor(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h <= 0) return `${m} min`;
  return `${h} h ${m} min`;
};

const RewardsModal = memo(({ visible, onClose }) => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { showAds, prepareRewarded, showRewarded } = useAdManager();
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
    if (!userId) return { ok: false, message: 'Utilisateur requis' };
    if (!socket.connected) socket.connect();
    socket.emit('join_user_room', userId);

    return await new Promise((resolve) => {
      try {
        socket.emit('grant_live_room_bonus', { amount: 1 }, (res) => {
          resolve(res || { ok: false, message: 'Réponse invalide' });
        });
      } catch {
        resolve({ ok: false, message: 'Erreur réseau.' });
      }
    });
  };

  useEffect(() => {
    if (!visible) return;
    dispatch(ensureDailyReset({ nowTs: Date.now() }));
    prepareRewarded();
  }, [visible, dispatch, prepareRewarded]);

  const shareMessage = useMemo(() => {
    const base = "Viens jouer à DeadPions !";
    const url = "https://play.deadpions.eu";
    return `${base}\n${url}`;
  }, []);

  const handleShare = async () => {
    if (!user) {
      appAlert('Connexion requise', 'Connectez-vous pour recevoir des récompenses.');
      return;
    }
    dispatch(ensureDailyReset({ nowTs: Date.now() }));
    if (shareClaimed) {
      appAlert('Déjà reçu', "Récompense de partage déjà obtenue aujourd'hui.");
      return;
    }
    if (!canUseShare) {
      appAlert('Indisponible', 'Partage indisponible sur cette plateforme.');
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
      await credit(50, 'Partage social', { source: 'share', channel: 'generic' });
      appAlert('Récompense', '+50 coins ajoutés !');
    } catch {
    } finally {
      setBusyKey(null);
    }
  };

  const handleRewardedPremium = async () => {
    if (!user) {
      appAlert('Connexion requise', 'Connectez-vous pour recevoir des récompenses.');
      return;
    }
    dispatch(ensureDailyReset({ nowTs: Date.now() }));
    if (!canUseRewarded) {
      appAlert('Indisponible', 'Publicités récompensées indisponibles sur ce build.');
      return;
    }
    if (hasTempPremium) {
      appAlert('Déjà actif', `Accès premium actif jusqu'au ${formatDateTime(premium.premiumUntil)}.`);
      return;
    }
    const next = (premium.watched || 0) + 1;
    const willUnlock = next >= (premium.required || 3);

    setBusyKey('premium');
    try {
      showRewarded({
        amount: 0,
        reason: 'Récompense engagement',
        metadata: { reward: 'premium_pions' },
        onEarned: async () => {
          dispatch(incrementPremiumRewarded({ nowTs: Date.now() }));
          appAlert('Validé', willUnlock ? 'Accès pions premium activé pendant 1 mois.' : `Progression: ${next}/${premium.required}`);
        }
      });
    } finally {
      setBusyKey(null);
    }
  };

  const handleRewardedHardAi = async () => {
    if (!user) {
      appAlert('Connexion requise', 'Connectez-vous pour recevoir des récompenses.');
      return;
    }
    dispatch(ensureDailyReset({ nowTs: Date.now() }));
    if (!canUseRewarded) {
      appAlert('Indisponible', 'Publicités récompensées indisponibles sur ce build.');
      return;
    }
    if (hardAiActive) {
      appAlert('Déjà actif', `Mode difficile actif encore ${formatRemaining(hardAiUntil)}.`);
      return;
    }

    setBusyKey('hard_ai');
    try {
      showRewarded({
        amount: 0,
        reason: 'Récompense engagement',
        metadata: { reward: 'ai_hard' },
        onEarned: async () => {
          dispatch(unlockHardAi({ nowTs: Date.now() }));
          appAlert('Débloqué', 'Mode difficile débloqué pendant 1 heure.');
        }
      });
    } finally {
      setBusyKey(null);
    }
  };

  const handleRewardedLive = async () => {
    if (!user) {
      appAlert('Connexion requise', 'Connectez-vous pour recevoir des récompenses.');
      return;
    }
    dispatch(ensureDailyReset({ nowTs: Date.now() }));
    if (!canUseRewarded) {
      appAlert('Indisponible', 'Publicités récompensées indisponibles sur ce build.');
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
            appAlert('Récompense', '+1 salle live ajoutée pour aujourd’hui.');
          } else {
            appAlert('Erreur', res?.message || "Impossible d'activer l'accès Live.");
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
            <Text style={[modalTheme.title, { marginBottom: 0 }]}>Récompenses</Text>
            <TouchableOpacity onPress={onClose} style={{ padding: getResponsiveSize(8) }}>
              <Ionicons name="close" size={getResponsiveSize(22)} color={T.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={{ width: '100%' }} contentContainerStyle={{ paddingTop: getResponsiveSize(14), gap: getResponsiveSize(12) }}>
            <View style={{ width: '100%', backgroundColor: T.bg3, borderRadius: getResponsiveSize(T.radiusMd), padding: getResponsiveSize(14), borderWidth: 1, borderColor: T.borderSoft }}>
              <Text style={{ color: T.text, fontWeight: '900', marginBottom: getResponsiveSize(6) }}>1) Partage social</Text>
              <Text style={{ color: T.textDim, marginBottom: getResponsiveSize(10) }}>
                Partage l'app et reçois +50 coins (1 fois par jour).
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
                  <ActivityIndicator color={shareClaimed ? T.text : '#1B1305'} />
                ) : (
                  <Text style={[modalTheme.buttonText, !shareClaimed ? modalTheme.buttonTextActive : null]}>
                    {shareClaimed ? "Déjà reçu aujourd'hui" : 'Partager (+50)'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>

            <View style={{ width: '100%', backgroundColor: T.bg3, borderRadius: getResponsiveSize(T.radiusMd), padding: getResponsiveSize(14), borderWidth: 1, borderColor: T.borderSoft }}>
              <Text style={{ color: T.text, fontWeight: '900', marginBottom: getResponsiveSize(6) }}>2) Pions premium (1 mois)</Text>
              <Text style={{ color: T.textDim, marginBottom: getResponsiveSize(10) }}>
                Regarde 3 vidéos récompensées pour débloquer les pions premium pendant 1 mois.
              </Text>
              {typeof premium.premiumUntil === 'number' && premium.premiumUntil > Date.now() && (
                <Text style={{ color: T.gold, fontWeight: '800', marginBottom: getResponsiveSize(10) }}>
                  Actif jusqu’au {formatDateTime(premium.premiumUntil)}
                </Text>
              )}
              {!hasTempPremium && (
                <Text style={{ color: T.textMuted, marginBottom: getResponsiveSize(10) }}>
                  Progression: {premium.watched}/{premium.required}
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
                  <ActivityIndicator color={hasTempPremium ? T.text : '#1B1305'} />
                ) : (
                  <Text style={[modalTheme.buttonText, !hasTempPremium ? modalTheme.buttonTextActive : null]}>
                    {hasTempPremium ? 'Déjà actif' : 'Regarder une vidéo'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>

            <View style={{ width: '100%', backgroundColor: T.bg3, borderRadius: getResponsiveSize(T.radiusMd), padding: getResponsiveSize(14), borderWidth: 1, borderColor: T.borderSoft }}>
              <Text style={{ color: T.text, fontWeight: '900', marginBottom: getResponsiveSize(6) }}>3) Mode difficile (Ordinateur)</Text>
              <Text style={{ color: T.textDim, marginBottom: getResponsiveSize(10) }}>
                1 vidéo récompensée = déblocage temporaire du mode difficile (1h).
              </Text>
              {hardAiActive && (
                <Text style={{ color: T.gold, fontWeight: '800', marginBottom: getResponsiveSize(10) }}>
                  Actif encore {formatRemaining(hardAiUntil)}
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
                  <ActivityIndicator color={hardAiActive ? T.text : '#1B1305'} />
                ) : (
                  <Text style={[modalTheme.buttonText, !hardAiActive ? modalTheme.buttonTextActive : null]}>
                    {hardAiActive ? 'Déjà actif' : 'Regarder une vidéo'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>

            <View style={{ width: '100%', backgroundColor: T.bg3, borderRadius: getResponsiveSize(T.radiusMd), padding: getResponsiveSize(14), borderWidth: 1, borderColor: T.borderSoft }}>
              <Text style={{ color: T.text, fontWeight: '900', marginBottom: getResponsiveSize(6) }}>4) Salles live</Text>
              <Text style={{ color: T.textDim, marginBottom: getResponsiveSize(10) }}>
                5 salles/jour. Chaque vidéo ajoute +1 salle pour aujourd’hui.
              </Text>
              <Text style={{ color: T.gold, fontWeight: '800', marginBottom: getResponsiveSize(10) }}>
                Restant aujourd’hui: {liveRemaining}
              </Text>
              <TouchableOpacity
                onPress={handleRewardedLive}
                disabled={busyKey != null}
                style={[modalTheme.button, modalTheme.buttonActive]}
              >
                {busyKey === 'live' ? (
                  <ActivityIndicator color="#1B1305" />
                ) : (
                  <Text style={[modalTheme.buttonText, modalTheme.buttonTextActive]}>Regarder une vidéo (+1)</Text>
                )}
              </TouchableOpacity>
            </View>

            {!showAds && (
              <Text style={{ color: T.textMuted, textAlign: 'center', marginTop: getResponsiveSize(8) }}>
                Les publicités récompensées ne sont pas disponibles sur ce build.
              </Text>
            )}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
});

export default RewardsModal;
