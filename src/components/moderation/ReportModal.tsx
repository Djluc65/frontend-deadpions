import React, { useState } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, TextInput, Pressable, ScrollView } from 'react-native';
import { T } from '../../utils/theme';
import { getResponsiveSize } from '../../utils/responsive';
import { useReport } from '../../hooks/useReport';
import { Ionicons } from '@expo/vector-icons';

interface ReportModalProps {
  targetId: string;
  targetType: 'user' | 'message' | 'username';
  contextGameId?: string;
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const REASONS = [
  "Comportement abusif",
  "Triche / exploit",
  "Nom inapproprié",
  "Spam",
  "Autre"
];

const ReportModal: React.FC<ReportModalProps> = ({
  targetId,
  targetType,
  contextGameId,
  visible,
  onClose,
  onSuccess
}) => {
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const { submit, loading } = useReport();

  const handleSubmit = async () => {
    if (!reason) return;
    const success = await submit({
      targetId,
      type: targetType,
      reason,
      details,
      contextGameId
    });
    if (success) {
      if (onSuccess) onSuccess();
      onClose();
      // Reset state
      setReason("");
      setDetails("");
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.container} onPress={() => {}}>
          <View style={styles.header}>
            <Text style={styles.title}>Signaler</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={T.textDim} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content}>
            <Text style={styles.label}>Motif du signalement :</Text>
            {REASONS.map((r) => (
              <TouchableOpacity 
                key={r} 
                style={styles.radioRow} 
                onPress={() => setReason(r)}
              >
                <View style={[styles.radio, reason === r && styles.radioSelected]}>
                  {reason === r && <View style={styles.radioInner} />}
                </View>
                <Text style={[styles.radioLabel, reason === r && styles.radioLabelSelected]}>{r}</Text>
              </TouchableOpacity>
            ))}

            <Text style={[styles.label, { marginTop: 20 }]}>Détails additionnels (optionnel) :</Text>
            <TextInput
              style={styles.input}
              placeholder="Max 200 caractères..."
              placeholderTextColor={T.textMuted}
              multiline
              maxLength={200}
              value={details}
              onChangeText={setDetails}
            />
          </ScrollView>

          <TouchableOpacity 
            style={[styles.submitBtn, (!reason || loading) && styles.submitBtnDisabled]}
            disabled={!reason || loading}
            onPress={handleSubmit}
          >
            <Text style={styles.submitBtnText}>
              {loading ? "Envoi..." : "Envoyer le signalement"}
            </Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end'
  },
  container: {
    backgroundColor: T.bg2,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: T.borderMid,
    padding: 20,
    maxHeight: '80%'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20
  },
  title: {
    fontSize: getResponsiveSize(20),
    fontWeight: 'bold',
    color: T.red
  },
  content: {
    marginBottom: 20
  },
  label: {
    fontSize: getResponsiveSize(14),
    color: T.textDim,
    marginBottom: 15,
    fontWeight: '600'
  },
  radioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: T.borderSoft
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: T.textDim,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  radioSelected: {
    borderColor: T.gold
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: T.gold
  },
  radioLabel: {
    fontSize: getResponsiveSize(16),
    color: T.text
  },
  radioLabelSelected: {
    color: T.gold,
    fontWeight: 'bold'
  },
  input: {
    backgroundColor: T.bg3,
    borderRadius: 12,
    padding: 12,
    color: T.text,
    fontSize: getResponsiveSize(14),
    minHeight: 100,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: T.borderMid
  },
  submitBtn: {
    backgroundColor: T.red,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10
  },
  submitBtnDisabled: {
    backgroundColor: T.bg3,
    opacity: 0.5
  },
  submitBtnText: {
    color: '#fff',
    fontSize: getResponsiveSize(16),
    fontWeight: 'bold'
  }
});

export default ReportModal;
