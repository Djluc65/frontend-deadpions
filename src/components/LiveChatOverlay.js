import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Animated, Keyboard } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import EmojiAnimation from './EmojiAnimation';
import { getEmojiSource } from '../utils/emojis';
import { getResponsiveSize, SCREEN_WIDTH } from '../utils/responsive';
import { useTranslation } from 'react-i18next';
import { T } from '../utils/theme';

const width = SCREEN_WIDTH;
const INPUT_BORDER_W = Math.max(1, Math.round(getResponsiveSize(1)));

const LiveChatOverlay = ({ 
    messages, 
    onSendMessage, 
    onSendReaction, 
    visible = true,
    showMessages = true,
    messagesLeftOffset = getResponsiveSize(20),
    inputLeftOffset = getResponsiveSize(90),
    currentUser,
    bottomOffset = getResponsiveSize(20)
}) => {
    const { t } = useTranslation();
    const [inputText, setInputText] = useState('');
    const [floatingReactions, setFloatingReactions] = useState([]);
    const [showReactions, setShowReactions] = useState(false);
    const [isInputFocused, setIsInputFocused] = useState(false);
    const flatListRef = useRef(null);
    const reactionIdCounter = useRef(0);

    // Emojis rapides
    const quickEmojis = ['😀', '😂', '🔥', '👏', '❤️'];

    // Auto-scroll to bottom
    useEffect(() => {
        if (flatListRef.current && messages.length > 0) {
            flatListRef.current.scrollToEnd({ animated: true });
        }
    }, [messages]);

    // Listen for new emoji messages to trigger animations
    useEffect(() => {
        const lastMsg = messages[messages.length - 1];
        if (lastMsg && lastMsg.type === 'emoji' && !lastMsg.estMoi) {
            triggerFloatingReaction(lastMsg.contenu);
        }
    }, [messages]);

    const handleSend = () => {
        if (inputText.trim()) {
            onSendMessage(inputText);
            setInputText('');
            Keyboard.dismiss(); // Masquer le clavier après l'envoi
        }
    };

    const handleReaction = (emoji) => {
        onSendReaction(emoji);
        triggerFloatingReaction(emoji);
    };

    const triggerFloatingReaction = (emoji) => {
        const id = reactionIdCounter.current++;
        const startX = Math.random() * (width * 0.4) + (width * 0.5); // Right side
        
        setFloatingReactions(prev => [...prev, { id, emoji, startX }]);
        
        // Remove after animation (handled by FloatingEmoji component)
        setTimeout(() => {
            setFloatingReactions(prev => prev.filter(r => r.id !== id));
        }, 2000);
    };

    if (!visible) return null;

    return (
        <View style={styles.container} pointerEvents="box-none">
            {/* Zone de Messages (Bottom Left) */}
            {showMessages && (
                <View
                    testID="live-chat-messages-container"
                    style={[styles.messagesContainer, { bottom: bottomOffset + getResponsiveSize(100), left: messagesLeftOffset }]}
                    pointerEvents="none"
                >
                    <FlatList
                        ref={flatListRef}
                        data={messages}
                        keyExtractor={(item, index) => item.id ? item.id.toString() : `msg-${index}-${Date.now()}`}
                        renderItem={({ item }) => (
                            <View style={styles.messageRow}>
                                <Text style={styles.messageAuthor}>{item.auteur}: </Text>
                                {item.type === 'emoji' ? (
                                    getEmojiSource(item.contenu) ? (
                                        <EmojiAnimation
                                            source={getEmojiSource(item.contenu)}
                                            style={{ width: getResponsiveSize(24), height: getResponsiveSize(24) }}
                                        />
                                    ) : (
                                        <Text style={styles.messageEmoji}>{item.contenu}</Text>
                                    )
                                ) : (
                                    <Text style={styles.messageText}>{item.contenu}</Text>
                                )}
                            </View>
                        )}
                        style={styles.messageList}
                        contentContainerStyle={styles.messageListContent}
                        showsVerticalScrollIndicator={false}
                        pointerEvents="none"
                    />
                </View>
            )}

            {/* Zone de Réactions Flottantes (Full Screen Overlay) */}
            {floatingReactions.map(r => (
                <FloatingEmoji key={r.id} emoji={r.emoji} startX={r.startX} />
            ))}

            {/* Barre d'Input Persistante */}
            <KeyboardAvoidingView 
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                testID="live-chat-input-wrapper"
                style={[styles.inputWrapper, { bottom: bottomOffset, left: inputLeftOffset }]}
                pointerEvents="box-none"
            >
                {/* Quick Reactions Panel (Conditional) */}
                {showReactions && (
                    <View style={styles.quickReactionsPanel}>
                        {quickEmojis.map((emoji, index) => (
                            <TouchableOpacity 
                                key={index} 
                                style={styles.reactionButton}
                                onPress={() => handleReaction(emoji)}
                            >
                                <Text style={styles.reactionText}>{emoji}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}

                <View style={[styles.inputBar, isInputFocused && styles.inputBarFocused]}>
                    <TouchableOpacity 
                        onPress={() => setShowReactions(!showReactions)} 
                        style={styles.emojiButton}
                    >
                        <Ionicons name="happy-outline" size={24} color="#fff" />
                    </TouchableOpacity>

                    <TextInput
                        style={styles.input}
                        value={inputText}
                        onChangeText={setInputText}
                        placeholder={t('chat.message_placeholder')}
                        placeholderTextColor="#ccc"
                        onSubmitEditing={handleSend}
                        onFocus={() => setIsInputFocused(true)}
                        onBlur={() => setIsInputFocused(false)}
                    />
                    
                    <TouchableOpacity onPress={handleSend} style={styles.sendButton}>
                        <Ionicons name="send" size={20} color="#3b82f6" />
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </View>
    );
};

const FloatingEmoji = ({ emoji, startX }) => {
    const translateY = useRef(new Animated.Value(0)).current;
    const opacity = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(translateY, {
                toValue: -getResponsiveSize(300),
                duration: 2000,
                useNativeDriver: true
            }),
            Animated.timing(opacity, {
                toValue: 0,
                duration: 2000,
                useNativeDriver: true
            })
        ]).start();
    }, []);

    const source = getEmojiSource(emoji);

    return (
        <Animated.View style={[
            styles.floatingEmojiContainer,
            {
                left: startX,
                bottom: getResponsiveSize(100),
                transform: [{ translateY }],
                opacity
            }
        ]}>
            {source ? (
                 <EmojiAnimation
                    source={source}
                    style={{ width: getResponsiveSize(60), height: getResponsiveSize(60) }}
                />
            ) : (
                <Text style={styles.floatingEmojiText}>{emoji}</Text>
            )}
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 50,
    },
    messagesContainer: {
        position: 'absolute',
        bottom: getResponsiveSize(100), // Just above input bar
        width: width * 0.6,
        height: getResponsiveSize(150),
        justifyContent: 'flex-end',
    },
    messageList: {
        flexGrow: 0,
    },
    messageListContent: {
        paddingBottom: getResponsiveSize(5),
    },
    messageRow: {
        flexDirection: 'row',
        marginBottom: getResponsiveSize(4),
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.3)',
        alignSelf: 'flex-start',
        paddingHorizontal: getResponsiveSize(8),
        paddingVertical: getResponsiveSize(4),
        borderRadius: getResponsiveSize(10),
    },
    messageAuthor: {
        color: '#f1c40f',
        fontWeight: 'bold',
        fontSize: getResponsiveSize(12),
    },
    messageText: {
        color: '#fff',
        fontSize: getResponsiveSize(14),
    },
    messageEmoji: {
        fontSize: getResponsiveSize(20),
    },
    inputWrapper: {
        position: 'absolute',
        bottom: getResponsiveSize(20),
        left: getResponsiveSize(90), // Space for Menu Button (Left 20 + Width 60 + Margin 10)
        right: getResponsiveSize(80), // Space for Audio Button (Right 20 + Width 44 + Margin 16)
        zIndex: 60,
    },
    inputBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.6)',
        borderRadius: getResponsiveSize(25),
        paddingHorizontal: getResponsiveSize(10),
        paddingVertical: getResponsiveSize(5),
        borderWidth: INPUT_BORDER_W,
        borderColor: T.cyanBorder,
    },
    inputBarFocused: {
        borderColor: T.cyan,
    },
    input: {
        flex: 1,
        color: '#fff',
        paddingHorizontal: getResponsiveSize(10),
        paddingVertical: getResponsiveSize(8),
        fontSize: getResponsiveSize(14),
    },
    sendButton: {
        padding: getResponsiveSize(8),
    },
    emojiButton: {
        padding: getResponsiveSize(8),
    },
    quickReactionsPanel: {
        flexDirection: 'row',
        backgroundColor: 'rgba(0,0,0,0.8)',
        borderRadius: getResponsiveSize(20),
        padding: getResponsiveSize(10),
        marginBottom: getResponsiveSize(10),
        alignSelf: 'center',
        justifyContent: 'center',
    },
    reactionButton: {
        paddingHorizontal: getResponsiveSize(10),
    },
    reactionText: {
        fontSize: getResponsiveSize(24),
    },
    floatingEmojiContainer: {
        position: 'absolute',
        zIndex: 100,
    },
    floatingEmojiText: {
        fontSize: getResponsiveSize(30),
        textShadowColor: 'rgba(0, 0, 0, 0.75)',
        textShadowOffset: {width: -getResponsiveSize(1), height: getResponsiveSize(1)},
        textShadowRadius: getResponsiveSize(10)
    }
});

export default LiveChatOverlay;
