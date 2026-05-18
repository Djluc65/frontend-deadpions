import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Animated,
  ScrollView,
  Modal,
  SafeAreaView,
  ActivityIndicator,
  useWindowDimensions
} from 'react-native';
import { T } from '../utils/theme';
import Svg, { Circle, Path, G, Defs, RadialGradient, Stop, LinearGradient, Ellipse } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { updateUser } from '../redux/slices/authSlice';
import { selectHasTempPremiumPions } from '../redux/slices/rewardsSlice';
import { API_URL } from '../config';
import PionSVG, { PION_COLORS } from '../components/PionSVG';
import { appAlert } from '../services/appAlert';
import { useTranslation } from 'react-i18next';

// ─── Types & Configuration ────────────────────────────────────────────────────────────

const PION_TYPES = [
  { id: 'skull',      labelKey: 'pions.skins.skull',      emoji: '💀', isPremium: false },
  { id: 'neon_skull', labelKey: 'pions.skins.neon_skull', emoji: '☠️', isPremium: true },
  { id: 'bull',       labelKey: 'pions.skins.bull',       emoji: '🐂', isPremium: true },
  { id: 'lion',       labelKey: 'pions.skins.lion',       emoji: '🦁', isPremium: true },
  { id: 'dragon',     labelKey: 'pions.skins.dragon',     emoji: '🐲', isPremium: true },
  { id: 'wolf',       labelKey: 'pions.skins.wolf',       emoji: '🐺', isPremium: true },
  { id: 'serpent',    labelKey: 'pions.skins.serpent',    emoji: '🐍', isPremium: true },
];

// ─── Color Palettes ────────────────────────────────────────────────────────────
const COLORS = PION_COLORS;

// ─── Pion Card ─────────────────────────────────────────────────────────────────

function PionCard({
  type,
  color,
  config,
  onPress,
  locked,
  onLockedPress,
  selected,
  equipped,
  cardWidth,
}) {
  const { t } = useTranslation();
  const scale = useRef(new Animated.Value(1)).current;
  const glow = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (selected) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(glow, { toValue: 1, duration: 800, useNativeDriver: true }),
          Animated.timing(glow, { toValue: 0, duration: 800, useNativeDriver: true }),
        ])
      ).start();
    } else {
      glow.stopAnimation();
      glow.setValue(0);
    }
  }, [selected]);

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.88, duration: 80, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, friction: 4, useNativeDriver: true }),
    ]).start();
    onPress();
  };

  const c = COLORS[color];
  const glowOpacity = glow.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.9] });

  return (
    <TouchableOpacity
      onPress={locked ? onLockedPress : handlePress}
      activeOpacity={0.85}
      disabled={locked}
    >
      <Animated.View
        style={[
          styles.pionCard,
          typeof cardWidth === 'number' ? { width: cardWidth } : null,
          selected && { borderColor: c.light, borderWidth: 2 },
          { transform: [{ scale }] },
        ]}
      >
        {config.isPremium && (
          <View style={styles.premiumBadge}>
            <Text style={styles.premiumText}>{t('premium_pions.pro_badge')}</Text>
          </View>
        )}

        {equipped && (
          <View style={styles.equippedBadge}>
            <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
          </View>
        )}

        {selected && (
          <Animated.View
            style={[
              StyleSheet.absoluteFillObject,
              styles.selectedGlow,
              { backgroundColor: c.primary, opacity: glowOpacity },
            ]}
          />
        )}

        <PionSVG type={type} color={color} size={72} />

        <Text style={[styles.pionLabel, { color: selected ? c.light : '#AAA' }]}>
          {t(config.labelKey)}
        </Text>

        {locked && (
          <View style={styles.lockOverlay}>
            <Ionicons name="lock-closed" size={18} color={T.gold} />
          </View>
        )}
      </Animated.View>
    </TouchableOpacity>
  );
}

// ─── Main Screen ───────────────────────────────────────────────────────────────

