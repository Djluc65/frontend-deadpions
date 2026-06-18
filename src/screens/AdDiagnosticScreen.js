import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, RefreshControl, Platform } from 'react-native';
import { useAdManager } from '../ads/AdSystem';
import { T } from '../utils/theme';
import { getResponsiveSize } from '../utils/responsive';
import { Ionicons } from '@expo/vector-icons';
import { API_URL } from '../config';

const AdDiagnosticScreen = ({ navigation }) => {
  const { getAdDiagnostics, logAdEvent } = useAdManager();
  const [diagnostics, setDiagnostics] = useState(getAdDiagnostics());
  const [recentEvents, setRecentEvents] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const fetchRecentEvents = async () => {
    try {
      const response = await fetch(`${API_URL}/ad-debug-events/events`);
      const data = await response.json();
      setRecentEvents(data);
    } catch (error) {
      console.error('Error fetching events:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    setDiagnostics(getAdDiagnostics());
    await fetchRecentEvents();
    setRefreshing(false);
  };

  useEffect(() => {
    fetchRecentEvents();
    const interval = setInterval(() => {
      setDiagnostics(getAdDiagnostics());
    }, 2000);
    return () => clearInterval(interval);
  }, [getAdDiagnostics]);

  const renderDiagnosticRow = (label, value, isStatus = false) => {
    let color = T.text;
    if (isStatus) {
      color = value ? '#4CAF50' : '#F44336';
    }

    return (
      <View style={styles.row}>
        <Text style={styles.label}>{label}</Text>
        <Text style={[styles.value, { color }]}>
          {typeof value === 'boolean' ? (value ? 'YES' : 'NO') : String(value || 'N/A')}
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={T.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Diagnostic Publicité</Text>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>État Actuel</Text>
          {renderDiagnosticRow('Show Ads', diagnostics.showAds, true)}
          {renderDiagnosticRow('Is Premium', diagnostics.isPremium)}
          {renderDiagnosticRow('Is Early Access', diagnostics.isEarlyAccess)}
          {renderDiagnosticRow('ATT Ready', diagnostics.attReady, true)}
          {renderDiagnosticRow('ATT Authorized', diagnostics.attAuthorized, true)}
          {renderDiagnosticRow('Native Ads Available', diagnostics.nativeAdsAvailable, true)}
          {renderDiagnosticRow('Rewarded Loaded', diagnostics.rewardedLoaded, true)}
          {renderDiagnosticRow('Interstitial Loaded', diagnostics.interstitialLoaded, true)}
          {renderDiagnosticRow('Ad Debug Enabled', diagnostics.adDebugEnabled, true)}
          {renderDiagnosticRow('Use Test IDs', diagnostics.useTestAdUnits, true)}
          {renderDiagnosticRow('NPA Only', diagnostics.requestNonPersonalizedAdsOnly, true)}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Config</Text>
          {renderDiagnosticRow('Platform', diagnostics.platform)}
          {renderDiagnosticRow('Ad Unit ID', diagnostics.rewardedAdUnitId)}
          {renderDiagnosticRow('Action Count', diagnostics.actionCount)}
          {renderDiagnosticRow('Last Interstitial', diagnostics.lastInterstitialAt ? new Date(diagnostics.lastInterstitialAt).toLocaleTimeString() : 'Never')}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Actions de Test</Text>
          <TouchableOpacity 
            style={styles.testButton}
            onPress={() => logAdEvent('manual_diagnostic_ping', 'User clicked ping in diagnostic screen')}
          >
            <Text style={styles.testButtonText}>Envoyer Ping Télémétrie</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Événements Récents (Production)</Text>
          {recentEvents.length === 0 ? (
            <Text style={styles.noEvents}>Aucun événement trouvé</Text>
          ) : (
            recentEvents.map((event, index) => (
              <View key={event._id || index} style={styles.eventItem}>
                <View style={styles.eventHeader}>
                  <Text style={styles.eventType}>{event.eventType}</Text>
                  <Text style={styles.eventTime}>{new Date(event.timestamp).toLocaleTimeString()}</Text>
                </View>
                <Text style={styles.eventMsg}>{event.message}</Text>
                {event.data && Object.keys(event.data).length > 0 && (
                  <Text style={styles.eventData}>{JSON.stringify(event.data, null, 2)}</Text>
                )}
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: T.background,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  backButton: {
    marginRight: 15,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: T.text,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    backgroundColor: T.card,
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: T.border,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: T.primary,
    marginBottom: 15,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
  },
  label: {
    fontSize: 14,
    color: T.textSecondary,
  },
  value: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'right',
    maxWidth: '60%',
  },
  testButton: {
    backgroundColor: T.primary,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  testButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  eventItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  eventType: {
    fontWeight: 'bold',
    color: T.text,
    fontSize: 13,
  },
  eventTime: {
    fontSize: 11,
    color: T.textSecondary,
  },
  eventMsg: {
    fontSize: 12,
    color: T.text,
    marginBottom: 4,
  },
  eventData: {
    fontSize: 10,
    color: T.textSecondary,
    backgroundColor: 'rgba(0,0,0,0.05)',
    padding: 5,
    borderRadius: 4,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  noEvents: {
    textAlign: 'center',
    color: T.textSecondary,
    fontStyle: 'italic',
  }
});

export default AdDiagnosticScreen;
