import React, { useState, useCallback, useEffect } from 'react';
import { Alert } from 'react-native';
import { useSelector } from 'react-redux';
import { translations } from '../../utils/translations';
import { socket } from '../../utils/socket';
import { BET_OPTIONS } from '../../utils/constants';
import FriendsMenuModal from './FriendsMenuModal';
import CreateRoomModal from './CreateRoomModal';

const FriendsGameSetup = ({ visible, onClose, navigation, user, onOpenLiveConfig }) => {
  const settings = useSelector(state => state.settings);
  const t = translations[settings.language] || translations.fr;

  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [inviteMode, setInviteMode] = useState('simple');
  const [inviteSeriesLength, setInviteSeriesLength] = useState(2);
  const [inviteBet, setInviteBet] = useState(100);
  const [inviteTime, setInviteTime] = useState(120);

  // Reset state when modal is closed
  useEffect(() => {
    if (!visible) {
      setShowCreateRoom(false);
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

  const handleCreateRoom = useCallback(() => {
    // Check quota for free users
    if (!user?.isPremium && user?.dailyCreatedRooms >= 5) {
        Alert.alert(
            "Limite atteinte",
            "Vous avez atteint votre limite de 5 salles privées par jour. Passez Premium pour un accès illimité !",
            [
                { text: "Annuler", style: "cancel" },
                { text: "Devenir Premium", onPress: () => {
                    onClose();
                    navigation.navigate('Shop');
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
        isPrivate: true
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
        handleCreateRoom={handleCreateRoom}
        userCoins={user?.coins}
        betOptions={BET_OPTIONS}
      />
    </>
  );
};

export default FriendsGameSetup;
