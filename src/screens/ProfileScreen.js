import React, { useState } from 'react';
import { View, Text, StyleSheet, ImageBackground, Alert, TouchableOpacity, Image, ScrollView, Modal, FlatList, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { updateUser, logout } from '../redux/slices/authSlice';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { playButtonSound } from '../utils/soundManager';
import { API_URL } from '../config';
import { COUNTRIES } from '../utils/countries';
import { PREMIUM_AVATARS, getAvatarSource } from '../utils/avatarUtils';

// Note: PREMIUM_AVATARS is imported from utils, do not redeclare it here.


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
  
  const [pseudo, setPseudo] = useState(user?.pseudo || '');
  const [email, setEmail] = useState(user?.email || '');
  const [selectedAvatar, setSelectedAvatar] = useState(user?.avatar || null);
  const [selectedCountry, setSelectedCountry] = useState(user?.country || null);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [showCountryModal, setShowCountryModal] = useState(false);
  const [imageUri, setImageUri] = useState(null);

  const filteredCountries = COUNTRIES.filter(country => 
    country.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const pickImage = async () => {
    // Demander la permission
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
      setSelectedAvatar(null); // Clear predefined avatar selection
      setShowAvatarModal(false);
    }
  };

  const handleSelectAvatar = (avatarUrl) => {
    setSelectedAvatar(avatarUrl);
    setImageUri(null); // Clear uploaded image selection
    setShowAvatarModal(false);
  };

  const handleSelectCountry = (country) => {
    setSelectedCountry(country.flag); // Store only flag for now, or object if needed
    setShowCountryModal(false);
  };

  const handleSave = async () => {
    if (!pseudo.trim()) {
      Alert.alert('Erreur', 'Le pseudo ne peut pas être vide');
      return;
    }

    const formData = new FormData();
    formData.append('pseudo', pseudo);
    
    // Si une nouvelle image a été choisie
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
      // Note: We need to use fetch directly here because we're sending FormData
      // Or we can modify our redux action to handle FormData, but direct fetch is easier for this case
      const response = await fetch(`${API_URL}/users/profile`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          // 'Content-Type': 'multipart/form-data', // Let fetch set this automatically for FormData
        },
        body: formData
      });

      const data = await response.json();

      if (response.ok) {
        dispatch(updateUser(data));
        Alert.alert('Succès', 'Profil mis à jour !');
        navigation.goBack();
      } else {
        Alert.alert('Erreur', data.message || 'Erreur lors de la mise à jour');
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Erreur', 'Impossible de se connecter au serveur');
    }
  };

  const handleLogout = () => {
    dispatch(logout());
    navigation.reset({
      index: 0,
      routes: [{ name: 'Login' }],
    });
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
                handleLogout();
              } else {
                const text = await response.text();
                try {
                  const data = JSON.parse(text);
                  Alert.alert("Erreur", data.message || "Impossible de désactiver le compte.");
                } catch (e) {
                  console.error("Non-JSON response:", text);
                  Alert.alert("Erreur", "Réponse inattendue du serveur.");
                }
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
      "ATTENTION : Cette action est irréversible. Toutes vos données (victoires, coins, etc.) seront perdues définitivement.",
      [
        { text: "Annuler", style: "cancel" },
        { 
          text: "Supprimer définitivement", 
          style: "destructive",
          onPress: async () => {
            try {
              const response = await fetch(`${API_URL}/users/profile`, {
                method: 'DELETE',
                headers: {
                  'Authorization': `Bearer ${token}`
                }
              });

              if (response.ok) {
                Alert.alert("Compte supprimé", "Votre compte a été supprimé avec succès.");
                handleLogout();
              } else {
                const text = await response.text();
                try {
                  const data = JSON.parse(text);
                  Alert.alert("Erreur", data.message || "Impossible de supprimer le compte.");
                } catch (e) {
                  console.error("Non-JSON response:", text);
                  Alert.alert("Erreur", "Réponse inattendue du serveur.");
                }
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
    return <Ionicons name="person-circle-outline" size={100} color="#fff" />;
  };

  return (
    <ImageBackground 
      source={require('../../assets/images/Background2-4.png')} 
      style={styles.background}
      resizeMode="cover"
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={{ flex: 1 }}>
            <View style={styles.header}>
              <TouchableOpacity onPress={() => { playButtonSound(); navigation.goBack(); }} style={styles.backButton}>
                <Ionicons name="arrow-back" size={24} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Mon Profil</Text>
              <View style={{ width: 24 }} /> 
            </View>

            <View style={styles.container}>
          <View style={styles.avatarSection}>
             <TouchableOpacity onPress={() => { playButtonSound(); setShowAvatarModal(true); }}>
               <View style={styles.avatarWrapper}>
                 {renderAvatar()}
                 <View style={styles.editIcon}>
                   <Ionicons name="camera" size={20} color="#000" />
                 </View>
               </View>
             </TouchableOpacity>
             {user?.isPremium && (
               <View style={{ marginTop: 10, backgroundColor: '#FFD700', paddingHorizontal: 10, paddingVertical: 2, borderRadius: 10 }}>
                 <Text style={{ color: 'black', fontWeight: 'bold', fontSize: 12 }}>
                   💎 {user.isEarlyAccess ? 'PREMIUM (OFFERT)' : 'PREMIUM'}
                 </Text>
               </View>
             )}
             <Text style={styles.currentPseudo}>{user?.pseudo}</Text>
             {selectedCountry && <Text style={styles.flag}>{selectedCountry}</Text>}

             <View style={styles.statsContainer}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{user?.stats?.wins || 0}</Text>
                  <Text style={styles.statLabel}>Victoires</Text>
                </View>
                <View style={[styles.statItem, styles.statBorder]}>
                  <Text style={styles.statValue}>{user?.stats?.losses || 0}</Text>
                  <Text style={styles.statLabel}>Défaites</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{user?.coins || 0}</Text>
                  <Text style={styles.statLabel}>Coins</Text>
                </View>
             </View>
          </View>

          <View style={styles.form}>
              <Text style={styles.label}>Pseudo</Text>
              <Input 
                  value={pseudo} 
                  onChangeText={setPseudo} 
                  placeholder="Votre pseudo"
              />
              
              <Text style={styles.label}>Email</Text>
              <Input 
                  value={email} 
                  onChangeText={setEmail} 
                  placeholder="Votre email"
                  editable={false}
                  style={{ opacity: 0.7 }}
              />

              <Text style={styles.label}>Pays</Text>
              <TouchableOpacity style={styles.countrySelector} onPress={() => { playButtonSound(); setShowCountryModal(true); }}>
                <Text style={styles.countryText}>
                  {selectedCountry ? `Drapeau actuel: ${selectedCountry}` : 'Choisir un pays'}
                </Text>
                <Ionicons name="chevron-forward" size={24} color="#000" />
              </TouchableOpacity>

              <Button title="Enregistrer les modifications" onPress={handleSave} />
              
              <Button 
              title="Se déconnecter" 
              onPress={handleLogout} 
              style={{ backgroundColor: '#ff6b6b', marginTop: 20 }}
              />

              <View style={styles.dangerZone}>
                <Text style={styles.dangerTitle}>Zone de danger</Text>
                <Button 
                  title="Désactiver mon compte" 
                  onPress={handleDeactivate} 
                  style={{ backgroundColor: '#f39c12', marginTop: 10 }}
                />
                <Button 
                  title="Supprimer mon compte" 
                  onPress={handleDelete} 
                  style={{ backgroundColor: '#c0392b', marginTop: 10 }}
                />
              </View>
          </View>
        </View>
        </View>
      </TouchableWithoutFeedback>
    </ScrollView>

      {/* Modal choix Avatar */}
      <Modal visible={showAvatarModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>Changer d'avatar</Text>
              
              <TouchableOpacity style={styles.uploadOption} onPress={pickImage}>
                <Ionicons name="image" size={24} color="#333" />
                <Text style={styles.uploadText}>Choisir depuis la galerie</Text>
              </TouchableOpacity>

              <Text style={styles.separator}>OU choisir un avatar</Text>

              <View style={styles.avatarGrid}>
                {AVATARS.map((avatar, index) => (
                  <TouchableOpacity key={index} onPress={() => handleSelectAvatar(avatar)}>
                    <Image source={{ uri: avatar }} style={styles.gridAvatar} />
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.separator, { marginTop: 20, color: '#f1c40f' }]}>Avatars Premium</Text>
              <View style={styles.avatarGrid}>
                {PREMIUM_AVATARS.map((avatar, index) => (
                  <TouchableOpacity key={index} onPress={() => handleSelectPremiumAvatar(avatar.id)}>
                    <View>
                        <Image source={avatar.source} style={styles.gridAvatar} />
                        {(!user?.isPremium && !user?.isEarlyAccess) && (
                            <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', borderRadius: 40 }}>
                                <Ionicons name="lock-closed" size={24} color="#f1c40f" />
                            </View>
                        )}
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
              
              <Button title="Annuler" onPress={() => setShowAvatarModal(false)} style={{ marginTop: 20, backgroundColor: '#999' }} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal choix Pays */}
      <Modal visible={showCountryModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Choisir votre pays</Text>
            
            <Input 
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Rechercher un pays..."
              style={{ marginBottom: 15 }}
            />

            <FlatList
              data={filteredCountries}
              keyExtractor={(item) => item.name}
              numColumns={3}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.countryItem} onPress={() => { playButtonSound(); handleSelectCountry(item); }}>
                  <Text style={styles.countryFlag}>{item.flag}</Text>
                  <Text style={styles.countryName}>{item.name}</Text>
                </TouchableOpacity>
              )}
            />
            
            <Button title="Annuler" onPress={() => setShowCountryModal(false)} style={{ marginTop: 20, backgroundColor: '#999' }} />
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 50,
  },
  headerTitle: {
    fontSize: 20,
    color: '#fff',
    fontWeight: 'bold',
  },
  container: {
    flex: 1,
    padding: 20,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 30,
  },
  avatarWrapper: {
    position: 'relative',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  editIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#fff',
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  currentPseudo: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 10,
  },
  flag: {
    fontSize: 30,
    marginTop: 5,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 15,
    padding: 15,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statBorder: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  statValue: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  statLabel: {
    color: '#ccc',
    fontSize: 12,
    marginTop: 5,
  },
  form: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 20,
    borderRadius: 15,
  },
  label: {
    color: '#ccc',
    marginBottom: 5,
    marginLeft: 5,
  },
  countrySelector: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: 15,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 10,
  },
  countryText: {
    fontSize: 16,
    color: '#000',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  uploadOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    marginBottom: 20,
  },
  uploadText: {
    marginLeft: 10,
    fontSize: 16,
  },
  separator: {
    textAlign: 'center',
    color: '#666',
    marginVertical: 10,
    fontWeight: 'bold',
  },
  avatarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 15,
    marginTop: 10,
  },
  gridAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  countryItem: {
    flex: 1,
    alignItems: 'center',
    margin: 10,
    padding: 10,
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
  },
  countryFlag: {
    fontSize: 40,
  },
  countryName: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 5,
  },
  dangerZone: {
    marginTop: 30,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.3)',
    paddingTop: 20,
    width: '100%',
  },
  dangerTitle: {
    color: '#ff6b6b',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  }
});

export default ProfileScreen;
