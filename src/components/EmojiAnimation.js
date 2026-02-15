import React from 'react';
import LottieView from 'lottie-react-native';
import { View, StyleSheet } from 'react-native';

export default function EmojiAnimation({ source, style }) {
    if (!source) return null;
    
    return (
        <View style={style}>
            <LottieView
                source={source}
                autoPlay
                loop
                style={StyleSheet.absoluteFill}
                resizeMode="contain"
            />
        </View>
    );
}
