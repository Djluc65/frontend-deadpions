import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Image, Animated, Dimensions } from 'react-native';
import { getAvatarSource } from '../utils/avatarUtils';

const { width, height } = Dimensions.get('window');

const VersusAnimation = ({ player1, player2, onFinish, visible }) => {
    const slideLeft = useRef(new Animated.Value(-width)).current;
    const slideRight = useRef(new Animated.Value(width)).current;
    const opacity = useRef(new Animated.Value(0)).current;
    const scaleVS = useRef(new Animated.Value(0)).current;
    const rotateVS = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            // Reset values
            slideLeft.setValue(-width);
            slideRight.setValue(width);
            opacity.setValue(0);
            scaleVS.setValue(0);
            rotateVS.setValue(0);

            // Start Animation
            Animated.parallel([
                Animated.timing(slideLeft, {
                    toValue: 0,
                    duration: 600,
                    useNativeDriver: true,
                }),
                Animated.timing(slideRight, {
                    toValue: 0,
                    duration: 600,
                    useNativeDriver: true,
                }),
                Animated.timing(opacity, {
                    toValue: 1,
                    duration: 400,
                    useNativeDriver: true,
                }),
                Animated.sequence([
                    Animated.delay(300),
                    Animated.parallel([
                        Animated.spring(scaleVS, {
                            toValue: 1,
                            friction: 3,
                            useNativeDriver: true,
                        }),
                        Animated.timing(rotateVS, {
                            toValue: 1,
                            duration: 500,
                            useNativeDriver: true,
                        })
                    ])
                ])
            ]).start();

            // Auto finish after 2s
            const timer = setTimeout(() => {
                onFinish && onFinish();
            }, 2000);

            return () => clearTimeout(timer);
        }
    }, [visible]);

    if (!visible) return null;

    const p1Source = getAvatarSource(player1?.avatar) || { uri: 'https://i.pravatar.cc/150' };
    const p2Source = getAvatarSource(player2?.avatar) || { uri: 'https://i.pravatar.cc/150' };

    const rotateStr = rotateVS.interpolate({
        inputRange: [0, 1],
        outputRange: ['-180deg', '0deg']
    });

    return (
        <View style={styles.container}>
            <View style={styles.background} />
            
            <View style={styles.content}>
                {/* Player 1 (Left) */}
                <Animated.View style={[styles.playerContainer, { transform: [{ translateX: slideLeft }], opacity }]}>
                    <View style={[styles.avatarContainer, { borderColor: '#3b82f6' }]}>
                         <Image source={p1Source} style={styles.avatar} />
                    </View>
                    <Text style={styles.pseudo} numberOfLines={1}>{player1?.pseudo || 'Joueur 1'}</Text>
                </Animated.View>

                {/* VS */}
                <Animated.View style={[styles.vsContainer, { transform: [{ scale: scaleVS }, { rotate: rotateStr }] }]}>
                    <Text style={styles.vsText}>VS</Text>
                </Animated.View>

                {/* Player 2 (Right) */}
                <Animated.View style={[styles.playerContainer, { transform: [{ translateX: slideRight }], opacity }]}>
                    <View style={[styles.avatarContainer, { borderColor: '#ef4444' }]}>
                        <Image source={p2Source} style={styles.avatar} />
                    </View>
                    <Text style={styles.pseudo} numberOfLines={1}>{player2?.pseudo || 'Joueur 2'}</Text>
                </Animated.View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: width,
        height: height,
        zIndex: 9999,
        justifyContent: 'center',
        alignItems: 'center',
    },
    background: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(4, 28, 85, 0.95)', // Bleu nuit DeadPions
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
        width: '100%',
        paddingHorizontal: 20,
    },
    playerContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        width: width * 0.35,
    },
    avatarContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        borderWidth: 3,
        overflow: 'hidden',
        marginBottom: 10,
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.5,
        shadowRadius: 5,
        backgroundColor: '#ccc',
    },
    avatar: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    pseudo: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 3,
        textAlign: 'center',
    },
    vsContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        width: width * 0.2,
    },
    vsText: {
        color: '#f1c40f',
        fontSize: 48,
        fontWeight: '900',
        fontStyle: 'italic',
        textShadowColor: '#d35400',
        textShadowOffset: { width: 2, height: 2 },
        textShadowRadius: 0,
    }
});

export default VersusAnimation;
