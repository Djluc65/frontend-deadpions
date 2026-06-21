// DeadPions — TournamentCreateModal.jsx — créé le 2026-06-08
import React, { useState } from 'react';
import { StyleSheet, View, Text, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { T, TY } from '../utils/theme';
import { Ionicons } from '@expo/vector-icons';
import Button from './common/Button';

const SIZES = [4, 8, 16, 32];
const FEES = [50, 100, 200, 500, 1000];

const TournamentCreateModal = ({ visible, onClose, onCreate }) => {
  const { t } = useTranslation();
  const [size, setSize] = useState(4);
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
            <Text style={styles.title}>{t('tournament.create_modal.title')}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={T.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content}>
            <Text style={styles.label}>{t('tournament.create_modal.size_label')}</Text>
            <View style={styles.optionRow}>
              {SIZES.map(s => (
                <TouchableOpacity 
                  key={s} 
                  style={[styles.option, size === s && styles.optionSelected]}
                  onPress={() => setSize(s)}
                >
                  <Text style={[styles.optionText, size === s && styles.optionTextSelected]}>
                    {t('tournament.create_modal.size_value', { size: s })}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>{t('tournament.create_modal.entry_label')}</Text>
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
                <Text style={styles.summaryLabel}>{t('tournament.create_modal.pot_label')}</Text>
                <Text style={styles.summaryValue}>
                  {t('tournament.create_modal.pot_value', { amount: totalPot })}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>{t('tournament.create_modal.winner_label')}</Text>
                <Text style={[styles.summaryValue, { color: T.gold }]}>
                  {t('tournament.create_modal.winner_value', { amount: winnerGain })}
                </Text>
              </View>
            </View>

            {!canAfford && (
              <Text style={styles.errorText}>{t('tournament.create_modal.error_insufficient')}</Text>
            )}
          </ScrollView>

          <Button 
            title={t('tournament.create_modal.btn_create')} 
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
