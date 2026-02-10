import React, { memo } from 'react';
import { Modal, Pressable, ScrollView, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { playButtonSound } from '../../utils/soundManager';

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
                    <View style={{ flexDirection: 'row', alignItems: 'center', width: '100%', marginBottom: 30, justifyContent: 'center', position: 'relative' }}>
                        <TouchableOpacity 
                            onPress={() => { playButtonSound(); onBack(); }}
                            style={{ position: 'absolute', left: 0, padding: 10, zIndex: 10 }}
                            hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                        >
                            <Ionicons name="arrow-back" size={28} color="#f1c40f" />
                        </TouchableOpacity>
                        <Text style={[styles.friendsModalTitle, { color: '#f1c40f', textShadowColor: 'rgba(241, 196, 15, 0.5)', textShadowRadius: 10, marginBottom: 0 }]}>Configuration IA</Text>
                    </View>
                    
                    {/* DIFFICULTÉ */}
                    <Text style={styles.friendsLabel}>Difficulté:</Text>
                    <View style={{ width: '100%', gap: 10, marginBottom: 20 }}>
                        {niveaux.map((niveau) => (
                            <TouchableOpacity
                                key={niveau.id}
                                style={[
                                    {
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        justifyContent: 'flex-start',
                                        padding: 15,
                                        backgroundColor: '#041c55',
                                        borderRadius: 20,
                                        borderWidth: 2,
                                        borderColor: aiDifficulte === niveau.id ? '#f1c40f' : 'rgba(255,255,255,0.1)',
                                    }
                                ]}
                                onPress={() => { playButtonSound(); setAiDifficulte(niveau.id); }}
                            >
                                <Text style={{ fontSize: 24, marginRight: 15 }}>{niveau.emoji}</Text>
                                <View>
                                    <Text style={{ 
                                        fontSize: 18, 
                                        fontWeight: 'bold', 
                                        color: aiDifficulte === niveau.id ? '#f1c40f' : 'white',
                                    }}>
                                        {niveau.titre}
                                    </Text>
                                    <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>
                                        {niveau.description}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* QUI COMMENCE */}
                    <View style={styles.sectionContainer}>
                        <Text style={styles.sectionTitle}>Qui commence ?</Text>
                        <View style={{ flexDirection: 'row', gap: 10, width: '100%' }}>
                            {['joueur', 'ia', 'aleatoire'].map(opt => (
                                <TouchableOpacity 
                                    key={opt} 
                                    style={{ 
                                        flex: 1, 
                                        paddingVertical: 12,
                                        backgroundColor: aiPremierJoueur === opt ? '#f1c40f' : 'rgba(255,255,255,0.05)',
                                        borderRadius: 12,
                                        alignItems: 'center',
                                        borderWidth: 1,
                                        borderColor: aiPremierJoueur === opt ? '#f1c40f' : 'rgba(255,255,255,0.1)'
                                    }} 
                                    onPress={() => { playButtonSound(); setAiPremierJoueur(opt); }}
                                >
                                    <Text style={{ 
                                        fontSize: 14, 
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
                        <View style={{ flexDirection: 'row', gap: 10, width: '100%' }}>
                                {[
                                { id: 'noir', icon: '🔴', label: 'Rouge' },
                                { id: 'blanc', icon: '✖', label: 'Bleu' },
                                { id: 'aleatoire', icon: '🎲', label: 'Aléa.' }
                                ].map(opt => (
                                <TouchableOpacity 
                                    key={opt.id} 
                                    style={{ 
                                        flex: 1, 
                                        paddingVertical: 8,
                                        backgroundColor: aiCouleurJoueur === opt.id ? '#f1c40f' : 'rgba(255,255,255,0.05)',
                                        borderRadius: 12,
                                        alignItems: 'center',
                                        borderWidth: 1,
                                        borderColor: aiCouleurJoueur === opt.id ? '#f1c40f' : 'rgba(255,255,255,0.1)'
                                    }} 
                                    onPress={() => { playButtonSound(); setAiCouleurJoueur(opt.id); }}
                                >
                                    <Text style={{ fontSize: 20, marginBottom: 5 }}>{opt.icon}</Text>
                                    <Text style={{ 
                                        fontSize: 14, 
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
                        style={[styles.friendsCloseButton, { backgroundColor: '#f1c40f', width: '100%', borderRadius: 15, paddingVertical: 10 }]}
                        onPress={() => { playButtonSound(); onStart(); }}
                    >
                        <Text style={[styles.friendsCloseButtonText, { color: '#000', fontWeight: 'bold', fontSize: 18 }]}>Jouer</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                        style={{ marginTop: 15, padding: 10 }}
                        onPress={() => { playButtonSound(); onBack(); }}
                    >
                        <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 16 }}>Retour</Text>
                    </TouchableOpacity>
                </ScrollView>
                <View style={styles.innerShadow} pointerEvents="none" />
            </Pressable>
        </Pressable>
    </Modal>
  );
});

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  friendsModalContent: {
    width: '80%',
    backgroundColor: '#041c55',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#f1c40f',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 3,
    shadowRadius: 3,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#f1c40f',
  },
  friendsModalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#fff',
  },
  friendsLabel: {
    fontSize: 16,
    color: '#f1c40f',
    alignSelf: 'flex-start',
    marginBottom: 10,
    fontWeight: 'bold',
  },
  sectionContainer: {
    width: '100%',
    backgroundColor: '#041c55',
    borderRadius: 20,
    padding: 10,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)'
  },
  sectionTitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 16,
    marginBottom: 15,
    textAlign: 'center'
  },
  friendsCloseButton: {
    backgroundColor: '#f1c40f',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 30,
    marginTop: 5,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 6,
  },
  friendsCloseButtonText: {
    color: '#041c55',
    fontWeight: 'bold',
    fontSize: 18,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
});

export default AIOptionsModal;
