import React, { useState, useEffect, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  Image,
  Dimensions,
  Platform,
  KeyboardAvoidingView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getResponsiveSize } from '../../utils/responsive';
import { getAvatarSource } from '../../utils/avatarUtils';
import { API_URL } from '../../config';
import { useSelector } from 'react-redux';
import axios from 'axios';
import { modalTheme } from '../../utils/modalTheme';

const { width, height } = Dimensions.get('window');

const UserSearchModal = ({ visible, onClose, navigation }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const { token, user } = useSelector(state => state.auth);

  const performSearch = async (query) => {
    if (!query || query.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    try {
      const response = await axios.get(`${API_URL}/users/search?q=${encodeURIComponent(query)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Filter out current user
      const filteredResults = response.data.filter(u => u._id !== user._id);
      setResults(filteredResults);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchQuery) {
        setLoading(true);
        performSearch(searchQuery);
      } else {
        setResults([]);
        setLoading(false);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const handleUserPress = (selectedUser) => {
    onClose();
    // Navigate to user profile or chat based on app structure
    // For now, we'll navigate to a public profile view if it exists, 
    // or just show an alert/action sheet
    // navigation.navigate('PublicProfile', { userId: selectedUser._id });
    console.log('Selected user:', selectedUser);
    // TODO: Implement navigation to user profile
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.userCard}
      onPress={() => handleUserPress(item)}
    >
      <Image 
        source={getAvatarSource(item.avatar)} 
        style={styles.avatar} 
      />
      <View style={styles.userInfo}>
        <Text style={styles.pseudo}>{item.pseudo}</Text>
        <View style={styles.statsRow}>
          <Text style={styles.statsText}>🏆 {item.stats?.wins || 0}</Text>
          <Text style={styles.statsText}>☠️ {item.stats?.losses || 0}</Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={24} color="#f1c40f" />
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.5)' }]} />
        
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <View style={styles.content}>
            <View style={styles.header}>
              <Text style={styles.title}>Rechercher un joueur</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Ionicons name="close" size={24} color="#f1c40f" />
              </TouchableOpacity>
            </View>

            <View style={styles.searchContainer}>
              <Ionicons name="search" size={20} color="#f1c40f" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Pseudo du joueur..."
                placeholderTextColor="rgba(255,255,255,0.6)"
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoFocus
                autoCorrect={false}
                autoCapitalize="none"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={18} color="#f1c40f" />
                </TouchableOpacity>
              )}
            </View>

            {loading ? (
              <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color="#f1c40f" />
              </View>
            ) : (
              <FlatList
                data={results}
                renderItem={renderItem}
                keyExtractor={item => item._id}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                  searchQuery.length > 1 ? (
                    <View style={styles.centerContainer}>
                      <Text style={styles.emptyText}>Aucun joueur trouvé</Text>
                    </View>
                  ) : (
                    <View style={styles.centerContainer}>
                      <Text style={styles.emptyText}>Entrez un pseudo pour rechercher</Text>
                    </View>
                  )
                }
              />
            )}
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-start',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
  },
  keyboardView: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
  },
  content: {
    width: width * 0.9,
    height: height * 0.7,
    backgroundColor: modalTheme.card.backgroundColor,
    borderRadius: modalTheme.card.borderRadius,
    borderWidth: modalTheme.card.borderWidth,
    borderColor: modalTheme.card.borderColor,
    overflow: 'hidden',
    shadowColor: modalTheme.card.shadowColor,
    shadowOffset: modalTheme.card.shadowOffset,
    shadowOpacity: modalTheme.card.shadowOpacity,
    shadowRadius: modalTheme.card.shadowRadius,
    elevation: modalTheme.card.elevation,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f1c40f',
  },
  title: {
    ...modalTheme.title,
    fontSize: getResponsiveSize(22),
    marginBottom: 0,
    textAlign: 'left'
  },
  closeButton: {
    padding: 5,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    margin: 15,
    paddingHorizontal: 15,
    borderRadius: getResponsiveSize(10),
    height: 50,
    borderWidth: 1,
    borderColor: '#f1c40f',
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    color: '#FFF',
    fontSize: 16,
    height: '100%',
  },
  listContent: {
    padding: 15,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 12,
    borderRadius: getResponsiveSize(12),
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(241, 196, 15, 0.5)',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: '#f1c40f',
  },
  userInfo: {
    flex: 1,
    marginLeft: 15,
  },
  pseudo: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 15,
  },
  statsText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 50,
  },
  emptyText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 16,
  },
});

export default UserSearchModal;
