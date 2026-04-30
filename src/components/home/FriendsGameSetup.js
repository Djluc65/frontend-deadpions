import React, { useState, useCallback, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { translations } from '../../utils/translations';
import { socket } from '../../utils/socket';
import { BET_OPTIONS } from '../../utils/constants';
import FriendsMenuModal from './FriendsMenuModal';
import CreateRoomModal from './CreateRoomModal';
import { appAlert } from '../../services/appAlert';
import JoinByCodeModal from '../modals/JoinByCodeModal';

const FriendsGameSetup = ({ visible, onClose, navigation, user, onOpenLiveConfig }) => {
  const settings = useSelector(state => state.settings);
  const t = translations[settings.language] || translations.fr;

  const [showMenu, setShowMenu] = useState(true);
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [inviteMode, setInviteMode] = useState('simple');
  const [inviteSeriesLength, setInviteSeriesLength] = useState(2);
  const [inviteBet, setInviteBet] = useState(100);
  const [inviteTime, setInviteTime] = useState(30);
  const [startingSide, setStartingSide] = useState('random');
  const [hostColor, setHostColor] = useState('random');
  const [showJoinByCode, setShowJoinByCode] = useState(false);

  // Reset state when modal is closed
  useEffect(() => {
    if (!visible) {
      setShowMenu(true);
      setShowCreateRoom(false);
      setShowJoinByCode(false);
      setStartingSide('random');
      setHostColor('random');
    }
    if (visible) {
      setShowMenu(true);
    }
  }, [visible]);

  const handleNavigateToLiveConfig = useCallback(() => {
    onClose();
    if (onOpenLiveConfig) {
      setTimeout(() => onOpenLiveConfig(), 250);
    }
  }, [onClose, onOpenLiveConfig]);

  const handleOpenFriendConfig = useCallback(() => {
    setShowMenu(false);
    setTimeout(() => setShowCreateRoom(true), 0);
  }, []);

  const handleOpenJoinByCode = useCallback(() => {
    setShowMenu(false);
    setTimeout(() => setShowJoinByCode(true), 0);
  }, []);

  const closeJoinByCode = useCallback(() => {
    setShowJoinByCode(false);
    setShowMenu(true);
  }, []);

  const handleCreateRoom = useCallback(() => {
    // Check quota for free users
    if (!user?.isPremium && !user?.isEarlyAccess && user?.dailyCreatedRooms >= 5) {
        appAlert(
            "Limite atteinte",
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
    setShowMenu(true);
  }, []);

  return (
    <>
      <FriendsMenuModal
        visible={visible && showMenu}
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
      <JoinByCodeModal
        visible={visible && showJoinByCode}
        onClose={closeJoinByCode}
        socket={socket}
        navigation={navigation}
        appAlert={appAlert}
        t={t}
      />
    </>
  );
};

export default FriendsGameSetup;
