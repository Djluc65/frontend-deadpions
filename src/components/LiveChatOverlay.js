import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Animated, Dimensions, Keyboard } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import EmojiAnimation from './EmojiAnimation';
import { getEmojiSource } from '../utils/emojis';

const { width, height } = Dimensions.get('window');

const LiveChatOverlay = ({ 
    messages, 
    onSendMessage, 
    onSendReaction, 
    visible = true,
    currentUser
}) => {
    const [inputText, setInputText] = useState('');
    const [floatingReactions, setFloatingReactions] = useState([]);
    const [showReactions, setShowReactions] = useState(false);
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
            <View style={styles.messagesContainer} pointerEvents="box-none">
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
                                        style={{ width: 24, height: 24 }}
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
                    pointerEvents="auto" // Allow scrolling
                />
            </View>

            {/* Zone de Réactions Flottantes (Full Screen Overlay) */}
            {floatingReactions.map(r => (
                <FloatingEmoji key={r.id} emoji={r.emoji} startX={r.startX} />
            ))}

            {/* Barre d'Input Persistante */}
            <KeyboardAvoidingView 
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={styles.inputWrapper}
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

                <View style={styles.inputBar}>
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
                        placeholder="Message..."
                        placeholderTextColor="#ccc"
                        onSubmitEditing={handleSend}
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
                toValue: -300,
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
                bottom: 100,
                transform: [{ translateY }],
                opacity
            }
        ]}>
            {source ? (
                 <EmojiAnimation
                    source={source}
                    style={{ width: 60, height: 60 }}
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
        bottom: 100, // Just above input bar
        left: 20,
        width: width * 0.6,
        height: 150,
        justifyContent: 'flex-end',
    },
    messageList: {
        flexGrow: 0,
    },
    messageListContent: {
        paddingBottom: 5,
    },
    messageRow: {
        flexDirection: 'row',
        marginBottom: 4,
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.3)',
        alignSelf: 'flex-start',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 10,
    },
    messageAuthor: {
        color: '#f1c40f',
        fontWeight: 'bold',
        fontSize: 12,
    },
    messageText: {
        color: '#fff',
        fontSize: 14,
    },
    messageEmoji: {
        fontSize: 20,
    },
    inputWrapper: {
        position: 'absolute',
        bottom: 20,
        left: 90, // Space for Menu Button (Left 20 + Width 60 + Margin 10)
        right: 80, // Space for Audio Button (Right 20 + Width 44 + Margin 16)
        zIndex: 60,
    },
    inputBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.6)',
        borderRadius: 25,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    input: {
        flex: 1,
        color: '#fff',
        paddingHorizontal: 10,
        paddingVertical: 8,
        fontSize: 14,
    },
    sendButton: {
        padding: 8,
    },
    emojiButton: {
        padding: 8,
    },
    quickReactionsPanel: {
        flexDirection: 'row',
        backgroundColor: 'rgba(0,0,0,0.8)',
        borderRadius: 20,
        padding: 10,
        marginBottom: 10,
        alignSelf: 'center',
        justifyContent: 'center',
    },
    reactionButton: {
        paddingHorizontal: 10,
    },
    reactionText: {
        fontSize: 24,
    },
    floatingEmojiContainer: {
        position: 'absolute',
        zIndex: 100,
    },
    floatingEmojiText: {
        fontSize: 30,
        textShadowColor: 'rgba(0, 0, 0, 0.75)',
        textShadowOffset: {width: -1, height: 1},
        textShadowRadius: 10
    }
});

export default LiveChatOverlay;
