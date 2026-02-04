import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Audio } from 'expo-av';

const CoinsFeedback = ({ amount, visible, onFinish }) => {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const translateY = useRef(new Animated.Value(20)).current;

    useEffect(() => {
        if (visible) {
            playSound(amount > 0);
            startAnimation();
        }
    }, [visible, amount]);

    const playSound = async (isGain) => {
        try {
            // Placeholder for sound logic - in real app would load specific files
            // const { sound } = await Audio.Sound.createAsync(
            //    isGain ? require('../../assets/sounds/coins-win.mp3') : require('../../assets/sounds/coins-pay.mp3')
            // );
            // await sound.playAsync();
        } catch (error) {
            console.log('Error playing sound', error);
        }
    };

    const startAnimation = () => {
        // Reset
        fadeAnim.setValue(0);
        translateY.setValue(20);

        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 500,
                useNativeDriver: true,
            }),
            Animated.timing(translateY, {
                toValue: -50,
                duration: 1000,
                useNativeDriver: true,
            }),
        ]).start(() => {
            // Fade out
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 500,
                delay: 1000,
                useNativeDriver: true,
            }).start(() => {
                if (onFinish) onFinish();
            });
        });
    };

    if (!visible) return null;

    const isGain = amount > 0;
    const text = isGain ? `+${amount}` : `${amount}`;
    const color = isGain ? '#FFD700' : '#FF4444'; // Gold or Red

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
                {text} 🪙
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
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 20,
    },
    text: {
        fontSize: 32,
        fontWeight: 'bold',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 5,
    },
});

export default CoinsFeedback;
