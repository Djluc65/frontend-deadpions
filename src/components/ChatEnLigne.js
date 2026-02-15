import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import EmojiAnimation from './EmojiAnimation';
import { emojisDisponibles, getEmojiSource } from '../utils/emojis';

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
  const emojiScrollViewRef = useRef(null);
  
  // Scroll automatique vers le bas (Chat Texte)
  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  // Scroll automatique vers le bas (Historique Emojis)
  useEffect(() => {
      emojiScrollViewRef.current?.scrollToEnd({ animated: true });
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

        {/* Historique des emojis envoyés */}
        <ScrollView 
          ref={emojiScrollViewRef}
          style={styles.emojiHistorique}
          contentContainerStyle={styles.emojiHistoriqueContent}
        >
          {messages.filter(m => m.type === 'emoji').length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTexte}>Aucune réaction</Text>
            </View>
          ) : (
            messages.filter(m => m.type === 'emoji').map(msg => {
              const source = getEmojiSource(msg.contenu);
              return (
              <View
                key={msg.id}
                style={[
                  styles.emojiHistoriqueItem,
                  msg.estMoi ? styles.emojiHistoriqueItemMoi : styles.emojiHistoriqueItemAutre
                ]}
              >
                {source ? (
                    <EmojiAnimation
                        source={source}
                        style={{ width: 24, height: 24 }}
                    />
                ) : (
                    <Text style={styles.emojiHistoriqueEmoji}>{msg.contenu}</Text>
                )}
                <Text style={styles.emojiHistoriqueAuteur}>
                  {msg.estMoi ? 'Vous' : msg.auteur}
                </Text>
              </View>
            )})
          )}
        </ScrollView>
        
        {/* Grille d'emojis cliquables */}
        <View style={styles.emojiGrid}>
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
        </View>
      </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flex: 1,
    borderTopWidth: 2,
    borderTopColor: '#e5e7eb',
    backgroundColor: '#fff'
  },
  
  // === CHAT TEXTE ===
  chatTexte: {
    flex: 1,
    borderRightWidth: 1,
    borderRightColor: '#e5e7eb'
  },
   chatHeader: {
    backgroundColor: '#f3f4f6',
    padding: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb'
  },
  chatTitre: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827'
  },
  messagesContainer: {
    flex: 1,
    backgroundColor: '#f9fafb'
  },
  messagesContent: {
    padding: 12
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40
  },
  emptyTexte: {
    fontSize: 14,
    color: '#9ca3af',
    fontWeight: '600',
    marginBottom: 4
  },
  emptySubTexte: {
    fontSize: 12,
    color: '#d1d5db'
  },
  messageItem: {
    marginBottom: 12
  },
  messageItemMoi: {
    alignItems: 'flex-end'
  },
  messageItemAutre: {
    alignItems: 'flex-start'
  },
  messageAuteur: {
    fontSize: 11,
    color: '#6b7280',
    marginBottom: 4,
    marginLeft: 8
  },
  messageBulle: {
    maxWidth: '80%',
    borderRadius: 12,
    padding: 10
  },
  messageBulleMoi: {
    backgroundColor: '#3b82f6'
  },
  messageBulleAutre: {
    backgroundColor: '#e5e7eb'
  },
  messageTexte: {
    fontSize: 14
  },
  messageTexteMoi: {
    color: '#fff'
  },
  messageTexteAutre: {
    color: '#111827'
  },
  messageHeure: {
    fontSize: 10,
    color: '#9ca3af',
    marginTop: 4,
    marginHorizontal: 8
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    backgroundColor: '#fff',
    alignItems: 'center'
  },
  input: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    maxHeight: 80,
    fontSize: 14,
    color: '#111827'
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center'
  },
  sendButtonDisabled: {
    backgroundColor: '#d1d5db'
  },
  sendButtonTexte: {
    fontSize: 20
  },
  
  // === CHAT EMOJIS ===
  chatEmojis: {
    flex: 1
  },
  emojiHistorique: {
    flex: 1,
    backgroundColor: '#f9fafb'
  },
  emojiHistoriqueContent: {
    padding: 12,
    alignItems: 'center'
  },
  emojiHistoriqueItem: {
    marginBottom: 12,
    alignItems: 'center'
  },
  emojiHistoriqueItemMoi: {
    alignSelf: 'flex-end'
  },
  emojiHistoriqueItemAutre: {
    alignSelf: 'flex-start'
  },
  emojiHistoriqueEmoji: {
    fontSize: 40,
    marginBottom: 4
  },
  emojiHistoriqueAuteur: {
    fontSize: 10,
    color: '#6b7280',
    fontWeight: '600'
  },
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 8,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    justifyContent: 'space-around'
  },
  emojiButton: {
    width: '22%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    overflow: 'hidden'
  },
  emojiButtonPresse: {
    backgroundColor: '#dbeafe',
    transform: [{ scale: 1.1 }]
  },
  emojiTexte: {
    fontSize: 28
  }
});

export default ChatEnLigne;