export default function PremiumPionsScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const { user, token } = useSelector(state => state.auth);
  const hasTempPremiumPions = useSelector(selectHasTempPremiumPions);
  const { width } = useWindowDimensions();
  
  const [selectedType, setSelectedType] = useState(user?.pawnSkin || 'skull');
  const [selectedColor, setSelectedColor] = useState('red');
  const [detailVisible, setDetailVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  const selectedConfig = PION_TYPES.find(p => p.id === selectedType) || PION_TYPES[0];
  const isEquipped = user?.pawnSkin === selectedType;
  const canAccessPremium = Boolean(user?.isPremium || user?.isEarlyAccess || hasTempPremiumPions);

  const gridGap = 12;
  const scrollPaddingHorizontal = 20;
  const availableGridWidth = Math.max(0, width - scrollPaddingHorizontal * 2);
  const pionCardWidth = Math.floor((availableGridWidth - gridGap * 2) / 3);

  const handleEquip = async () => {
    if (!user) {
      appAlert(t('auth.login_required'), t('premium_pions.login_required_desc'));
      return;
    }
    if (selectedConfig.isPremium && !canAccessPremium) {
      appAlert(t('premium_pions.unlock_required_title'), t('premium_pions.unlock_required_desc'));
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/users/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ pawnSkin: selectedType })
      });

      const data = await response.json();
      
      if (response.ok) {
        dispatch(updateUser({ pawnSkin: selectedType }));
        appAlert(t('common.success'), t('premium_pions.equip_success'));
        setDetailVisible(false);
      } else {
        appAlert(t('common.error'), data.message || t('premium_pions.update_profile_failed'));
      }
    } catch (error) {
      console.error(error);
      appAlert(t('common.error'), t('errors.server_unavailable'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity 
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Ionicons name="arrow-back" size={28} color="#FFF" style={{marginTop: 25}} />
      </TouchableOpacity>
      
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>DEAD<Text style={styles.titleBlue}>PIONS</Text></Text>
          <Text style={styles.subtitle}>{t('premium_pions.subtitle')}</Text>
        </View>

        {/* Color Toggle */}
        <View style={styles.colorToggle}>
          <TouchableOpacity
            style={[styles.colorBtn, selectedColor === 'red' && styles.colorBtnActiveRed]}
            onPress={() => setSelectedColor('red')}
          >
            <Text style={styles.colorBtnText}>🔴 {t('colors.red').toUpperCase()}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.colorBtn, selectedColor === 'blue' && styles.colorBtnActiveBlue]}
            onPress={() => setSelectedColor('blue')}
          >
            <Text style={styles.colorBtnText}>🔵 {t('colors.blue').toUpperCase()}</Text>
          </TouchableOpacity>
        </View>

        {/* Selected Pion Preview */}
        <TouchableOpacity onPress={() => setDetailVisible(true)} activeOpacity={0.9}>
          <View style={styles.previewContainer}>
            <View style={[styles.previewGlow, { backgroundColor: COLORS[selectedColor].primary }]} />
            <PionSVG type={selectedType} color={selectedColor} size={140} />
            <Text style={styles.previewLabel}>{t(selectedConfig.labelKey).toUpperCase()}</Text>
            <Text style={styles.previewHint}>{t('premium_pions.tap_for_details')}</Text>
          </View>
        </TouchableOpacity>

        {/* Grid */}
        <Text style={styles.sectionTitle}>{t('premium_pions.choose_pawn')}</Text>
        <View style={styles.grid}>
          {PION_TYPES.map(config => (
            <PionCard
              key={`${config.id}_${selectedColor}`}
              type={config.id}
              color={selectedColor}
              config={config}
              onPress={() => setSelectedType(config.id)}
              locked={Boolean(config.isPremium && !canAccessPremium)}
              onLockedPress={() => appAlert(t('ai.locked_title'), t('premium_pions.locked_desc'))}
              selected={selectedType === config.id}
              equipped={user?.pawnSkin === config.id}
              cardWidth={pionCardWidth}
            />
          ))}
        </View>

      </ScrollView>

      {/* Detail Modal */}
      <Modal visible={detailVisible} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setDetailVisible(false)}
        >
          <View style={styles.modalCard}>
            <View style={[styles.modalGlow, { backgroundColor: COLORS[selectedColor].primary }]} />
            <PionSVG type={selectedType} color={selectedColor} size={200} />
            <Text style={styles.modalTitle}>{t(selectedConfig.labelKey).toUpperCase()}</Text>
            <Text style={[styles.modalColorTag, { color: COLORS[selectedColor].light }]}>
              {selectedColor === 'red'
                ? t('premium_pions.team_red')
                : t('premium_pions.team_blue')}
            </Text>
            {selectedConfig.isPremium && (
              <View style={styles.proBadgeLarge}>
                <Text style={styles.proBadgeText}>✨ {t('premium_pions.pro_version')}</Text>
              </View>
            )}

            {isEquipped ? (
              <View style={[styles.equipButton, { backgroundColor: '#444' }]}>
                 <Text style={styles.equipButtonText}>{t('premium_pions.currently_equipped')}</Text>
              </View>
            ) : (
              <TouchableOpacity 
                style={[styles.equipButton, { backgroundColor: COLORS[selectedColor].primary }]}
                onPress={handleEquip}
                disabled={loading}
              >
                {loading ? (
                   <ActivityIndicator color="#FFF" />
                ) : (
                   <Text style={styles.equipButtonText}>{t('premium_pions.equip_button')}</Text>
                )}
              </TouchableOpacity>
            )}

            <TouchableOpacity onPress={() => setDetailVisible(false)} style={{ marginTop: 10 }}>
               <Text style={styles.modalClose}>{t('common.close')}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: T.bg0,
  },
  scroll: {
    padding: 20,
    paddingBottom: 40,
  },
  backButton: {
    position: 'absolute',
    top: 10,
    left: 20,
    zIndex: 10,
    padding: 10,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 8,
  },
  title: {
    fontSize: 42,
    fontWeight: '900',
    color: T.red,
    letterSpacing: 4,
    textTransform: 'uppercase',
  },
  titleBlue: {
    color: T.blue,
  },
  subtitle: {
    fontSize: 13,
    color: T.textMuted,
    letterSpacing: 6,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  colorToggle: {
    flexDirection: 'row',
    borderRadius: T.radiusMd,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: T.borderSoft,
    marginBottom: 24,
  },
  colorBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: T.bg2,
  },
  colorBtnActiveRed: {
    backgroundColor: 'rgba(230,57,70,0.2)',
  },
  colorBtnActiveBlue: {
    backgroundColor: 'rgba(77,163,255,0.2)',
  },
  colorBtnText: {
    color: T.textDim,
    fontWeight: '700',
    letterSpacing: 2,
    fontSize: 13,
  },
  previewContainer: {
    alignItems: 'center',
    backgroundColor: T.bg2,
    borderRadius: T.radiusLg,
    paddingVertical: 32,
    marginBottom: 28,
    borderWidth: 1,
    borderColor: T.borderSoft,
    overflow: 'hidden',
  },
  previewGlow: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    opacity: 0.08,
    top: '50%',
    marginTop: -90,
  },
  previewLabel: {
    color: T.text,
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 3,
    marginTop: 16,
    textTransform: 'uppercase',
  },
  previewHint: {
    color: T.textMuted,
    fontSize: 11,
    marginTop: 6,
    letterSpacing: 1,
  },
  sectionTitle: {
    color: T.textMuted,
    fontSize: 11,
    letterSpacing: 4,
    textTransform: 'uppercase',
    marginBottom: 14,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
    marginBottom: 28,
  },
  pionCard: {
    aspectRatio: 0.9,
    backgroundColor: T.bg2,
    borderRadius: T.radiusMd,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: T.borderSoft,
    overflow: 'hidden',
    paddingVertical: 12,
  },
  premiumBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: T.gold,
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  premiumText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#1B1305',
    letterSpacing: 1,
  },
  equippedBadge: {
    position: 'absolute',
    top: 5,
    left: 5,
    zIndex: 5,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 12,
  },
  selectedGlow: {
    borderRadius: T.radiusMd,
  },
  lockOverlay: {
    position: 'absolute',
    right: 8,
    bottom: 8,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.35)',
  },
  pionLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1,
    marginTop: 6,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  unlockBanner: {
    backgroundColor: T.bg2,
    borderRadius: T.radiusLg,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: T.borderSoft,
  },
  unlockTitle: {
    color: T.text,
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 4,
  },
  unlockSub: {
    color: T.textMuted,
    fontSize: 13,
    marginBottom: 16,
  },
  unlockBtn: {
    backgroundColor: T.red,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: T.radiusMd,
  },
  unlockBtnText: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 14,
    letterSpacing: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: T.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    backgroundColor: T.bg2,
    borderRadius: T.radiusXl,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: T.borderSoft,
    overflow: 'hidden',
    ...T.shadowCard,
  },
  modalGlow: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    opacity: 0.1,
    top: -50,
  },
  modalTitle: {
    color: T.text,
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 2,
    marginTop: 24,
    marginBottom: 8,
    textAlign: 'center',
  },
  modalColorTag: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 1,
    marginBottom: 24,
  },
  proBadgeLarge: {
    backgroundColor: T.gold,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: T.radiusPill,
    marginBottom: 24,
  },
  proBadgeText: {
    color: '#1B1305',
    fontWeight: '800',
    fontSize: 12,
    letterSpacing: 1,
  },
  modalClose: {
    color: T.textMuted,
    fontSize: 14,
  },
  equipButton: {
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: T.radiusPill,
    marginTop: 20,
    minWidth: 200,
    alignItems: 'center',
    ...T.shadowBtn,
  },
  equipButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 1,
  },
});
