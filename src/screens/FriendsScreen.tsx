import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, ActivityIndicator, SafeAreaView, ImageBackground } from 'react-native';
import { T } from '../utils/theme';
import { getResponsiveSize } from '../utils/responsive';
import { useFriends } from '../hooks/useFriends';
import { Ionicons } from '@expo/vector-icons';
import ToastNotification from '../components/moderation/ToastNotification';

const FriendsScreen = ({ navigation }: any) => {
  const { friends, requests, loading, acceptRequest, declineRequest, removeFriend, refresh } = useFriends();
  const [toast, setToast] = useState({ visible: false, message: '', type: 'info' as 'success'|'error'|'info' });

  const showToast = (message: string, type: 'success'|'error'|'info' = 'info') => {
    setToast({ visible: true, message, type });
  };

  const handleAccept = async (id: string) => {
    const success = await acceptRequest(id);
    if (success) showToast("Demande acceptée !", "success");
    else showToast("Erreur lors de l'acceptation.", "error");
  };

  const handleDecline = async (id: string) => {
    const success = await declineRequest(id);
    if (success) showToast("Demande refusée.");
    else showToast("Erreur.", "error");
  };

  const handleRemove = async (id: string) => {
    const success = await removeFriend(id);
    if (success) showToast("Ami supprimé.");
    else showToast("Erreur.", "error");
  };

  const renderFriend = ({ item }: any) => (
    <View style={styles.card}>
      <Image source={{ uri: item.avatar || 'https://via.placeholder.com/150' }} style={styles.avatar} />
      <View style={styles.info}>
        <Text style={styles.pseudo}>{item.pseudo}</Text>
        <Text style={[styles.status, { color: item.isOnline ? T.green : T.textDim }]}>
          {item.isOnline ? "En ligne" : "Hors ligne"}
        </Text>
      </View>
      <TouchableOpacity onPress={() => handleRemove(item._id)}>
        <Ionicons name="person-remove-outline" size={24} color={T.red} />
      </TouchableOpacity>
    </View>
  );

  const renderRequest = ({ item }: any) => (
    <View style={styles.card}>
      <Image source={{ uri: item.sender.avatar || 'https://via.placeholder.com/150' }} style={styles.avatar} />
      <View style={styles.info}>
        <Text style={styles.pseudo}>{item.sender.pseudo}</Text>
        <Text style={styles.status}>Demande reçue</Text>
      </View>
      <View style={styles.actions}>
        <TouchableOpacity style={styles.acceptBtn} onPress={() => handleAccept(item._id)}>
          <Ionicons name="checkmark" size={20} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.declineBtn} onPress={() => handleDecline(item._id)}>
          <Ionicons name="close" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <ImageBackground 
      source={require('../../assets/images/Background2-4.png')} 
      style={styles.background}
    >
      <View style={styles.bgOverlay} />
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={28} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.title}>Amis</Text>
          <TouchableOpacity onPress={refresh}>
            <Ionicons name="refresh" size={24} color={T.gold} />
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={T.gold} style={{ marginTop: 50 }} />
        ) : (
          <FlatList
            data={friends}
            keyExtractor={(item) => item._id}
            renderItem={renderFriend}
            ListHeaderComponent={
              <View>
                {requests.length > 0 && (
                  <>
                    <Text style={styles.sectionTitle}>Demandes en attente ({requests.length})</Text>
                    <FlatList
                      data={requests}
                      keyExtractor={(item) => item._id}
                      renderItem={renderRequest}
                      scrollEnabled={false}
                    />
                  </>
                )}
                <Text style={styles.sectionTitle}>Mes amis ({friends.length})</Text>
              </View>
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="people-outline" size={60} color={T.textDim} />
                <Text style={styles.emptyText}>Vous n'avez pas encore d'amis.</Text>
                <TouchableOpacity 
                  style={styles.searchBtn}
                  onPress={() => navigation.navigate('Social')}
                >
                  <Text style={styles.searchBtnText}>Rechercher des joueurs</Text>
                </TouchableOpacity>
              </View>
            }
            contentContainerStyle={styles.listContent}
          />
        )}

        <ToastNotification 
          {...toast} 
          onHide={() => setToast(prev => ({ ...prev, visible: false }))} 
        />
      </SafeAreaView>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  background: { flex: 1 },
  bgOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(5,9,15,0.8)'
  },
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    backgroundColor: 'rgba(0,0,0,0.3)'
  },
  title: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: T.gold,
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 10
  },
  listContent: { paddingBottom: 20 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: T.bg2,
    marginHorizontal: 20,
    marginVertical: 6,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: T.borderSoft
  },
  avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: T.bg3 },
  info: { flex: 1, marginLeft: 15 },
  pseudo: { fontSize: 16, fontWeight: 'bold', color: T.text },
  status: { fontSize: 12, color: T.textDim, marginTop: 2 },
  actions: { flexDirection: 'row' },
  acceptBtn: {
    backgroundColor: T.green,
    padding: 8,
    borderRadius: 8,
    marginRight: 8
  },
  declineBtn: {
    backgroundColor: T.red,
    padding: 8,
    borderRadius: 8
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 100,
    padding: 40
  },
  emptyText: {
    color: T.textDim,
    fontSize: 16,
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 30
  },
  searchBtn: {
    backgroundColor: T.gold,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 24
  },
  searchBtnText: {
    color: T.bg0,
    fontWeight: 'bold',
    fontSize: 16
  }
});

export default FriendsScreen;
