import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getResponsiveSize } from '../utils/responsive';

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
                        <Ionicons name={config.icon} size={getResponsiveSize(10)} color="#fff" />
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
                    <View style={{ marginLeft: 'auto', paddingLeft: getResponsiveSize(10), justifyContent: 'center' }}>
                        <Text style={{ fontSize: getResponsiveSize(24), fontWeight: 'bold', color: config.couleur }}>
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
        borderRadius: getResponsiveSize(12),
        padding: getResponsiveSize(8),
        paddingHorizontal: getResponsiveSize(12),
        borderWidth: getResponsiveSize(1),
        shadowColor: '#000',
        shadowOffset: { width: 0, height: getResponsiveSize(2) },
        shadowOpacity: 0.1,
        shadowRadius: getResponsiveSize(3),
        elevation: 3,
        minWidth: getResponsiveSize(160)
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatarWrapper: {
        position: 'relative',
        marginRight: getResponsiveSize(12),
    },
    avatarContainer: {
        width: getResponsiveSize(44),
        height: getResponsiveSize(44),
        borderRadius: getResponsiveSize(22),
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: getResponsiveSize(1),
    },
    avatarEmoji: {
        fontSize: getResponsiveSize(24)
    },
    loadingRing: {
        position: 'absolute',
        width: getResponsiveSize(48),
        height: getResponsiveSize(48),
        borderRadius: getResponsiveSize(24),
        borderWidth: getResponsiveSize(2),
        borderTopColor: 'transparent',
        borderRightColor: 'transparent',
    },
    badge: {
        position: 'absolute',
        bottom: getResponsiveSize(-2),
        right: getResponsiveSize(-2),
        width: getResponsiveSize(16),
        height: getResponsiveSize(16),
        borderRadius: getResponsiveSize(8),
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: getResponsiveSize(1),
        borderColor: '#fff'
    },
    badgeText: {
        color: '#fff',
        fontSize: getResponsiveSize(10),
        fontWeight: 'bold'
    },
    infoContainer: {
        flex: 1,
        justifyContent: 'center'
    },
    nom: {
        fontSize: getResponsiveSize(14),
        fontWeight: 'bold',
        marginBottom: getResponsiveSize(2)
    },
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center'
    },
    statusText: {
        fontSize: getResponsiveSize(12),
        fontWeight: '600',
        fontStyle: 'italic'
    },
    description: {
        fontSize: getResponsiveSize(12),
        color: '#6b7280'
    }
});

export default ProfilIA;
