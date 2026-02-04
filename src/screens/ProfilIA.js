import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const ProfilIA = ({ difficulte, enReflexion = false, message = '', containerStyle, score }) => {
    const [pulse] = useState(new Animated.Value(1));
    const [rotation] = useState(new Animated.Value(0));
    const [opacity] = useState(new Animated.Value(0.5));

    useEffect(() => {
        if (enReflexion) {
            // Animation de pulsation (battement de coeur)
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulse, {
                        toValue: 1.15,
                        duration: 800,
                        easing: Easing.inOut(Easing.ease),
                        useNativeDriver: true
                    }),
                    Animated.timing(pulse, {
                        toValue: 1,
                        duration: 800,
                        easing: Easing.inOut(Easing.ease),
                        useNativeDriver: true
                    })
                ])
            ).start();

            // Animation de rotation (cercle de chargement)
            Animated.loop(
                Animated.timing(rotation, {
                    toValue: 1,
                    duration: 1500,
                    easing: Easing.linear,
                    useNativeDriver: true
                })
            ).start();
            
            // Animation d'opacité pour le texte
            Animated.loop(
                Animated.sequence([
                    Animated.timing(opacity, { toValue: 1, duration: 500, useNativeDriver: true }),
                    Animated.timing(opacity, { toValue: 0.5, duration: 500, useNativeDriver: true })
                ])
            ).start();
            
        } else {
            pulse.setValue(1);
            rotation.setValue(0);
            opacity.setValue(1);
        }
    }, [enReflexion]);

    const spin = rotation.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg']
    });

    // Configuration selon la difficulté
    const configs = {
        facile: {
            nom: 'IA Novice',
            avatar: '🤖',
            couleur: '#10b981', // Emerald 500
            bg: '#d1fae5', // Emerald 100
            badge: '1',
            description: 'Débutant',
            icon: 'happy-outline'
        },
        moyen: {
            nom: 'IA Stratège',
            avatar: '🧠',
            couleur: '#f59e0b', // Amber 500
            bg: '#fef3c7', // Amber 100
            badge: '2',
            description: 'Intermédiaire',
            icon: 'bulb-outline'
        },
        difficile: {
            nom: 'IA MasterMind',
            avatar: '👾',
            couleur: '#ef4444', // Red 500
            bg: '#fee2e2', // Red 100
            badge: '3',
            description: 'Expert',
            icon: 'flame-outline'
        }
    };

    const config = configs[difficulte] || configs.moyen;

    return (
        <View style={[styles.container, { borderColor: config.couleur }, containerStyle]}>
            <View style={styles.headerRow}>
                {/* Avatar Section */}
                <View style={styles.avatarWrapper}>
                    <Animated.View
                        style={[
                            styles.avatarContainer,
                            {
                                backgroundColor: config.bg,
                                borderColor: config.couleur,
                                transform: [{ scale: pulse }]
                            }
                        ]}
                    >
                        <Text style={styles.avatarEmoji}>{config.avatar}</Text>
                        
                        {/* Status Indicator Ring */}
                        {enReflexion && (
                             <Animated.View style={[styles.loadingRing, { 
                                 borderColor: config.couleur,
                                 transform: [{ rotate: spin }] 
                             }]} />
                        )}
                    </Animated.View>
                    
                    {/* Badge Level */}
                    <View style={[styles.badge, { backgroundColor: config.couleur }]}>
                        <Ionicons name={config.icon} size={10} color="#fff" />
                    </View>
                </View>

                {/* Info Section */}
                <View style={styles.infoContainer}>
                    <Text style={[styles.nom, { color: '#1f2937' }]}>
                        {config.nom}
                    </Text>
                    
                    {enReflexion ? (
                        <View style={styles.statusRow}>
                            <Animated.Text style={[styles.statusText, { color: config.couleur, opacity }]}>
                                Réflexion en cours...
                            </Animated.Text>
                        </View>
                    ) : (
                        <View style={styles.statusRow}>
                            <Text style={styles.description}>{message || config.description}</Text>
                        </View>
                    )}
                </View>

                {score !== undefined && (
                    <View style={{ marginLeft: 'auto', paddingLeft: 10, justifyContent: 'center' }}>
                        <Text style={{ fontSize: 24, fontWeight: 'bold', color: config.couleur }}>
                            {score}
                        </Text>
                    </View>
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#ffffff',
        borderRadius: 12,
        padding: 8,
        paddingHorizontal: 12,
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 3,
        minWidth: 160
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatarWrapper: {
        position: 'relative',
        marginRight: 12,
    },
    avatarContainer: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
    },
    avatarEmoji: {
        fontSize: 24
    },
    loadingRing: {
        position: 'absolute',
        width: 48,
        height: 48,
        borderRadius: 24,
        borderWidth: 2,
        borderTopColor: 'transparent',
        borderRightColor: 'transparent',
    },
    badge: {
        position: 'absolute',
        bottom: -2,
        right: -2,
        width: 16,
        height: 16,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#fff'
    },
    badgeText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: 'bold'
    },
    infoContainer: {
        flex: 1,
        justifyContent: 'center'
    },
    nom: {
        fontSize: 14,
        fontWeight: 'bold',
        marginBottom: 2
    },
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center'
    },
    statusText: {
        fontSize: 12,
        fontWeight: '600',
        fontStyle: 'italic'
    },
    description: {
        fontSize: 12,
        color: '#6b7280'
    }
});

export default ProfilIA;
