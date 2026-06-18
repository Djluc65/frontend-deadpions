// DeadPions — TournamentCreateModal.jsx — créé le 2026-06-08
import React, { useState } from 'react';
import { StyleSheet, View, Text, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { useSelector } from 'react-redux';
import { T, TY } from '../utils/theme';
import { Ionicons } from '@expo/vector-icons';
import Button from './common/Button';

const SIZES = [2, 4, 8, 16, 32];
const FEES = [50, 100, 200, 500, 1000];

const TournamentCreateModal = ({ visible, onClose, onCreate }) => {
  const [size, setSize] = useState(2);
  const [fee, setFee] = useState(100);
  const user = useSelector(state => state.auth.user);

  const totalPot = size * fee;
  const winnerGain = Math.floor(totalPot * 0.95);

  const handleCreate = () => {
    onCreate(size, fee);
    onClose();
  };

  const canAfford = user && user.coins >= fee;

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Créer un tournoi</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={T.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content}>
            <Text style={styles.label}>Taille du tournoi</Text>
            <View style={styles.optionRow}>
              {SIZES.map(s => (
                <TouchableOpacity 
                  key={s} 
                  style={[styles.option, size === s && styles.optionSelected]}
                  onPress={() => setSize(s)}
                >
                  <Text style={[styles.optionText, size === s && styles.optionTextSelected]}>{s} j.</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Mise par joueur (coins)</Text>
            <View style={styles.optionRow}>
              {FEES.map(f => (
                <TouchableOpacity 
                  key={f} 
                  style={[styles.option, fee === f && styles.optionSelected]}
                  onPress={() => setFee(f)}
                >
                  <Text style={[styles.optionText, fee === f && styles.optionTextSelected]}>{f}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.summary}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Pot total :</Text>
                <Text style={styles.summaryValue}>{totalPot} coins</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Gain champion (95%) :</Text>
                <Text style={[styles.summaryValue, { color: T.gold }]}>{winnerGain} coins</Text>
              </View>
            </View>

            {!canAfford && (
              <Text style={styles.errorText}>Solde insuffisant pour créer ce tournoi.</Text>
            )}
          </ScrollView>

          <Button 
            title="Créer le tournoi" 
            onPress={handleCreate} 
            disabled={!canAfford}
            style={styles.createButton}
          />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 9, 15, 0.8)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#060B17',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '80%',
    borderTopWidth: 2,
    borderTopColor: '#F4B41A',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    ...TY.heading,
    fontSize: 20,
    color: '#F4B41A',
  },
  content: {
    marginBottom: 24,
  },
  label: {
    ...TY.label,
    marginBottom: 12,
    marginTop: 8,
  },
  optionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  option: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(236, 230, 214, 0.1)',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    minWidth: 60,
    alignItems: 'center',
  },
  optionSelected: {
    borderColor: '#F4B41A',
    backgroundColor: 'rgba(244, 180, 26, 0.1)',
  },
  optionText: {
    color: '#A8B4C9',
    fontWeight: '700',
  },
  optionTextSelected: {
    color: '#F4B41A',
  },
  summary: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    color: '#A8B4C9',
    fontSize: 14,
  },
  summaryValue: {
    color: '#ECE6D6',
    fontWeight: '800',
    fontSize: 14,
  },
  errorText: {
    color: T.red,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 16,
  },
  createButton: {
    marginTop: 10,
  }
});

export default TournamentCreateModal;
