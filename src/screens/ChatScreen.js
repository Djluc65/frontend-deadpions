/**
 * ChatScreen.jsx — WhatsApp-grade chat for DeadPions
 * 
 * Nouvelles fonctionnalités vs version précédente :
 *  - Reply (répondre à un message, swipe ou long-press)
 *  - Réactions emoji (long-press sur une bulle)
 *  - Grouping de messages consécutifs (même sender, < 2 min)
 *  - Scroll-to-bottom FAB avec compteur non-lus
 *  - Double-tick animé (sent → delivered → read)
 *  - Indicateur "en ligne" en temps réel
 *  - Recording overlay amélioré avec waveform
 *  - Haptics sur actions clés
 *  - Réactions enregistrées en base (via socket + REST)
 *  - Mark-as-read au focus et au scroll
 *  - Suppression de message (long press → menu)
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TextInput, FlatList,
  KeyboardAvoidingView, Platform, SafeAreaView, Modal, Image,
  Animated, Easing, Vibration, TouchableWithoutFeedback, Keyboard,
  PanResponder, Pressable, ScrollView, ActivityIndicator
} from 'react-native';
import { AppTouchableOpacity as TouchableOpacity } from '../components/common/AppTouchable';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import { playButtonSound } from '../utils/soundManager';
import {
  RTCPeerConnection, RTCIceCandidate, RTCSessionDescription,
  RTCView, mediaDevices, isAvailable as isWebRTCAvailable
} from '../services/webrtc';
import { API_URL } from '../config';
import socket from '../services/socket';
import { AudioController } from '../utils/AudioController';
import { getResponsiveSize, isTablet, SCREEN_WIDTH, SCREEN_HEIGHT } from '../utils/responsive';
import { appAlert } from '../services/appAlert';
import { T } from '../utils/theme';
import { useTranslation } from 'react-i18next';

const width = SCREEN_WIDTH;
const height = SCREEN_HEIGHT;
const INPUT_BORDER_W = Math.max(1, Math.round(getResponsiveSize(1)));

const QUICK_MESSAGE_KEYS = ["quick_gg", "quick_good_game", "quick_well_played", "quick_see_you"];

// ─────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────
const REACTION_EMOJIS = ['❤️', '😂', '😮', '😢', '🔥', '👍'];
const GROUP_THRESHOLD_MS = 2 * 60 * 1000; // 2 min

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────
function formatDuration(seconds) {
  const s = Math.floor(seconds);
  const m = Math.floor(s / 60);
  return `${m}:${(s % 60).toString().padStart(2, '0')}`;
}

function isSameGroup(a, b, myId) {
  if (!a || !b) return false;
  const sameUser =
    (a.sender === b.sender) ||
    (a.sender?._id && a.sender._id === b.sender?._id);
  const timeDiff = new Date(b.createdAt) - new Date(a.createdAt);
  return sameUser && timeDiff < GROUP_THRESHOLD_MS;
}

// ─────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────

/** Tick de statut animé */
const StatusTick = ({ status, isMe }) => {
  if (!isMe) return null;
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (status === 'read') {
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.4, duration: 150, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1, duration: 150, useNativeDriver: true }),
      ]).start();
    }
  }, [status]);

  const color = status === 'read' ? '#53bdeb' : 'rgba(255,255,255,0.55)';
  const icon = status === 'read' || status === 'delivered' ? 'checkmark-done' : 'checkmark';

  return (
    <Animated.View style={{ transform: [{ scale }], marginLeft: 3 }}>
      <Ionicons name={icon} size={getResponsiveSize(14)} color={color} />
    </Animated.View>
  );
};

/** Preview du message auquel on répond */
const ReplyPreview = ({ message, onCancel, isMe }) => {
  if (!message) return null;
  return (
    <View style={[
      styles.replyPreviewContainer,
      { borderLeftColor: isMe ? '#53bdeb' : T.gold || '#f1c40f' }
    ]}>
      <View style={{ flex: 1 }}>
        <Text style={styles.replyPreviewName} numberOfLines={1}>
          {message.senderName || 'Message'}
        </Text>
        <Text style={styles.replyPreviewText} numberOfLines={1}>
          {message.type === 'audio' ? '🎤 Message vocal' : message.content}
        </Text>
      </View>
      {onCancel && (
        <TouchableOpacity onPress={onCancel} style={{ padding: 4 }}>
          <Ionicons name="close" size={getResponsiveSize(18)} color={T.textMuted} />
        </TouchableOpacity>
      )}
    </View>
  );
};

/** Bulle de message audio */
const AudioBubble = ({ item, isMe, isPlaying, playbackStatus, onPlay }) => {
  const progressRatio =
    isPlaying && playbackStatus.duration > 0
      ? Math.min(1, playbackStatus.position / playbackStatus.duration)
      : 0;

  return (
    <View style={styles.audioContainer}>
      <TouchableOpacity
        style={[styles.audioPlayButton, {
          backgroundColor: isMe ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.07)'
        }]}
        onPress={onPlay}
      >
        <Ionicons
          name={isPlaying ? 'pause' : 'play'}
          size={getResponsiveSize(20)}
          color={isMe ? '#fff' : '#333'}
          style={{ marginLeft: isPlaying ? 0 : getResponsiveSize(2) }}
        />
      </TouchableOpacity>

      <View style={{ flex: 1, marginLeft: getResponsiveSize(10), justifyContent: 'center' }}>
        {/* Waveform simulé */}
        <View style={styles.waveformRow}>
          {Array.from({ length: 28 }, (_, i) => {
            const h = [3, 6, 10, 8, 14, 12, 18, 10, 8, 6, 16, 20, 14, 10,
              8, 12, 18, 16, 10, 8, 14, 12, 6, 10, 8, 6, 4, 3][i];
            const filled = progressRatio > i / 28;
            return (
              <View
                key={i}
                style={{
                  width: getResponsiveSize(3),
                  height: getResponsiveSize(h),
                  backgroundColor: filled
                    ? (isMe ? '#fff' : '#444')
                    : (isMe ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.15)'),
                  borderRadius: 2,
                  marginHorizontal: 1,
                }}
              />
            );
          })}
        </View>

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
          <Text style={[styles.audioTime, { color: isMe ? 'rgba(255,255,255,0.75)' : 'rgba(0,0,0,0.5)' }]}>
            {isPlaying
              ? formatDuration(playbackStatus.position)
              : formatDuration((item.duration || 0) / 1000)}
          </Text>
        </View>
      </View>
    </View>
  );
};

