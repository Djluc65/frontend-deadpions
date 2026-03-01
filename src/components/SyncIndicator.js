import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useCoinsContext } from '../context/CoinsContext';
import { getResponsiveSize } from '../utils/responsive';

const SyncIndicator = () => {
    const { isLoading, lastSync } = useCoinsContext();
    const [timeDisplay, setTimeDisplay] = useState('');

    // Update time display every second
    useEffect(() => {
        const updateTime = () => {
            if (!lastSync) {
                setTimeDisplay('Jamais');
                return;
            }
            const seconds = Math.floor((Date.now() - lastSync) / 1000);
            if (seconds < 60) {
                setTimeDisplay(`Il y a ${seconds}s`);
            } else {
                const minutes = Math.floor(seconds / 60);
                setTimeDisplay(`Il y a ${minutes}min`);
            }
        };

        updateTime();
        const interval = setInterval(updateTime, 5000); // Update every 5s to avoid too many renders
        return () => clearInterval(interval);
    }, [lastSync]);

    if (!lastSync && !isLoading) return null;

    return (
        <View style={styles.syncIndicator}>
            {isLoading ? (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <ActivityIndicator size="small" color="#FFD700" style={{ marginRight: getResponsiveSize(5) }} />
                    <Text style={styles.syncText}>Sync...</Text>
                </View>
            ) : (
                <Text style={styles.syncText}>
                    ✓ Synchronisé {timeDisplay}
                </Text>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    syncIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: getResponsiveSize(5),
        paddingHorizontal: getResponsiveSize(10),
        backgroundColor: 'rgba(0,0,0,0.3)',
        borderRadius: getResponsiveSize(15),
        alignSelf: 'center',
        marginVertical: getResponsiveSize(5)
    },
    syncText: {
        color: '#FFD700',
        fontSize: getResponsiveSize(10),
        fontWeight: 'bold'
    }
});

export default SyncIndicator;
