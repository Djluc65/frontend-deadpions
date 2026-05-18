import React, { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { socket } from '../../utils/socket';
import { BET_OPTIONS } from '../../utils/constants';
import FriendsMenuModal from './FriendsMenuModal';
import CreateRoomModal from './CreateRoomModal';
import { appAlert } from '../../services/appAlert';
import JoinByCodeModal from '../modals/JoinByCodeModal';

const FriendsGameSetup = ({ visible, onClose, navigation, user, onOpenLiveConfig }) => {
  const { t } = useTranslation();

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
    onClose();
  }, [onClose]);

  const handleCreateRoom = useCallback(() => {
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
    onClose();
  }, [onClose]);

  return (
    <>
      <FriendsMenuModal
        visible={visible && showMenu}
        onClose={onClose}
        onNavigateToLiveConfig={handleNavigateToLiveConfig}
        onOpenFriendConfig={handleOpenFriendConfig}
        onOpenJoinByCode={handleOpenJoinByCode}
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
      />
    </>
  );
};

export default FriendsGameSetup;
