import React, { useState, useEffect, useRef } from 'react';
import { 
  View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, 
  KeyboardAvoidingView, Platform, SafeAreaView, Alert, Modal, Image,
  Dimensions, Animated, Easing, Vibration, TouchableWithoutFeedback, Keyboard
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { Audio } from 'expo-av';
import { playButtonSound } from '../utils/soundManager';
import { 
  RTCPeerConnection, 
  RTCIceCandidate, 
  RTCSessionDescription, 
  RTCView, 
  mediaDevices,
  isAvailable as isWebRTCAvailable
} from '../services/webrtc';

import { API_URL } from '../config';
import socket from '../services/socket';
import { AudioController } from '../utils/AudioController';
import { getResponsiveSize, isTablet } from '../utils/responsive';

const { width, height } = Dimensions.get('window');

const ChatScreen = ({ route, navigation }) => {
  const { friendId, friendName, friendAvatar } = route.params;
  const { user, token } = useSelector(state => state.auth);
  const settings = useSelector(state => state.settings || { isMusicEnabled: true });
  
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [recording, setRecording] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [sound, setSound] = useState(null);
  const [isPlaying, setIsPlaying] = useState(null); // messageId of playing audio
  const [playbackStatus, setPlaybackStatus] = useState({}); // { duration: 0, position: 0 } for current playing
  
  // Recording Overlay State
  const [isRecordingOverlayVisible, setIsRecordingOverlayVisible] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [metering, setMetering] = useState(-160);
  
  // Animations
  const recordingDotOpacity = useRef(new Animated.Value(1)).current;
  // Create 40 animated values for the visualizer bars
  const visualizerBars = useRef([...Array(40)].map(() => new Animated.Value(0))).current;
  
  // Call State
  const [callStatus, setCallStatus] = useState('idle'); // idle, calling, incoming, connected
  const [callType, setCallType] = useState(null); // audio, video
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);

  // Status State
  const [friendStatus, setFriendStatus] = useState(null); // { isOnline, lastSeen }
  const [tick, setTick] = useState(0); // For timer updates

  const flatListRef = useRef(null);
  const callTimerRef = useRef(null);
  const peerConnection = useRef(null);
  const pendingCandidates = useRef([]);

  // --- INITIALIZATION ---
  useEffect(() => {
    if (isRecordingOverlayVisible) {
        Animated.loop(
            Animated.sequence([
                Animated.timing(recordingDotOpacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
                Animated.timing(recordingDotOpacity, { toValue: 1, duration: 800, useNativeDriver: true })
            ])
        ).start();
    } else {
        recordingDotOpacity.setValue(1);
    }
  }, [isRecordingOverlayVisible]);

  useEffect(() => {
    AudioController.notifyChatEnter();

    fetchMessages();
    markMessagesAsRead();
    setupSocket();
    fetchFriendStatus();

    (async () => {
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
    })();

    return () => {
      AudioController.notifyChatExit(settings.isMusicEnabled);

      if (sound) sound.unloadAsync();
      endCallCleanup();
      socket.off('receive_message');
      socket.off('messages_read'); 
      socket.off('message_delivered_receipt');
      socket.off('incoming_call');
      socket.off('call_accepted');
      socket.off('call_ended');
      socket.off('ice_candidate');
      socket.off('friend_status_updated');
    };
  }, []);

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

  const fetchFriendStatus = async () => {
    try {
        const res = await fetch(`${API_URL}/users/${friendId}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
            const data = await res.json();
            setFriendStatus({ isOnline: data.isOnline, lastSeen: data.lastSeen });
        }
    } catch (err) {
        console.error("Error fetching friend status:", err);
    }
  };

  const markMessagesAsRead = async () => {
    try {
        await fetch(`${API_URL}/chat/mark-read`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}` 
            },
            body: JSON.stringify({ friendId })
        });
    } catch (err) {
        console.error("Error marking read:", err);
    }
  };

  const fetchMessages = async () => {
    try {
      const res = await fetch(`${API_URL}/chat/${friendId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setMessages(data);
      }
    } catch (error) {
      console.error("Error fetching messages:", error);
    }
  };

  const setupSocket = () => {
    socket.on('receive_message', (message) => {
      if (message.sender === friendId || message.recipient === friendId) {
        setMessages(prev => [...prev, message]);
        flatListRef.current?.scrollToEnd();

        if (message.sender === friendId) {
            socket.emit('message_delivered', { messageId: message._id, senderId: message.sender });
            markMessagesAsRead();
        }
      }
    });

    socket.on('message_delivered_receipt', ({ messageId }) => {
        setMessages(prev => prev.map(msg => 
            (msg._id === messageId && msg.status !== 'read') ? { ...msg, status: 'delivered' } : msg
        ));
    });

    socket.on('messages_read', ({ readerId }) => {
        if (readerId === friendId) {
            setMessages(prev => prev.map(msg => 
                // Check if message was sent by me (user._id) OR if I am the sender
                // We handle both string ID and populated object ID for safety
                ((msg.sender === user._id) || (msg.sender?._id === user._id) || (msg.recipient === readerId))
                ? { ...msg, status: 'read', read: true } 
                : msg
            ));
        }
    });

    socket.on('friend_status_updated', ({ userId, isOnline }) => {
        if (userId === friendId) {
            // Refetch to ensure we get the latest lastSeen time from DB if offline
            fetchFriendStatus();
        }
    });

    // Real Call Signaling
    socket.on('incoming_call', async (data) => {
      // data: { signal, from, name, avatar, type }
      if (data.from === friendId) {
        setCallType(data.type);
        setCallStatus('incoming');
        
        // We defer peerConnection creation until answer, 
        // OR we can create it now to handle early candidates.
        // For simplicity, we store the offer signal in a ref or state if needed, 
        // but typically we can just pass it to acceptCall.
        // Here we attach it to the socket object temporarily or state
        socket.incomingSignal = data.signal; 
      }
    });

    socket.on('call_accepted', async (signal) => {
      setCallStatus('connected');
      startCallTimer();
      if (peerConnection.current) {
        try {
          await peerConnection.current.setRemoteDescription(new RTCSessionDescription(signal));
          // Process any pending candidates
          while (pendingCandidates.current.length > 0) {
             const candidate = pendingCandidates.current.shift();
             await peerConnection.current.addIceCandidate(candidate);
          }
        } catch (err) {
          console.error("Error setting remote description:", err);
        }
      }
    });

    socket.on('ice_candidate', async (candidate) => {
      if (peerConnection.current && peerConnection.current.remoteDescription) {
        try {
          await peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          console.error("Error adding ice candidate", err);
        }
      } else {
        pendingCandidates.current.push(new RTCIceCandidate(candidate));
      }
    });

    socket.on('call_ended', () => {
      endCallCleanup();
      // Add log
      const logMsg = {
        _id: Date.now().toString(),
        sender: friendId,
        content: `Appel terminé`,
        type: 'info',
        createdAt: new Date().toISOString()
      };
      setMessages(prev => [...prev, logMsg]);
    });
  };

  // --- CHAT FUNCTIONS ---

  const handleSendMessage = async () => {
    if (!inputText.trim()) return;

    const messageData = {
      recipientId: friendId,
      content: inputText,
      type: 'text'
    };

    try {
      // Optimistic update
      const tempMsg = {
        _id: Date.now().toString(),
        sender: user._id,
        content: inputText,
        type: 'text',
        createdAt: new Date().toISOString()
      };
      setMessages(prev => [...prev, tempMsg]);
      setInputText('');

      const res = await fetch(`${API_URL}/chat/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(messageData)
      });
      
      const data = await res.json();

      if (res.ok) {
        // Replace temp message with actual message from server (with correct _id)
        setMessages(prev => prev.map(msg => 
            msg._id === tempMsg._id ? data : msg
        ));
      } else {
        Alert.alert("Erreur", "Message non envoyé");
        // Remove temp message on failure
        setMessages(prev => prev.filter(msg => msg._id !== tempMsg._id));
      }
    } catch (error) {
      console.error(error);
    }
  };

  // --- AUDIO RECORDING ---

  const updateVisualizer = (meteringDb) => {
    // meteringDb is typically -160 to 0. Normalize to 0-1
    const normalized = Math.max(0, (meteringDb + 160) / 160);
    
    // Animate all bars with random variations based on the normalized value
    visualizerBars.forEach((anim, index) => {
        // Create a wave effect: center bars are higher
        const centerOffset = Math.abs(index - 20) / 20; // 0 at center, 1 at edges
        const scaleFactor = 1 - (centerOffset * 0.5); // Center is 1.0, edges 0.5
        
        // Random noise
        const noise = Math.random() * 0.3;
        const targetHeight = (normalized * scaleFactor * 0.7) + noise;
        
        Animated.timing(anim, {
            toValue: Math.max(0.1, targetHeight), // Minimum height 10%
            duration: 100,
            useNativeDriver: false 
        }).start();
    });
  };

  const startRecording = async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status !== 'granted') return;

      await AudioController.stopHomeMusic();

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        {
            ...Audio.RecordingOptionsPresets.HIGH_QUALITY,
            isMeteringEnabled: true
        },
        (status) => {
            setRecordingDuration(Math.floor(status.durationMillis / 1000));
            if (status.metering !== undefined) {
                updateVisualizer(status.metering);
            }
            // Auto stop at 2 mins (120s)
            if (status.durationMillis >= 120000) {
                sendRecording();
            }
        },
        100 // Update every 100ms
      );
      
      setRecording(recording);
      setIsRecording(true);
      setIsRecordingOverlayVisible(true);
      setRecordingDuration(0);
      Vibration.vibrate(50);
      
    } catch (err) {
      console.error('Failed to start recording', err);
      Alert.alert("Erreur", "Impossible de démarrer l'enregistrement");
    }
  };

  const cancelRecording = async () => {
    if (!recording) return;
    try {
        await recording.stopAndUnloadAsync();
        setRecording(null);
        setIsRecording(false);
        setIsRecordingOverlayVisible(false);
        setRecordingDuration(0);
        Vibration.vibrate(50);
    } catch (err) {
        console.error("Error canceling", err);
    }
  };

  const sendRecording = async () => {
    if (!recording) return;
    
    try {
      setIsRecording(false);
      setIsRecordingOverlayVisible(false);
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);
      
      // Upload Audio
      const formData = new FormData();
      formData.append('audio', {
        uri: uri,
        type: 'audio/m4a', 
        name: 'voice_message.m4a'
      });

      const uploadRes = await fetch(`${API_URL}/chat/upload-audio`, {
        method: 'POST',
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`
        },
        body: formData
      });
      
      const uploadData = await uploadRes.json();
      
      if (uploadRes.ok) {
        const messageData = {
          recipientId: friendId,
          content: "Message vocal",
          type: 'audio',
          audioUri: uploadData.url,
          duration: recordingDuration
        };

        const sendRes = await fetch(`${API_URL}/chat/send`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify(messageData)
        });

        const sentMessage = await sendRes.json();
        
        if (sendRes.ok) {
            setMessages(prev => [...prev, sentMessage]);
        } else {
             Alert.alert("Erreur", "Impossible d'envoyer le message vocal");
        }
      } else {
        Alert.alert("Erreur", "Échec de l'envoi du vocal.");
      }
    } catch (error) {
      console.error("Error sending voice message:", error);
      Alert.alert("Erreur", "Erreur réseau.");
    }
  };

  const resolveAudioUrl = (item) => { // ✅ CORRIGÉ
    const url = // ✅ CORRIGÉ
      item.audioUri || // ✅ CORRIGÉ
      item.audio_url || // ✅ CORRIGÉ
      item.mediaUrl || // ✅ CORRIGÉ
      item.url || // ✅ CORRIGÉ
      null; // ✅ CORRIGÉ

    if (!url) { // ✅ CORRIGÉ
      console.warn('⚠️ No audio URL found in message:', item); // ✅ CORRIGÉ
      return null; // ✅ CORRIGÉ
    } // ✅ CORRIGÉ

    if (url.startsWith('/')) { // ✅ CORRIGÉ
      return `${API_URL}${url}`; // ✅ CORRIGÉ
    } // ✅ CORRIGÉ

    return url; // ✅ CORRIGÉ
  }; // ✅ CORRIGÉ

  const playSound = async (uri, messageId) => { // ✅ CORRIGÉ
    if (!uri || uri === 'Message vocal' || !uri.startsWith('http')) { // ✅ CORRIGÉ
      console.error('❌ Invalid audio URI:', uri); // ✅ CORRIGÉ
      Alert.alert('Erreur', 'Impossible de lire ce message vocal (URL invalide)'); // ✅ CORRIGÉ
      return; // ✅ CORRIGÉ
    } // ✅ CORRIGÉ

    try { // ✅ CORRIGÉ
      if (sound) { // ✅ CORRIGÉ
        try { // ✅ CORRIGÉ
          await sound.stopAsync(); // ✅ CORRIGÉ
          await sound.unloadAsync(); // ✅ CORRIGÉ
        } catch (e) { // ✅ CORRIGÉ
          console.error('Error stopping previous sound:', e); // ✅ CORRIGÉ
        } // ✅ CORRIGÉ
        setSound(null); // ✅ CORRIGÉ
        setIsPlaying(null); // ✅ CORRIGÉ
        setPlaybackStatus({ duration: 0, position: 0 }); // ✅ CORRIGÉ
        if (isPlaying === messageId) return; // ✅ CORRIGÉ
      } // ✅ CORRIGÉ

      await Audio.setAudioModeAsync({ // ✅ CORRIGÉ
        allowsRecordingIOS: false, // ✅ CORRIGÉ
        playsInSilentModeIOS: true, // ✅ CORRIGÉ
      }); // ✅ CORRIGÉ

      const { sound: newSound } = await Audio.Sound.createAsync( // ✅ CORRIGÉ
        { uri }, // ✅ CORRIGÉ
        { shouldPlay: true }, // ✅ CORRIGÉ
      ); // ✅ CORRIGÉ

      setSound(newSound); // ✅ CORRIGÉ
      setIsPlaying(messageId); // ✅ CORRIGÉ

      newSound.setOnPlaybackStatusUpdate((status) => { // ✅ CORRIGÉ
        if (status.isLoaded) { // ✅ CORRIGÉ
          setPlaybackStatus({ // ✅ CORRIGÉ
            duration: (status.durationMillis || 0) / 1000, // ✅ CORRIGÉ
            position: (status.positionMillis || 0) / 1000, // ✅ CORRIGÉ
          }); // ✅ CORRIGÉ
          if (status.didJustFinish) { // ✅ CORRIGÉ
            setIsPlaying(null); // ✅ CORRIGÉ
            setPlaybackStatus({ duration: 0, position: 0 }); // ✅ CORRIGÉ
          } // ✅ CORRIGÉ
        } // ✅ CORRIGÉ
        if (status.error) { // ✅ CORRIGÉ
          console.error('❌ Playback error:', status.error); // ✅ CORRIGÉ
          Alert.alert('Erreur', 'Impossible de lire ce message vocal'); // ✅ CORRIGÉ
          setIsPlaying(null); // ✅ CORRIGÉ
        } // ✅ CORRIGÉ
      }); // ✅ CORRIGÉ
    } catch (error) { // ✅ CORRIGÉ
      console.error('❌ playSound error:', error); // ✅ CORRIGÉ
      Alert.alert('Erreur', 'Impossible de lire ce message vocal'); // ✅ CORRIGÉ
      setIsPlaying(null); // ✅ CORRIGÉ
    } // ✅ CORRIGÉ
  }; // ✅ CORRIGÉ

  // --- WEBRTC CALL FUNCTIONS ---

  const getStream = async (type) => {
    if (!isWebRTCAvailable) return null;

    let isVideo = type === 'video';
    let sourceInfos = await mediaDevices.enumerateDevices();
    let videoSourceId;
    for (let i = 0; i < sourceInfos.length; i++) {
      const sourceInfo = sourceInfos[i];
      if(sourceInfo.kind == "videoinput" && sourceInfo.facing == (isVideo ? "front" : "environment")) {
        videoSourceId = sourceInfo.deviceId;
      }
    }
    
    const stream = await mediaDevices.getUserMedia({
      audio: true,
      video: isVideo ? {
        mandatory: {
          minWidth: 500,
          minHeight: 300,
          minFrameRate: 30
        },
        facingMode: (isVideo ? "user" : "environment"),
        optional: (videoSourceId ? [{sourceId: videoSourceId}] : [])
      } : false
    });

    if (stream) {
      setLocalStream(stream);
      return stream;
    }
  };

  const createPeerConnection = async () => {
    const configuration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
      ],
    };
    
    const pc = new RTCPeerConnection(configuration);

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('ice_candidate', {
          to: friendId,
          candidate: event.candidate
        });
      }
    };

    pc.onaddstream = (event) => {
      setRemoteStream(event.stream);
    };

    peerConnection.current = pc;
    return pc;
  };

  const startCallTimer = () => {
    stopCallTimer();
    setCallDuration(0);
    callTimerRef.current = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);
  };

  const stopCallTimer = () => {
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
      callTimerRef.current = null;
    }
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const initiateCall = async (type) => {
    setCallType(type);
    setCallStatus('calling');
    
    try {
      const stream = await getStream(type);
      const pc = await createPeerConnection();
      
      if (stream) {
        pc.addStream(stream);
      }

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      socket.emit('call_user', {
        userToCall: friendId,
        signalData: offer,
        from: user._id,
        name: user.pseudo || "User",
        avatar: user.avatar,
        type: type
      });

    } catch (err) {
      console.error("Error initiating call:", err);
      Alert.alert("Erreur", "Impossible de démarrer l'appel");
      endCallCleanup();
    }
  };

  const acceptCall = async () => {
    // Allow call acceptance in Expo Go (mock mode)
    // if (!isWebRTCAvailable) {
    //    Alert.alert("Erreur", "WebRTC non disponible sur cet appareil (Mode Expo Go).");
    //    return;
    // }

    try {
      const stream = await getStream(callType);
      const pc = await createPeerConnection();
      
      if (stream) {
        pc.addStream(stream);
      }
      
      const offer = socket.incomingSignal;
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      
      socket.emit('answer_call', {
        signal: answer,
        to: friendId
      });

      setCallStatus('connected');
      startCallTimer();
      
      // Process pending candidates
      while (pendingCandidates.current.length > 0) {
         const candidate = pendingCandidates.current.shift();
         await pc.addIceCandidate(candidate);
      }

    } catch (err) {
      console.error("Error accepting call:", err);
      endCallCleanup();
    }
  };

  const endCall = () => {
    socket.emit('end_call', { to: friendId });
    
    // Add call log to chat
    const logMsg = {
      _id: Date.now().toString(),
      sender: user._id,
      content: `Appel ${callType === 'video' ? 'vidéo' : 'audio'} terminé - ${formatDuration(callDuration)}`,
      type: 'info',
      createdAt: new Date().toISOString()
    };
    setMessages(prev => [...prev, logMsg]);

    endCallCleanup();
  };

  const endCallCleanup = () => {
    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }
    if (remoteStream) {
       // Remote stream tracks are usually stopped when connection closes
       setRemoteStream(null);
    }
    
    stopCallTimer();
    setCallStatus('idle');
    setCallDuration(0);
    setIsMuted(false);
    setIsCameraOff(false);

    Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
    }).catch(e => console.log('AudioMode reset error:', e));
  };

  const toggleMute = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
    }
  };

  const toggleCamera = () => {
    if (localStream && callType === 'video') {
      localStream.getVideoTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsCameraOff(!isCameraOff);
    }
  };

  // --- RENDERERS ---

  const renderMessage = ({ item }) => { // ✅ CORRIGÉ
    const isMe = item.sender === user._id; // ✅ CORRIGÉ
    
    if (item.type === 'audio') { // ✅ CORRIGÉ
      console.log('🔊 Audio message received:', JSON.stringify(item, null, 2)); // ✅ CORRIGÉ
    } // ✅ CORRIGÉ

    if (item.type === 'info') { // ✅ CORRIGÉ
      return ( // ✅ CORRIGÉ
        <View style={styles.infoMessage}> 
          <Text style={styles.infoText}>{item.content}</Text>
        </View>
      );
    }

    const progressRatio =
      isPlaying === item._id && playbackStatus.duration > 0
        ? Math.min(1, playbackStatus.position / playbackStatus.duration)
        : 0; // ✅ CORRIGÉ

    return ( // ✅ CORRIGÉ
      <View style={[styles.messageBubble, isMe ? styles.myMessage : styles.theirMessage]}>
        {item.type === 'audio' ? ( // ✅ CORRIGÉ
          <View style={styles.audioContainer}> 
            <TouchableOpacity 
              style={[
                styles.audioPlayButton, 
                { backgroundColor: isMe ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.05)' }
              ]}
              onPress={() => {
                const audioUrl = resolveAudioUrl(item);
                if (!audioUrl) {
                  Alert.alert('Erreur', 'Fichier audio introuvable');
                  return;
                }
                playSound(audioUrl, item._id);
              }}
            >
              <Ionicons 
                name={isPlaying === item._id ? "pause" : "play"} 
                size={getResponsiveSize(20)} 
                color={isMe ? "#fff" : "#333"} 
                style={{ marginLeft: isPlaying === item._id ? 0 : getResponsiveSize(2) }}
              />
            </TouchableOpacity>
            
            <View style={{ flex: 1, marginLeft: getResponsiveSize(12), justifyContent: 'center' }}> 
              <View
                style={{
                  height: getResponsiveSize(4),
                  borderRadius: getResponsiveSize(2),
                  overflow: 'hidden',
                  backgroundColor: isMe
                    ? 'rgba(255,255,255,0.3)'
                    : 'rgba(0,0,0,0.1)',
                }}
              >
                <View
                  style={{
                    height: getResponsiveSize(4),
                    borderRadius: getResponsiveSize(2),
                    width: `${progressRatio * 100}%`,
                    backgroundColor: isMe ? '#fff' : '#333',
                  }}
                />
              </View>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: getResponsiveSize(4) }}>
                <Text style={{ color: isMe ? "rgba(255,255,255,0.8)" : "rgba(0,0,0,0.6)", fontSize: getResponsiveSize(11), fontVariant: ['tabular-nums'] }}>
                  {isPlaying === item._id 
                    ? formatDuration(Math.floor(playbackStatus.position || 0))
                    : formatDuration(item.duration || 0)}
                </Text>
              </View>
            </View>
          </View>
        ) : (
          <Text style={isMe ? styles.myText : styles.theirText}>{item.content}</Text>
        )}
        <View style={styles.timestampContainer}>
          <Text style={[styles.timestamp, isMe ? { color: '#ddd' } : { color: '#666' }]}>
            {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
          {isMe && (
            <>
              {item.sendError && (
                <Ionicons 
                  name="alert-circle-outline"
                  size={getResponsiveSize(16)}
                  color="#e74c3c"
                  style={{ marginLeft: getResponsiveSize(5) }}
                />
              )}
              {!item.sendError && (
                <Ionicons 
                  name={(item.status === 'read' || item.read || item.status === 'delivered') ? "checkmark-done" : "checkmark"} 
                  size={getResponsiveSize(16)} 
                  color={(item.status === 'read' || item.read) ? "#3b82f6" : "#ddd"} 
                  style={{ marginLeft: getResponsiveSize(5) }}
                />
              )}
            </>
          )}
        </View>
      </View>
    );
  };

  const renderRecordingOverlay = () => {
    if (!isRecordingOverlayVisible) return null;

    return (
      <View style={styles.recordingOverlay}>
        <View style={styles.recordingContent}>
            {/* Instruction */}
            <Text style={styles.recordingInstruction}>
                Relâchez pour envoyer • Appuyez sur X pour annuler
            </Text>

            {/* Timer */}
            <Text style={styles.recordingTimer}>
                {formatDuration(recordingDuration)}
            </Text>

            {/* Visualizer */}
            <View style={styles.visualizerContainer}>
                {visualizerBars.map((anim, index) => (
                    <Animated.View
                        key={index}
                        style={[
                            styles.visualizerBar,
                            {
                                height: anim.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [getResponsiveSize(4), getResponsiveSize(50)] // Min 4px, Max 50px
                                }),
                                opacity: anim.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [0.5, 1]
                                })
                            }
                        ]}
                    />
                ))}
            </View>

            {/* Controls */}
            <View style={styles.recordingControls}>
                <TouchableOpacity onPress={cancelRecording} style={styles.cancelButton}>
                    <Ionicons name="close" size={getResponsiveSize(30)} color="white" />
                </TouchableOpacity>

                <View style={styles.recordingIndicator}>
                    <Animated.View style={[styles.recordingDot, { opacity: recordingDotOpacity }]} />
                    <Ionicons name="mic" size={getResponsiveSize(40)} color="white" />
                </View>

                <TouchableOpacity onPress={sendRecording} style={styles.sendButtonRecording}>
                    <Ionicons name="send" size={getResponsiveSize(24)} color="white" />
                </TouchableOpacity>
            </View>
            
            {/* Progress Bar (2 mins) */}
            <View style={styles.recordingProgressBarContainer}>
                <View style={[styles.recordingProgressBar, { width: `${(recordingDuration / 120) * 100}%` }]} />
            </View>
        </View>
      </View>
    );
  };

  const renderCallOverlay = () => {
    if (callStatus === 'idle') return null;

    const isVideo = callType === 'video';

    return (
      <Modal visible={true} animationType="slide" transparent={false}>
        <View style={styles.callContainer}>
          {/* Video Streams */}
          <View style={styles.videoWrapper}>
            {isVideo ? (
               <>
                 {/* Remote Stream (Full Screen) */}
                 {remoteStream ? (
                   <RTCView 
                     streamURL={remoteStream.toURL()} 
                     style={styles.remoteVideo} 
                     objectFit="cover"
                   />
                 ) : (
                   <View style={styles.waitingRemote}>
                     <Text style={{color: 'white', textAlign: 'center'}}>
                        {isWebRTCAvailable ? "En attente de la vidéo..." : "Vidéo non disponible dans Expo Go\n(Mode Simulation)"}
                     </Text>
                   </View>
                 )}

                 {/* Local Stream (Small Pip) */}
                 {localStream && !isCameraOff && (
                   <View style={styles.localVideoContainer}>
                     <RTCView 
                       streamURL={localStream.toURL()} 
                       style={styles.localVideo} 
                       objectFit="cover"
                       zOrder={1}
                     />
                   </View>
                 )}
               </>
            ) : (
               /* Audio Only UI */
               <View style={styles.avatarContainer}>
                 <Image 
                   source={friendAvatar || { uri: 'https://i.pravatar.cc/150' }} 
                   style={styles.callAvatar} 
                 />
               </View>
            )}
          </View>

          {/* Overlay UI */}
          <View style={styles.callOverlay}>
            <View style={styles.callHeader}>
              <Text style={styles.callName}>{friendName}</Text>
              <Text style={styles.callStatus}>
                {callStatus === 'calling' ? 'Appel en cours...' : 
                 callStatus === 'incoming' ? 'Appel entrant...' : 
                 formatDuration(callDuration)}
              </Text>
            </View>

            <View style={styles.callControls}>
              {callStatus === 'incoming' ? (
                <>
                  <TouchableOpacity style={[styles.controlBtn, { backgroundColor: '#e74c3c' }]} onPress={endCall}>
                    <Ionicons name="close" size={getResponsiveSize(32)} color="white" />
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.controlBtn, { backgroundColor: '#2ecc71' }]} onPress={acceptCall}>
                    <Ionicons name="call" size={getResponsiveSize(32)} color="white" />
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <TouchableOpacity style={[styles.controlBtn, isMuted && styles.activeBtn]} onPress={toggleMute}>
                    <Ionicons name={isMuted ? "mic-off" : "mic"} size={getResponsiveSize(28)} color="white" />
                  </TouchableOpacity>
                  
                  <TouchableOpacity style={[styles.controlBtn, { backgroundColor: '#e74c3c', width: getResponsiveSize(70), height: getResponsiveSize(70), borderRadius: getResponsiveSize(35) }]} onPress={endCall}>
                    <Ionicons name="call" size={getResponsiveSize(32)} color="white" />
                  </TouchableOpacity>

                  {isVideo && (
                    <TouchableOpacity style={[styles.controlBtn, isCameraOff && styles.activeBtn]} onPress={toggleCamera}>
                      <Ionicons name={isCameraOff ? "videocam-off" : "videocam"} size={getResponsiveSize(28)} color="white" />
                    </TouchableOpacity>
                  )}
                </>
              )}
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => { playButtonSound(); navigation.goBack(); }}>
          <Ionicons name="arrow-back" size={getResponsiveSize(24)} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerName}>{friendName}</Text>
          {friendStatus ? (
             <Text style={[styles.headerStatus, { color: getStatusInfo(friendStatus.isOnline, friendStatus.lastSeen).color }]}>
               {getStatusInfo(friendStatus.isOnline, friendStatus.lastSeen).text}
             </Text>
          ) : (
             <Text style={styles.headerStatus}>Chargement...</Text>
          )}
        </View>
        <View style={styles.headerIcons}>
          <TouchableOpacity onPress={() => { playButtonSound(); initiateCall('audio'); }} style={styles.headerIcon}>
            <Ionicons name="call" size={getResponsiveSize(22)} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => { playButtonSound(); initiateCall('video'); }} style={styles.headerIcon}>
            <Ionicons name="videocam" size={getResponsiveSize(22)} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={item => item._id}
        renderItem={renderMessage}
        contentContainerStyle={styles.listContent}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
      />

      {/* Input or Recording UI */}
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"}>
        {isRecordingOverlayVisible ? (
             <View style={styles.inputContainer}>
                {/* Cancel Button */}
                <TouchableOpacity onPress={() => { playButtonSound(); cancelRecording(); }} style={{ padding: getResponsiveSize(10) }}>
                    <Ionicons name="trash-outline" size={getResponsiveSize(24)} color="#e74c3c" />
                </TouchableOpacity>

                {/* Timer */}
                <Text style={{ color: '#fff', marginRight: getResponsiveSize(10), minWidth: getResponsiveSize(40), fontSize: getResponsiveSize(14) }}>
                    {formatDuration(recordingDuration)}
                </Text>

                {/* Visualizer (Horizontal) */}
                <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', height: getResponsiveSize(30), justifyContent: 'center' }}>
                    {visualizerBars.slice(0, 20).map((anim, index) => (
                        <Animated.View
                            key={index}
                            style={{
                                width: getResponsiveSize(3),
                                backgroundColor: '#e74c3c',
                                marginHorizontal: 1,
                                borderRadius: getResponsiveSize(1.5),
                                height: anim.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [getResponsiveSize(3), getResponsiveSize(25)] 
                                })
                            }}
                        />
                    ))}
                </View>

                {/* Send Button */}
                <TouchableOpacity onPress={() => { playButtonSound(); sendRecording(); }} style={styles.sendButton}>
                    <Ionicons name="arrow-up-circle" size={getResponsiveSize(32)} color="#2ecc71" />
                </TouchableOpacity>
             </View>
        ) : (
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Message..."
                placeholderTextColor="#999"
                value={inputText}
                onChangeText={setInputText}
                multiline
              />
              {inputText.length > 0 ? (
                <TouchableOpacity style={styles.sendButton} onPress={() => { playButtonSound(); handleSendMessage(); }}>
                  <Ionicons name="send" size={getResponsiveSize(24)} color="#f1c40f" />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity 
                  style={[styles.micButton]} 
                  onPress={() => { playButtonSound(); startRecording(); }}
                >
                  <Ionicons name="mic" size={getResponsiveSize(24)} color="#fff" />
                </TouchableOpacity>
              )}
            </View>
        )}
      </KeyboardAvoidingView>

      {renderRecordingOverlay()}
      {renderCallOverlay()}
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a1a3c',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: getResponsiveSize(15),
    backgroundColor: 'rgba(4, 28, 85, 0.95)',
    borderBottomWidth: getResponsiveSize(1),
    borderBottomColor: '#f1c40f',
  },
  headerInfo: {
    flex: 1,
    marginLeft: getResponsiveSize(15),
  },
  headerName: {
    color: '#fff',
    fontSize: getResponsiveSize(18),
    fontWeight: 'bold',
  },
  headerStatus: {
    color: '#2ecc71',
    fontSize: getResponsiveSize(12),
  },
  headerIcons: {
    flexDirection: 'row',
  },
  headerIcon: {
    marginLeft: getResponsiveSize(15),
  },
  listContent: {
    padding: getResponsiveSize(15),
    paddingBottom: getResponsiveSize(20),
  },
  messageBubble: {
    maxWidth: '80%',
    padding: getResponsiveSize(10),
    borderRadius: getResponsiveSize(15),
    marginBottom: getResponsiveSize(10),
  },
  myMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#3498db',
    borderBottomRightRadius: getResponsiveSize(2),
  },
  theirMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#ecf0f1',
    borderBottomLeftRadius: getResponsiveSize(2),
  },
  myText: {
    color: '#fff',
    fontSize: getResponsiveSize(14),
  },
  theirText: {
    color: '#333',
    fontSize: getResponsiveSize(14),
  },
  timestampContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    marginTop: getResponsiveSize(5),
  },
  timestamp: {
    fontSize: getResponsiveSize(10),
  },
  infoMessage: {
    alignSelf: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: getResponsiveSize(5),
    borderRadius: getResponsiveSize(5),
    marginBottom: getResponsiveSize(10),
  },
  infoText: {
    color: '#ccc',
    fontSize: getResponsiveSize(12),
  },
  audioContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: getResponsiveSize(5),
    minWidth: getResponsiveSize(150),
  },
  audioPlayButton: {
    width: getResponsiveSize(36),
    height: getResponsiveSize(36),
    borderRadius: getResponsiveSize(18),
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: getResponsiveSize(10),
    backgroundColor: 'rgba(4, 28, 85, 0.95)',
    borderTopWidth: getResponsiveSize(1),
    borderTopColor: '#333',
  },
  input: {
    flex: 1,
    backgroundColor: '#1a2a4c',
    color: '#fff',
    borderRadius: getResponsiveSize(20),
    paddingHorizontal: getResponsiveSize(15),
    paddingVertical: getResponsiveSize(10),
    maxHeight: getResponsiveSize(100),
    marginRight: getResponsiveSize(10),
    fontSize: getResponsiveSize(16),
  },
  sendButton: {
    padding: getResponsiveSize(10),
  },
  micButton: {
    padding: getResponsiveSize(10),
    backgroundColor: '#3498db',
    borderRadius: getResponsiveSize(25),
  },
  recordingBtn: {
    backgroundColor: '#e74c3c',
  },
  
  // Call Overlay
  callContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  videoWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  remoteVideo: {
    width: width,
    height: height,
    position: 'absolute',
    top: 0,
    left: 0,
  },
  localVideoContainer: {
    position: 'absolute',
    top: getResponsiveSize(50),
    right: getResponsiveSize(20),
    width: getResponsiveSize(100),
    height: getResponsiveSize(150),
    backgroundColor: '#333',
    borderRadius: getResponsiveSize(10),
    overflow: 'hidden',
    borderWidth: getResponsiveSize(1),
    borderColor: '#fff',
  },
  localVideo: {
    flex: 1,
  },
  waitingRemote: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarContainer: {
    alignItems: 'center',
  },
  callAvatar: {
    width: getResponsiveSize(150),
    height: getResponsiveSize(150),
    borderRadius: getResponsiveSize(75),
    borderWidth: getResponsiveSize(3),
    borderColor: '#fff',
  },
  callOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'space-between',
    paddingVertical: getResponsiveSize(50),
    paddingHorizontal: getResponsiveSize(20),
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  callHeader: {
    alignItems: 'center',
    marginTop: getResponsiveSize(50),
  },
  callName: {
    color: '#fff',
    fontSize: getResponsiveSize(28),
    fontWeight: 'bold',
  },
  callStatus: {
    color: '#eee',
    fontSize: getResponsiveSize(16),
    marginTop: getResponsiveSize(5),
  },
  callControls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: getResponsiveSize(20),
  },
  controlBtn: {
    width: getResponsiveSize(50),
    height: getResponsiveSize(50),
    borderRadius: getResponsiveSize(25),
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeBtn: {
    backgroundColor: '#fff',
  },
  
  // Recording Overlay Styles
  recordingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#e74c3c', // Red immersive background
    justifyContent: 'flex-end',
    paddingBottom: getResponsiveSize(40),
    zIndex: 1000, // Ensure it's on top
  },
  recordingContent: {
    alignItems: 'center',
    paddingHorizontal: getResponsiveSize(20),
  },
  recordingInstruction: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: getResponsiveSize(14),
    marginBottom: getResponsiveSize(20),
    fontWeight: '500',
  },
  recordingTimer: {
    color: '#fff',
    fontSize: getResponsiveSize(48),
    fontWeight: 'bold',
    marginBottom: getResponsiveSize(30),
  },
  visualizerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: getResponsiveSize(60),
    marginBottom: getResponsiveSize(40),
    width: '100%',
  },
  visualizerBar: {
    width: getResponsiveSize(4),
    backgroundColor: 'rgba(255,255,255,0.8)',
    marginHorizontal: getResponsiveSize(1),
    borderRadius: getResponsiveSize(2),
  },
  recordingControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: getResponsiveSize(20),
    marginBottom: getResponsiveSize(30),
  },
  cancelButton: {
    width: getResponsiveSize(60),
    height: getResponsiveSize(60),
    borderRadius: getResponsiveSize(30),
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordingIndicator: {
    width: getResponsiveSize(80),
    height: getResponsiveSize(80),
    borderRadius: getResponsiveSize(40),
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordingDot: {
    position: 'absolute',
    width: getResponsiveSize(100),
    height: getResponsiveSize(100),
    borderRadius: getResponsiveSize(50),
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  sendButtonRecording: {
    width: getResponsiveSize(60),
    height: getResponsiveSize(60),
    borderRadius: getResponsiveSize(30),
    backgroundColor: '#2ecc71', // Green send button
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: getResponsiveSize(2) },
    shadowOpacity: 0.25,
    shadowRadius: getResponsiveSize(3.84),
  },
  recordingProgressBarContainer: {
    width: '100%',
    height: getResponsiveSize(6),
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: getResponsiveSize(3),
    marginTop: getResponsiveSize(10),
    overflow: 'hidden',
  },
  recordingProgressBar: {
    height: '100%',
    backgroundColor: '#fff',
  },
});

export default ChatScreen;
