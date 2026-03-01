import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import TransactionService from '../services/TransactionService';
import { getResponsiveSize } from '../utils/responsive';

const TransactionHistory = () => {
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadHistory();
    }, []);

    const loadHistory = async () => {
        try {
            const history = await TransactionService.getHistory();
            setTransactions(history);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const renderItem = ({ item }) => {
        const isCredit = item.type === 'CREDIT' || item.type === 'GAIN_JEU_EN_LIGNE';
        const color = isCredit ? '#4CAF50' : '#F44336';
        const sign = isCredit ? '+' : '-';
        
        return (
            <View style={styles.item}>
                <View>
                    <Text style={styles.reason}>{item.raison || item.type}</Text>
                    <Text style={styles.date}>{new Date(item.timestamp).toLocaleDateString()} {new Date(item.timestamp).toLocaleTimeString()}</Text>
                </View>
                <Text style={[styles.amount, { color }]}>
                    {sign}{item.montant} 🪙
                </Text>
            </View>
        );
    };

    if (loading) return <ActivityIndicator color="#FFD700" />;

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Historique des Transactions</Text>
            {transactions.length === 0 ? (
                <Text style={styles.empty}>Aucune transaction récente</Text>
            ) : (
                <FlatList
                    data={transactions}
                    renderItem={renderItem}
                    keyExtractor={item => item.id}
                    style={styles.list}
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginTop: getResponsiveSize(20),
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: getResponsiveSize(15),
        padding: getResponsiveSize(15),
        maxHeight: getResponsiveSize(300),
    },
    title: {
        color: '#fff',
        fontSize: getResponsiveSize(18),
        fontWeight: 'bold',
        marginBottom: getResponsiveSize(10),
    },
    list: {
        width: '100%',
    },
    item: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: getResponsiveSize(10),
        borderBottomWidth: getResponsiveSize(1),
        borderBottomColor: 'rgba(255,255,255,0.1)',
    },
    reason: {
        color: '#fff',
        fontSize: getResponsiveSize(14),
        fontWeight: '600',
    },
    date: {
        color: '#ccc',
        fontSize: getResponsiveSize(12),
    },
    amount: {
        fontSize: getResponsiveSize(16),
        fontWeight: 'bold',
    },
    empty: {
        color: '#aaa',
        fontStyle: 'italic',
        textAlign: 'center',
        marginTop: getResponsiveSize(10),
    }
});

export default TransactionHistory;
