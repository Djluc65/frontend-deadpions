import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import { getResponsiveSize } from '../utils/responsive';

const CoinsFeedback = ({ amount, visible, type, onFinish }) => {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const translateY = useRef(new Animated.Value(getResponsiveSize(20))).current;

    useEffect(() => {
        if (visible) {
            playSound(type);
            triggerHaptics(type);
            startAnimation(type);
        }
    }, [visible, amount, type]);

    const playSound = async (type) => {
        try {
            let soundFile;
            if (type === 'CREDIT' || amount > 0) {
                soundFile = require('../../assets/song/gaming-victory-464016.mp3');
            } else if (type === 'REMBOURSEMENT' || type === 'REFUND') {
                soundFile = require('../../assets/song/MatchNul.mp3');
            } else {
                soundFile = require('../../assets/song/PionRouge.mp3');
            }

            const { sound } = await Audio.Sound.createAsync(soundFile);
            await sound.playAsync();
        } catch (error) {
            console.log('Error playing sound', error);
        }
    };

    const triggerHaptics = (type) => {
        if (type === 'CREDIT' || amount > 0) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } else if (type === 'REMBOURSEMENT' || type === 'REFUND') {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        } else {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }
    };

    const startAnimation = (type) => {
        const duration = (type === 'CREDIT' || amount > 0) ? 2000 : 1000;
        
        // Reset
        fadeAnim.setValue(0);
        translateY.setValue(getResponsiveSize(20));

        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 500,
                useNativeDriver: true,
            }),
            Animated.timing(translateY, {
                toValue: -getResponsiveSize(50),
                duration: 1000,
                useNativeDriver: true,
            }),
        ]).start(() => {
            // Fade out
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 500,
                delay: duration,
                useNativeDriver: true,
            }).start(() => {
                if (onFinish) onFinish();
            });
        });
    };

    if (!visible) return null;

    const isGain = amount > 0;
    const isRefund = type === 'REMBOURSEMENT' || type === 'REFUND' || (amount === 0); 
    
    let color = '#FF4444'; // Red (Debit)
    let message = `${Math.abs(amount)} coins misés`;

    if (isGain) {
        color = '#FFD700'; // Gold
        message = `+${amount} coins gagnés ! 🎉`;
    } else if (isRefund) {
        color = '#4da6ff'; // Blue
        message = `${amount} coins remboursés`;
    }

    return (
        <Animated.View
            style={[
                styles.container,
                {
                    opacity: fadeAnim,
                    transform: [{ translateY }],
                },
            ]}
        >
            <Text style={[styles.text, { color, textShadowColor: isGain ? '#FFA500' : '#8B0000' }]}>
                {message}
            </Text>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: '50%',
        alignSelf: 'center',
        zIndex: 1000,
        backgroundColor: 'rgba(0,0,0,0.7)',
        paddingHorizontal: getResponsiveSize(20),
        paddingVertical: getResponsiveSize(10),
        borderRadius: getResponsiveSize(20),
    },
    text: {
        fontSize: getResponsiveSize(32),
        fontWeight: 'bold',
        textShadowOffset: { width: getResponsiveSize(1), height: getResponsiveSize(1) },
        textShadowRadius: getResponsiveSize(5),
    },
});

export default CoinsFeedback;
