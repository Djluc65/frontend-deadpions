import React, { memo } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { T, TY } from '../utils/theme';
import { getResponsiveSize } from '../utils/responsive';
import { getAvatarSource } from '../utils/avatarUtils';

const rs = getResponsiveSize;

// pawnColor: 'black' → pion rouge, 'white' → pion bleu (correspondance visuelle en jeu)
const PAWN_COLORS = {
  black: { fill: '#E63946', border: '#8B0000', label: 'Rouge' },
  white: { fill: '#4DA3FF', border: '#1A4F8A', label: 'Bleu' },
};

const MAX_TIMEOUTS = 5;

const PlayerHUD = memo(({
  name = '',
  flag = '',
  coins = 0,
  time = null,          // secondes restantes (null = pas de timer)
  isTurn = false,
  side = 'bottom',
  small = false,
  rotated = false,
  moves = null,
  pawnColor = null,     // 'black' | 'white'
  avatar = null,        // URL ou id avatar (géré par getAvatarSource)
  timeouts = 0,         // nombre de timeouts utilisés
  maxTimeouts = MAX_TIMEOUTS,
}) => {
  const initial = name ? name.charAt(0).toUpperCase() : '?';
  const timerRed = typeof time === 'number' && time < 10;
  const timerPct = typeof time === 'number' ? Math.max(0, Math.min(1, time / 60)) : 0;
  const showTimer = typeof time === 'number';
  const pawn = pawnColor ? PAWN_COLORS[pawnColor] : null;
  const avatarSrc = avatar ? getAvatarSource(avatar) : null;

  return (
    <View style={[
      styles.container,
      isTurn && styles.containerActive,
      small && styles.containerSmall,
      rotated && { transform: [{ rotate: '180deg' }] },
    ]}>
      <View style={styles.row}>

        {/* ── Avatar (image ou initiale) ── */}
        <View style={[styles.avatarWrap, isTurn && styles.avatarWrapActive, small && styles.avatarWrapSmall]}>
          {avatarSrc ? (
            <Image source={avatarSrc} style={styles.avatarImg} resizeMode="cover" />
          ) : (
            <Text style={[styles.avatarInitial, small && styles.avatarInitialSmall]}>{initial}</Text>
          )}
          {/* Badge couleur pion (petit carré en bas-droite de l'avatar) */}
          {pawn && (
            <View style={[styles.pawnBadge, { backgroundColor: pawn.fill, borderColor: pawn.border }]} />
          )}
        </View>

        {/* ── Info centrale ── */}
        <View style={styles.info}>

          {/* Nom + drapeau */}
          <Text style={[styles.name, small && styles.nameSmall]} numberOfLines={1}>
            {flag ? `${flag} ` : ''}{name}
          </Text>

          {/* Ligne meta : coups · couleur */}
          <View style={styles.metaRow}>
            {moves !== null && (
              <Text style={[styles.meta, small && styles.metaSmall]}>
                {moves} {moves === 1 ? 'coup' : 'coups'}
              </Text>
            )}
            {pawn && (
              <Text style={[styles.meta, small && styles.metaSmall, { color: pawn.fill }]}>
                ● {pawn.label}
              </Text>
            )}
          </View>

          {/* Timeouts : 5 pastilles (or = utilisé, sombre = restant) */}
          {maxTimeouts > 0 && (
            <View style={styles.timeoutRow}>
              {Array.from({ length: maxTimeouts }).map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.timeoutDot,
                    small && styles.timeoutDotSmall,
                    i < timeouts ? styles.timeoutUsed : styles.timeoutFree,
                  ]}
                />
              ))}
            </View>
          )}

          {/* Barre timer fine */}
          {showTimer && (
            <View style={[styles.timerTrack, small && styles.timerTrackSmall]}>
              <View
                style={[
                  styles.timerFill,
                  { width: `${timerPct * 100}%` },
                  timerRed && styles.timerFillRed,
                ]}
              />
            </View>
          )}
        </View>

        {/* ── Colonne droite : timer (chiffres) + pièces ── */}
        <View style={styles.rightCol}>
          {showTimer && (
            <Text style={[styles.timerNum, timerRed && styles.timerNumRed, small && styles.timerNumSmall]}>
              {time}s
            </Text>
          )}
          <Text style={[styles.coinsValue, small && styles.coinsValueSmall]}>
            {Number(coins || 0).toLocaleString()}
          </Text>
          <Text style={styles.coinsLabel}>💰</Text>
        </View>

      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    backgroundColor: T.bg2,
    borderWidth: 2,
    borderColor: T.borderSoft,
    borderRadius: rs(T.radiusMd),
    padding: rs(9),
    paddingHorizontal: rs(11),
    ...T.shadowCard,
  },
  containerActive: {
    borderColor: T.gold,
    ...T.shadowGold,
  },
  containerSmall: {
    padding: rs(6),
    paddingHorizontal: rs(9),
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(10),
  },

  // Avatar
  avatarWrap: {
    width: rs(40),
    height: rs(40),
    borderRadius: rs(20),
    backgroundColor: T.bg3,
    borderWidth: 2,
    borderColor: T.borderSoft,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'visible',
    position: 'relative',
  },
  avatarWrapActive: {
    borderColor: T.gold,
  },
  avatarWrapSmall: {
    width: rs(30),
    height: rs(30),
    borderRadius: rs(15),
  },
  avatarImg: {
    width: '100%',
    height: '100%',
    borderRadius: rs(20),
    overflow: 'hidden',
  },
  avatarInitial: {
    ...TY.heading,
    fontSize: rs(16),
    color: T.text,
  },
  avatarInitialSmall: {
    fontSize: rs(12),
  },
  // Pastille couleur pion en bas-droite de l'avatar
  pawnBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: rs(11),
    height: rs(11),
    borderRadius: rs(6),
    borderWidth: 1.5,
  },

  // Info
  info: {
    flex: 1,
    gap: rs(3),
  },
  name: {
    fontSize: rs(13),
    fontWeight: '700',
    color: T.text,
    letterSpacing: 0.2,
    textTransform: 'uppercase',
    flexShrink: 1,
  },
  nameSmall: {
    fontSize: rs(11),
  },
  metaRow: {
    flexDirection: 'row',
    gap: rs(8),
    alignItems: 'center',
  },
  meta: {
    fontSize: rs(10),
    color: T.textMuted,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  metaSmall: {
    fontSize: rs(9),
  },

  // Timeouts dots
  timeoutRow: {
    flexDirection: 'row',
    gap: rs(3),
    alignItems: 'center',
  },
  timeoutDot: {
    width: rs(7),
    height: rs(7),
    borderRadius: rs(4),
    borderWidth: 1,
  },
  timeoutDotSmall: {
    width: rs(6),
    height: rs(6),
  },
  timeoutUsed: {
    backgroundColor: T.gold,
    borderColor: T.goldDeep,
  },
  timeoutFree: {
    backgroundColor: T.bg3,
    borderColor: T.borderMid,
  },

  // Timer bar
  timerTrack: {
    height: rs(3),
    backgroundColor: T.borderMid,
    borderRadius: rs(T.radiusPill),
    overflow: 'hidden',
    width: '100%',
  },
  timerTrackSmall: {
    height: rs(2),
  },
  timerFill: {
    height: '100%',
    backgroundColor: T.gold,
    borderRadius: rs(T.radiusPill),
  },
  timerFillRed: {
    backgroundColor: T.red,
  },

  // Colonne droite
  rightCol: {
    alignItems: 'center',
    minWidth: rs(42),
    gap: rs(2),
  },
  timerNum: {
    fontSize: rs(18),
    fontWeight: '900',
    color: T.gold,
    letterSpacing: -0.5,
    fontVariant: ['tabular-nums'],
  },
  timerNumRed: {
    color: T.red,
  },
  timerNumSmall: {
    fontSize: rs(14),
  },
  coinsValue: {
    fontSize: rs(12),
    fontWeight: '800',
    color: T.gold,
    letterSpacing: 0.2,
  },
  coinsValueSmall: {
    fontSize: rs(10),
  },
  coinsLabel: {
    fontSize: rs(9),
  },
});

export default PlayerHUD;
