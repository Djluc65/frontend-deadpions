import React, { useState, useCallback, useEffect } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { useSelector } from 'react-redux';
import { translations } from '../../utils/translations';
import { socket } from '../../utils/socket';
import { BET_OPTIONS } from '../../utils/constants';
import CoinsService from '../../services/CoinsService';
import TransactionService from '../../services/TransactionService';
import FriendsMenuModal from './FriendsMenuModal';
import CreateRoomModal from './CreateRoomModal';
import { appAlert } from '../../services/appAlert';
import { getResponsiveSize } from '../../utils/responsive';

const FriendsGameSetup = ({ visible, onClose, navigation, user, onOpenLiveConfig }) => {
  const settings = useSelector(state => state.settings);
  const t = translations[settings.language] || translations.fr;

  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [inviteMode, setInviteMode] = useState('simple');
  const [inviteSeriesLength, setInviteSeriesLength] = useState(2);
  const [inviteBet, setInviteBet] = useState(100);
  const [inviteTime, setInviteTime] = useState(30);
  const [startingSide, setStartingSide] = useState('random');
  const [hostColor, setHostColor] = useState('random');
  const [showJoinByCode, setShowJoinByCode] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinError, setJoinError] = useState('');

  // Reset state when modal is closed
  useEffect(() => {
    if (!visible) {
      setShowCreateRoom(false);
      setStartingSide('random');
      setHostColor('random');
    }
  }, [visible]);

  const handleNavigateToLiveConfig = useCallback(() => {
    onClose();
    if (onOpenLiveConfig) {
      onOpenLiveConfig();
    }
  }, [onClose, onOpenLiveConfig]);

  const handleOpenFriendConfig = useCallback(() => {
    setShowCreateRoom(true);
  }, []);

  const handleOpenJoinByCode = useCallback(() => {
    setShowJoinByCode(true);
    setJoinCode('');
    setJoinError('');
  }, []);

  const closeJoinByCode = useCallback(() => {
    setShowJoinByCode(false);
    setJoinLoading(false);
    setJoinError('');
  }, []);

  const handleJoinByCode = useCallback(() => {
    if (joinCode.trim().length !== 6) {
      setJoinError('Le code doit contenir 6 caractères');
      return;
    }
    setJoinLoading(true);
    setJoinError('');

    const onSuccess = (data) => {
      cleanup();
      closeJoinByCode();
      appAlert('Succès', 'Code accepté, redirection vers la salle');
      // Navigate to waiting room with config
      if (data && data.config) {
        onClose();
        // navigation passed as prop
        navigation.navigate('SalleAttenteLive', { configSalle: data.config });
      }
    };
    const onError = (message) => {
      setJoinLoading(false);
      setJoinError(message);
      socket.off('join_code_success', onSuccess);
      socket.off('join_code_error', onError);
    };
    const cleanup = () => {
      setJoinLoading(false);
      socket.off('join_code_success', onSuccess);
      socket.off('join_code_error', onError);
    };

    socket.on('join_code_success', onSuccess);
    socket.on('join_code_error', onError);
    socket.emit('join_by_code', {
      code: joinCode.trim().toUpperCase(),
      userId: user._id || user.id
    });
  }, [joinCode, user, navigation, onClose, closeJoinByCode]);

  const handleCreateRoom = useCallback(() => {
    // Check quota for free users
    if (!user?.isPremium && !user?.isEarlyAccess && user?.dailyCreatedRooms >= 5) {
        appAlert(
            "Limite atteinte",
            "Vous avez atteint votre limite de 5 salles privées par jour. Passez Premium pour un accès illimité !",
            [
                { text: "Annuler", style: "cancel" },
                { text: "Devenir Premium", onPress: () => {
                    onClose();
                    // Naviguer vers le TabNavigator 'Home' puis vers l'onglet 'Magasin'
                    navigation.navigate('Home', { screen: 'Magasin' });
                }}
            ]
        );
        return;
    }

    // Emit create_room event
    socket.emit('create_room', {
        betAmount: inviteBet,
        timeControl: inviteTime,
        mode: inviteMode,
        seriesLength: inviteMode === 'tournament' ? inviteSeriesLength : 1,
        id: user._id || user.id,
        pseudo: user.pseudo,
        isPrivate: true,
        startingSide,
        hostColor
    });

    onClose(); // Close the modal, HomeScreen waits for room_created
  }, [inviteBet, inviteTime, inviteMode, inviteSeriesLength, user, onClose]);

  const handleCloseCreateRoom = useCallback(() => {
    setShowCreateRoom(false);
  }, []);

  return (
    <>
      <FriendsMenuModal
        visible={visible && !showCreateRoom}
        onClose={onClose}
        onNavigateToLiveConfig={handleNavigateToLiveConfig}
        onOpenFriendConfig={handleOpenFriendConfig}
        onOpenJoinByCode={handleOpenJoinByCode}
        t={t}
      />
      <CreateRoomModal
        visible={visible && showCreateRoom}
        onClose={handleCloseCreateRoom}
        inviteMode={inviteMode}
        setInviteMode={setInviteMode}
        inviteSeriesLength={inviteSeriesLength}
        setInviteSeriesLength={setInviteSeriesLength}
        inviteBet={inviteBet}
        setInviteBet={setInviteBet}
        inviteTime={inviteTime}
        setInviteTime={setInviteTime}
        startingSide={startingSide}
        setStartingSide={setStartingSide}
        hostColor={hostColor}
        setHostColor={setHostColor}
        handleCreateRoom={handleCreateRoom}
        userCoins={user?.coins}
        betOptions={BET_OPTIONS}
      />
      <Modal
        visible={visible && showJoinByCode}
        transparent
        animationType="fade"
        onRequestClose={closeJoinByCode}
      >
        <View style={stylesJoin.overlay}>
          <View style={stylesJoin.card}>
            <Text style={stylesJoin.title}>Rejoindre via un code</Text>
            <Text style={stylesJoin.subtitle}>Entre le code à 6 caractères partagé par ton adversaire</Text>
            <TextInput
              style={stylesJoin.input}
              value={joinCode}
              onChangeText={v => setJoinCode(v.toUpperCase())}
              placeholder="EX: ABC123"
              placeholderTextColor="#6b7280"
              maxLength={6}
              autoCapitalize="characters"
              autoCorrect={false}
              keyboardType="default"
            />
            {joinError !== '' && <Text style={stylesJoin.error}>{joinError}</Text>}
            <TouchableOpacity
              style={[stylesJoin.joinButton, (joinLoading || joinCode.length < 6) && { opacity: 0.5 }]}
              onPress={handleJoinByCode}
              disabled={joinLoading || joinCode.length < 6}
            >
              {joinLoading ? <ActivityIndicator color="#000" /> : <Text style={stylesJoin.joinButtonText}>Rejoindre</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={stylesJoin.cancelButton} onPress={closeJoinByCode}>
              <Text style={stylesJoin.cancelText}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
};

export default FriendsGameSetup;

const stylesJoin = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: '#041c55',
    borderRadius: getResponsiveSize(20),
    padding: getResponsiveSize(28),
    width: '85%',
    alignItems: 'center',
    borderWidth: getResponsiveSize(1),
    borderColor: '#f1c40f',
  },
  title: {
    color: '#f1c40f',
    fontSize: getResponsiveSize(22),
    fontWeight: 'bold',
    marginBottom: getResponsiveSize(8),
  },
  subtitle: {
    color: '#9ca3af',
    fontSize: getResponsiveSize(13),
    textAlign: 'center',
    marginBottom: getResponsiveSize(20),
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    color: '#fff',
    fontSize: getResponsiveSize(28),
    fontWeight: 'bold',
    letterSpacing: getResponsiveSize(10),
    textAlign: 'center',
    width: '100%',
    paddingVertical: getResponsiveSize(14),
    paddingHorizontal: getResponsiveSize(10),
    borderRadius: getResponsiveSize(12),
    borderWidth: getResponsiveSize(1),
    borderColor: '#f1c40f',
    marginBottom: getResponsiveSize(12),
  },
  error: {
    color: '#ef4444',
    fontSize: getResponsiveSize(13),
    marginBottom: getResponsiveSize(10),
    textAlign: 'center',
  },
  joinButton: {
    backgroundColor: '#f1c40f',
    paddingVertical: getResponsiveSize(14),
    paddingHorizontal: getResponsiveSize(40),
    borderRadius: getResponsiveSize(12),
    width: '100%',
    alignItems: 'center',
    marginBottom: getResponsiveSize(10),
  },
  joinButtonText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: getResponsiveSize(16),
  },
  cancelButton: {
    paddingVertical: getResponsiveSize(10),
  },
  cancelText: {
    color: '#6b7280',
    fontSize: getResponsiveSize(14),
  },
});
