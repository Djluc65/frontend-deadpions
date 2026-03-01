import React, { useState, useRef, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  FlatList, 
  KeyboardAvoidingView, 
  Platform, 
  ImageBackground, 
  ActivityIndicator 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { API_URL } from '../config';
import { getResponsiveSize } from '../utils/responsive';

const AssistantScreen = ({ navigation }) => {
  const token = useSelector(state => state.auth.token);
  const [messages, setMessages] = useState([
    { id: '1', role: 'assistant', content: "Bonjour ! Je suis l'assistant DeadPions. Comment puis-je vous aider aujourd'hui ?" }
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const flatListRef = useRef(null);

  const sendMessage = async () => {
    if (!inputText.trim() || isLoading) return;

    const userMessage = { id: Date.now().toString(), role: 'user', content: inputText.trim() };
    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    try {
      // Prepare history for context (last 10 messages to save tokens)
      const history = messages.slice(-10).map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      const response = await fetch(`${API_URL}/ai/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: userMessage.content,
          history: history
        }),
      });

      const data = await response.json();

      if (response.ok) {
        const aiMessage = { 
          id: (Date.now() + 1).toString(), 
          role: 'assistant', 
          content: data.message 
        };
        setMessages(prev => [...prev, aiMessage]);
      } else {
        console.error('AI Error:', data);
        const errorMessage = { 
          id: (Date.now() + 1).toString(), 
          role: 'assistant', 
          content: "Désolé, je rencontre des difficultés pour répondre. Veuillez réessayer plus tard." 
        };
        setMessages(prev => [...prev, errorMessage]);
      }
    } catch (error) {
      console.error('Network Error:', error);
      const errorMessage = { 
        id: (Date.now() + 1).toString(), 
        role: 'assistant', 
        content: "Erreur de connexion. Vérifiez votre réseau." 
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (flatListRef.current) {
      flatListRef.current.scrollToEnd({ animated: true });
    }
  }, [messages]);

  const renderItem = ({ item }) => (
    <View style={[
      styles.messageBubble, 
      item.role === 'user' ? styles.userBubble : styles.aiBubble
    ]}>
      <Text style={[
        styles.messageText, 
        item.role === 'user' ? styles.userText : styles.aiText
      ]}>
        {item.content}
      </Text>
    </View>
  );

  return (
    <ImageBackground 
      source={require('../../assets/images/Background2-4.png')} 
      style={styles.background}
      resizeMode="cover"
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={getResponsiveSize(28)} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Assistant DeadPions</Text>
        <View style={{ width: getResponsiveSize(28) }} /> 
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
        keyboardVerticalOffset={Platform.OS === "ios" ? getResponsiveSize(10) : 0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.messagesList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        />

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Posez votre question..."
            placeholderTextColor="#bdc3c7"
            multiline
            maxLength={500}
          />
          <TouchableOpacity 
            style={[styles.sendButton, (!inputText.trim() || isLoading) && styles.sendButtonDisabled]} 
            onPress={sendMessage}
            disabled={!inputText.trim() || isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#041c55" />
            ) : (
              <Ionicons name="send" size={getResponsiveSize(24)} color="#041c55" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: getResponsiveSize(Platform.OS === 'ios' ? 60 : 40),
    paddingHorizontal: getResponsiveSize(20),
    paddingBottom: getResponsiveSize(20),
    backgroundColor: 'rgba(4, 28, 85, 0.9)',
    borderBottomWidth: getResponsiveSize(1),
    borderBottomColor: '#f1c40f',
  },
  backButton: {
    padding: getResponsiveSize(5),
  },
  headerTitle: {
    color: '#fff',
    fontSize: getResponsiveSize(20),
    fontWeight: 'bold',
  },
  container: {
    flex: 1,
  },
  messagesList: {
    padding: getResponsiveSize(20),
    paddingBottom: getResponsiveSize(20),
  },
  messageBubble: {
    maxWidth: '80%',
    padding: getResponsiveSize(12),
    borderRadius: getResponsiveSize(15),
    marginBottom: getResponsiveSize(10),
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#f1c40f',
    borderBottomRightRadius: getResponsiveSize(2),
  },
  aiBubble: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(4, 28, 85, 0.8)',
    borderWidth: getResponsiveSize(1),
    borderColor: '#f1c40f',
    borderBottomLeftRadius: getResponsiveSize(2),
  },
  messageText: {
    fontSize: getResponsiveSize(16),
    lineHeight: getResponsiveSize(22),
  },
  userText: {
    color: '#041c55',
  },
  aiText: {
    color: '#fff',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: getResponsiveSize(15),
    backgroundColor: 'rgba(4, 28, 85, 0.95)',
    borderTopWidth: getResponsiveSize(1),
    borderTopColor: '#f1c40f',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    color: '#fff',
    borderRadius: getResponsiveSize(20),
    paddingHorizontal: getResponsiveSize(15),
    paddingVertical: getResponsiveSize(10),
    marginRight: getResponsiveSize(10),
    maxHeight: getResponsiveSize(100),
  },
  sendButton: {
    backgroundColor: '#f1c40f',
    width: getResponsiveSize(45),
    height: getResponsiveSize(45),
    borderRadius: getResponsiveSize(22.5),
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#95a5a6',
  },
});

export default AssistantScreen;
