import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ImageBackground, Alert, TouchableOpacity, Image, ScrollView, Modal, FlatList, TouchableWithoutFeedback, Keyboard, SafeAreaView, Dimensions } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { updateUser, logout } from '../redux/slices/authSlice';
import { useCoinsContext } from '../context/CoinsContext';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import SyncIndicator from '../components/SyncIndicator';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { playButtonSound } from '../utils/soundManager';
import { API_URL } from '../config';
import { COUNTRIES } from '../utils/countries';
import { PREMIUM_AVATARS, getAvatarSource } from '../utils/avatarUtils';
import TransactionService from '../services/TransactionService';
import { LinearGradient } from 'expo-linear-gradient';
import { getResponsiveSize } from '../utils/responsive';

const { width } = Dimensions.get('window');

const AVATARS = [
  'https://cdn-icons-png.flaticon.com/512/147/147144.png',
  'https://cdn-icons-png.flaticon.com/512/147/147142.png',
  'https://cdn-icons-png.flaticon.com/512/147/147140.png',
  'https://cdn-icons-png.flaticon.com/512/147/147133.png',
  'https://cdn-icons-png.flaticon.com/512/194/194938.png',
  'https://cdn-icons-png.flaticon.com/512/194/194935.png',
];

const ProfileScreen = ({ navigation }) => {
  const user = useSelector(state => state.auth.user);
  const token = useSelector(state => state.auth.token);
  const dispatch = useDispatch();
  
  const { refreshBalance } = useCoinsContext();
  
  const [pseudo, setPseudo] = useState(user?.pseudo || '');
  const [email, setEmail] = useState(user?.email || '');
  const [selectedAvatar, setSelectedAvatar] = useState(user?.avatar || null);
  const [selectedCountry, setSelectedCountry] = useState(user?.country || null);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [showCountryModal, setShowCountryModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [imageUri, setImageUri] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [isEditing, setIsEditing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadTransactions();
      refreshBalance();
    }, [])
  );

  const loadTransactions = async () => {
      const history = await TransactionService.getHistory();
      setTransactions(history);
  };

  const filteredCountries = COUNTRIES.filter(country => 
    country.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission refusée', 'Désolé, nous avons besoin des permissions pour accéder à vos photos !');
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
      setSelectedAvatar(null);
      setShowAvatarModal(false);
    }
  };

  const handleSelectAvatar = (avatarUrl) => {
    setSelectedAvatar(avatarUrl);
    setImageUri(null);
    setShowAvatarModal(false);
  };

  const handleSelectCountry = (country) => {
    setSelectedCountry(country.flag);
    setShowCountryModal(false);
  };

  const handleSave = async () => {
    if (!pseudo.trim()) {
      Alert.alert('Erreur', 'Le pseudo ne peut pas être vide');
      return;
    }

    const formData = new FormData();
    formData.append('pseudo', pseudo);
    
    if (imageUri) {
      const filename = imageUri.split('/').pop();
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';
      
      formData.append('avatar', {
        uri: imageUri,
        name: filename,
        type: type,
      });
    } else if (selectedAvatar) {
      formData.append('avatar', selectedAvatar);
    }

    if (selectedCountry) {
      formData.append('country', selectedCountry);
    }

    try {
      const response = await fetch(`${API_URL}/users/profile`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData
      });

      const data = await response.json();

      if (response.ok) {
        dispatch(updateUser(data));
        Alert.alert('Succès', 'Profil mis à jour !');
        setIsEditing(false);
      } else {
        Alert.alert('Erreur', data.message || 'Erreur lors de la mise à jour');
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Erreur', 'Impossible de se connecter au serveur');
    }
  };

  const handleLogout = () => {
    Alert.alert(
      "Déconnexion",
      "Voulez-vous vraiment vous déconnecter ?",
      [
        { text: "Annuler", style: "cancel" },
        { 
          text: "Se déconnecter", 
          style: "destructive",
          onPress: () => {
            dispatch(logout());
            navigation.reset({
              index: 0,
              routes: [{ name: 'Login' }],
            });
          }
        }
      ]
    );
  };

  const handleDeactivate = () => {
    Alert.alert(
      "Désactiver le compte",
      "Êtes-vous sûr de vouloir désactiver votre compte ? Vous pourrez le réactiver en vous reconnectant.",
      [
        { text: "Annuler", style: "cancel" },
        { 
          text: "Désactiver", 
          style: "destructive",
          onPress: async () => {
            try {
              const response = await fetch(`${API_URL}/users/deactivate`, {
                method: 'PATCH',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json'
                }
              });

              if (response.ok) {
                Alert.alert("Succès", "Votre compte a été désactivé.");
                dispatch(logout());
                navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
              } else {
                Alert.alert("Erreur", "Impossible de désactiver le compte.");
              }
            } catch (error) {
              console.error(error);
              Alert.alert("Erreur", "Erreur réseau.");
            }
          }
        }
      ]
    );
  };

  const handleDelete = () => {
    Alert.alert(
      "Supprimer le compte",
      "ATTENTION : Cette action est irréversible. Toutes vos données seront perdues définitivement.",
      [
        { text: "Annuler", style: "cancel" },
        { 
          text: "Supprimer définitivement", 
          style: "destructive",
          onPress: async () => {
            try {
              const response = await fetch(`${API_URL}/users/profile`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
              });

              if (response.ok) {
                Alert.alert("Compte supprimé", "Votre compte a été supprimé avec succès.");
                dispatch(logout());
                navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
              } else {
                Alert.alert("Erreur", "Impossible de supprimer le compte.");
              }
            } catch (error) {
              console.error(error);
              Alert.alert("Erreur", "Erreur réseau.");
            }
          }
        }
      ]
    );
  };

  const handleSelectPremiumAvatar = (avatarId) => {
    if (!user?.isPremium && !user?.isEarlyAccess) {
        Alert.alert('Premium requis', 'Ces avatars sont réservés aux membres Premium.');
        return;
    }
    setSelectedAvatar(avatarId);
    setImageUri(null);
    setShowAvatarModal(false);
  };

  const renderAvatar = () => {
    if (imageUri) {
      return <Image source={{ uri: imageUri }} style={styles.avatarImage} />;
    }
    if (selectedAvatar) {
      const source = getAvatarSource(selectedAvatar);
      return <Image source={source} style={styles.avatarImage} />;
    }
    return <Ionicons name="person-circle-outline" size={getResponsiveSize(100)} color="#fff" />;
  };

  return (
    <ImageBackground 
      source={require('../../assets/images/Background2-4.png')} 
      style={styles.background}
      resizeMode="cover"
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
            <TouchableOpacity onPress={() => { playButtonSound(); navigation.goBack(); }} style={styles.backButton}>
                <Ionicons name="arrow-back" size={getResponsiveSize(24)} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Mon Profil</Text>
            <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
                <Ionicons name="log-out-outline" size={getResponsiveSize(24)} color="#ff6b6b" />
            </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            
            {/* Profil Card */}
            <View style={styles.profileCard}>
                <View style={styles.avatarContainer}>
                    <TouchableOpacity onPress={() => isEditing && setShowAvatarModal(true)} disabled={!isEditing}>
                        <View style={[styles.avatarWrapper, isEditing && styles.avatarEditable]}>
                            {renderAvatar()}
                            {isEditing && (
                                <View style={styles.editIconBadge}>
                                    <Ionicons name="camera" size={getResponsiveSize(16)} color="#fff" />
                                </View>
                            )}
                        </View>
                    </TouchableOpacity>
                    
                    {user?.isPremium && (
                        <LinearGradient
                            colors={['#FFD700', '#FFA500']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.premiumBadge}
                        >
                            <Text style={styles.premiumText}>
                                💎 {user.isEarlyAccess ? 'PREMIUM (OFFERT)' : 'PREMIUM'}
                            </Text>
                        </LinearGradient>
                    )}

                    <Text style={styles.pseudoText}>
                        {user?.pseudo} {selectedCountry && <Text style={{fontSize: getResponsiveSize(20)}}>{selectedCountry}</Text>}
                    </Text>
                    <Text style={styles.emailText}>{user?.email}</Text>
                </View>

                {/* Stats Grid */}
                <View style={styles.statsGrid}>
                    <View style={styles.statItem}>
                        <Text style={styles.statValue}>{user?.stats?.wins || 0}</Text>
                        <Text style={styles.statLabel}>Victoires</Text>
                    </View>
                    <View style={[styles.statItem, styles.statBorder]}>
                        <Text style={styles.statValue}>{user?.stats?.losses || 0}</Text>
                        <Text style={styles.statLabel}>Défaites</Text>
                    </View>
                    <View style={styles.statItem}>
                        <Text style={[styles.statValue, { color: '#f1c40f' }]}>{user?.coins || 0}</Text>
                        <Text style={styles.statLabel}>Coins</Text>
                    </View>
                </View>
            </View>

            {/* Actions Menu */}
            <View style={styles.menuContainer}>
                <TouchableOpacity style={styles.menuItem} onPress={() => { playButtonSound(); navigation.navigate('PremiumPions'); }}>
                    <View style={[styles.iconBox, { backgroundColor: 'rgba(155, 89, 182, 0.2)' }]}>
                        <MaterialCommunityIcons name="chess-pawn" size={getResponsiveSize(24)} color="#9b59b6" />
                    </View>
                    <View style={{flex: 1}}>
                        <Text style={[styles.menuText, { flex: 0 }]}>Personnaliser mon Pion</Text>
                        <Text style={{ fontSize: getResponsiveSize(12), color: '#aaa', marginTop: 2 }}>
                            {user?.pawnSkin ? `Skin: ${user.pawnSkin.charAt(0).toUpperCase() + user.pawnSkin.slice(1)}` : 'Skin par défaut'}
                        </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={getResponsiveSize(20)} color="#ccc" />
                </TouchableOpacity>

                <TouchableOpacity style={styles.menuItem} onPress={() => { playButtonSound(); setShowHistoryModal(true); }}>
                    <View style={[styles.iconBox, { backgroundColor: 'rgba(52, 152, 219, 0.2)' }]}>
                        <MaterialCommunityIcons name="history" size={getResponsiveSize(24)} color="#3498db" />
                    </View>
                    <Text style={styles.menuText}>Historique des transactions</Text>
                    <Ionicons name="chevron-forward" size={getResponsiveSize(20)} color="#ccc" />
                </TouchableOpacity>

                <TouchableOpacity style={styles.menuItem} onPress={() => {
                    playButtonSound();
                    setIsEditing(!isEditing);
                    if (isEditing) handleSave(); // Save on toggle off if needed, but better to use specific button
                }}>
                    <View style={[styles.iconBox, { backgroundColor: 'rgba(46, 204, 113, 0.2)' }]}>
                        <Ionicons name={isEditing ? "save-outline" : "create-outline"} size={getResponsiveSize(24)} color="#2ecc71" />
                    </View>
                    <Text style={styles.menuText}>{isEditing ? "Sauvegarder les modifications" : "Modifier mon profil"}</Text>
                    <Ionicons name="chevron-forward" size={getResponsiveSize(20)} color="#ccc" />
                </TouchableOpacity>
            </View>

            {/* Edit Form (Visible only when editing) */}
            {isEditing && (
                <View style={styles.editForm}>
                    <Text style={styles.sectionHeader}>Informations personnelles</Text>
                    
                    <Text style={styles.inputLabel}>Pseudo</Text>
                    <Input 
                        value={pseudo} 
                        onChangeText={setPseudo} 
                        placeholder="Votre pseudo"
                        containerStyle={styles.inputContainer}
                    />
                    
                    <Text style={styles.inputLabel}>Pays</Text>
                    <TouchableOpacity style={styles.countrySelectButton} onPress={() => setShowCountryModal(true)}>
                        <Text style={styles.countrySelectText}>
                            {selectedCountry ? `Drapeau actuel: ${selectedCountry}` : 'Choisir un pays'}
                        </Text>
                        <Ionicons name="chevron-down" size={getResponsiveSize(20)} color="#ccc" />
                    </TouchableOpacity>

                    <Button title="Enregistrer" onPress={handleSave} style={styles.saveButton} />
                </View>
            )}

            {/* Danger Zone */}
            <View style={styles.dangerZone}>
                <Text style={styles.dangerTitle}>Zone de danger</Text>
                <TouchableOpacity style={styles.dangerButton} onPress={handleDeactivate}>
                    <Ionicons name="pause-circle-outline" size={getResponsiveSize(20)} color="#f39c12" />
                    <Text style={[styles.dangerButtonText, { color: '#f39c12' }]}>Désactiver mon compte</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.dangerButton} onPress={handleDelete}>
                    <Ionicons name="trash-outline" size={getResponsiveSize(20)} color="#e74c3c" />
                    <Text style={[styles.dangerButtonText, { color: '#e74c3c' }]}>Supprimer mon compte</Text>
                </TouchableOpacity>
            </View>
            
            <View style={{ height: getResponsiveSize(40) }} />
        </ScrollView>
      </SafeAreaView>

      {/* MODAL: Historique des transactions */}
      <Modal visible={showHistoryModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Historique</Text>
                    <TouchableOpacity onPress={() => setShowHistoryModal(false)} style={styles.closeButton}>
                        <Ionicons name="close" size={getResponsiveSize(24)} color="#fff" />
                    </TouchableOpacity>
                </View>
                
                {transactions.length === 0 ? (
                    <View style={styles.emptyState}>
                        <MaterialCommunityIcons name="clipboard-text-off-outline" size={getResponsiveSize(60)} color="#555" />
                        <Text style={styles.emptyText}>Aucune transaction récente</Text>
                    </View>
                ) : (
                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: getResponsiveSize(20) }}>
                        {(() => {
                            const today = new Date().toDateString();
                            const yesterday = new Date(Date.now() - 86400000).toDateString();
                            const groups = { "Aujourd'hui": [], "Hier": [], "Plus ancien": [] };
                            
                            transactions.forEach(tx => {
                                const d = new Date(tx.timestamp).toDateString();
                                if (d === today) groups["Aujourd'hui"].push(tx);
                                else if (d === yesterday) groups["Hier"].push(tx);
                                else groups["Plus ancien"].push(tx);
                            });

                            return Object.entries(groups).map(([label, txs]) => (
                                txs.length > 0 && (
                                    <View key={label} style={styles.historyGroup}>
                                        <Text style={styles.historyDateHeader}>{label}</Text>
                                        {txs.map((tx, index) => (
                                            <View key={index} style={styles.txItem}>
                                                <View style={[styles.txIcon, { 
                                                    backgroundColor: tx.type === 'CREDIT' ? 'rgba(76, 175, 80, 0.1)' : 
                                                                    (tx.type === 'REMBOURSEMENT' || tx.type === 'REFUND') ? 'rgba(33, 150, 243, 0.1)' : 'rgba(244, 67, 54, 0.1)' 
                                                }]}>
                                                    <Text style={{ fontSize: getResponsiveSize(18) }}>
                                                        {tx.type === 'CREDIT' ? '💰' : (tx.type === 'REMBOURSEMENT' || tx.type === 'REFUND') ? '↩️' : '🛒'}
                                                    </Text>
                                                </View>
                                                <View style={styles.txDetails}>
                                                    <Text style={styles.txReason} numberOfLines={1}>{tx.raison || 'Transaction'}</Text>
                                                    <Text style={styles.txDate}>
                                                        {new Date(tx.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </Text>
                                                </View>
                                                <Text style={[
                                                    styles.txAmount, 
                                                    { color: tx.type === 'CREDIT' ? '#4CAF50' : ((tx.type === 'REMBOURSEMENT' || tx.type === 'REFUND') ? '#2196F3' : '#F44336') }
                                                ]}>
                                                    {tx.type === 'CREDIT' || tx.type === 'REMBOURSEMENT' || tx.type === 'REFUND' ? '+' : '-'}{tx.montant}
                                                </Text>
                                            </View>
                                        ))}
                                    </View>
                                )
                            ));
                        })()}
                    </ScrollView>
                )}
            </View>
        </View>
      </Modal>

      {/* Modal choix Avatar */}
      <Modal visible={showAvatarModal} animationType="fade" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Changer d'avatar</Text>
                <TouchableOpacity onPress={() => setShowAvatarModal(false)} style={styles.closeButton}>
                    <Ionicons name="close" size={getResponsiveSize(24)} color="#fff" />
                </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              
              <TouchableOpacity style={styles.uploadOption} onPress={pickImage}>
                <View style={styles.uploadIconCircle}>
                    <Ionicons name="images-outline" size={getResponsiveSize(24)} color="#fff" />
                </View>
                <Text style={styles.uploadText}>Choisir depuis la galerie</Text>
              </TouchableOpacity>

              <Text style={styles.separator}>Avatars Classiques</Text>
              <View style={styles.avatarGrid}>
                {AVATARS.map((avatar, index) => (
                  <TouchableOpacity key={index} onPress={() => handleSelectAvatar(avatar)} style={styles.avatarGridItem}>
                    <Image source={{ uri: avatar }} style={styles.gridAvatar} />
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.separator, { color: '#f1c40f' }]}>Avatars Premium</Text>
              <View style={styles.avatarGrid}>
                {PREMIUM_AVATARS.map((avatar, index) => (
                  <TouchableOpacity key={index} onPress={() => handleSelectPremiumAvatar(avatar.id)} style={styles.avatarGridItem}>
                    <View>
                        <Image source={avatar.source} style={styles.gridAvatar} />
                        {(!user?.isPremium && !user?.isEarlyAccess) && (
                            <View style={styles.lockedOverlay}>
                                <Ionicons name="lock-closed" size={getResponsiveSize(20)} color="#f1c40f" />
                            </View>
                        )}
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal choix Pays */}
      <Modal visible={showCountryModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Choisir votre pays</Text>
                <TouchableOpacity onPress={() => setShowCountryModal(false)} style={styles.closeButton}>
                    <Ionicons name="close" size={getResponsiveSize(24)} color="#fff" />
                </TouchableOpacity>
            </View>
            
            <Input 
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Rechercher un pays..."
              style={{ marginBottom: getResponsiveSize(15) }}
            />

            <FlatList
              data={filteredCountries}
              keyExtractor={(item) => item.name}
              numColumns={3}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.countryItem} onPress={() => { playButtonSound(); handleSelectCountry(item); }}>
                  <Text style={styles.countryFlag}>{item.flag}</Text>
                  <Text style={styles.countryName} numberOfLines={1}>{item.name}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  background: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  safeArea: {
    flex: 1,
    paddingTop: getResponsiveSize(20),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: getResponsiveSize(20),
    paddingBottom: getResponsiveSize(10),
  },
  headerTitle: {
    fontSize: getResponsiveSize(20),
    color: '#fff',
    fontWeight: 'bold',
    fontFamily: 'Roboto', 
  },
  backButton: {
    padding: getResponsiveSize(8),
  },
  logoutButton: {
    padding: getResponsiveSize(8),
  },
  scrollContent: {
    paddingHorizontal: getResponsiveSize(20),
    paddingBottom: getResponsiveSize(40),
  },
  profileCard: {
    backgroundColor: '#041c55',
    borderRadius: getResponsiveSize(20),
    padding: getResponsiveSize(20),
    alignItems: 'center',
    marginBottom: getResponsiveSize(20),
    borderWidth: getResponsiveSize(1),
    borderColor: '#f1c40f',
    shadowColor: '#f1c40f',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.5,
    shadowRadius: getResponsiveSize(5),
    elevation: getResponsiveSize(5),
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: getResponsiveSize(20),
  },
  avatarWrapper: {
    width: getResponsiveSize(100),
    height: getResponsiveSize(100),
    borderRadius: getResponsiveSize(50),
    borderWidth: getResponsiveSize(3),
    borderColor: '#3498db',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: getResponsiveSize(10),
    overflow: 'hidden',
  },
  avatarEditable: {
    borderColor: '#2ecc71',
    borderStyle: 'dashed',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  editIconBadge: {
    position: 'absolute',
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    width: '100%',
    height: getResponsiveSize(30),
    justifyContent: 'center',
    alignItems: 'center',
  },
  premiumBadge: {
    paddingHorizontal: getResponsiveSize(12),
    paddingVertical: getResponsiveSize(4),
    borderRadius: getResponsiveSize(12),
    marginBottom: getResponsiveSize(8),
  },
  premiumText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: getResponsiveSize(10),
  },
  pseudoText: {
    fontSize: getResponsiveSize(24),
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: getResponsiveSize(4),
  },
  emailText: {
    fontSize: getResponsiveSize(14),
    color: '#aaa',
  },
  statsGrid: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-around',
    marginTop: getResponsiveSize(10),
    paddingTop: getResponsiveSize(15),
    borderTopWidth: getResponsiveSize(1),
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statBorder: {
    borderLeftWidth: getResponsiveSize(1),
    borderRightWidth: getResponsiveSize(1),
    borderColor: 'rgba(255,255,255,0.1)',
  },
  statValue: {
    fontSize: getResponsiveSize(20),
    fontWeight: 'bold',
    color: '#fff',
  },
  statLabel: {
    fontSize: getResponsiveSize(12),
    color: '#888',
    marginTop: getResponsiveSize(4),
  },
  menuContainer: {
    backgroundColor: '#041c55',
    borderRadius: getResponsiveSize(16),
    padding: getResponsiveSize(10),
    marginBottom: getResponsiveSize(20),
    borderWidth: getResponsiveSize(1),
    borderColor: '#f1c40f',
    shadowColor: '#f1c40f',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.5,
    shadowRadius: getResponsiveSize(5),
    elevation: getResponsiveSize(5),
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: getResponsiveSize(15),
    paddingHorizontal: getResponsiveSize(10),
    borderBottomWidth: getResponsiveSize(1),
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  iconBox: {
    width: getResponsiveSize(40),
    height: getResponsiveSize(40),
    borderRadius: getResponsiveSize(10),
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: getResponsiveSize(15),
  },
  menuText: {
    flex: 1,
    fontSize: getResponsiveSize(16),
    color: '#fff',
  },
  editForm: {
    backgroundColor: '#041c55',
    borderRadius: getResponsiveSize(16),
    padding: getResponsiveSize(20),
    marginBottom: getResponsiveSize(20),
    borderWidth: getResponsiveSize(1),
    borderColor: '#f1c40f',
    shadowColor: '#f1c40f',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.5,
    shadowRadius: getResponsiveSize(5),
    elevation: getResponsiveSize(5),
  },
  sectionHeader: {
    fontSize: getResponsiveSize(18),
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: getResponsiveSize(15),
  },
  inputLabel: {
    color: '#ccc',
    marginBottom: getResponsiveSize(8),
    fontSize: getResponsiveSize(14),
  },
  inputContainer: {
    marginBottom: getResponsiveSize(15),
  },
  countrySelectButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: getResponsiveSize(15),
    borderRadius: getResponsiveSize(10),
    marginBottom: getResponsiveSize(20),
  },
  countrySelectText: {
    color: '#fff',
    fontSize: getResponsiveSize(16),
  },
  saveButton: {
    marginTop: getResponsiveSize(10),
  },
  dangerZone: {
    marginTop: getResponsiveSize(20),
    padding: getResponsiveSize(20),
    borderRadius: getResponsiveSize(16),
    borderWidth: getResponsiveSize(1),
    backgroundColor: '#041c55',
    borderColor: '#f1c40f',
    shadowColor: '#f1c40f',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.5,
    shadowRadius: 5,
    elevation: 5,
  },
  dangerTitle: {
    color: '#e74c3c',
    fontSize: getResponsiveSize(16),
    fontWeight: 'bold',
    marginBottom: getResponsiveSize(15),
  },
  dangerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: getResponsiveSize(12),
  },
  dangerButtonText: {
    marginLeft: getResponsiveSize(10),
    fontSize: getResponsiveSize(16),
    fontWeight: '500',
  },
  
  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1e1e1e',
    borderTopLeftRadius: getResponsiveSize(25),
    borderTopRightRadius: getResponsiveSize(25),
    padding: getResponsiveSize(20),
    maxHeight: '85%',
    minHeight: '50%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: getResponsiveSize(20),
    borderBottomWidth: getResponsiveSize(1),
    borderBottomColor: 'rgba(255,255,255,0.1)',
    paddingBottom: getResponsiveSize(15),
  },
  modalTitle: {
    fontSize: getResponsiveSize(20),
    fontWeight: 'bold',
    color: '#fff',
  },
  closeButton: {
    padding: getResponsiveSize(5),
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: getResponsiveSize(40),
  },
  emptyText: {
    color: '#888',
    marginTop: getResponsiveSize(10),
    fontSize: getResponsiveSize(16),
  },
  historyGroup: {
    marginBottom: getResponsiveSize(20),
  },
  historyDateHeader: {
    color: '#888',
    fontSize: getResponsiveSize(14),
    marginBottom: getResponsiveSize(10),
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  txItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: getResponsiveSize(12),
    borderRadius: getResponsiveSize(12),
    marginBottom: getResponsiveSize(8),
  },
  txIcon: {
    width: getResponsiveSize(40),
    height: getResponsiveSize(40),
    borderRadius: getResponsiveSize(20),
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: getResponsiveSize(12),
  },
  txDetails: {
    flex: 1,
  },
  txReason: {
    color: '#fff',
    fontSize: getResponsiveSize(16),
    fontWeight: '500',
    marginBottom: getResponsiveSize(2),
  },
  txDate: {
    color: '#888',
    fontSize: getResponsiveSize(12),
  },
  txAmount: {
    fontSize: getResponsiveSize(16),
    fontWeight: 'bold',
  },
  
  // Avatar Modal
  uploadOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(52, 152, 219, 0.1)',
    padding: getResponsiveSize(15),
    borderRadius: getResponsiveSize(12),
    marginBottom: getResponsiveSize(20),
  },
  uploadIconCircle: {
    width: getResponsiveSize(40),
    height: getResponsiveSize(40),
    borderRadius: getResponsiveSize(20),
    backgroundColor: '#3498db',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: getResponsiveSize(15),
  },
  uploadText: {
    color: '#fff',
    fontSize: getResponsiveSize(16),
    fontWeight: '500',
  },
  separator: {
    color: '#888',
    fontSize: getResponsiveSize(14),
    fontWeight: 'bold',
    marginBottom: getResponsiveSize(15),
    marginTop: getResponsiveSize(10),
  },
  avatarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: getResponsiveSize(20),
  },
  avatarGridItem: {
    width: (width - getResponsiveSize(60)) / 3,
    height: (width - getResponsiveSize(60)) / 3,
    marginBottom: getResponsiveSize(10),
    borderRadius: getResponsiveSize(12),
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  gridAvatar: {
    width: '100%',
    height: '100%',
  },
  lockedOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Country Modal
  countryItem: {
    width: (width - getResponsiveSize(60)) / 3,
    alignItems: 'center',
    marginBottom: getResponsiveSize(20),
    padding: getResponsiveSize(5),
  },
  countryFlag: {
    fontSize: getResponsiveSize(32),
    marginBottom: getResponsiveSize(5),
  },
  countryName: {
    color: '#ccc',
    fontSize: getResponsiveSize(12),
    textAlign: 'center',
  },
});

export default ProfileScreen;
