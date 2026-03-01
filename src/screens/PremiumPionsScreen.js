import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Animated,
  Dimensions,
  ScrollView,
  Modal,
  SafeAreaView,
  Alert,
  ActivityIndicator
} from 'react-native';
import Svg, { Circle, Path, G, Defs, RadialGradient, Stop, LinearGradient, Ellipse } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { updateUser } from '../redux/slices/authSlice';
import { API_URL } from '../config';
import PionSVG, { PION_COLORS } from '../components/PionSVG';

const { width } = Dimensions.get('window');

// ─── Types & Configuration ────────────────────────────────────────────────────────────

const PION_TYPES = [
  { id: 'skull',   label: 'Skull',   labelFR: 'Tête de Mort', emoji: '💀', isPremium: false },
  { id: 'bull',    label: 'Bull',    labelFR: 'Tête de Taureau', emoji: '🐂', isPremium: true },
  { id: 'lion',    label: 'Lion',    labelFR: 'Tête de Lion', emoji: '🦁', isPremium: true },
  { id: 'dragon',  label: 'Dragon',  labelFR: 'Tête de Dragon', emoji: '🐲', isPremium: true },
  { id: 'wolf',    label: 'Wolf',    labelFR: 'Tête de Loup', emoji: '🐺', isPremium: true },
  { id: 'serpent', label: 'Serpent', labelFR: 'Tête de Serpent', emoji: '🐍', isPremium: true },
];

// ─── Color Palettes ────────────────────────────────────────────────────────────
const COLORS = PION_COLORS;

// ─── Pion Card ─────────────────────────────────────────────────────────────────

