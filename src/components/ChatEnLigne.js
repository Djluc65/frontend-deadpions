import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import EmojiAnimation from './EmojiAnimation';
import { emojisDisponibles, getEmojiSource } from '../utils/emojis';
import { getResponsiveSize } from '../utils/responsive';

const ChatEnLigne = ({ 
  matchId, 
  monPseudo = 'Vous', 
  adversairePseudo = 'Adversaire',
  onEnvoyerMessage,
  messages = [],
  displayMode = 'full'
}) => {
  const [messageInput, setMessageInput] = useState('');
  const [emojisPresses, setEmojisPresses] = useState([]);
  const [lastMessageTime, setLastMessageTime] = useState(0);
  
  const scrollViewRef = useRef(null);
  
  // Scroll automatique vers le bas (Chat Texte)
  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  // Envoyer un message texte
  const envoyerMessageTexte = () => {
    if (!messageInput.trim()) return;
    
    // Protection anti-spam (2 secondes)
    const now = Date.now();
    if (now - lastMessageTime < 2000) return;
    setLastMessageTime(now);
    
    const nouveauMessage = {
      id: Date.now(),
      type: 'texte',
      auteur: monPseudo,
      estMoi: true,
      contenu: messageInput,
      timestamp: new Date()
    };
    
    // Envoyer au serveur via WebSocket
    if (onEnvoyerMessage) {
      onEnvoyerMessage(nouveauMessage, {
        type: 'MESSAGE_TEXTE',
        matchId,
        message: messageInput
      });
    }
    
    setMessageInput('');
  };
  
  // Envoyer un emoji
  const envoyerEmoji = (emojiData) => {
    // Protection anti-spam (2 secondes)
    const now = Date.now();
    if (now - lastMessageTime < 2000) return;
    setLastMessageTime(now);

    const nouveauMessage = {
      id: Date.now(),
      type: 'emoji',
      auteur: monPseudo,
      estMoi: true,
      contenu: emojiData.name,
      timestamp: new Date()
    };
    
    // Animation de l'emoji pressé
    setEmojisPresses(prev => [...prev, emojiData.id]);
    setTimeout(() => {
      setEmojisPresses(prev => prev.filter(id => id !== emojiData.id));
    }, 300);
    
    // Envoyer au serveur
    if (onEnvoyerMessage) {
      onEnvoyerMessage(nouveauMessage, {
        type: 'MESSAGE_EMOJI',
        matchId,
        emoji: emojiData.name
      });
    }
  };
  
  const formatHeure = (date) => {
    return new Date(date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };
  
  return (
    <View style={styles.container}>
      {/* CHAT TEXTE (Gauche) */}
      {(displayMode === 'full' || displayMode === 'text') && (
      <View style={[styles.chatTexte, displayMode === 'text' && { borderRightWidth: 0 }]}>
        <View style={styles.chatHeader}>
          <Text style={styles.chatTitre}>💬 Chat</Text>
        </View>
        
        {/* Zone de messages */}
        <ScrollView 
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
        >
          {messages.filter(m => m.type === 'texte').length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTexte}>Aucun message</Text>
              <Text style={styles.emptySubTexte}>Commencez la conversation !</Text>
            </View>
          ) : (
            messages.filter(m => m.type === 'texte').map(msg => (
              <View
                key={msg.id}
                style={[
                  styles.messageItem,
                  msg.estMoi ? styles.messageItemMoi : styles.messageItemAutre
                ]}
              >
                {!msg.estMoi && (
                  <Text style={styles.messageAuteur}>{msg.auteur}</Text>
                )}
                <View style={[
                  styles.messageBulle,
                  msg.estMoi ? styles.messageBulleMoi : styles.messageBulleAutre
                ]}>
                  <Text style={[
                    styles.messageTexte,
                    msg.estMoi ? styles.messageTexteMoi : styles.messageTexteAutre
                  ]}>
                    {msg.contenu}
                  </Text>
                </View>
                <Text style={styles.messageHeure}>{formatHeure(msg.timestamp)}</Text>
              </View>
            ))
          )}
        </ScrollView>
        
        {/* Zone de saisie */}
        <View 
          style={styles.inputContainer}
        >
          <TextInput
            style={styles.input}
            value={messageInput}
            onChangeText={setMessageInput}
            placeholder="Écrivez un message..."
            placeholderTextColor="#9ca3af"
            multiline
            maxLength={200}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              !messageInput.trim() && styles.sendButtonDisabled
            ]}
            onPress={envoyerMessageTexte}
            disabled={!messageInput.trim()}
          >
            <Text style={styles.sendButtonTexte}>📤</Text>
          </TouchableOpacity>
        </View>
      </View>
      )}
      
      {/* CHAT EMOJIS (Droite) */}
      {(displayMode === 'full' || displayMode === 'emoji') && (
      <View style={styles.chatEmojis}>
        {/* Grille d'emojis cliquables */}
        <ScrollView style={styles.emojiGridContainer} contentContainerStyle={styles.emojiGrid}>
          {emojisDisponibles.map(emojiData => (
            <TouchableOpacity
              key={emojiData.id}
              style={[
                styles.emojiButton,
                emojisPresses.includes(emojiData.id) && styles.emojiButtonPresse
              ]}
              onPress={() => envoyerEmoji(emojiData)}
              activeOpacity={0.7}
            >
              <EmojiAnimation
                  source={emojiData.source}
                  style={{ width: '100%', height: '100%' }}
              />
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flex: 1,
    borderTopWidth: getResponsiveSize(2),
    borderTopColor: '#e5e7eb',
    backgroundColor: '#fff'
  },
  
  // === CHAT TEXTE ===
  chatTexte: {
    flex: 1,
    borderRightWidth: getResponsiveSize(1),
    borderRightColor: '#e5e7eb'
  },
   chatHeader: {
    backgroundColor: '#f3f4f6',
    padding: getResponsiveSize(5),
    borderBottomWidth: getResponsiveSize(1),
    borderBottomColor: '#e5e7eb'
  },
  chatTitre: {
    fontSize: getResponsiveSize(16),
    fontWeight: 'bold',
    color: '#111827'
  },
  messagesContainer: {
    flex: 1,
    backgroundColor: '#f9fafb'
  },
  messagesContent: {
    padding: getResponsiveSize(12)
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: getResponsiveSize(40)
  },
  emptyTexte: {
    fontSize: getResponsiveSize(14),
    color: '#9ca3af',
    fontWeight: '600',
    marginBottom: getResponsiveSize(4)
  },
  emptySubTexte: {
    fontSize: getResponsiveSize(12),
    color: '#d1d5db'
  },
  messageItem: {
    marginBottom: getResponsiveSize(12)
  },
  messageItemMoi: {
    alignItems: 'flex-end'
  },
  messageItemAutre: {
    alignItems: 'flex-start'
  },
  messageAuteur: {
    fontSize: getResponsiveSize(11),
    color: '#6b7280',
    marginBottom: getResponsiveSize(4),
    marginLeft: getResponsiveSize(8)
  },
  messageBulle: {
    maxWidth: '80%',
    borderRadius: getResponsiveSize(12),
    padding: getResponsiveSize(10)
  },
  messageBulleMoi: {
    backgroundColor: '#3b82f6'
  },
  messageBulleAutre: {
    backgroundColor: '#e5e7eb'
  },
  messageTexte: {
    fontSize: getResponsiveSize(14)
  },
  messageTexteMoi: {
    color: '#fff'
  },
  messageTexteAutre: {
    color: '#111827'
  },
  messageHeure: {
    fontSize: getResponsiveSize(10),
    color: '#9ca3af',
    marginTop: getResponsiveSize(4),
    marginHorizontal: getResponsiveSize(8)
  },
  inputContainer: {
    flexDirection: 'row',
    padding: getResponsiveSize(12),
    borderTopWidth: getResponsiveSize(1),
    borderTopColor: '#e5e7eb',
    backgroundColor: '#fff',
    alignItems: 'center'
  },
  input: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    borderRadius: getResponsiveSize(20),
    paddingHorizontal: getResponsiveSize(16),
    paddingVertical: getResponsiveSize(8),
    marginRight: getResponsiveSize(8),
    maxHeight: getResponsiveSize(80),
    fontSize: getResponsiveSize(14),
    color: '#111827'
  },
  sendButton: {
    width: getResponsiveSize(40),
    height: getResponsiveSize(40),
    borderRadius: getResponsiveSize(20),
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center'
  },
  sendButtonDisabled: {
    backgroundColor: '#d1d5db'
  },
  sendButtonTexte: {
    fontSize: getResponsiveSize(20)
  },
  
  // === CHAT EMOJIS ===
  chatEmojis: {
    flex: 1,
    backgroundColor: '#fff'
  },
  emojiGridContainer: {
    flex: 1,
    backgroundColor: '#fff',
    borderTopWidth: getResponsiveSize(1),
    borderTopColor: '#e5e7eb',
  },
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: getResponsiveSize(8),
    justifyContent: 'space-around'
  },
  emojiButton: {
    width: '22%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: getResponsiveSize(8),
    borderRadius: getResponsiveSize(8),
    backgroundColor: '#f3f4f6',
    overflow: 'hidden'
  },
  emojiButtonPresse: {
    backgroundColor: '#dbeafe',
    transform: [{ scale: 1.1 }]
  },
  emojiTexte: {
    fontSize: getResponsiveSize(28)
  }
});

export default ChatEnLigne;