// ─────────────────────────────────────────────
// MAIN SCREEN
// ─────────────────────────────────────────────
const ChatScreen = ({ route, navigation }) => {
  const { t } = useTranslation();
  const { friendId, friendName, friendAvatar } = route.params;
  const { user, token } = useSelector(state => state.auth);
  const settings = useSelector(state => state.settings || { isMusicEnabled: true, isChatEnabled: true });
  const isChatEnabled = settings.isChatEnabled ?? true;

  // ── Messages ──
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [moderationError, setModerationError] = useState(null);

  // ── Reply ──
  const [replyTo, setReplyTo] = useState(null); // { _id, content, type, senderName }

  // ── Reactions ──
  const [reactionTarget, setReactionTarget] = useState(null); // message._id
  const [reactionMenuPos, setReactionMenuPos] = useState({ x: 0, y: 0 });

  // ── Scroll FAB ──
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [unreadFabCount, setUnreadFabCount] = useState(0);

  // ── Audio playback ──
  const [sound, setSound] = useState(null);
  const [isPlaying, setIsPlaying] = useState(null);
  const [playbackStatus, setPlaybackStatus] = useState({ duration: 0, position: 0 });

  // ── Recording ──
  const [recording, setRecording] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const visualizerBars = useRef([...Array(32)].map(() => new Animated.Value(0.1))).current;
  const recordingDotOpacity = useRef(new Animated.Value(1)).current;

  // ── Status & typing ──
  const [friendStatus, setFriendStatus] = useState(null);
  const [isFriendTyping, setIsFriendTyping] = useState(false);
  const typingTimeoutRef = useRef(null);

  // ── Calls ──
  const [callStatus, setCallStatus] = useState('idle');
  const [callType, setCallType] = useState(null);
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);

  const flatListRef = useRef(null);
  const callTimerRef = useRef(null);
  const peerConnection = useRef(null);
  const pendingCandidates = useRef([]);
  const inputRef = useRef(null);
  const isAtBottomRef = useRef(true);

  // ─────────────────────────────────────────────
  // LIFECYCLE
  // ─────────────────────────────────────────────
  useEffect(() => {
    AudioController.notifyChatEnter();
    fetchMessages();
    markMessagesAsRead();
    setupSocket();
    fetchFriendStatus();

    (async () => {
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
    })();

    return () => {
      AudioController.notifyChatExit(settings.isMusicEnabled);
      sound?.unloadAsync();
      endCallCleanup();
      ['receive_message', 'messages_read', 'message_delivered_receipt',
        'incoming_call', 'call_accepted', 'call_ended', 'ice_candidate',
        'friend_status_updated', 'friend_typing', 'message_reaction_updated',
        'message_deleted'].forEach(ev => socket.off(ev));
    };
  }, []);

  // Blinking dot for recording
  useEffect(() => {
    if (isRecording) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(recordingDotOpacity, { toValue: 0.2, duration: 700, useNativeDriver: true }),
          Animated.timing(recordingDotOpacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        ])
      ).start();
    } else {
      recordingDotOpacity.setValue(1);
    }
  }, [isRecording]);

  // ─────────────────────────────────────────────
  // STATUS
  // ─────────────────────────────────────────────
  const getStatusInfo = useCallback((isOnline, lastSeen) => {
    if (isOnline) return { color: '#25d366', text: t('chat.status_online') };
    if (!lastSeen) return { color: '#8696a0', text: t('chat.status_offline') };

    const diff = Date.now() - new Date(lastSeen);
    const s = Math.floor(diff / 1000);
    const m = Math.floor(s / 60);
    const h = Math.floor(m / 60);
    const d = Math.floor(h / 24);

    if (s < 60) return { color: '#f1c40f', text: t('chat.last_seen_seconds', { count: s }) };
    if (m < 60) return { color: '#8696a0', text: t('chat.last_seen_minutes', { count: m }) };
    if (h < 24) return { color: '#8696a0', text: t('chat.last_seen_hours', { count: h }) };
    if (d < 7) return { color: '#8696a0', text: t('chat.last_seen_days', { count: d }) };
    return { color: '#8696a0', text: t('chat.last_seen_weeks', { count: Math.floor(d / 7) }) };
  }, [t]);

  const fetchFriendStatus = async () => {
    try {
      const res = await fetch(`${API_URL}/users/${friendId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setFriendStatus({ isOnline: data.isOnline, lastSeen: data.lastSeen });
      }
    } catch (_) {}
  };

  // ─────────────────────────────────────────────
  // MESSAGES
  // ─────────────────────────────────────────────
  const fetchMessages = async () => {
    try {
      const res = await fetch(`${API_URL}/chat/${friendId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setMessages(data);
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: false }), 100);
      }
    } catch (_) {}
    finally { setIsLoading(false); }
  };

  const markMessagesAsRead = async () => {
    try {
      await fetch(`${API_URL}/chat/read`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ friendId })
      });
    } catch (_) {}
  };

  // ─────────────────────────────────────────────
  // SOCKET
  // ─────────────────────────────────────────────
  const setupSocket = () => {
    socket.on('receive_message', (message) => {
      if (message.sender !== friendId && message.recipient !== friendId) return;

      setMessages(prev => {
        // avoid duplicates
        if (prev.find(m => m._id === message._id)) return prev;
        return [...prev, message];
      });

      if (isAtBottomRef.current) {
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 50);
      } else {
        setUnreadFabCount(c => c + 1);
        setShowScrollBtn(true);
      }

      if (message.sender === friendId) {
        socket.emit('message_delivered', { messageId: message._id, senderId: message.sender });
        markMessagesAsRead();
      }
    });

    socket.on('message_delivered_receipt', ({ messageId }) => {
      setMessages(prev => prev.map(m =>
        m._id === messageId && m.status !== 'read' ? { ...m, status: 'delivered' } : m
      ));
    });

    socket.on('messages_read', ({ readerId }) => {
      if (readerId !== friendId) return;
      setMessages(prev => prev.map(m =>
        (m.sender === user._id || m.sender?._id === user._id)
          ? { ...m, status: 'read', read: true }
          : m
      ));
    });

    socket.on('friend_status_updated', ({ userId }) => {
      if (userId === friendId) fetchFriendStatus();
    });

    socket.on('friend_typing', ({ friendId: tid, isTyping }) => {
      if (tid === friendId) setIsFriendTyping(isTyping);
    });

    socket.on('message_reaction_updated', ({ messageId, reactions }) => {
      setMessages(prev => prev.map(m =>
        m._id === messageId ? { ...m, reactions } : m
      ));
    });

    socket.on('message_deleted', ({ messageId }) => {
      setMessages(prev => prev.map(m =>
        m._id === messageId ? { ...m, deleted: true, content: '' } : m
      ));
    });

    // Call signaling
    socket.on('incoming_call', (data) => {
      if (data.from !== friendId) return;
      setCallType(data.type);
      setCallStatus('incoming');
      socket.incomingSignal = data.signal;
    });

    socket.on('call_accepted', async (signal) => {
      setCallStatus('connected');
      startCallTimer();
      if (peerConnection.current) {
        try {
          await peerConnection.current.setRemoteDescription(new RTCSessionDescription(signal));
          while (pendingCandidates.current.length > 0)
            await peerConnection.current.addIceCandidate(pendingCandidates.current.shift());
        } catch (_) {}
      }
    });

    socket.on('ice_candidate', async (candidate) => {
      if (peerConnection.current?.remoteDescription) {
        try { await peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate)); }
        catch (_) {}
      } else {
        pendingCandidates.current.push(new RTCIceCandidate(candidate));
      }
    });

    socket.on('call_ended', () => {
      endCallCleanup();
      addInfoMessage(t('chat.call_ended'));
    });
  };

  const addInfoMessage = (content) => {
    setMessages(prev => [...prev, {
      _id: `info_${Date.now()}`,
      type: 'info',
      content,
      createdAt: new Date().toISOString()
    }]);
  };

  // ─────────────────────────────────────────────
  // SEND MESSAGE
  // ─────────────────────────────────────────────
  const handleInputChange = (text) => {
    setInputText(text);
    socket.emit('typing', { recipientId: friendId, isTyping: text.length > 0 });
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(
      () => socket.emit('typing', { recipientId: friendId, isTyping: false }), 3000
    );
  };

  const handleSendMessage = async (customContent = null) => {
    const trimmed = (customContent || inputText).trim();
    if (!trimmed) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const tempId = `temp_${Date.now()}`;
    const tempMsg = {
      _id: tempId,
      sender: user._id,
      content: trimmed,
      type: 'text',
      status: 'sent',
      createdAt: new Date().toISOString(),
      replyTo: replyTo ? { _id: replyTo._id, content: replyTo.content, type: replyTo.type } : null,
    };

    setMessages(prev => [...prev, tempMsg]);
    if (!customContent) setInputText('');
    setReplyTo(null);
    setModerationError(null);
    socket.emit('typing', { recipientId: friendId, isTyping: false });
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 50);

    try {
      const res = await fetch(`${API_URL}/chat/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          recipientId: friendId,
          content: trimmed,
          type: 'text',
          replyTo: replyTo?._id
        })
      });
      const data = await res.json();

      if (res.ok) {
        setMessages(prev => prev.map(m => m._id === tempId ? data : m));
      } else {
        if (data.error === 'MESSAGE_BLOCKED') {
          setModerationError(t('chat.message_blocked') || "Message non envoyé : contenu inapproprié.");
          setTimeout(() => setModerationError(null), 4000);
          setMessages(prev => prev.filter(m => m._id !== tempId));
        } else {
          setMessages(prev => prev.map(m =>
            m._id === tempId ? { ...m, sendError: true } : m
          ));
        }
      }
    } catch (_) {
      setMessages(prev => prev.map(m =>
        m._id === tempId ? { ...m, sendError: true } : m
      ));
    }
  };

  // ─────────────────────────────────────────────
  // REACTIONS
  // ─────────────────────────────────────────────
  const handleLongPress = (item, event) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const { pageY, pageX } = event.nativeEvent;
    setReactionMenuPos({ x: pageX, y: pageY });
    setReactionTarget(item._id);
  };

  const sendReaction = async (emoji) => {
    const messageId = reactionTarget;
    setReactionTarget(null);

    // Optimistic update
    setMessages(prev => prev.map(m => {
      if (m._id !== messageId) return m;
      const reactions = { ...(m.reactions || {}) };
      if (reactions[emoji]?.includes(user._id)) {
        reactions[emoji] = reactions[emoji].filter(id => id !== user._id);
        if (!reactions[emoji].length) delete reactions[emoji];
      } else {
        reactions[emoji] = [...(reactions[emoji] || []), user._id];
      }
      return { ...m, reactions };
    }));

    try {
      await fetch(`${API_URL}/chat/react`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ messageId, emoji, recipientId: friendId })
      });
    } catch (_) {}
  };

  // ─────────────────────────────────────────────
  // AUDIO RECORDING
  // ─────────────────────────────────────────────
  const updateVisualizer = (meteringDb) => {
    const normalized = Math.max(0, (meteringDb + 160) / 160);
    visualizerBars.forEach((anim, i) => {
      const center = Math.abs(i - 16) / 16;
      const target = (normalized * (1 - center * 0.4) * 0.8) + Math.random() * 0.2;
      Animated.timing(anim, { toValue: Math.max(0.05, target), duration: 80, useNativeDriver: false }).start();
    });
  };

  const startRecording = async () => {
    try {
      const perm = await Audio.requestPermissionsAsync();
      if (perm.status !== 'granted') return;

      await AudioController.stopHomeMusic();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });

      const { recording: rec } = await Audio.Recording.createAsync(
        { ...Audio.RecordingOptionsPresets.HIGH_QUALITY, isMeteringEnabled: true },
        (status) => {
          setRecordingDuration(Math.floor(status.durationMillis / 1000));
          if (status.metering !== undefined) updateVisualizer(status.metering);
          if (status.durationMillis >= 120000) sendRecording();
        },
        80
      );

      setRecording(rec);
      setIsRecording(true);
      setRecordingDuration(0);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      console.error('Recording error:', err);
      appAlert(t('common.error'), t('chat.recording_start_failed'));
    }
  };

  const cancelRecording = async () => {
    if (!recording) return;
    await recording.stopAndUnloadAsync().catch(() => {});
    setRecording(null);
    setIsRecording(false);
    setRecordingDuration(0);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const sendRecording = async () => {
    if (!recording) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsRecording(false);

    try {
      const status = await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);
      setRecordingDuration(0);

      const formData = new FormData();
      formData.append('audio', { uri, type: 'audio/m4a', name: 'voice_message.m4a' });

      const uploadRes = await fetch(`${API_URL}/chat/upload-audio`, {
        method: 'POST',
        headers: { 'Content-Type': 'multipart/form-data', Authorization: `Bearer ${token}` },
        body: formData
      });
      const uploadData = await uploadRes.json();

      if (!uploadRes.ok) throw new Error('Upload failed');

      const sendRes = await fetch(`${API_URL}/chat/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          recipientId: friendId,
          content: t('chat.voice_message'),
          type: 'audio',
          audioUri: uploadData.url,
          duration: status.durationMillis
        })
      });

      const sentMsg = await sendRes.json();
      if (sendRes.ok) {
        setMessages(prev => [...prev, sentMsg]);
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 50);
      }
    } catch (err) {
      console.error('Voice send error:', err);
      appAlert(t('common.error'), t('chat.voice_message_send_failed'));
    }
  };

  // ─────────────────────────────────────────────
  // AUDIO PLAYBACK
  // ─────────────────────────────────────────────
  const resolveAudioUrl = (item) => {
    const url = item.audioUri || item.audio_url || item.mediaUrl || item.url || null;
    if (!url) return null;
    return url.startsWith('/') ? `${API_URL}${url}` : url;
  };

  const playSound = async (uri, messageId) => {
    if (!uri || !uri.startsWith('http')) {
      appAlert(t('common.error'), t('chat.audio_invalid_url'));
      return;
    }
    try {
      if (sound) {
        try { await sound.stopAsync(); await sound.unloadAsync(); } catch (_) {}
        setSound(null);
        if (isPlaying === messageId) { setIsPlaying(null); return; }
      }

      await Audio.setAudioModeAsync({ allowsRecordingIOS: false, playsInSilentModeIOS: true });
      const { sound: ns } = await Audio.Sound.createAsync({ uri }, { shouldPlay: true });
      setSound(ns);
      setIsPlaying(messageId);

      ns.setOnPlaybackStatusUpdate((s) => {
        if (s.isLoaded) {
          setPlaybackStatus({ duration: (s.durationMillis || 0) / 1000, position: (s.positionMillis || 0) / 1000 });
          if (s.didJustFinish) { setIsPlaying(null); setPlaybackStatus({ duration: 0, position: 0 }); }
        }
      });
    } catch (_) {
      setIsPlaying(null);
      appAlert(t('common.error'), t('chat.audio_playback_failed'));
    }
  };

  // ─────────────────────────────────────────────
  // DELETE MESSAGE
  // ─────────────────────────────────────────────
  const deleteMessage = async (messageId) => {
    try {
      const res = await fetch(`${API_URL}/chat/message/${messageId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setMessages(prev => prev.map(m =>
          m._id === messageId ? { ...m, deleted: true, content: '' } : m
        ));
      }
    } catch (_) {}
  };

  // ─────────────────────────────────────────────
  // CALLS
  // ─────────────────────────────────────────────
  const getStream = async (type) => {
    if (!isWebRTCAvailable) return null;
    const stream = await mediaDevices.getUserMedia({
      audio: true,
      video: type === 'video' ? { facingMode: 'user', mandatory: { minWidth: 500, minHeight: 300, minFrameRate: 30 } } : false
    });
    if (stream) { setLocalStream(stream); return stream; }
  };

  const createPeerConnection = async () => {
    const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
    pc.onicecandidate = (e) => e.candidate && socket.emit('ice_candidate', { to: friendId, candidate: e.candidate });
    pc.onaddstream = (e) => setRemoteStream(e.stream);
    peerConnection.current = pc;
    return pc;
  };

  const startCallTimer = () => {
    callTimerRef.current && clearInterval(callTimerRef.current);
    setCallDuration(0);
    callTimerRef.current = setInterval(() => setCallDuration(d => d + 1), 1000);
  };

  const initiateCall = async (type) => {
    setCallType(type); setCallStatus('calling');
    try {
      const stream = await getStream(type);
      const pc = await createPeerConnection();
      if (stream) pc.addStream(stream);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit('call_user', { userToCall: friendId, signalData: offer, from: user._id, name: user.pseudo, avatar: user.avatar, type });
    } catch (_) { endCallCleanup(); }
  };

  const acceptCall = async () => {
    try {
      const stream = await getStream(callType);
      const pc = await createPeerConnection();
      if (stream) pc.addStream(stream);
      await pc.setRemoteDescription(new RTCSessionDescription(socket.incomingSignal));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit('answer_call', { signal: answer, to: friendId });
      setCallStatus('connected'); startCallTimer();
      while (pendingCandidates.current.length)
        await pc.addIceCandidate(pendingCandidates.current.shift());
    } catch (_) { endCallCleanup(); }
  };

  const endCall = () => {
    socket.emit('end_call', { to: friendId });
    addInfoMessage(t('chat.call_ended_with_duration', {
      type: callType === 'video' ? t('chat.call_type_video') : t('chat.call_type_audio'),
      duration: formatDuration(callDuration)
    }));
    endCallCleanup();
  };

  const endCallCleanup = () => {
    peerConnection.current?.close(); peerConnection.current = null;
    localStream?.getTracks().forEach(t => t.stop()); setLocalStream(null);
    setRemoteStream(null);
    callTimerRef.current && clearInterval(callTimerRef.current);
    setCallStatus('idle'); setCallDuration(0); setIsMuted(false); setIsCameraOff(false);
    Audio.setAudioModeAsync({ allowsRecordingIOS: false, playsInSilentModeIOS: true }).catch(() => {});
  };

  const toggleMute = () => {
    localStream?.getAudioTracks().forEach(t => { t.enabled = !t.enabled; });
    setIsMuted(m => !m);
  };

  const toggleCamera = () => {
    localStream?.getVideoTracks().forEach(t => { t.enabled = !t.enabled; });
    setIsCameraOff(c => !c);
  };

  // ─────────────────────────────────────────────
  // RENDERERS
  // ─────────────────────────────────────────────
  const renderMessage = useCallback(({ item, index }) => {
    const myId = user?._id || user?.id;
    const isMe = item.sender === myId || item.sender?._id === myId;

    // Date separator
    let showDate = index === 0;
    let dateLabel = '';
    if (!showDate && index > 0) {
      const prev = messages[index - 1];
      showDate = new Date(item.createdAt).toDateString() !== new Date(prev.createdAt).toDateString();
    }
    if (showDate) {
      const d = new Date(item.createdAt);
      const today = new Date();
      const yesterday = new Date(); yesterday.setDate(today.getDate() - 1);
      dateLabel = d.toDateString() === today.toDateString()
        ? (t('chat.today') || "Aujourd'hui")
        : d.toDateString() === yesterday.toDateString()
          ? (t('chat.yesterday') || 'Hier')
          : d.toLocaleDateString(undefined, { day: 'numeric', month: 'long' });
    }

    // Grouping
    const prevMsg = messages[index - 1];
    const nextMsg = messages[index + 1];
    const isGroupFirst = !isSameGroup(prevMsg, item);
    const isGroupLast = !isSameGroup(item, nextMsg);

    // Border radius WhatsApp style
    const br = getResponsiveSize(16);
    const bubbleRadius = isMe ? {
      borderTopLeftRadius: br,
      borderTopRightRadius: isGroupFirst ? br : getResponsiveSize(4),
      borderBottomLeftRadius: br,
      borderBottomRightRadius: isGroupLast ? getResponsiveSize(4) : getResponsiveSize(4),
    } : {
      borderTopLeftRadius: isGroupFirst ? br : getResponsiveSize(4),
      borderTopRightRadius: br,
      borderBottomLeftRadius: isGroupLast ? getResponsiveSize(4) : getResponsiveSize(4),
      borderBottomRightRadius: br,
    };

    if (item.type === 'info') {
      return (
        <View style={styles.infoMessage}>
          <Text style={styles.infoText}>{item.content}</Text>
        </View>
      );
    }

    const reactions = item.reactions || {};
    const reactionEntries = Object.entries(reactions).filter(([, ids]) => ids.length > 0);

    return (
      <View key={item._id}>
        {showDate && (
          <View style={styles.dateSeparator}>
            <Text style={styles.dateText}>{dateLabel}</Text>
          </View>
        )}

        <Pressable
          onLongPress={(e) => !item.deleted && handleLongPress(item, e)}
          delayLongPress={400}
          style={[
            styles.bubbleRow,
            isMe ? styles.bubbleRowMe : styles.bubbleRowThem,
            { marginBottom: isGroupLast ? getResponsiveSize(6) : getResponsiveSize(2) }
          ]}
        >
          {/* Avatar (only last in group, for friend) */}
          {!isMe && (
            <View style={{ width: getResponsiveSize(28), marginRight: getResponsiveSize(6), alignSelf: 'flex-end' }}>
              {isGroupLast ? (
                <Image
                  source={friendAvatar ? { uri: friendAvatar } : { uri: 'https://i.pravatar.cc/150' }}
                  style={styles.messageAvatar}
                />
              ) : null}
            </View>
          )}

          <View style={{ maxWidth: '78%' }}>
            {/* ReplyTo preview inside bubble */}
            {item.replyTo && (
              <View style={[
                styles.inBubbleReply,
                isMe ? styles.inBubbleReplyMe : styles.inBubbleReplyThem
              ]}>
                <Text style={styles.inBubbleReplyText} numberOfLines={1}>
                  {item.replyTo.type === 'audio' ? '🎤 Message vocal' : item.replyTo.content}
                </Text>
              </View>
            )}

            {/* Main bubble */}
            <View style={[
              styles.messageBubble,
              isMe ? styles.myMessage : styles.theirMessage,
              bubbleRadius,
              item.deleted && styles.deletedBubble
            ]}>
              {item.deleted ? (
                <Text style={styles.deletedText}>
                  <Ionicons name="ban-outline" size={getResponsiveSize(13)} /> {t('chat.message_deleted') || 'Message supprimé'}
                </Text>
              ) : item.type === 'audio' ? (
                <AudioBubble
                  item={item}
                  isMe={isMe}
                  isPlaying={isPlaying === item._id}
                  playbackStatus={playbackStatus}
                  onPlay={() => {
                    const url = resolveAudioUrl(item);
                    if (!url) { appAlert(t('common.error'), t('chat.audio_file_not_found')); return; }
                    playSound(url, item._id);
                  }}
                />
              ) : (
                <Text style={isMe ? styles.myText : styles.theirText}>{item.content}</Text>
              )}

              {/* Timestamp + ticks */}
              <View style={styles.timestampContainer}>
                <Text style={[styles.timestamp, { color: isMe ? 'rgba(255,255,255,0.6)' : '#8696a0' }]}>
                  {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
                {item.sendError
                  ? <Ionicons name="alert-circle-outline" size={getResponsiveSize(14)} color="#e74c3c" style={{ marginLeft: 3 }} />
                  : <StatusTick status={item.status} isMe={isMe} />
                }
              </View>
            </View>

            {/* Reactions */}
            {reactionEntries.length > 0 && (
              <View style={[styles.reactionsRow, isMe ? styles.reactionsRowMe : styles.reactionsRowThem]}>
                {reactionEntries.map(([emoji, ids]) => (
                  <TouchableOpacity
                    key={emoji}
                    style={[
                      styles.reactionChip,
                      ids.includes(user._id) && styles.reactionChipMine
                    ]}
                    onPress={() => { setReactionTarget(item._id); sendReaction(emoji); }}
                  >
                    <Text style={styles.reactionEmoji}>{emoji}</Text>
                    {ids.length > 1 && <Text style={styles.reactionCount}>{ids.length}</Text>}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </Pressable>
      </View>
    );
  }, [messages, isPlaying, playbackStatus, user]);

  // Reaction picker modal
  const renderReactionPicker = () => {
    if (!reactionTarget) return null;
    return (
      <TouchableWithoutFeedback onPress={() => setReactionTarget(null)}>
        <View style={StyleSheet.absoluteFillObject}>
          <View style={[
            styles.reactionPicker,
            {
              top: Math.min(reactionMenuPos.y - getResponsiveSize(60), height - getResponsiveSize(100)),
              left: Math.max(getResponsiveSize(10), Math.min(reactionMenuPos.x - getResponsiveSize(120), width - getResponsiveSize(260)))
            }
          ]}>
            {REACTION_EMOJIS.map(emoji => (
              <TouchableOpacity
                key={emoji}
                style={styles.reactionPickerItem}
                onPress={() => sendReaction(emoji)}
              >
                <Text style={styles.reactionPickerEmoji}>{emoji}</Text>
              </TouchableOpacity>
            ))}
            {/* Separator + Reply / Delete */}
            <View style={styles.reactionPickerSeparator} />
            <TouchableOpacity
              style={styles.reactionPickerAction}
              onPress={() => {
                const msg = messages.find(m => m._id === reactionTarget);
                if (msg) setReplyTo({
                  _id: msg._id,
                  content: msg.content,
                  type: msg.type,
                  senderName: msg.sender === (user._id || user.id) ? t('chat.you') : friendName
                });
                setReactionTarget(null);
                inputRef.current?.focus();
              }}
            >
              <Ionicons name="return-up-back-outline" size={getResponsiveSize(18)} color={T.text || '#fff'} />
              <Text style={styles.reactionPickerActionText}>{t('chat.reply') || 'Répondre'}</Text>
            </TouchableOpacity>
            {messages.find(m => m._id === reactionTarget)?.sender === (user._id || user.id) && (
              <TouchableOpacity
                style={styles.reactionPickerAction}
                onPress={() => {
                  appAlert(
                    t('chat.delete_message') || 'Supprimer',
                    t('chat.delete_confirm') || 'Supprimer ce message ?',
                    [
                      { text: t('common.cancel') || 'Annuler', style: 'cancel' },
                      { text: t('common.delete') || 'Supprimer', style: 'destructive', onPress: () => deleteMessage(reactionTarget) }
                    ]
                  );
                  setReactionTarget(null);
                }}
              >
                <Ionicons name="trash-outline" size={getResponsiveSize(18)} color="#e74c3c" />
                <Text style={[styles.reactionPickerActionText, { color: '#e74c3c' }]}>{t('common.delete') || 'Supprimer'}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </TouchableWithoutFeedback>
    );
  };

  // Recording overlay
  const renderRecordingOverlay = () => {
    if (!isRecording) return null;
    return (
      <View style={styles.recordingBar}>
        {/* Cancel */}
        <TouchableOpacity onPress={cancelRecording} style={styles.recCancelBtn}>
          <Ionicons name="trash-outline" size={getResponsiveSize(22)} color="#e74c3c" />
        </TouchableOpacity>

        {/* Waveform + timer */}
        <Animated.View style={{ opacity: recordingDotOpacity, marginHorizontal: getResponsiveSize(8) }}>
          <View style={styles.recDot} />
        </Animated.View>
        <Text style={styles.recTimer}>{formatDuration(recordingDuration)}</Text>

        <View style={styles.recWaveform}>
          {visualizerBars.slice(0, 20).map((anim, i) => (
            <Animated.View
              key={i}
              style={{
                width: getResponsiveSize(3),
                marginHorizontal: 1,
                borderRadius: 2,
                backgroundColor: '#e74c3c',
                height: anim.interpolate({ inputRange: [0, 1], outputRange: [getResponsiveSize(2), getResponsiveSize(24)] })
              }}
            />
          ))}
        </View>

        {/* Send */}
        <TouchableOpacity onPress={sendRecording} style={styles.recSendBtn}>
          <Ionicons name="send" size={getResponsiveSize(20)} color="#fff" />
        </TouchableOpacity>
      </View>
    );
  };

  // Call overlay
  const renderCallOverlay = () => {
    if (callStatus === 'idle') return null;
    const isVideo = callType === 'video';
    return (
      <Modal visible animationType="slide" transparent={false}>
        <View style={styles.callContainer}>
          <View style={styles.videoWrapper}>
            {isVideo ? (
              <>
                {remoteStream
                  ? <RTCView streamURL={remoteStream.toURL()} style={styles.remoteVideo} objectFit="cover" />
                  : <View style={styles.waitingRemote}><Text style={{ color: '#fff' }}>{t('chat.waiting_for_video')}</Text></View>
                }
                {localStream && !isCameraOff && (
                  <View style={styles.localVideoContainer}>
                    <RTCView streamURL={localStream.toURL()} style={styles.localVideo} objectFit="cover" zOrder={1} />
                  </View>
                )}
              </>
            ) : (
              <View style={styles.avatarContainer}>
                <Image source={friendAvatar || { uri: 'https://i.pravatar.cc/150' }} style={styles.callAvatar} />
              </View>
            )}
          </View>

          <View style={styles.callOverlay}>
            <View style={styles.callHeader}>
              <Text style={styles.callName}>{friendName}</Text>
              <Text style={styles.callStatusText}>
                {callStatus === 'calling' ? t('chat.call_in_progress')
                  : callStatus === 'incoming' ? t('chat.call_incoming')
                    : formatDuration(callDuration)}
              </Text>
            </View>
            <View style={styles.callControls}>
              {callStatus === 'incoming' ? (
                <>
                  <TouchableOpacity style={[styles.controlBtn, { backgroundColor: '#e74c3c' }]} onPress={endCall}>
                    <Ionicons name="call" size={getResponsiveSize(32)} color="white" style={{ transform: [{ rotate: '135deg' }] }} />
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.controlBtn, { backgroundColor: '#25d366' }]} onPress={acceptCall}>
                    <Ionicons name="call" size={getResponsiveSize(32)} color="white" />
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <TouchableOpacity style={[styles.controlBtn, isMuted && styles.activeBtnCall]} onPress={toggleMute}>
                    <Ionicons name={isMuted ? 'mic-off' : 'mic'} size={getResponsiveSize(26)} color="white" />
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.controlBtn, styles.endCallBtn]} onPress={endCall}>
                    <Ionicons name="call" size={getResponsiveSize(32)} color="white" style={{ transform: [{ rotate: '135deg' }] }} />
                  </TouchableOpacity>
                  {isVideo && (
                    <TouchableOpacity style={[styles.controlBtn, isCameraOff && styles.activeBtnCall]} onPress={toggleCamera}>
                      <Ionicons name={isCameraOff ? 'videocam-off' : 'videocam'} size={getResponsiveSize(26)} color="white" />
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

  // ─────────────────────────────────────────────
  // HEADER STATUS
  // ─────────────────────────────────────────────
  const statusInfo = friendStatus
    ? getStatusInfo(friendStatus.isOnline, friendStatus.lastSeen)
    : null;

  // ─────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────
  return (
    <TouchableWithoutFeedback onPress={() => { Keyboard.dismiss(); setReactionTarget(null); }}>
      <SafeAreaView style={styles.container}>
        {/* ── Header ── */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={getResponsiveSize(24)} color="#fff" />
          </TouchableOpacity>

          {/* Avatar + name */}
          <TouchableOpacity style={styles.headerCenter} onPress={() => {}}>
            <Image
              source={friendAvatar ? { uri: friendAvatar } : { uri: 'https://i.pravatar.cc/150' }}
              style={styles.headerAvatar}
            />
            <View style={{ marginLeft: getResponsiveSize(10) }}>
              <Text style={styles.headerName}>{friendName}</Text>
              {isFriendTyping ? (
                <Text style={styles.typingText}>{t('chat.typing') || "En train d'écrire…"}</Text>
              ) : statusInfo ? (
                <Text style={[styles.headerStatus, { color: statusInfo.color }]}>{statusInfo.text}</Text>
              ) : (
                <ActivityIndicator size="small" color={T.textMuted} style={{ alignSelf: 'flex-start' }} />
              )}
            </View>
          </TouchableOpacity>

          <View style={styles.headerIcons}>
            <TouchableOpacity onPress={() => initiateCall('audio')} style={styles.headerIcon}>
              <Ionicons name="call" size={getResponsiveSize(21)} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => initiateCall('video')} style={styles.headerIcon}>
              <Ionicons name="videocam" size={getResponsiveSize(21)} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Messages ── */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={T.gold || '#f1c40f'} />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={item => item._id}
            renderItem={renderMessage}
            contentContainerStyle={styles.listContent}
            onContentSizeChange={() => {
              if (isAtBottomRef.current) flatListRef.current?.scrollToEnd({ animated: false });
            }}
            onScroll={(e) => {
              const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
              const distFromBottom = contentSize.height - contentOffset.y - layoutMeasurement.height;
              const atBottom = distFromBottom < 80;
              isAtBottomRef.current = atBottom;
              setShowScrollBtn(!atBottom);
              if (atBottom) { setUnreadFabCount(0); markMessagesAsRead(); }
            }}
            scrollEventThrottle={100}
            keyboardDismissMode="interactive"
            keyboardShouldPersistTaps="handled"
          />
        )}

        {/* ── Scroll-to-bottom FAB ── */}
        {showScrollBtn && (
          <TouchableOpacity
            style={styles.scrollFab}
            onPress={() => {
              flatListRef.current?.scrollToEnd({ animated: true });
              setShowScrollBtn(false);
              setUnreadFabCount(0);
              markMessagesAsRead();
            }}
          >
            <Ionicons name="chevron-down" size={getResponsiveSize(22)} color="#fff" />
            {unreadFabCount > 0 && (
              <View style={styles.fabBadge}>
                <Text style={styles.fabBadgeText}>{unreadFabCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        )}

        {/* ── Input area ── */}
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          {/* Moderation Error */}
          {moderationError && (
            <View style={styles.moderationErrorContainer}>
              <Text style={styles.moderationErrorText}>{moderationError}</Text>
            </View>
          )}

          {/* Reply preview */}
          {replyTo && (
            <ReplyPreview
              message={replyTo}
              onCancel={() => setReplyTo(null)}
            />
          )}

          {!isChatEnabled ? (
            <View style={styles.disabledChatContainer}>
              <Ionicons name="chatbubble-outline" size={20} color={T.textDim} />
              <Text style={styles.disabledChatText}>{t('chat.chat_disabled') || "Chat désactivé"}</Text>
            </View>
          ) : isRecording
            ? renderRecordingOverlay()
            : (
              <View style={styles.inputAreaWrapper}>
                {/* Quick Messages */}
                <View style={styles.quickMessagesContainer}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickMessagesScroll}>
                    {QUICK_MESSAGE_KEYS.map(key => (
                      <TouchableOpacity 
                        key={key} 
                        style={styles.quickChip} 
                        onPress={() => handleSendMessage(t(`chat.${key}`))}
                      >
                        <Text style={styles.quickChipText}>{t(`chat.${key}`)}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                <View style={styles.inputContainer}>
                  <TextInput
                    ref={inputRef}
                    style={[styles.input, isInputFocused && styles.inputFocused]}
                    placeholder={t('chat.message_placeholder') || 'Message…'}
                    placeholderTextColor="#8696a0"
                    value={inputText}
                    onChangeText={handleInputChange}
                    multiline
                    maxLength={2000}
                    onFocus={() => setIsInputFocused(true)}
                    onBlur={() => setIsInputFocused(false)}
                  />
                  {inputText.trim().length > 0 ? (
                    <TouchableOpacity style={styles.sendBtn} onPress={() => handleSendMessage()}>
                      <Ionicons name="send" size={getResponsiveSize(20)} color="#fff" />
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity style={styles.micBtn} onPress={startRecording}>
                      <Ionicons name="mic" size={getResponsiveSize(22)} color="#fff" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            )
          }
        </KeyboardAvoidingView>

        {/* Overlays */}
        {renderReactionPicker()}
        {renderCallOverlay()}
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
};

// ─────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg1 },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: getResponsiveSize(10),
    paddingVertical: getResponsiveSize(10),
    backgroundColor: T.bg1,
    borderBottomWidth: 1, borderBottomColor: T.borderSoft,
  },
  backBtn: { padding: getResponsiveSize(6) },
  headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', marginLeft: getResponsiveSize(4) },
  headerAvatar: {
    width: getResponsiveSize(40), height: getResponsiveSize(40),
    borderRadius: getResponsiveSize(20),
    borderWidth: 1.5, borderColor: T.borderSoft
  },
  headerName: { color: T.text, fontSize: getResponsiveSize(16), fontWeight: '700' },
  headerStatus: { fontSize: getResponsiveSize(11), marginTop: 1 },
  typingText: { color: '#25d366', fontSize: getResponsiveSize(11), fontStyle: 'italic' },
  headerIcons: { flexDirection: 'row' },
  headerIcon: { marginLeft: getResponsiveSize(16) },

  // List
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: {
    paddingHorizontal: getResponsiveSize(10),
    paddingBottom: getResponsiveSize(10),
    paddingTop: getResponsiveSize(8),
    flexGrow: 1,
  },

  // Messages
  bubbleRow: { flexDirection: 'row', alignItems: 'flex-end' },
  bubbleRowMe: { justifyContent: 'flex-end' },
  bubbleRowThem: { justifyContent: 'flex-start' },
  messageAvatar: {
    width: getResponsiveSize(28), height: getResponsiveSize(28),
    borderRadius: getResponsiveSize(14),
  },
  messageBubble: {
    paddingHorizontal: getResponsiveSize(11),
    paddingTop: getResponsiveSize(7),
    paddingBottom: getResponsiveSize(5),
    maxWidth: '100%',
  },
  myMessage: { backgroundColor: '#005c4b' }, // WhatsApp dark green
  theirMessage: { backgroundColor: T.bg3 || '#1f2c34', borderWidth: 1, borderColor: T.borderSoft },
  deletedBubble: { backgroundColor: 'transparent', borderWidth: 1, borderColor: T.borderSoft, borderStyle: 'dashed' },
  deletedText: { color: T.textMuted, fontSize: getResponsiveSize(13), fontStyle: 'italic' },
  myText: { color: '#e9edef', fontSize: getResponsiveSize(14.5), lineHeight: getResponsiveSize(20) },
  theirText: { color: T.text, fontSize: getResponsiveSize(14.5), lineHeight: getResponsiveSize(20) },
  timestampContainer: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-end', marginTop: getResponsiveSize(3) },
  timestamp: { fontSize: getResponsiveSize(10) },

  // In-bubble reply
  inBubbleReply: {
    paddingHorizontal: getResponsiveSize(8),
    paddingVertical: getResponsiveSize(4),
    borderRadius: getResponsiveSize(8),
    marginBottom: getResponsiveSize(5),
    borderLeftWidth: 3,
  },
  inBubbleReplyMe: { backgroundColor: 'rgba(255,255,255,0.08)', borderLeftColor: '#53bdeb' },
  inBubbleReplyThem: { backgroundColor: 'rgba(0,0,0,0.1)', borderLeftColor: T.gold || '#f1c40f' },
  inBubbleReplyText: { color: T.textMuted, fontSize: getResponsiveSize(12) },

  // Reactions
  reactionsRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: getResponsiveSize(3), gap: 4 },
  reactionsRowMe: { justifyContent: 'flex-end' },
  reactionsRowThem: { justifyContent: 'flex-start' },
  reactionChip: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: T.bg3 || '#1f2c34',
    borderRadius: getResponsiveSize(12),
    paddingHorizontal: getResponsiveSize(6),
    paddingVertical: getResponsiveSize(2),
    borderWidth: 1, borderColor: T.borderSoft,
  },
  reactionChipMine: { borderColor: T.gold || '#f1c40f' },
  reactionEmoji: { fontSize: getResponsiveSize(14) },
  reactionCount: { color: T.textMuted, fontSize: getResponsiveSize(11), marginLeft: 2 },

  // Info message
  infoMessage: { alignSelf: 'center', backgroundColor: 'rgba(255,255,255,0.06)', paddingHorizontal: getResponsiveSize(12), paddingVertical: getResponsiveSize(4), borderRadius: getResponsiveSize(12), marginVertical: getResponsiveSize(8) },
  infoText: { color: T.textMuted, fontSize: getResponsiveSize(11) },

  // Date separator
  dateSeparator: { alignItems: 'center', marginVertical: getResponsiveSize(12) },
  dateText: { color: T.textMuted, fontSize: getResponsiveSize(11.5), fontWeight: '600', backgroundColor: 'rgba(255,255,255,0.06)', paddingHorizontal: getResponsiveSize(10), paddingVertical: getResponsiveSize(3), borderRadius: getResponsiveSize(10) },

  // Audio
  audioContainer: { flexDirection: 'row', alignItems: 'center', minWidth: getResponsiveSize(160), paddingVertical: getResponsiveSize(3) },
  audioPlayButton: { width: getResponsiveSize(38), height: getResponsiveSize(38), borderRadius: getResponsiveSize(19), justifyContent: 'center', alignItems: 'center' },
  waveformRow: { flexDirection: 'row', alignItems: 'center', height: getResponsiveSize(28) },
  audioTime: { fontSize: getResponsiveSize(11), fontVariant: ['tabular-nums'] },

  // Scroll FAB
  scrollFab: {
    position: 'absolute', right: getResponsiveSize(16), bottom: getResponsiveSize(72),
    width: getResponsiveSize(40), height: getResponsiveSize(40), borderRadius: getResponsiveSize(20),
    backgroundColor: T.bg3 || '#1f2c34',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.4, shadowRadius: 4, elevation: 6,
    borderWidth: 1, borderColor: T.borderSoft,
  },
  fabBadge: {
    position: 'absolute', top: getResponsiveSize(-6), right: getResponsiveSize(-6),
    backgroundColor: '#25d366', borderRadius: getResponsiveSize(10),
    minWidth: getResponsiveSize(18), height: getResponsiveSize(18),
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: 2,
  },
  fabBadgeText: { color: '#fff', fontSize: getResponsiveSize(10), fontWeight: '700' },

  // Input
  inputContainer: {
    flexDirection: 'row', alignItems: 'flex-end',
    paddingHorizontal: getResponsiveSize(10), paddingVertical: getResponsiveSize(8),
    backgroundColor: T.bg1, borderTopWidth: 1, borderTopColor: T.borderSoft,
    gap: getResponsiveSize(8),
  },
  input: {
    flex: 1,
    backgroundColor: T.bg2 || '#1f2c34',
    color: T.text, borderRadius: getResponsiveSize(22),
    paddingHorizontal: getResponsiveSize(16), paddingVertical: getResponsiveSize(10),
    maxHeight: getResponsiveSize(120), fontSize: getResponsiveSize(15),
    borderWidth: INPUT_BORDER_W, borderColor: T.cyanBorder,
  },
  inputFocused: {
    borderColor: T.cyan,
  },
  sendBtn: {
    width: getResponsiveSize(44), height: getResponsiveSize(44),
    borderRadius: getResponsiveSize(22), backgroundColor: '#005c4b',
    justifyContent: 'center', alignItems: 'center',
  },
  micBtn: {
    width: getResponsiveSize(44), height: getResponsiveSize(44),
    borderRadius: getResponsiveSize(22), backgroundColor: T.blue || '#3b82f6',
    justifyContent: 'center', alignItems: 'center',
  },

  // Reply preview (above input)
  replyPreviewContainer: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: getResponsiveSize(14), paddingVertical: getResponsiveSize(8),
    backgroundColor: T.bg2 || '#1f2c34',
    borderTopWidth: 1, borderTopColor: T.borderSoft,
    borderLeftWidth: 3,
  },
  replyPreviewName: { color: T.gold || '#f1c40f', fontSize: getResponsiveSize(12), fontWeight: '700', marginBottom: 2 },
  replyPreviewText: { color: T.textMuted, fontSize: getResponsiveSize(12) },

  // Recording bar
  recordingBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: getResponsiveSize(10), paddingVertical: getResponsiveSize(10),
    backgroundColor: T.bg1, borderTopWidth: 1, borderTopColor: T.borderSoft, gap: getResponsiveSize(8),
  },
  recCancelBtn: { padding: getResponsiveSize(8) },
  recDot: { width: getResponsiveSize(8), height: getResponsiveSize(8), borderRadius: 4, backgroundColor: '#e74c3c' },
  recTimer: { color: '#e74c3c', fontSize: getResponsiveSize(14), fontWeight: '600', fontVariant: ['tabular-nums'], minWidth: getResponsiveSize(38) },
  recWaveform: { flex: 1, flexDirection: 'row', alignItems: 'center', height: getResponsiveSize(28), justifyContent: 'center' },
  recSendBtn: {
    width: getResponsiveSize(40), height: getResponsiveSize(40), borderRadius: getResponsiveSize(20),
    backgroundColor: '#25d366', justifyContent: 'center', alignItems: 'center',
  },

  // Reaction picker
  reactionPicker: {
    position: 'absolute', zIndex: 9999,
    backgroundColor: T.bg2 || '#1f2c34',
    borderRadius: getResponsiveSize(16),
    paddingHorizontal: getResponsiveSize(8), paddingVertical: getResponsiveSize(8),
    flexDirection: 'column',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 10,
    borderWidth: 1, borderColor: T.borderSoft,
    minWidth: getResponsiveSize(200),
  },
  reactionPickerEmojisRow: { flexDirection: 'row', justifyContent: 'center', marginBottom: getResponsiveSize(8) },
  reactionPickerItem: { padding: getResponsiveSize(8) },
  reactionPickerEmoji: { fontSize: getResponsiveSize(26) },
  reactionPickerSeparator: { height: 1, backgroundColor: T.borderSoft, marginVertical: getResponsiveSize(4) },
  reactionPickerAction: {
    flexDirection: 'row', alignItems: 'center', gap: getResponsiveSize(10),
    paddingVertical: getResponsiveSize(8), paddingHorizontal: getResponsiveSize(4),
  },
  reactionPickerActionText: { color: T.text, fontSize: getResponsiveSize(14) },

  // Call
  callContainer: { flex: 1, backgroundColor: '#000' },
  videoWrapper: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' },
  remoteVideo: { width, height, position: 'absolute', top: 0, left: 0 },
  localVideoContainer: {
    position: 'absolute', top: getResponsiveSize(50), right: getResponsiveSize(16),
    width: getResponsiveSize(90), height: getResponsiveSize(130),
    borderRadius: getResponsiveSize(10), overflow: 'hidden',
    borderWidth: 1.5, borderColor: '#fff', backgroundColor: '#333',
  },
  localVideo: { flex: 1 },
  waitingRemote: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  avatarContainer: { alignItems: 'center' },
  callAvatar: { width: getResponsiveSize(120), height: getResponsiveSize(120), borderRadius: getResponsiveSize(60), borderWidth: 3, borderColor: '#fff' },
  callOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'space-between',
    paddingVertical: getResponsiveSize(50), paddingHorizontal: getResponsiveSize(20),
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  callHeader: { alignItems: 'center', marginTop: getResponsiveSize(40) },
  callName: { color: '#fff', fontSize: getResponsiveSize(26), fontWeight: '700' },
  callStatusText: { color: '#eee', fontSize: getResponsiveSize(15), marginTop: 4 },
  callControls: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', marginBottom: getResponsiveSize(16) },
  controlBtn: {
    width: getResponsiveSize(56), height: getResponsiveSize(56), borderRadius: getResponsiveSize(28),
    backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center',
  },
  endCallBtn: { backgroundColor: '#e74c3c', width: getResponsiveSize(68), height: getResponsiveSize(68), borderRadius: getResponsiveSize(34) },
  activeBtnCall: { backgroundColor: 'rgba(255,255,255,0.8)' },

  // Moderation & Quick Messages
  moderationErrorContainer: {
    backgroundColor: 'rgba(231, 76, 60, 0.1)',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderTopWidth: 1,
    borderTopColor: 'rgba(231, 76, 60, 0.3)',
  },
  moderationErrorText: {
    color: T.red,
    fontSize: getResponsiveSize(12),
    textAlign: 'center',
    fontWeight: '600',
  },
  disabledChatContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: T.bg2,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: T.borderSoft,
  },
  disabledChatText: {
    color: T.textDim,
    fontSize: getResponsiveSize(14),
    marginLeft: 10,
    fontStyle: 'italic',
  },
  inputAreaWrapper: {
    backgroundColor: T.bg1,
  },
  quickMessagesContainer: {
    borderTopWidth: 1,
    borderTopColor: T.borderSoft,
    paddingVertical: 8,
  },
  quickMessagesScroll: {
    paddingHorizontal: 10,
  },
  quickChip: {
    backgroundColor: T.bg3,
    paddingHorizontal: 15,
    paddingVertical: 6,
    borderRadius: 20,
    marginHorizontal: 5,
    borderWidth: 1,
    borderColor: T.borderMid,
  },
  quickChipText: {
    color: T.gold,
    fontSize: getResponsiveSize(12),
    fontWeight: '600',
  },
});

export default ChatScreen;
