import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Easing } from 'react-native';
import EmojiAnimation from './EmojiAnimation';
import { getEmojiSource } from '../utils/emojis';
import { getResponsiveSize } from '../utils/responsive';

const FlyingEmoji = ({ emoji, start, end, onComplete }) => {
    const position = useRef(new Animated.ValueXY(start)).current;
    const opacity = useRef(new Animated.Value(1)).current;
    const scale = useRef(new Animated.Value(0.5)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(position, {
                toValue: end,
                duration: 1200,
                useNativeDriver: true,
                easing: Easing.bezier(0.25, 0.1, 0.25, 1), // Ease out cubic roughly
            }),
            Animated.sequence([
                Animated.timing(scale, {
                    toValue: 1.2,
                    duration: 300,
                    useNativeDriver: true,
                }),
                Animated.timing(scale, {
                    toValue: 1,
                    duration: 200,
                    useNativeDriver: true,
                }),
                Animated.delay(500),
                Animated.timing(opacity, {
                    toValue: 0,
                    duration: 200,
                    useNativeDriver: true,
                })
            ])
        ]).start(() => {
            onComplete && onComplete();
        });
    }, []);

    const source = getEmojiSource(emoji);

    if (!source) return null;

    return (
        <Animated.View
            style={[
                styles.container,
                {
                    transform: [
                        { translateX: position.x },
                        { translateY: position.y },
                        { scale: scale }
                    ],
                    opacity: opacity
                }
            ]}
        >
            <EmojiAnimation source={source} style={{ width: getResponsiveSize(60), height: getResponsiveSize(60) }} />
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        zIndex: 9999, // Ensure it's on top of everything
        top: 0,
        left: 0,
    }
});

export default FlyingEmoji;
