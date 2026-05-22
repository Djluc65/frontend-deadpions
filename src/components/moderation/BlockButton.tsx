import React, { useState } from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { T } from '../../utils/theme';
import { getResponsiveSize } from '../../utils/responsive';
import { Ionicons } from '@expo/vector-icons';
import { useBlockUser } from '../hooks/useBlockUser'; // Fixed path
import ConfirmModal from './ConfirmModal';

interface BlockButtonProps {
  targetId: string;
  username: string;
  onSuccess?: (blocked: boolean) => void;
}

const BlockButton: React.FC<BlockButtonProps> = ({ targetId, username, onSuccess }) => {
  const { isBlocked, block, unblock, loading } = useBlockUser(targetId);
  const [showConfirm, setShowConfirm] = useState(false);

  const handlePress = () => {
    if (isBlocked) {
      unblock().then(success => success && onSuccess && onSuccess(false));
    } else {
      setShowConfirm(true);
    }
  };

  const handleConfirmBlock = async () => {
    setShowConfirm(false);
    const success = await block();
    if (success && onSuccess) {
      onSuccess(true);
    }
  };

  return (
    <>
      <TouchableOpacity 
        style={[styles.button, isBlocked ? styles.unblockBtn : styles.blockBtn]} 
        onPress={handlePress}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <>
            <Ionicons 
              name={isBlocked ? "person-add-outline" : "person-remove-outline"} 
              size={20} 
              color="#fff" 
            />
            <Text style={styles.text}>
              {isBlocked ? "Débloquer" : "Bloquer"}
            </Text>
          </>
        )}
      </TouchableOpacity>

      <ConfirmModal
        visible={showConfirm}
        title={`Bloquer ${username} ?`}
        message="Il ne pourra plus vous inviter ni vous voir."
        confirmLabel="Bloquer"
        confirmColor={T.red}
        onConfirm={handleConfirmBlock}
        onCancel={() => setShowConfirm(false)}
      />
    </>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginTop: 10
  },
  blockBtn: {
    backgroundColor: T.red
  },
  unblockBtn: {
    backgroundColor: T.bg3,
    borderWidth: 1,
    borderColor: T.borderMid
  },
  text: {
    color: '#fff',
    fontSize: getResponsiveSize(14),
    fontWeight: 'bold',
    marginLeft: 8
  }
});

export default BlockButton;
