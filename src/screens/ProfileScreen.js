import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ImageBackground, Image, ScrollView, Modal, FlatList, TouchableWithoutFeedback, Keyboard, SafeAreaView, Platform, useWindowDimensions } from 'react-native';
import { AppTouchableOpacity as TouchableOpacity } from '../components/common/AppTouchable';
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
import { getResponsiveSize, DESKTOP_BREAKPOINT } from '../utils/responsive';
import { appAlert } from '../services/appAlert';
import { T } from '../utils/theme';
import { selectHasTempPremiumPions } from '../redux/slices/rewardsSlice';

const AVATARS = [
  'https://cdn-icons-png.flaticon.com/512/147/147144.png',
  'https://cdn-icons-png.flaticon.com/512/147/147142.png',
  'https://cdn-icons-png.flaticon.com/512/147/147140.png',
  'https://cdn-icons-png.flaticon.com/512/147/147133.png',
  'https://cdn-icons-png.flaticon.com/512/194/194938.png',
  'https://cdn-icons-png.flaticon.com/512/194/194935.png',
];

const ProfileScreen = ({ navigation }) => {
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const isDesktop = Platform.OS === 'web' && width >= DESKTOP_BREAKPOINT;
  const user = useSelector(state => state.auth.user);
  const token = useSelector(state => state.auth.token);
  const hasTempPremiumPions = useSelector(selectHasTempPremiumPions);
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
      appAlert('Permission refusée', 'Désolé, nous avons besoin des permissions pour accéder à vos photos !');
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
      appAlert('Erreur', 'Le pseudo ne peut pas être vide');
      return;
    }

    const formData = new FormData();
    formData.append('pseudo', pseudo);
    
    if (imageUri) {
      const filename = imageUri.split('/').pop();
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';
      
      // On React Native, we MUST use this object structure for file uploads
      formData.append('avatar', {
        uri: Platform.OS === 'android' ? imageUri : imageUri.replace('file://', ''),
        name: filename || 'avatar.jpg',
        type: type,
      });
    } else if (selectedAvatar) {
      formData.append('avatar', selectedAvatar);
    }

    if (selectedCountry) {
      formData.append('country', selectedCountry);
    }

    try {
      // Logic for saving (pseudo, avatar, country)
      const isSaving = true;
      
      const response = await fetch(`${API_URL}/users/profile`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          // DO NOT set Content-Type header when sending FormData
        },
        body: formData
      });

      const data = await response.json();

      if (response.ok) {
        dispatch(updateUser(data));
        appAlert('Succès', 'Profil mis à jour !');
        setIsEditing(false);
      } else {
        appAlert('Erreur', data.message || 'Erreur lors de la mise à jour');
      }
    } catch (error) {
      console.error(error);
      appAlert('Erreur', 'Impossible de se connecter au serveur');
    }
  };

  const handleLogout = () => {
    playButtonSound();
    appAlert(
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
    playButtonSound();
    appAlert(
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
                appAlert("Succès", "Votre compte a été désactivé.");
                dispatch(logout());
                navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
              } else {
                appAlert("Erreur", "Impossible de désactiver le compte.");
              }
            } catch (error) {
              console.error(error);
              appAlert("Erreur", "Erreur réseau.");
            }
          }
        }
      ]
    );
  };

  const handleDelete = () => {
    playButtonSound();
    appAlert(
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
                appAlert("Compte supprimé", "Votre compte a été supprimé avec succès.");
                dispatch(logout());
                navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
              } else {
                appAlert("Erreur", "Impossible de supprimer le compte.");
              }
            } catch (error) {
              console.error(error);
              appAlert("Erreur", "Erreur réseau.");
            }
          }
        }
      ]
    );
  };

  const handleSelectPremiumAvatar = (avatarId) => {
    playButtonSound();
    if (!user?.isPremium && !user?.isEarlyAccess && !hasTempPremiumPions) {
        appAlert('Premium requis', 'Ces avatars sont réservés aux membres Premium.');
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
      <View style={styles.bgOverlay} pointerEvents="none" />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
            <TouchableOpacity onPress={() => { navigation.goBack(); }} style={styles.backButton}>
                <Ionicons name="arrow-back" size={getResponsiveSize(24)} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Mon Profil</Text>
            <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
                <Ionicons name="log-out-outline" size={getResponsiveSize(24)} color="#ff6b6b" />
            </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={[styles.scrollContent, isTablet && styles.scrollContentWide]} showsVerticalScrollIndicator={false}>

          {isTablet ? (
            /* ── Disposition 2 colonnes (tablette & desktop) ── */
            <>
              <View style={styles.twoColRow}>

                {/* Colonne gauche : avatar + menu + édition */}
                <View style={styles.leftCol}>
                  <View style={styles.profileCard}>
                    <View style={styles.avatarContainer}>
                      <TouchableOpacity onPress={() => { playButtonSound(); setIsEditing(true); setShowAvatarModal(true); }}>
                        <View style={[styles.avatarWrapper, styles.avatarWrapperTablet, isEditing && styles.avatarEditable, !isEditing && { borderColor: T.gold }]}>
                          {renderAvatar()}
                          <View style={[styles.editIconBadge, !isEditing && { backgroundColor: 'rgba(0,0,0,0.3)' }]}>
                            <Ionicons name="camera" size={getResponsiveSize(16)} color="#fff" />
                          </View>
                        </View>
                      </TouchableOpacity>
                      {user?.isPremium && (
                        <LinearGradient colors={['#FFD700', '#FFA500']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.premiumBadge}>
                          <Text style={styles.premiumText}>💎 {user.isEarlyAccess ? 'PREMIUM (OFFERT)' : 'PREMIUM'}</Text>
                        </LinearGradient>
                      )}
                      <Text style={styles.pseudoText}>
                        {user?.pseudo} {selectedCountry && <Text style={{fontSize: getResponsiveSize(20)}}>{selectedCountry}</Text>}
                      </Text>
                      <Text style={styles.emailText}>{user?.email}</Text>
                    </View>
                  </View>

                  <View style={styles.menuContainer}>
                    <TouchableOpacity style={styles.menuItem} onPress={() => { navigation.navigate('PremiumPions'); }}>
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
                    <TouchableOpacity style={styles.menuItem} onPress={() => { setShowHistoryModal(true); }}>
                      <View style={[styles.iconBox, { backgroundColor: 'rgba(52, 152, 219, 0.2)' }]}>
                        <MaterialCommunityIcons name="history" size={getResponsiveSize(24)} color="#3498db" />
                      </View>
                      <Text style={styles.menuText}>Historique des transactions</Text>
                      <Ionicons name="chevron-forward" size={getResponsiveSize(20)} color="#ccc" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.menuItem} onPress={() => { setIsEditing(!isEditing); if (isEditing) handleSave(); }}>
                      <View style={[styles.iconBox, { backgroundColor: 'rgba(46, 204, 113, 0.2)' }]}>
                        <Ionicons name={isEditing ? "save-outline" : "create-outline"} size={getResponsiveSize(24)} color="#2ecc71" />
                      </View>
                      <Text style={styles.menuText}>{isEditing ? "Sauvegarder les modifications" : "Modifier mon profil"}</Text>
                      <Ionicons name="chevron-forward" size={getResponsiveSize(20)} color="#ccc" />
                    </TouchableOpacity>
                  </View>

                  {isEditing && (
                    <View style={styles.editForm}>
                      <Text style={styles.sectionHeader}>Informations personnelles</Text>
                      <Text style={styles.inputLabel}>Pseudo</Text>
                      <Input value={pseudo} onChangeText={setPseudo} placeholder="Votre pseudo" containerStyle={styles.inputContainer} />
                      <Text style={styles.inputLabel}>Pays</Text>
                      <TouchableOpacity style={styles.countrySelectButton} onPress={() => setShowCountryModal(true)}>
                        <Text style={styles.countrySelectText}>{selectedCountry ? `Drapeau actuel: ${selectedCountry}` : 'Choisir un pays'}</Text>
                        <Ionicons name="chevron-down" size={getResponsiveSize(20)} color="#ccc" />
                      </TouchableOpacity>
                      <Button title="Enregistrer" onPress={handleSave} style={styles.saveButton} />
                    </View>
                  )}
                </View>

                {/* Colonne droite : stats + zone de danger */}
                <View style={styles.rightCol}>
                  <View style={styles.profileCard}>
                    <View style={styles.heroRow}>
                      <View style={styles.heroStat}>
                        <Text style={styles.heroValue}>{(user?.coins || 0).toLocaleString()}</Text>
                        <Text style={styles.heroLabel}>💰 Pièces</Text>
                      </View>
                      <View style={styles.heroSep} />
                      <View style={styles.heroStat}>
                        <Text style={[styles.heroValue, { color: T.blue }]}>{user?.ranking ?? '—'}</Text>
                        <Text style={styles.heroLabel}>🏆 Classement</Text>
                      </View>
                      {(user?.niveau || user?.level) ? (
                        <>
                          <View style={styles.heroSep} />
                          <View style={styles.heroStat}>
                            <Text style={[styles.heroValue, { color: T.purple }]}>Nv.{user?.niveau || user?.level}</Text>
                            <Text style={styles.heroLabel}>Niveau</Text>
                          </View>
                        </>
                      ) : null}
                    </View>
                    <View style={styles.statsGrid}>
                      <View style={styles.statCard}>
                        <Text style={[styles.statValue, { color: T.green }]}>{user?.stats?.wins || 0}</Text>
                        <Text style={styles.statLabel}>Victoires</Text>
                      </View>
                      <View style={styles.statCard}>
                        <Text style={[styles.statValue, { color: T.red }]}>{user?.stats?.losses || 0}</Text>
                        <Text style={styles.statLabel}>Défaites</Text>
                      </View>
                      <View style={styles.statCard}>
                        <Text style={[styles.statValue, { color: T.textDim }]}>{user?.stats?.abandons || 0}</Text>
                        <Text style={styles.statLabel}>Abandons</Text>
                      </View>
                      <View style={styles.statCard}>
                        <Text style={[styles.statValue, { color: T.gold }]}>
                          {(() => { const w = user?.stats?.wins || 0; const l = user?.stats?.losses || 0; return w + l > 0 ? Math.round((w / (w + l)) * 100) + '%' : '—'; })()}
                        </Text>
                        <Text style={styles.statLabel}>Ratio V/D</Text>
                      </View>
                      <View style={styles.statCard}>
                        <Text style={[styles.statValue, { color: T.textDim }]}>
                          {(user?.stats?.wins || 0) + (user?.stats?.losses || 0) + (user?.stats?.abandons || 0)}
                        </Text>
                        <Text style={styles.statLabel}>Parties</Text>
                      </View>
                    </View>
                    {(() => {
                      const w = user?.stats?.wins || 0;
                      const l = user?.stats?.losses || 0;
                      const pct = w + l > 0 ? Math.round((w / (w + l)) * 100) : 0;
                      return (
                        <View style={styles.winRateContainer}>
                          <Text style={styles.winRateLabel}>TAUX DE VICTOIRE — {pct}%</Text>
                          <View style={styles.winRateTrack}>
                            <View style={[styles.winRateFill, { width: `${pct}%` }]} />
                          </View>
                        </View>
                      );
                    })()}
                  </View>

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
                </View>

              </View>
              <View style={{ height: getResponsiveSize(40) }} />
            </>
          ) : (
            /* ── Disposition colonne unique (smartphone) ── */
            <>
              <View style={styles.profileCard}>
                <View style={styles.avatarContainer}>
                  <TouchableOpacity onPress={() => { playButtonSound(); setIsEditing(true); setShowAvatarModal(true); }}>
                    <View style={[styles.avatarWrapper, isEditing && styles.avatarEditable, !isEditing && { borderColor: T.gold }]}>
                      {renderAvatar()}
                      <View style={[styles.editIconBadge, !isEditing && { backgroundColor: 'rgba(0,0,0,0.3)' }]}>
                        <Ionicons name="camera" size={getResponsiveSize(16)} color="#fff" />
                      </View>
                    </View>
                  </TouchableOpacity>
                  {user?.isPremium && (
                    <LinearGradient colors={['#FFD700', '#FFA500']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.premiumBadge}>
                      <Text style={styles.premiumText}>💎 {user.isEarlyAccess ? 'PREMIUM (OFFERT)' : 'PREMIUM'}</Text>
                    </LinearGradient>
                  )}
                  <Text style={styles.pseudoText}>
                    {user?.pseudo} {selectedCountry && <Text style={{fontSize: getResponsiveSize(20)}}>{selectedCountry}</Text>}
                  </Text>
                  <Text style={styles.emailText}>{user?.email}</Text>
                </View>

                <View style={styles.heroRow}>
                  <View style={styles.heroStat}>
                    <Text style={styles.heroValue}>{(user?.coins || 0).toLocaleString()}</Text>
                    <Text style={styles.heroLabel}>💰 Pièces</Text>
                  </View>
                  <View style={styles.heroSep} />
                  <View style={styles.heroStat}>
                    <Text style={[styles.heroValue, { color: T.blue }]}>{user?.ranking ?? '—'}</Text>
                    <Text style={styles.heroLabel}>🏆 Classement</Text>
                  </View>
                  {(user?.niveau || user?.level) ? (
                    <>
                      <View style={styles.heroSep} />
                      <View style={styles.heroStat}>
                        <Text style={[styles.heroValue, { color: T.purple }]}>Nv.{user?.niveau || user?.level}</Text>
                        <Text style={styles.heroLabel}>Niveau</Text>
                      </View>
                    </>
                  ) : null}
                </View>

                <View style={styles.statsGrid}>
                  <View style={styles.statCard}>
                    <Text style={[styles.statValue, { color: T.green }]}>{user?.stats?.wins || 0}</Text>
                    <Text style={styles.statLabel}>Victoires</Text>
                  </View>
                  <View style={styles.statCard}>
                    <Text style={[styles.statValue, { color: T.red }]}>{user?.stats?.losses || 0}</Text>
                    <Text style={styles.statLabel}>Défaites</Text>
                  </View>
                  <View style={styles.statCard}>
                    <Text style={[styles.statValue, { color: T.textDim }]}>{user?.stats?.abandons || 0}</Text>
                    <Text style={styles.statLabel}>Abandons</Text>
                  </View>
                  <View style={styles.statCard}>
                    <Text style={[styles.statValue, { color: T.gold }]}>
                      {(() => { const w = user?.stats?.wins || 0; const l = user?.stats?.losses || 0; return w + l > 0 ? Math.round((w / (w + l)) * 100) + '%' : '—'; })()}
                    </Text>
                    <Text style={styles.statLabel}>Ratio V/D</Text>
                  </View>
                  <View style={styles.statCard}>
                    <Text style={[styles.statValue, { color: T.textDim }]}>
                      {(user?.stats?.wins || 0) + (user?.stats?.losses || 0) + (user?.stats?.abandons || 0)}
                    </Text>
                    <Text style={styles.statLabel}>Parties</Text>
                  </View>
                </View>

                {(() => {
                  const w = user?.stats?.wins || 0;
                  const l = user?.stats?.losses || 0;
                  const pct = w + l > 0 ? Math.round((w / (w + l)) * 100) : 0;
                  return (
                    <View style={styles.winRateContainer}>
                      <Text style={styles.winRateLabel}>TAUX DE VICTOIRE — {pct}%</Text>
                      <View style={styles.winRateTrack}>
                        <View style={[styles.winRateFill, { width: `${pct}%` }]} />
                      </View>
                    </View>
                  );
                })()}
              </View>

              <View style={styles.menuContainer}>
                <TouchableOpacity style={styles.menuItem} onPress={() => { navigation.navigate('PremiumPions'); }}>
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
                <TouchableOpacity style={styles.menuItem} onPress={() => { setShowHistoryModal(true); }}>
                  <View style={[styles.iconBox, { backgroundColor: 'rgba(52, 152, 219, 0.2)' }]}>
                    <MaterialCommunityIcons name="history" size={getResponsiveSize(24)} color="#3498db" />
                  </View>
                  <Text style={styles.menuText}>Historique des transactions</Text>
                  <Ionicons name="chevron-forward" size={getResponsiveSize(20)} color="#ccc" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.menuItem} onPress={() => { setIsEditing(!isEditing); if (isEditing) handleSave(); }}>
                  <View style={[styles.iconBox, { backgroundColor: 'rgba(46, 204, 113, 0.2)' }]}>
                    <Ionicons name={isEditing ? "save-outline" : "create-outline"} size={getResponsiveSize(24)} color="#2ecc71" />
                  </View>
                  <Text style={styles.menuText}>{isEditing ? "Sauvegarder les modifications" : "Modifier mon profil"}</Text>
                  <Ionicons name="chevron-forward" size={getResponsiveSize(20)} color="#ccc" />
                </TouchableOpacity>
              </View>

              {isEditing && (
                <View style={styles.editForm}>
                  <Text style={styles.sectionHeader}>Informations personnelles</Text>
                  <Text style={styles.inputLabel}>Pseudo</Text>
                  <Input value={pseudo} onChangeText={setPseudo} placeholder="Votre pseudo" containerStyle={styles.inputContainer} />
                  <Text style={styles.inputLabel}>Pays</Text>
                  <TouchableOpacity style={styles.countrySelectButton} onPress={() => setShowCountryModal(true)}>
                    <Text style={styles.countrySelectText}>{selectedCountry ? `Drapeau actuel: ${selectedCountry}` : 'Choisir un pays'}</Text>
                    <Ionicons name="chevron-down" size={getResponsiveSize(20)} color="#ccc" />
                  </TouchableOpacity>
                  <Button title="Enregistrer" onPress={handleSave} style={styles.saveButton} />
                </View>
              )}

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
            </>
          )}
        </ScrollView>
      </SafeAreaView>

      {/* MODAL: Historique des transactions */}
      <Modal visible={showHistoryModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, isTablet && styles.modalContentTablet]}>
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
          <View style={[styles.modalContent, isTablet && styles.modalContentTablet]}>
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

              <Text style={[styles.separator, { color: T.gold, marginTop: getResponsiveSize(10) }]}>
                ✨ Avatars Premium
              </Text>
              <View style={styles.avatarGrid}>
                {PREMIUM_AVATARS.map((avatar, index) => {
                  const isLocked = !user?.isPremium && !user?.isEarlyAccess;
                  return (
                    <TouchableOpacity 
                      key={index} 
                      onPress={() => handleSelectPremiumAvatar(avatar.id)} 
                      style={[
                        styles.avatarGridItem, 
                        { borderColor: isLocked ? T.borderSoft : T.gold }
                      ]}
                    >
                      <Image source={avatar.source} style={styles.gridAvatar} />
                      
                      {!isLocked && (
                        <View style={styles.premiumRibbon}>
                          <Ionicons name="star" size={getResponsiveSize(10)} color="#000" />
                        </View>
                      )}

                      {isLocked && (
                        <View style={styles.lockedOverlay}>
                          <Ionicons name="lock-closed" size={getResponsiveSize(20)} color={T.gold} />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal choix Pays */}
      <Modal visible={showCountryModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, isTablet && styles.modalContentTablet]}>
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
                <TouchableOpacity style={styles.countryItem} onPress={() => { handleSelectCountry(item); }}>
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
  bgOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(5,9,15,0.55)',
  },
  background: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: T.bg0,
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
    fontSize: getResponsiveSize(22),
    color: T.text,
    fontWeight: '900',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  backButton: {
    padding: getResponsiveSize(8),
    borderRadius: T.radiusMd,
    borderWidth: 1,
    borderColor: T.border,
    backgroundColor: T.bg2,
  },
  logoutButton: {
    padding: getResponsiveSize(8),
  },
  scrollContent: {
    paddingHorizontal: getResponsiveSize(16),
    paddingBottom: getResponsiveSize(40),
  },
  scrollContentWide: {
    maxWidth: 1100,
    width: '100%',
    alignSelf: 'center',
  },
  twoColRow: {
    flexDirection: 'row',
    gap: getResponsiveSize(16),
    alignItems: 'flex-start',
  },
  leftCol: {
    flex: 1,
  },
  rightCol: {
    flex: 1,
  },
  profileCard: {
    backgroundColor: T.bg2,
    borderRadius: getResponsiveSize(T.radiusLg),
    padding: getResponsiveSize(20),
    alignItems: 'center',
    marginBottom: getResponsiveSize(16),
    borderWidth: 1,
    borderColor: T.border,
    ...T.shadowCard,
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: getResponsiveSize(16),
  },
  avatarWrapper: {
    width: getResponsiveSize(80),
    height: getResponsiveSize(80),
    borderRadius: getResponsiveSize(40),
    borderWidth: 2,
    borderColor: T.gold,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: getResponsiveSize(10),
    overflow: 'hidden',
  },
  avatarWrapperTablet: {
    width: getResponsiveSize(100),
    height: getResponsiveSize(100),
    borderRadius: getResponsiveSize(50),
  },
  avatarEditable: {
    borderColor: T.green,
    borderStyle: 'dashed',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  editIconBadge: {
    position: 'absolute',
    bottom: 0,
    backgroundColor: T.overlay,
    width: '100%',
    height: getResponsiveSize(28),
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
    color: '#1B1305',
    fontWeight: '800',
    fontSize: getResponsiveSize(10),
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  pseudoText: {
    fontSize: getResponsiveSize(24),
    fontWeight: '900',
    color: T.text,
    marginBottom: getResponsiveSize(4),
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  emailText: {
    fontSize: getResponsiveSize(13),
    color: T.textMuted,
  },
  // Hero stats row (coins + ranking + level)
  heroRow: {
    flexDirection: 'row',
    width: '100%',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: T.bg3,
    borderRadius: getResponsiveSize(T.radiusMd),
    paddingVertical: getResponsiveSize(14),
    paddingHorizontal: getResponsiveSize(8),
    marginTop: getResponsiveSize(14),
    borderWidth: 1,
    borderColor: T.border,
  },
  heroStat: {
    flex: 1,
    alignItems: 'center',
  },
  heroValue: {
    fontSize: getResponsiveSize(22),
    fontWeight: '900',
    color: T.gold,
    letterSpacing: 0.3,
  },
  heroLabel: {
    fontSize: getResponsiveSize(10),
    color: T.textMuted,
    marginTop: getResponsiveSize(3),
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: '600',
  },
  heroSep: {
    width: 1,
    height: getResponsiveSize(32),
    backgroundColor: T.borderSoft,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: '100%',
    gap: getResponsiveSize(8),
    marginTop: getResponsiveSize(12),
    paddingTop: getResponsiveSize(12),
    borderTopWidth: 1,
    borderTopColor: T.borderSoft,
  },
  statCard: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '30%',
    flexGrow: 1,
    backgroundColor: T.bg2,
    borderWidth: 1,
    borderColor: T.borderSoft,
    borderRadius: getResponsiveSize(T.radiusMd),
    paddingVertical: getResponsiveSize(12),
    paddingHorizontal: getResponsiveSize(8),
    ...T.shadowCard,
  },
  statValue: {
    fontSize: getResponsiveSize(28),
    fontWeight: '800',
    color: T.text,
    letterSpacing: 0.3,
  },
  statLabel: {
    fontSize: getResponsiveSize(11),
    color: T.textMuted,
    marginTop: getResponsiveSize(4),
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: '600',
  },
  winRateContainer: {
    width: '100%',
    marginTop: getResponsiveSize(14),
    paddingTop: getResponsiveSize(10),
    borderTopWidth: 1,
    borderTopColor: T.borderSoft,
  },
  winRateLabel: {
    fontSize: getResponsiveSize(11),
    fontWeight: '700',
    color: T.textDim,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: getResponsiveSize(6),
  },
  winRateTrack: {
    width: '100%',
    height: getResponsiveSize(6),
    backgroundColor: T.borderMid,
    borderRadius: getResponsiveSize(T.radiusPill),
    overflow: 'hidden',
  },
  winRateFill: {
    height: '100%',
    backgroundColor: T.gold,
    borderRadius: getResponsiveSize(T.radiusPill),
  },
  menuContainer: {
    backgroundColor: T.bg2,
    borderRadius: getResponsiveSize(T.radiusMd),
    padding: getResponsiveSize(8),
    marginBottom: getResponsiveSize(16),
    borderWidth: 1,
    borderColor: T.borderSoft,
    ...T.shadowCard,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: getResponsiveSize(14),
    paddingHorizontal: getResponsiveSize(10),
    borderBottomWidth: 1,
    borderBottomColor: T.borderSoft,
  },
  iconBox: {
    width: getResponsiveSize(38),
    height: getResponsiveSize(38),
    borderRadius: getResponsiveSize(10),
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: getResponsiveSize(14),
  },
  menuText: {
    flex: 1,
    fontSize: getResponsiveSize(15),
    color: T.text,
    fontWeight: '500',
  },
  editForm: {
    backgroundColor: T.bg2,
    borderRadius: getResponsiveSize(T.radiusMd),
    padding: getResponsiveSize(20),
    marginBottom: getResponsiveSize(16),
    borderWidth: 1,
    borderColor: T.borderSoft,
    ...T.shadowCard,
  },
  sectionHeader: {
    fontSize: getResponsiveSize(18),
    fontWeight: '800',
    color: T.text,
    marginBottom: getResponsiveSize(14),
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  inputLabel: {
    color: T.textDim,
    marginBottom: getResponsiveSize(6),
    fontSize: getResponsiveSize(13),
    fontWeight: '600',
    letterSpacing: 0.2,
    textTransform: 'uppercase',
  },
  inputContainer: {
    marginBottom: getResponsiveSize(14),
  },
  countrySelectButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: T.bg3,
    padding: getResponsiveSize(14),
    borderRadius: getResponsiveSize(T.radiusMd),
    marginBottom: getResponsiveSize(18),
    borderWidth: 1,
    borderColor: T.borderSoft,
  },
  countrySelectText: {
    color: T.text,
    fontSize: getResponsiveSize(15),
  },
  saveButton: {
    marginTop: getResponsiveSize(8),
  },
  dangerZone: {
    marginTop: getResponsiveSize(16),
    padding: getResponsiveSize(18),
    borderRadius: getResponsiveSize(T.radiusMd),
    borderWidth: 1,
    backgroundColor: T.bg2,
    borderColor: T.borderSoft,
    ...T.shadowCard,
  },
  dangerTitle: {
    color: T.red,
    fontSize: getResponsiveSize(14),
    fontWeight: '800',
    marginBottom: getResponsiveSize(14),
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  dangerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: getResponsiveSize(12),
  },
  dangerButtonText: {
    marginLeft: getResponsiveSize(10),
    fontSize: getResponsiveSize(15),
    fontWeight: '600',
  },

  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: T.overlay,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: T.bg2,
    borderTopLeftRadius: getResponsiveSize(T.radiusXl),
    borderTopRightRadius: getResponsiveSize(T.radiusXl),
    padding: getResponsiveSize(20),
    maxHeight: '85%',
    minHeight: '50%',
    borderWidth: 1,
    borderColor: T.borderSoft,
  },
  modalContentTablet: {
    width: '55%',
    maxWidth: 550,
    alignSelf: 'center',
    borderRadius: getResponsiveSize(T.radiusXl),
    borderTopLeftRadius: getResponsiveSize(T.radiusXl),
    borderTopRightRadius: getResponsiveSize(T.radiusXl),
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: getResponsiveSize(18),
    borderBottomWidth: 1,
    borderBottomColor: T.borderSoft,
    paddingBottom: getResponsiveSize(14),
  },
  modalTitle: {
    fontSize: getResponsiveSize(20),
    fontWeight: '800',
    color: T.text,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  closeButton: {
    padding: getResponsiveSize(5),
    borderRadius: T.radiusSm,
    backgroundColor: T.bg3,
    borderWidth: 1,
    borderColor: T.borderSoft,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: getResponsiveSize(40),
  },
  emptyText: {
    color: T.textMuted,
    marginTop: getResponsiveSize(10),
    fontSize: getResponsiveSize(15),
  },
  historyGroup: {
    marginBottom: getResponsiveSize(18),
  },
  historyDateHeader: {
    color: T.textMuted,
    fontSize: getResponsiveSize(11),
    marginBottom: getResponsiveSize(10),
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    fontWeight: '700',
  },
  txItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: T.bg3,
    padding: getResponsiveSize(12),
    borderRadius: getResponsiveSize(T.radiusMd),
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
    color: T.text,
    fontSize: getResponsiveSize(15),
    fontWeight: '600',
    marginBottom: getResponsiveSize(2),
  },
  txDate: {
    color: T.textMuted,
    fontSize: getResponsiveSize(12),
  },
  txAmount: {
    fontSize: getResponsiveSize(16),
    fontWeight: '800',
  },

  // Avatar Modal
  uploadOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: T.bg3,
    padding: getResponsiveSize(14),
    borderRadius: getResponsiveSize(T.radiusMd),
    marginBottom: getResponsiveSize(18),
    borderWidth: 1,
    borderColor: T.borderSoft,
  },
  uploadIconCircle: {
    width: getResponsiveSize(40),
    height: getResponsiveSize(40),
    borderRadius: getResponsiveSize(20),
    backgroundColor: T.blue,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: getResponsiveSize(14),
  },
  uploadText: {
    color: T.text,
    fontSize: getResponsiveSize(15),
    fontWeight: '600',
  },
  separator: {
    color: T.textMuted,
    fontSize: getResponsiveSize(12),
    fontWeight: '700',
    marginBottom: getResponsiveSize(12),
    marginTop: getResponsiveSize(8),
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  avatarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: getResponsiveSize(10),
    marginBottom: getResponsiveSize(18),
  },
  avatarGridItem: {
    width: '30%',
    aspectRatio: 1,
    borderRadius: getResponsiveSize(T.radiusMd),
    overflow: 'hidden',
    backgroundColor: T.bg3,
    borderWidth: 1.5,
    borderColor: T.borderSoft,
    position: 'relative',
  },
  gridAvatar: {
    width: '100%',
    height: '100%',
  },
  lockedOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(5,9,15,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  premiumRibbon: {
    position: 'absolute',
    top: 0, right: 0,
    backgroundColor: T.gold,
    paddingHorizontal: 4,
    paddingVertical: 2,
    zIndex: 3,
  },

  // Country Modal
  countryItem: {
    alignItems: 'center',
    marginBottom: getResponsiveSize(18),
    padding: getResponsiveSize(5),
  },
  countryFlag: {
    fontSize: getResponsiveSize(32),
    marginBottom: getResponsiveSize(5),
  },
  countryName: {
    color: T.textDim,
    fontSize: getResponsiveSize(11),
    textAlign: 'center',
    fontWeight: '600',
  },
});

export default ProfileScreen;