function PionCard({
  type,
  color,
  config,
  onPress,
  selected,
  equipped,
}) {
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
    <TouchableOpacity onPress={handlePress} activeOpacity={0.85}>
      <Animated.View
        style={[
          styles.pionCard,
          selected && { borderColor: c.light, borderWidth: 2 },
          { transform: [{ scale }] },
        ]}
      >
        {config.isPremium && (
          <View style={styles.premiumBadge}>
            <Text style={styles.premiumText}>PRO</Text>
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
          {config.labelFR}
        </Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

// ─── Main Screen ───────────────────────────────────────────────────────────────

export default function PremiumPionsScreen() {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const { user, token } = useSelector(state => state.auth);
  
  const [selectedType, setSelectedType] = useState(user?.pawnSkin || 'skull');
  const [selectedColor, setSelectedColor] = useState('red');
  const [detailVisible, setDetailVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  const selectedConfig = PION_TYPES.find(p => p.id === selectedType) || PION_TYPES[0];
  const isOwned = !selectedConfig.isPremium || user?.isPremium || user?.isEarlyAccess;
  const isEquipped = user?.pawnSkin === selectedType;

  const handleEquip = async () => {
    if (!user) {
      Alert.alert('Connexion requise', 'Veuillez vous connecter pour équiper un pion.');
      return;
    }
    
    if (!isOwned) {
      Alert.alert('Premium requis', 'Ce pion est réservé aux membres Premium.');
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
        Alert.alert('Succès', 'Pion équipé avec succès !');
        setDetailVisible(false);
      } else {
        Alert.alert('Erreur', data.message || 'Impossible de mettre à jour le profil');
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Erreur', 'Erreur de connexion au serveur');
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
          <Text style={styles.subtitle}>Collection Premium</Text>
        </View>

        {/* Color Toggle */}
        <View style={styles.colorToggle}>
          <TouchableOpacity
            style={[styles.colorBtn, selectedColor === 'red' && styles.colorBtnActiveRed]}
            onPress={() => setSelectedColor('red')}
          >
            <Text style={styles.colorBtnText}>🔴 ROUGE</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.colorBtn, selectedColor === 'blue' && styles.colorBtnActiveBlue]}
            onPress={() => setSelectedColor('blue')}
          >
            <Text style={styles.colorBtnText}>🔵 BLEU</Text>
          </TouchableOpacity>
        </View>

        {/* Selected Pion Preview */}
        <TouchableOpacity onPress={() => setDetailVisible(true)} activeOpacity={0.9}>
          <View style={styles.previewContainer}>
            <View style={[styles.previewGlow, { backgroundColor: COLORS[selectedColor].primary }]} />
            <PionSVG type={selectedType} color={selectedColor} size={140} />
            <Text style={styles.previewLabel}>{selectedConfig.labelFR.toUpperCase()}</Text>
            <Text style={styles.previewHint}>Appuyer pour voir en détail</Text>
          </View>
        </TouchableOpacity>

        {/* Grid */}
        <Text style={styles.sectionTitle}>Choisir un Pion</Text>
        <View style={styles.grid}>
          {PION_TYPES.map(config => (
            <PionCard
              key={`${config.id}_${selectedColor}`}
              type={config.id}
              color={selectedColor}
              config={config}
              onPress={() => setSelectedType(config.id)}
              selected={selectedType === config.id}
              equipped={user?.pawnSkin === config.id}
            />
          ))}
        </View>

        {/* Unlock Banner */}
        {!user?.isPremium && !user?.isEarlyAccess && (
          <View style={styles.unlockBanner}>
            <Text style={styles.unlockTitle}>🔓 Débloque tous les Pions</Text>
            <Text style={styles.unlockSub}>12 pions exclusifs — Rouge & Bleu</Text>
            <TouchableOpacity 
              style={styles.unlockBtn}
              onPress={() => navigation.navigate('Shop', { purchaseTarget: 'premium_unlock' })}
            >
              <Text style={styles.unlockBtnText}>PASSER EN PRO — 4,99€</Text>
            </TouchableOpacity>
          </View>
        )}

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
            <Text style={styles.modalTitle}>{selectedConfig.labelFR.toUpperCase()}</Text>
            <Text style={[styles.modalColorTag, { color: COLORS[selectedColor].light }]}>
              {selectedColor === 'red' ? '🔴 Équipe Rouge' : '🔵 Équipe Bleue'}
            </Text>
            {selectedConfig.isPremium && (
              <View style={styles.proBadgeLarge}>
                <Text style={styles.proBadgeText}>✨ VERSION PRO</Text>
              </View>
            )}

            {isEquipped ? (
              <View style={[styles.equipButton, { backgroundColor: '#444' }]}>
                 <Text style={styles.equipButtonText}>ACTUELLEMENT ÉQUIPÉ</Text>
              </View>
            ) : isOwned ? (
              <TouchableOpacity 
                style={[styles.equipButton, { backgroundColor: COLORS[selectedColor].primary }]}
                onPress={handleEquip}
                disabled={loading}
              >
                {loading ? (
                   <ActivityIndicator color="#FFF" />
                ) : (
                   <Text style={styles.equipButtonText}>ÉQUIPER CE PION</Text>
                )}
              </TouchableOpacity>
            ) : (
              <TouchableOpacity 
                style={[styles.equipButton, { backgroundColor: '#CC0000' }]}
                onPress={() => {
                   setDetailVisible(false);
                   navigation.navigate('Shop', { purchaseTarget: 'premium_unlock' });
                }}
              >
                <Text style={styles.equipButtonText}>DÉBLOQUER (PRO)</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity onPress={() => setDetailVisible(false)} style={{ marginTop: 10 }}>
               <Text style={styles.modalClose}>Fermer</Text>
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
    backgroundColor: COLORS.bg,
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
    color: '#CC0000',
    letterSpacing: 4,
    textTransform: 'uppercase',
  },
  titleBlue: {
    color: '#0088FF',
  },
  subtitle: {
    fontSize: 13,
    color: '#666',
    letterSpacing: 6,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  colorToggle: {
    flexDirection: 'row',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#222',
    marginBottom: 24,
  },
  colorBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: COLORS.card,
  },
  colorBtnActiveRed: {
    backgroundColor: '#3D0000',
  },
  colorBtnActiveBlue: {
    backgroundColor: '#001144',
  },
  colorBtnText: {
    color: '#CCC',
    fontWeight: '700',
    letterSpacing: 2,
    fontSize: 13,
  },
  previewContainer: {
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 24,
    paddingVertical: 32,
    marginBottom: 28,
    borderWidth: 1,
    borderColor: '#222',
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
    color: '#FFF',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 3,
    marginTop: 16,
    textTransform: 'uppercase',
  },
  previewHint: {
    color: '#444',
    fontSize: 11,
    marginTop: 6,
    letterSpacing: 1,
  },
  sectionTitle: {
    color: '#555',
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
    width: (width - 64) / 3,
    aspectRatio: 0.9,
    backgroundColor: COLORS.card,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#222',
    overflow: 'hidden',
    paddingVertical: 12,
  },
  premiumBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: '#FFD700',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  premiumText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#000',
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
    borderRadius: 16,
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
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  unlockTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 4,
  },
  unlockSub: {
    color: '#777',
    fontSize: 13,
    marginBottom: 16,
  },
  unlockBtn: {
    backgroundColor: '#CC0000',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 12,
  },
  unlockBtnText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 14,
    letterSpacing: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    backgroundColor: COLORS.card,
    borderRadius: 32,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
    overflow: 'hidden',
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
    color: '#FFF',
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
    backgroundColor: COLORS.gold,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 24,
  },
  proBadgeText: {
    color: '#000',
    fontWeight: '800',
    fontSize: 12,
    letterSpacing: 1,
  },
  modalClose: {
    color: '#888',
    fontSize: 14,
  },
  equipButton: {
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 25,
    marginTop: 20,
    minWidth: 200,
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
  },
  equipButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
});
