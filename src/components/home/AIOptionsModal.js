import React, { memo } from 'react';
import { Modal, Pressable, ScrollView, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { playButtonSound } from '../../utils/soundManager';
import { getResponsiveSize } from '../../utils/responsive';
import { modalTheme } from '../../utils/modalTheme';

const AIOptionsModal = memo(({
  visible,
  onClose,
  aiDifficulte,
  setAiDifficulte,
  aiPremierJoueur,
  setAiPremierJoueur,
  aiCouleurJoueur,
  setAiCouleurJoueur,
  onBack,
  onStart
}) => {
  const niveaux = [
    { id: 'facile', titre: 'Facile', emoji: '🟢', description: 'Parfait pour débuter' },
    { id: 'moyen', titre: 'Moyen', emoji: '🟡', description: 'Challenge équilibré' },
    { id: 'difficile', titre: 'Difficile', emoji: '🔴', description: 'Pour les experts' }
  ];

  return (
    <Modal
        visible={visible}
        transparent={true}
        animationType="slide"
        onRequestClose={onClose}
    >
        <Pressable style={styles.modalOverlay} onPress={() => { playButtonSound(); onClose(); }}>
            <Pressable style={[styles.friendsModalContent, { maxHeight: '90%' }]} onPress={() => {}}>
                <ScrollView contentContainerStyle={{ alignItems: 'center', width: '100%' }} style={{ width: '100%' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', width: '100%', marginBottom: getResponsiveSize(30), justifyContent: 'center', position: 'relative' }}>
                        <TouchableOpacity 
                            onPress={() => { playButtonSound(); onBack(); }}
                            style={{ position: 'absolute', left: 0, padding: getResponsiveSize(10), zIndex: 10 }}
                            hitSlop={{ top: getResponsiveSize(15), bottom: getResponsiveSize(15), left: getResponsiveSize(15), right: getResponsiveSize(15) }}
                        >
                            <Ionicons name="arrow-back" size={getResponsiveSize(28)} color="#f1c40f" />
                        </TouchableOpacity>
                        <Text style={[styles.friendsModalTitle, { marginBottom: 0 }]}>Configuration IA</Text>
                    </View>
                    
                    {/* DIFFICULTÉ */}
                    <Text style={styles.friendsLabel}>Difficulté:</Text>
                    <View style={{ width: '100%', gap: getResponsiveSize(10), marginBottom: getResponsiveSize(20) }}>
                        {niveaux.map((niveau) => (
                            <TouchableOpacity
                                key={niveau.id}
                                style={[
                                    {
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        justifyContent: 'flex-start',
                                        padding: getResponsiveSize(15),
                                        backgroundColor: '#041c55',
                                        borderRadius: getResponsiveSize(20),
                                        borderWidth: getResponsiveSize(2),
                                        borderColor: '#f1c40f',
                                    }
                                ]}
                                onPress={() => { playButtonSound(); setAiDifficulte(niveau.id); }}
                            >
                                <Text style={{ fontSize: getResponsiveSize(24), marginRight: getResponsiveSize(15) }}>{niveau.emoji}</Text>
                                <View>
                                    <Text style={{ 
                                        fontSize: getResponsiveSize(18), 
                                        fontWeight: 'bold', 
                                        color: aiDifficulte === niveau.id ? '#f1c40f' : 'white',
                                    }}>
                                        {niveau.titre}
                                    </Text>
                                    <Text style={{ fontSize: getResponsiveSize(12), color: 'rgba(255,255,255,0.6)' }}>
                                        {niveau.description}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* QUI COMMENCE */}
                    <View style={styles.sectionContainer}>
                        <Text style={styles.sectionTitle}>Qui commence ?</Text>
                        <View style={{ flexDirection: 'row', gap: getResponsiveSize(10), width: '100%' }}>
                            {['joueur', 'ia', 'aleatoire'].map(opt => (
                                <TouchableOpacity 
                                    key={opt} 
                                    style={{ 
                                        flex: 1, 
                                        paddingVertical: getResponsiveSize(12),
                                        backgroundColor: aiPremierJoueur === opt ? '#f1c40f' : 'rgba(255,255,255,0.05)',
                                        borderRadius: getResponsiveSize(12),
                                        alignItems: 'center',
                                        borderWidth: getResponsiveSize(1),
                                        borderColor: aiPremierJoueur === opt ? '#f1c40f' : 'rgba(255,255,255,0.1)'
                                    }} 
                                    onPress={() => { playButtonSound(); setAiPremierJoueur(opt); }}
                                >
                                    <Text style={{ 
                                        fontSize: getResponsiveSize(14), 
                                        fontWeight: 'bold',
                                        color: aiPremierJoueur === opt ? '#000' : 'rgba(255,255,255,0.6)' 
                                    }}>
                                        {opt === 'joueur' ? 'Vous' : opt === 'ia' ? 'IA' : 'Aléatoire'}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    {/* COULEUR */}
                    <View style={styles.sectionContainer}>
                        <Text style={styles.sectionTitle}>Votre couleur</Text>
                        <View style={{ flexDirection: 'row', gap: getResponsiveSize(10), width: '100%' }}>
                                {[
                                { id: 'noir', icon: '🔴', label: 'Rouge' },
                                { id: 'blanc', icon: '✖', label: 'Bleu' },
                                { id: 'aleatoire', icon: '🎲', label: 'Aléa.' }
                                ].map(opt => (
                                <TouchableOpacity 
                                    key={opt.id} 
                                    style={{ 
                                        flex: 1, 
                                        paddingVertical: getResponsiveSize(8),
                                        backgroundColor: aiCouleurJoueur === opt.id ? '#f1c40f' : 'rgba(255,255,255,0.05)',
                                        borderRadius: getResponsiveSize(12),
                                        alignItems: 'center',
                                        borderWidth: getResponsiveSize(1),
                                        borderColor: aiCouleurJoueur === opt.id ? '#f1c40f' : 'rgba(255,255,255,0.1)'
                                    }} 
                                    onPress={() => { playButtonSound(); setAiCouleurJoueur(opt.id); }}
                                >
                                    <Text style={{ fontSize: getResponsiveSize(20), marginBottom: getResponsiveSize(5) }}>{opt.icon}</Text>
                                    <Text style={{ 
                                        fontSize: getResponsiveSize(14), 
                                        fontWeight: 'bold',
                                        color: aiCouleurJoueur === opt.id ? '#000' : 'rgba(255,255,255,0.6)'
                                    }}>
                                        {opt.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    <TouchableOpacity 
                        style={[modalTheme.button, modalTheme.buttonActive, { width: '100%', borderRadius: getResponsiveSize(15), paddingVertical: getResponsiveSize(10) }]}
                        onPress={() => { playButtonSound(); onStart(); }}
                    >
                        <Text style={[modalTheme.buttonText, modalTheme.buttonTextActive, { fontSize: getResponsiveSize(18) }]}>Jouer</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                        style={{ marginTop: getResponsiveSize(15), padding: getResponsiveSize(10) }}
                        onPress={() => { playButtonSound(); onBack(); }}
                    >
                        <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: getResponsiveSize(16) }}>Retour</Text>
                    </TouchableOpacity>
                </ScrollView>
            </Pressable>
        </Pressable>
    </Modal>
  );
});

const styles = StyleSheet.create({
  modalOverlay: modalTheme.overlay,
  friendsModalContent: modalTheme.card,
  friendsModalTitle: modalTheme.title,
  friendsLabel: {
    fontSize: getResponsiveSize(16),
    color: '#f1c40f',
    alignSelf: 'flex-start',
    marginBottom: getResponsiveSize(10),
    fontWeight: 'bold',
  },
  sectionContainer: {
    width: '100%',
    backgroundColor: '#041c55',
    borderRadius: getResponsiveSize(20),
    padding: getResponsiveSize(10),
    marginBottom: getResponsiveSize(20),
    borderWidth: getResponsiveSize(1),
          borderColor: 'rgba(255,255,255,0.1)'
  },
  sectionTitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: getResponsiveSize(16),
    marginBottom: getResponsiveSize(15),
    textAlign: 'center'
  },
});

export default AIOptionsModal;
