import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ImageBackground, 
  TouchableOpacity, 
  FlatList, 
  Image, 
  TextInput, 
  Modal,
  Alert,
  StatusBar,
  SafeAreaView,
  ActivityIndicator,
  TouchableWithoutFeedback,
  Keyboard,
  ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSelector, useDispatch } from 'react-redux';
import { useFocusEffect } from '@react-navigation/native';
import { API_URL } from '../config';
import socket from '../services/socket';
import { setNotificationsCount } from '../redux/slices/socialSlice';

const SocialScreen = ({ navigation }) => {
  // --- STATE ---
  const [activeTab, setActiveTab] = useState('discussions'); // discussions, friends, requests
  const [searchQuery, setSearchQuery] = useState('');
  const [tick, setTick] = useState(0); // Timer for status updates
  
  // Data State
  const [friends, setFriends] = useState([]);
  const [requestsReceived, setRequestsReceived] = useState([]);
  const [requestsSent, setRequestsSent] = useState([]);
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(false);

  // Modals
  const [isAddFriendVisible, setIsAddFriendVisible] = useState(false);
  const [newFriendName, setNewFriendName] = useState('');
  
  // Game Invite State
  const [inviteConfigVisible, setInviteConfigVisible] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [inviteBet, setInviteBet] = useState(100);
  const [inviteTime, setInviteTime] = useState(null);
  const [inviteMode, setInviteMode] = useState('simple');
  const [inviteSeriesLength, setInviteSeriesLength] = useState(2);
  const [incomingInvite, setIncomingInvite] = useState(null);


  // Redux
  const dispatch = useDispatch();
  const { user, token } = useSelector(state => state.auth);
  const coins = user?.coins || 0;

  // --- HELPER ---
  const getAvatarUri = (avatarPath) => {
    if (!avatarPath) return { uri: 'https://i.pravatar.cc/150' };
    if (avatarPath.startsWith('http')) return { uri: avatarPath };
    
    const baseUrl = API_URL.replace('/api', '');
    const safePath = avatarPath.startsWith('/') ? avatarPath : `/${avatarPath}`;
    return { uri: `${baseUrl}${safePath}` };
  };

  const getStatusInfo = (isOnline, lastSeen) => {
    if (isOnline) {
      return { color: '#2ecc71', text: 'En ligne' }; // Green
    }
    
    if (!lastSeen) {
       return { color: '#95a5a6', text: 'Hors ligne' }; // Grey
    }

    const now = new Date();
    const lastSeenDate = new Date(lastSeen);
    const diffMs = now - lastSeenDate;
    const seconds = Math.floor(diffMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    // < 1 min: Yellow with seconds
    if (seconds < 60) {
      return { 
        color: '#f1c40f', // Yellow
        text: `Depuis ${Math.max(0, seconds)} sec` 
      };
    }

    // 1-59 min: Grey
    if (minutes < 60) {
      return { 
        color: '#95a5a6', // Grey
        text: `Depuis ${minutes} min` 
      };
    }

    // 1-23 hours: Grey
    if (hours < 24) {
      const restMin = minutes % 60;
      const text = restMin > 0 ? `Depuis ${hours}h ${restMin}min` : `Depuis ${hours}h`;
      return { color: '#95a5a6', text };
    }

    // 1-6 days: Grey
    if (days < 7) {
      return { 
        color: '#95a5a6', 
        text: `Depuis ${days} jour${days > 1 ? 's' : ''}` 
      };
    }

    // 7+ days: Grey (Weeks or Months)
    if (days < 30) {
      const weeks = Math.floor(days / 7);
      return { 
        color: '#95a5a6', 
        text: `Depuis ${weeks} semaine${weeks > 1 ? 's' : ''}` 
      };
    }

    const months = Math.floor(days / 30);
    return { 
      color: '#95a5a6', 
      text: `Depuis ${months} mois` 
    };
  };

  const formatHeureRecente = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const isToday = date.getDate() === now.getDate() &&
                    date.getMonth() === now.getMonth() &&
                    date.getFullYear() === now.getFullYear();

    if (isToday) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = date.getDate() === yesterday.getDate() &&
                        date.getMonth() === yesterday.getMonth() &&
                        date.getFullYear() === yesterday.getFullYear();

    if (isYesterday) {
      return 'Hier';
    }
    
    return date.toLocaleDateString();
  };

  // --- TIMER ---
  useEffect(() => {
    const interval = setInterval(() => {
      setTick(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // --- FETCH DATA ---
  const fetchData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      // Fetch Friends
      const friendsRes = await fetch(`${API_URL}/friends`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const friendsData = await friendsRes.json();
      if (friendsRes.ok) {
        setFriends(friendsData.map(f => ({
          id: f._id,
          name: f.pseudo,
          avatar: getAvatarUri(f.avatar),
          isOnline: f.isOnline,
          lastSeen: f.lastSeen,
          currentGame: f.currentGame
        })));
      }

      // Fetch Requests
      const requestsRes = await fetch(`${API_URL}/friends/requests`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const requestsData = await requestsRes.json();
      if (requestsRes.ok) {
        const received = requestsData.received.map(r => {
          if (!r.sender) return null; // Skip if sender deleted
          return {
            id: r._id,
            senderId: r.sender._id,
            name: r.sender.pseudo,
            avatar: getAvatarUri(r.sender.avatar),
            date: new Date(r.createdAt).toLocaleDateString()
          };
        }).filter(Boolean);

        setRequestsReceived(received);
        dispatch(setNotificationsCount(received.length));
        
        setRequestsSent(requestsData.sent.map(r => {
          if (!r.recipient) return null; // Skip if recipient deleted
          return {
            id: r._id,
            recipientId: r.recipient._id,
            name: r.recipient.pseudo,
            avatar: getAvatarUri(r.recipient.avatar),
            date: new Date(r.createdAt).toLocaleDateString()
          };
        }).filter(Boolean));
      }

      // Fetch Chats
      const chatsRes = await fetch(`${API_URL}/chat/conversations`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const chatsData = await chatsRes.json();
      if (chatsRes.ok) {
        setChats(chatsData.map(c => ({
          id: c.friendId, // Conversation ID is effectively friend ID
          friendId: c.friendId,
          name: c.name,
          avatar: getAvatarUri(c.avatar),
          lastMessage: c.lastMessage,
          timestamp: formatHeureRecente(c.timestamp),
          unread: c.unread,
          lastRead: c.lastRead ? 'Lu' : ''
        })));
      }

    } catch (error) {
      console.error("Error fetching social data:", error);
      Alert.alert("Erreur", "Impossible de charger les données sociales.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  // --- SOCKET CONNECTION ---
  useEffect(() => {
    if (user && token) {
      if (!socket.connected) {
        socket.connect();
      }
      socket.emit('join_user_room', user._id);

      const handleFriendRequest = () => {
        fetchData();
        Alert.alert("Notification", "Nouvelle demande d'ami reçue !");
      };

      const handleReceiveMessage = (message) => {
        if (message && message._id && message.sender) {
            socket.emit('message_delivered', { messageId: message._id, senderId: message.sender });
        }
        fetchData();
      };
      
      const handleMessagesRead = () => {
        fetchData();
      };

      const handleStatusUpdate = ({ userId, isOnline }) => {
        // Optimistic update
        setFriends(prevFriends => prevFriends.map(f => {
            if (f.id === userId) {
                return { 
                    ...f, 
                    isOnline: isOnline,
                    lastSeen: isOnline ? null : new Date().toISOString() // If offline, set lastSeen to now
                };
            }
            return f;
        }));
      };

      const handleGameInvitation = (data) => {
          setIncomingInvite(data);
      };

      const handleInvitationError = (msg) => {
          Alert.alert("Erreur", msg);
      };

      const handleGameStart = (data) => {
          setIncomingInvite(null);
          navigation.navigate('Game', { 
            mode: 'online',
            gameId: data.gameId,
            players: data.players,
            currentTurn: data.currentTurn,
            betAmount: data.betAmount,
            timeControl: data.timeControl,
            gameType: data.mode,
            tournamentSettings: data.tournamentSettings,
            opponent: data.players.black.id.toString() === (user._id || user.id).toString() ? data.players.white : data.players.black
          });
      };

      socket.on('friend_request_received', handleFriendRequest);
      socket.on('receive_message', handleReceiveMessage);
      socket.on('messages_read', handleMessagesRead);
      socket.on('friend_status_updated', handleStatusUpdate);
      socket.on('game_invitation', handleGameInvitation);
      socket.on('invitation_error', handleInvitationError);
      socket.on('game_start', handleGameStart);

      return () => {
        socket.off('friend_request_received', handleFriendRequest);
        socket.off('receive_message', handleReceiveMessage);
        socket.off('messages_read', handleMessagesRead);
        socket.off('friend_status_updated', handleStatusUpdate);
        socket.off('game_invitation', handleGameInvitation);
        socket.off('invitation_error', handleInvitationError);
        socket.off('game_start', handleGameStart);
        // Do not disconnect here if we want socket to persist across tabs, 
        // but since this is the only screen using it, we might disconnect or leave it.
        // For now, let's keep it connected but maybe leave room? 
        // socket.disconnect(); 
      };
    }
  }, [user, token, fetchData]);

  // --- ACTIONS ---

  const handleJoinSpectator = (friend) => {
      if (!friend.currentGame) return;
      
      navigation.navigate('Game', { 
          mode: 'spectator',
          gameId: friend.currentGame
      });
  };

  const handleBlockFriend = (friend) => {
    // Implement block logic if API supports it
    Alert.alert("Info", "Fonctionnalité de blocage à venir.");
  };

  const handleRemoveFriend = (friend) => {
    Alert.alert(
      "Supprimer l'ami",
      `Êtes-vous sûr de vouloir supprimer ${friend.name} de vos amis ?`,
      [
        { text: "Annuler", style: "cancel" },
        { 
          text: "Supprimer", 
          style: "destructive",
          onPress: async () => {
            try {
              const res = await fetch(`${API_URL}/friends/${friend.id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
              });
              if (res.ok) {
                setFriends(prev => prev.filter(f => f.id !== friend.id));
                Alert.alert("Succès", "Ami supprimé.");
              } else {
                const data = await res.json();
                Alert.alert("Erreur", data.message);
              }
            } catch (error) {
              Alert.alert("Erreur", "Erreur réseau.");
            }
          }
        }
      ]
    );
  };

  const handleAcceptRequest = async (request) => {
    try {
      const res = await fetch(`${API_URL}/friends/accept`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ requestId: request.id })
      });

      if (res.ok) {
        // Optimistic update or refetch
        fetchData();
        Alert.alert("Succès", "Demande acceptée.");
      } else {
        const data = await res.json();
        Alert.alert("Erreur", data.message);
      }
    } catch (error) {
      Alert.alert("Erreur", "Erreur réseau.");
    }
  };

  const handleDeclineRequest = async (id) => {
    try {
      const res = await fetch(`${API_URL}/friends/decline`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ requestId: id })
      });

      if (res.ok) {
        setRequestsReceived(prev => prev.filter(r => r.id !== id));
      } else {
        const data = await res.json();
        Alert.alert("Erreur", data.message);
      }
    } catch (error) {
      Alert.alert("Erreur", "Erreur réseau.");
    }
  };

  const handleCancelRequest = async (id) => {
    Alert.alert("Info", "Annulation spécifique non implémentée.");
  };

  const handleCancelLatestRequest = async () => {
    try {
      const res = await fetch(`${API_URL}/friends/cancel-latest`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (res.ok) {
        fetchData();
        Alert.alert("Succès", data.message || "Dernière demande annulée.");
      } else {
        Alert.alert("Erreur", data.message || "Impossible d'annuler la demande.");
      }
    } catch (error) {
      Alert.alert("Erreur", "Erreur réseau.");
    }
  };

  const handleSendRequest = async () => {
    if (newFriendName.trim().length === 0) return;

    try {
      // 1. Search user
      const searchRes = await fetch(`${API_URL}/friends/search?q=${newFriendName}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const responseData = await searchRes.json();

      if (!searchRes.ok) {
        Alert.alert("Erreur", responseData.message || "Erreur lors de la recherche.");
        return;
      }

      const users = responseData;

      if (!Array.isArray(users)) {
        Alert.alert("Erreur", "Format de réponse invalide.");
        return;
      }

      if (users.length === 0) {
        Alert.alert("Erreur", "Utilisateur non trouvé.");
        return;
      }

      // 2. Select first match (simplified)
      const targetUser = users[0]; // You might want to show a list to pick from

      // 3. Send Request
      const res = await fetch(`${API_URL}/friends/request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ recipientId: targetUser._id })
      });

      const data = await res.json();
      if (res.ok) {
        Alert.alert("Succès", `Demande envoyée à ${targetUser.pseudo}`);
        setNewFriendName('');
        setIsAddFriendVisible(false);
        fetchData();
      } else {
        Alert.alert("Erreur", data.message);
      }
    } catch (error) {
      console.error(error);
      Alert.alert("Erreur", "Erreur réseau.");
    }
  };

  const handleSendInvite = () => {
      if (!selectedFriend) return;
      socket.emit('invite_friend', {
          recipientId: selectedFriend.id,
          betAmount: inviteBet,
          timeControl: inviteTime,
          mode: inviteMode,
          seriesLength: inviteMode === 'tournament' ? inviteSeriesLength : 1
      });
      setInviteConfigVisible(false);
      Alert.alert("Invitation envoyée", "En attente de la réponse...");
  };

  const handleAcceptInvite = () => {
      if (!incomingInvite) return;
      socket.emit('respond_invite', {
          senderId: incomingInvite.senderId,
          accepted: true,
          betAmount: incomingInvite.betAmount,
          timeControl: incomingInvite.timeControl,
          mode: incomingInvite.mode,
          seriesLength: incomingInvite.seriesLength
      });
      setIncomingInvite(null);
  };

  const handleDeclineInvite = () => {
      if (!incomingInvite) return;
      socket.emit('respond_invite', {
          senderId: incomingInvite.senderId,
          accepted: false
      });
      setIncomingInvite(null);
  };


  // --- FILTERING ---
  const filteredFriends = friends.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredChats = chats.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredReceived = requestsReceived.filter(r => r.name.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredSent = requestsSent.filter(r => r.name.toLowerCase().includes(searchQuery.toLowerCase()));

  // --- RENDERERS ---

  // Header
  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.coinContainer}>
        <Ionicons name="logo-bitcoin" style={styles.coinIcon} color="#f1c40f" />
        <Text style={styles.coinText}>{coins}</Text>
      </View>
      <View style={styles.headerButtons}>
        <TouchableOpacity style={styles.iconButton} onPress={() => setIsAddFriendVisible(true)}>
          <Ionicons name="person-add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderTabs = () => (
    <View style={styles.tabContainer}>
      <TouchableOpacity 
        style={[styles.tab, activeTab === 'discussions' && styles.activeTab]}
        onPress={() => setActiveTab('discussions')}
      >
        <Text style={[styles.tabText, activeTab === 'discussions' && styles.activeTabText]}>
          Discussions
        </Text>
        {chats.some(c => c.unread > 0) && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {chats.reduce((acc, curr) => acc + (curr.unread || 0), 0)}
            </Text>
          </View>
        )}
      </TouchableOpacity>

      <TouchableOpacity 
        style={[styles.tab, activeTab === 'friends' && styles.activeTab]}
        onPress={() => setActiveTab('friends')}
      >
        <Text style={[styles.tabText, activeTab === 'friends' && styles.activeTabText]}>
          Amis ({friends.length})
        </Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={[styles.tab, activeTab === 'requests' && styles.activeTab]}
        onPress={() => setActiveTab('requests')}
      >
        <Text style={[styles.tabText, activeTab === 'requests' && styles.activeTabText]}>
          Demandes ({requestsReceived.length + requestsSent.length})
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderSearchBar = () => (
    <View style={styles.searchContainer}>
      <Ionicons name="search" size={20} color="#ccc" style={styles.searchIcon} />
      <TextInput
        style={styles.searchInput}
        placeholder={`Rechercher dans ${
          activeTab === 'discussions' ? 'les discussions' : 
          activeTab === 'friends' ? 'les amis' : 'les demandes'
        }...`}
        placeholderTextColor="#999"
        value={searchQuery}
        onChangeText={setSearchQuery}
      />
    </View>
  );

  const renderDiscussions = () => (
    <FlatList
      data={filteredChats}
      keyExtractor={item => item.id}
      contentContainerStyle={styles.listContent}
      refreshing={loading}
      onRefresh={fetchData}
      renderItem={({ item }) => (
        <TouchableOpacity 
          style={styles.chatItem}
          onPress={() => navigation.navigate('Chat', { friendId: item.friendId, friendName: item.name, friendAvatar: item.avatar })}
        >
          <Image source={item.avatar} style={styles.avatar} />
          <View style={styles.chatInfo}>
            <View style={styles.chatHeader}>
              <Text style={styles.chatName}>{item.name}</Text>
              <Text style={styles.chatTime}>{item.timestamp}</Text>
            </View>
            <View style={styles.chatFooter}>
              <Text style={[styles.lastMessage, item.unread > 0 && styles.unreadMessage]} numberOfLines={1}>
                {item.lastMessage}
              </Text>
              {item.unread > 0 && (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadBadgeText}>{item.unread}</Text>
                </View>
              )}
            </View>
            {item.lastRead ? <Text style={styles.lastRead}>{item.lastRead}</Text> : null}
          </View>
        </TouchableOpacity>
      )}
      ListEmptyComponent={!loading && <Text style={styles.emptyText}>Aucune discussion trouvée.</Text>}
    />
  );

  const renderFriends = () => (
    <FlatList
      data={filteredFriends}
      extraData={tick}
      keyExtractor={item => item.id}
      contentContainerStyle={styles.listContent}
      refreshing={loading}
      onRefresh={fetchData}
      keyboardDismissMode="on-drag"
      keyboardShouldPersistTaps="handled"
      renderItem={({ item }) => {
        const statusInfo = getStatusInfo(item.isOnline, item.lastSeen);
        return (
          <View style={styles.friendItem}>
            <View style={styles.friendAvatarContainer}>
              <Image source={item.avatar} style={styles.avatar} />
              <View style={[styles.statusIndicator, { backgroundColor: statusInfo.color }]} />
            </View>
            <View style={styles.friendInfo}>
              <Text style={styles.friendName}>{item.name}</Text>
              <Text style={[styles.lastSeen, { color: statusInfo.color }]}>{statusInfo.text}</Text>
            </View>
            <View style={styles.friendActions}>
              {item.currentGame ? (
                  <TouchableOpacity 
                    style={[styles.actionButton, { backgroundColor: '#3498db', marginRight: 5 }]}
                    onPress={() => handleJoinSpectator(item)}
                  >
                    <Ionicons name="eye" size={20} color="#fff" />
                  </TouchableOpacity>
              ) : (
                  <TouchableOpacity 
                    style={[styles.actionButton, { backgroundColor: '#f39c12', marginRight: 5 }]}
                    onPress={() => {
                        setSelectedFriend(item);
                        setInviteBet(100);
                        setInviteTime(null);
                        setInviteConfigVisible(true);
                    }}
                  >
                    <Ionicons name="game-controller" size={20} color="#fff" />
                  </TouchableOpacity>
              )}
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => navigation.navigate('Chat', { friendId: item.id, friendName: item.name, friendAvatar: item.avatar })}
              >
                <Ionicons name="chatbubble-ellipses-outline" size={20} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton} onPress={() => handleBlockFriend(item)}>
                <Ionicons name="ban-outline" size={20} color="#e74c3c" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton} onPress={() => handleRemoveFriend(item)}>
                <Ionicons name="trash-outline" size={20} color="#e74c3c" />
              </TouchableOpacity>
            </View>
          </View>
        );
      }}
      ListEmptyComponent={!loading && <Text style={styles.emptyText}>Aucun ami trouvé.</Text>}
    />
  );

  const renderRequests = () => (
    <View style={{ flex: 1 }}>
      <FlatList
        contentContainerStyle={styles.listContent}
        data={[]} 
        refreshing={loading}
        onRefresh={fetchData}
        ListHeaderComponent={
          <>
            {/* Received Requests */}
            {filteredReceived.length > 0 && (
              <View>
                <Text style={styles.sectionTitle}>Reçues ({filteredReceived.length})</Text>
                {filteredReceived.map(item => (
                  <View key={item.id} style={styles.requestItem}>
                    <Image source={item.avatar} style={styles.avatar} />
                    <View style={styles.requestInfo}>
                      <Text style={styles.requestName}>{item.name}</Text>
                      <Text style={styles.requestDate}>Reçu le {item.date}</Text>
                    </View>
                    <View style={styles.requestActions}>
                      <TouchableOpacity style={[styles.requestButton, styles.acceptButton]} onPress={() => handleAcceptRequest(item)}>
                        <Ionicons name="checkmark" size={20} color="#fff" />
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.requestButton, styles.declineButton]} onPress={() => handleDeclineRequest(item.id)}>
                        <Ionicons name="close" size={20} color="#fff" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Sent Requests */}
            {filteredSent.length > 0 && (
              <View style={{ marginTop: 20 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={styles.sectionTitle}>Envoyées ({filteredSent.length})</Text>
                  <TouchableOpacity style={styles.cancelLatestButton} onPress={handleCancelLatestRequest}>
                    <Text style={styles.cancelLatestText}>Annuler la dernière</Text>
                  </TouchableOpacity>
                </View>
                {filteredSent.map(item => (
                  <View key={item.id} style={styles.requestItem}>
                    <Image source={item.avatar} style={styles.avatar} />
                    <View style={styles.requestInfo}>
                      <Text style={styles.requestName}>{item.name}</Text>
                      <Text style={styles.requestDate}>Envoyé {item.date}</Text>
                    </View>
                    <TouchableOpacity style={styles.cancelButton} onPress={() => handleCancelRequest(item.id)}>
                      <Ionicons name="close-circle-outline" size={24} color="#e74c3c" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            {!loading && filteredReceived.length === 0 && filteredSent.length === 0 && (
               <Text style={styles.emptyText}>Aucune demande d'ami.</Text>
            )}
          </>
        }
      />
    </View>
  );

  return (
    <ImageBackground 
      source={require('../../assets/images/Background2-4.png')} 
      style={styles.background}
      resizeMode="cover"
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <SafeAreaView style={styles.safeArea}>
          {renderHeader()}
          {renderTabs()}
          {renderSearchBar()}
          
          <View style={styles.contentContainer}>
            {loading && <ActivityIndicator size="large" color="#f1c40f" style={{ marginTop: 20 }} />}
            {!loading && activeTab === 'discussions' && renderDiscussions()}
            {!loading && activeTab === 'friends' && renderFriends()}
            {!loading && activeTab === 'requests' && renderRequests()}
          </View>

          {/* Add Friend Modal */}
          <Modal
            visible={isAddFriendVisible}
            transparent={true}
            animationType="slide"
            onRequestClose={() => setIsAddFriendVisible(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Ajouter un ami</Text>
                <TextInput 
                  style={styles.modalInput}
                  placeholder="Entrez le pseudo..."
                  placeholderTextColor="#999"
                  value={newFriendName}
                  onChangeText={setNewFriendName}
                />
                <View style={styles.modalButtons}>
                  <TouchableOpacity style={styles.modalButtonCancel} onPress={() => setIsAddFriendVisible(false)}>
                    <Text style={styles.modalButtonText}>Annuler</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.modalButtonConfirm} onPress={handleSendRequest}>
                    <Text style={styles.modalButtonText}>Rechercher & Ajouter</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>

          {/* Invite Config Modal */}
          <Modal
            visible={inviteConfigVisible}
            transparent={true}
            animationType="slide"
            onRequestClose={() => setInviteConfigVisible(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={[styles.modalContent, { maxHeight: '80%' }]}>
                <ScrollView contentContainerStyle={{ alignItems: 'center', width: '100%' }} style={{ width: '100%' }}>
                <Text style={styles.modalTitle}>Inviter {selectedFriend?.name}</Text>
                
                <Text style={styles.label}>Mode de jeu:</Text>
                <View style={styles.optionsRow}>
                    <TouchableOpacity 
                        style={[styles.optionButton, inviteMode === 'simple' && styles.optionButtonActive]}
                        onPress={() => setInviteMode('simple')}
                    >
                        <Text style={[styles.optionText, inviteMode === 'simple' && styles.optionTextActive]}>Simple</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={[styles.optionButton, inviteMode === 'tournament' && styles.optionButtonActive]}
                        onPress={() => setInviteMode('tournament')}
                    >
                        <Text style={[styles.optionText, inviteMode === 'tournament' && styles.optionTextActive]}>Tournoi</Text>
                    </TouchableOpacity>
                </View>

                {inviteMode === 'tournament' && (
                    <>
                        <Text style={styles.label}>Nombre de parties:</Text>
                        <View style={styles.optionsRow}>
                            {[2, 4, 6, 8, 10].map(num => (
                                <TouchableOpacity 
                                    key={num} 
                                    style={[styles.optionButton, inviteSeriesLength === num && styles.optionButtonActive]}
                                    onPress={() => setInviteSeriesLength(num)}
                                >
                                    <Text style={[styles.optionText, inviteSeriesLength === num && styles.optionTextActive]}>{num}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </>
                )}

                <Text style={styles.label}>Mise (coins):</Text>
                <View style={styles.optionsRow}>
                    {[100, 500, 1000, 5000].map(amount => (
                        <TouchableOpacity 
                            key={amount} 
                            style={[styles.optionButton, inviteBet === amount && styles.optionButtonActive]}
                            onPress={() => setInviteBet(amount)}
                        >
                            <Text style={[styles.optionText, inviteBet === amount && styles.optionTextActive]}>{amount}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <Text style={styles.label}>Temps par tour:</Text>
                <View style={styles.optionsRow}>
                    {[null, 30, 60, 120].map(time => (
                        <TouchableOpacity 
                            key={time} 
                            style={[styles.optionButton, inviteTime === time && styles.optionButtonActive]}
                            onPress={() => setInviteTime(time)}
                        >
                            <Text style={[styles.optionText, inviteTime === time && styles.optionTextActive]}>
                                {time ? `${time}s` : '∞'}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <View style={styles.modalButtons}>
                  <TouchableOpacity style={styles.modalButtonCancel} onPress={() => setInviteConfigVisible(false)}>
                    <Text style={styles.modalButtonText}>Annuler</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.modalButtonConfirm} onPress={handleSendInvite}>
                    <Text style={styles.modalButtonText}>Envoyer</Text>
                  </TouchableOpacity>
                </View>
                </ScrollView>
              </View>
            </View>
          </Modal>

          {/* Incoming Invite Modal */}
          <Modal
            visible={!!incomingInvite}
            transparent={true}
            animationType="slide"
            onRequestClose={handleDeclineInvite}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Invitation de {incomingInvite?.senderPseudo}</Text>
                <Text style={styles.inviteDetails}>
                    Mode: {incomingInvite?.mode === 'tournament' ? `Tournoi (${incomingInvite?.seriesLength} parties)` : 'Simple'}{'\n'}
                    Mise: {incomingInvite?.betAmount} coins{'\n'}
                    Temps: {incomingInvite?.timeControl ? `${incomingInvite.timeControl}s` : 'Illimité'}
                </Text>
                
                <View style={styles.modalButtons}>
                  <TouchableOpacity style={styles.modalButtonCancel} onPress={handleDeclineInvite}>
                    <Text style={styles.modalButtonText}>Refuser</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.modalButtonConfirm} onPress={handleAcceptInvite}>
                    <Text style={styles.modalButtonText}>Accepter</Text>
                  </TouchableOpacity>
                </View>
              </View>
             </View>
           </Modal>
 
         </SafeAreaView>
      </TouchableWithoutFeedback>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  background: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  safeArea: {
    flex: 1,
    backgroundColor: 'rgba(4, 28, 85, 0.7)',
  },
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    marginTop: 10,
  },
  coinContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#f1c40f',
  },
  coinIcon: {
    fontSize: 16,
    marginRight: 5,
  },
  coinText: {
    color: '#f1c40f',
    fontWeight: 'bold',
    fontSize: 16,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  iconButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    padding: 8,
    borderRadius: 20,
  },
  
  // Tabs
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 10,
    marginBottom: 10,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  activeTab: {
    borderBottomColor: '#f1c40f',
  },
  tabText: {
    color: '#ccc',
    fontSize: 14,
    fontWeight: '600',
  },
  activeTabText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  badge: {
    backgroundColor: '#e74c3c',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 5,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },

  // Search
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    marginHorizontal: 15,
    borderRadius: 10,
    paddingHorizontal: 10,
    marginBottom: 15,
    height: 40,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
  },

  // Content
  contentContainer: {
    flex: 1,
    paddingBottom: 80, // Space for bottom tab navigator
  },
  listContent: {
    paddingHorizontal: 15,
    paddingBottom: 20,
  },
  emptyText: {
    color: '#aaa',
    textAlign: 'center',
    marginTop: 50,
    fontSize: 16,
    fontStyle: 'italic',
  },

  // Chat Item
  chatItem: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
    alignItems: 'center',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  chatInfo: {
    flex: 1,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  chatName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  chatTime: {
    color: '#aaa',
    fontSize: 12,
  },
  chatFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastMessage: {
    color: '#888',
    fontSize: 14,
    flex: 1,
    marginRight: 10,
  },
  unreadChatItem: {
    backgroundColor: '#e0f2fe',
    borderLeftWidth: 4,
    borderLeftColor: '#3b82f6',
  },
  unreadChatName: {
    color: '#1e293b',
    fontWeight: 'bold',
  },
  unreadChatTime: {
    color: '#64748b',
  },
  unreadMessage: {
    color: '#334155',
    fontWeight: '600',
  },
  unreadBadge: {
    backgroundColor: '#3b82f6',
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  lastRead: {
    color: '#666',
    fontSize: 10,
    marginTop: 4,
    alignSelf: 'flex-start',
  },

  // Friend Item
  friendItem: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.08)',
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
    alignItems: 'center',
  },
  friendAvatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  statusIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#041c55',
  },
  friendInfo: {
    flex: 1,
  },
  friendName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  friendActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 20,
  },
  lastSeen: {
    color: '#aaa',
    fontSize: 12,
    marginTop: 2,
  },

  // Request Item
  sectionTitle: {
    color: '#f1c40f',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 10,
    marginTop: 5,
    textTransform: 'uppercase',
  },
  requestItem: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
    alignItems: 'center',
  },
  requestInfo: {
    flex: 1,
  },
  requestName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  requestDate: {
    color: '#aaa',
    fontSize: 12,
  },
  requestActions: {
    flexDirection: 'row',
    gap: 10,
  },
  requestButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptButton: {
    backgroundColor: '#2ecc71',
  },
  declineButton: {
    backgroundColor: '#e74c3c',
  },
  cancelButton: {
    padding: 5,
  },
  cancelLatestButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(231, 76, 60, 0.2)',
    borderRadius: 8,
  },
  cancelLatestText: {
    color: '#e74c3c',
    fontWeight: 'bold',
    fontSize: 12,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    width: '80%',
    padding: 20,
    borderRadius: 15,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#041c55',
  },
  modalInput: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
    marginBottom: 20,
    fontSize: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 15,
  },
  modalButtonCancel: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: '#95a5a6',
  },
  modalButtonConfirm: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: '#041c55',
  },
  modalButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },

  // Invite Config
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#041c55',
    marginBottom: 8,
    alignSelf: 'flex-start',
  },
  optionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
    justifyContent: 'center',
  },
  optionButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#041c55',
    backgroundColor: '#fff',
  },
  optionButtonActive: {
    backgroundColor: '#041c55',
  },
  optionText: {
    color: '#041c55',
    fontWeight: '600',
  },
  optionTextActive: {
    color: '#fff',
  },
  inviteDetails: {
      fontSize: 16,
      color: '#333',
      marginBottom: 20,
      textAlign: 'center',
      lineHeight: 24,
  },
});

export default SocialScreen;
