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
import { T } from '../utils/theme';
import { useTranslation } from 'react-i18next';

const AssistantScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const token = useSelector(state => state.auth.token);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const flatListRef = useRef(null);
  
  useEffect(() => {
    if (messages.length > 0) return;
    setMessages([{ id: '1', role: 'assistant', content: t('assistant.greeting') }]);
  }, [t]);

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
          content: t('assistant.error_generic')
        };
        setMessages(prev => [...prev, errorMessage]);
      }
    } catch (error) {
      console.error('Network Error:', error);
      const errorMessage = { 
        id: (Date.now() + 1).toString(), 
        role: 'assistant', 
        content: t('errors.network')
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
      <View style={styles.bgOverlay} pointerEvents="none" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={getResponsiveSize(28)} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('assistant.title')}</Text>
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
            placeholder={t('assistant.placeholder')}
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
  bgOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(5,9,15,0.55)',
  },
  background: {
    flex: 1,
    backgroundColor: T.bg0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: getResponsiveSize(Platform.OS === 'ios' ? 60 : 40),
    paddingHorizontal: getResponsiveSize(20),
    paddingBottom: getResponsiveSize(18),
    backgroundColor: T.bg1,
    borderBottomWidth: 1,
    borderBottomColor: T.borderSoft,
  },
  backButton: {
    padding: getResponsiveSize(8),
    borderRadius: T.radiusMd,
    backgroundColor: T.bg2,
    borderWidth: 1,
    borderColor: T.borderSoft,
  },
  headerTitle: {
    color: T.text,
    fontSize: getResponsiveSize(20),
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  container: {
    flex: 1,
  },
  messagesList: {
    padding: getResponsiveSize(16),
    paddingBottom: getResponsiveSize(20),
  },
  messageBubble: {
    maxWidth: '80%',
    padding: getResponsiveSize(12),
    borderRadius: getResponsiveSize(T.radiusMd),
    marginBottom: getResponsiveSize(10),
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: T.gold,
    borderBottomRightRadius: getResponsiveSize(2),
  },
  aiBubble: {
    alignSelf: 'flex-start',
    backgroundColor: T.bg2,
    borderWidth: 1,
    borderColor: T.border,
    borderBottomLeftRadius: getResponsiveSize(2),
  },
  messageText: {
    fontSize: getResponsiveSize(15),
    lineHeight: getResponsiveSize(21),
  },
  userText: {
    color: '#1B1305',
    fontWeight: '600',
  },
  aiText: {
    color: T.text,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: getResponsiveSize(12),
    backgroundColor: T.bg1,
    borderTopWidth: 1,
    borderTopColor: T.borderSoft,
    alignItems: 'center',
  },
  input: {
    flex: 1,
    backgroundColor: T.bg2,
    color: T.text,
    borderRadius: getResponsiveSize(T.radiusPill),
    paddingHorizontal: getResponsiveSize(15),
    paddingVertical: getResponsiveSize(10),
    marginRight: getResponsiveSize(10),
    maxHeight: getResponsiveSize(100),
    borderWidth: 1,
    borderColor: T.borderSoft,
    fontSize: getResponsiveSize(15),
  },
  sendButton: {
    backgroundColor: T.gold,
    width: getResponsiveSize(44),
    height: getResponsiveSize(44),
    borderRadius: getResponsiveSize(22),
    justifyContent: 'center',
    alignItems: 'center',
    ...T.shadowBtn,
  },
  sendButtonDisabled: {
    backgroundColor: T.bg3,
    opacity: 0.6,
  },
});

export default AssistantScreen;
