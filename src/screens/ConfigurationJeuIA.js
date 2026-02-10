import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Switch, ImageBackground, Dimensions, SafeAreaView, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { playButtonSound } from '../utils/soundManager';

const { width } = Dimensions.get('window');

const BET_OPTIONS = [
  100, 250, 500, 1000, 2500, 5000, 10000, 25000, 50000, 
  100000, 250000, 500000, 1000000, 2500000, 5000000, 
  10000000, 25000000, 50000000, 100000000, 250000000, 
  500000000, 1000000000, 2500000000, 5000000000
];

const ConfigurationJeuIA = ({ navigation }) => {
  const user = useSelector(state => state.auth.user);
  const [activeTab, setActiveTab] = useState('difficulte'); // 'difficulte' | 'options'
  const [difficulte, setDifficulte] = useState('moyen');
  const [premierJoueur, setPremierJoueur] = useState('joueur');
  const [couleurJoueur, setCouleurJoueur] = useState('noir');
  const [vitesseIA, setVitesseIA] = useState('normal');
  const [indicesActifs, setIndicesActifs] = useState(false);
  const [chronometreActif, setChronometreActif] = useState(true);
  const [animationsActives, setAnimationsActives] = useState(true);
  const [betAmount, setBetAmount] = useState(100);
  
  const [statistiques, setStatistiques] = useState({
    facile: { jouees: 0, gagnees: 0 },
    moyen: { jouees: 0, gagnees: 0 },
    difficile: { jouees: 0, gagnees: 0 }
  });
  
  // Charger les statistiques au montage
  React.useEffect(() => {
    chargerStatistiques();
  }, []);
  
  const chargerStatistiques = async () => {
    try {
      const stats = await AsyncStorage.getItem('statsIA');
      if (stats) {
        setStatistiques(JSON.parse(stats));
      }
    } catch (error) {
      console.error('Erreur chargement stats:', error);
    }
  };
  
  const demarrerPartie = () => {
    // Vérification du solde
    if (betAmount > user?.coins) {
        Alert.alert('Solde insuffisant', `Vous n'avez pas assez de coins pour parier ${betAmount.toLocaleString()} coins.`);
        return;
    }

    // Déterminer qui commence réellement
    let joueurDebut = premierJoueur;
    if (premierJoueur === 'aleatoire') {
      joueurDebut = Math.random() < 0.5 ? 'joueur' : 'ia';
    }
    
    // Déterminer les couleurs (traduction en anglais pour le moteur de jeu)
    const getCouleurAnglais = (c) => c === 'noir' ? 'black' : 'white';
    
    let couleurJ = couleurJoueur;
    if (couleurJoueur === 'aleatoire') {
        couleurJ = Math.random() < 0.5 ? 'noir' : 'blanc';
    }

    const couleurs = {
        joueur: getCouleurAnglais(couleurJ),
        ia: getCouleurAnglais(couleurJ === 'noir' ? 'blanc' : 'noir')
    };
    
    // Naviguer vers GameScreen avec configuration IA
    navigation.navigate('Game', {
      modeJeu: 'ia',
      betAmount: betAmount,
      configIA: {
        difficulte,
        premierJoueur: joueurDebut,
        couleurs,
        vitesseIA,
        indicesActifs,
        chronometreActif,
        animationsActives
      }
    });
  };
  
  const niveaux = [
    {
      id: 'facile',
      titre: 'Facile',
      emoji: '🟢',
      description: 'Parfait pour débuter',
      tauxVictoire: '15%',
      couleur: '#10b981', // Keep original color for accent/emoji but card style will be unified
      stats: statistiques.facile
    },
    {
      id: 'moyen',
      titre: 'Moyen',
      emoji: '🟡',
      description: 'Challenge équilibré',
      tauxVictoire: '50%',
      couleur: '#f59e0b',
      stats: statistiques.moyen
    },
    {
      id: 'difficile',
      titre: 'Difficile',
      emoji: '🔴',
      description: 'Pour les experts',
      tauxVictoire: '95%',
      couleur: '#ef4444',
      stats: statistiques.difficile
    }
  ];
  
  const vitesses = [
    { id: 'instantane', label: 'Instantané', delai: 0 },
    { id: 'rapide', label: 'Rapide (0.3s)', delai: 300 },
    { id: 'normal', label: 'Normal (1s)', delai: 1000 },
    { id: 'lent', label: 'Lent (2s)', delai: 2000 },
    { id: 'reflexion', label: 'Réflexion (3s)', delai: 3000 }
  ];

  const renderDifficultyTab = () => (
    <View style={styles.tabContent}>
      {niveaux.map(niveau => (
        <TouchableOpacity
          key={niveau.id}
          style={[
            styles.niveauCard,
            difficulte === niveau.id && styles.niveauCardActive
          ]}
          onPress={() => { playButtonSound(); setDifficulte(niveau.id); }}
        >
          <Text style={styles.niveauEmoji}>{niveau.emoji}</Text>
          <View style={styles.niveauInfo}>
            <Text style={styles.niveauTitre}>{niveau.titre}</Text>
            <Text style={styles.niveauDesc}>{niveau.description}</Text>
            <Text style={styles.niveauTaux}>
              IA gagne à {niveau.tauxVictoire}
            </Text>
            
            {niveau.stats.jouees > 0 && (
              <View style={styles.statsContainer}>
                <Text style={styles.statsTexte}>
                  {((niveau.stats.gagnees / niveau.stats.jouees) * 100).toFixed(0)}% 
                  de victoires • {niveau.stats.jouees} parties
                </Text>
              </View>
            )}
          </View>
          {difficulte === niveau.id && (
            <View style={[styles.selectedIndicator, { backgroundColor: '#f1c40f' }]}>
              <Ionicons name="checkmark" size={16} color="#041c55" />
            </View>
          )}
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderOptionsTab = () => (
    <View style={styles.tabContent}>
      {/* Bet Amount - Styled like Online */}
      <View style={styles.option}>
        <Text style={styles.optionLabel}>Mise (coins)</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginVertical: 10 }}>
            <TouchableOpacity 
                onPress={() => {
                    playButtonSound();
                    const currentIndex = BET_OPTIONS.indexOf(betAmount);
                    if (currentIndex > 0) setBetAmount(BET_OPTIONS[currentIndex - 1]);
                }}
                disabled={BET_OPTIONS.indexOf(betAmount) <= 0}
                style={{ padding: 10, opacity: BET_OPTIONS.indexOf(betAmount) <= 0 ? 0.3 : 1 }}
            >
                <Ionicons name="remove-circle-outline" size={40} color="#fff" />
            </TouchableOpacity>
            
            <View style={styles.betDisplay}>
                <Text style={styles.betDisplayText}>
                    {betAmount.toLocaleString()}
                </Text>
            </View>

            <TouchableOpacity 
                onPress={() => {
                    playButtonSound();
                    const currentIndex = BET_OPTIONS.indexOf(betAmount);
                    if (currentIndex < BET_OPTIONS.length - 1) setBetAmount(BET_OPTIONS[currentIndex + 1]);
                }}
                disabled={BET_OPTIONS.indexOf(betAmount) >= BET_OPTIONS.length - 1}
                style={{ padding: 10, opacity: BET_OPTIONS.indexOf(betAmount) >= BET_OPTIONS.length - 1 ? 0.3 : 1 }}
            >
                <Ionicons name="add-circle-outline" size={40} color="#fff" />
            </TouchableOpacity>
        </View>
      </View>

      {/* Qui commence */}
      <View style={styles.option}>
        <Text style={styles.optionLabel}>Qui commence ?</Text>
        <View style={styles.buttonGroup}>
          {['joueur', 'ia', 'aleatoire'].map(opt => (
            <TouchableOpacity
              key={opt}
              style={[
                styles.optionButton,
                premierJoueur === opt && styles.optionButtonActive
              ]}
              onPress={() => setPremierJoueur(opt)}
            >
              <Text style={[
                styles.optionButtonText,
                premierJoueur === opt && styles.optionButtonTextActive
              ]}>
                {opt === 'joueur' ? 'Vous' : opt === 'ia' ? 'IA' : 'Aléatoire'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      
      {/* Couleur */}
      <View style={styles.option}>
        <Text style={styles.optionLabel}>Votre couleur</Text>
        <View style={styles.buttonGroup}>
          {[
            { id: 'noir', icon: '🔴', label: 'Rouge' },
            { id: 'blanc', icon: '✖', label: 'Bleu', iconColor: '#3b82f6' },
            { id: 'aleatoire', icon: '🎲', label: 'Aléa.' }
          ].map(opt => (
            <TouchableOpacity
              key={opt.id}
              style={[
                styles.optionButton,
                couleurJoueur === opt.id && styles.optionButtonActive
              ]}
              onPress={() => setCouleurJoueur(opt.id)}
            >
              <Text style={[
                styles.optionButtonText,
                couleurJoueur === opt.id && styles.optionButtonTextActive
              ]}>
                <Text style={opt.iconColor ? { color: opt.iconColor, fontSize: 16 } : { fontSize: 16 }}>
                  {opt.icon}
                </Text>
                {' ' + opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      
      {/* Vitesse IA */}
      <View style={styles.option}>
        <Text style={styles.optionLabel}>Vitesse de jeu de l'IA</Text>
        <View style={styles.pickerContainer}>
          {vitesses.map(v => (
            <TouchableOpacity
              key={v.id}
              style={[
                styles.vitesseOption,
                vitesseIA === v.id && styles.vitesseOptionActive
              ]}
              onPress={() => setVitesseIA(v.id)}
            >
              <Text style={[
                styles.vitesseTexte,
                vitesseIA === v.id && styles.vitesseTexteActive
              ]}>
                {v.label}
              </Text>
              {vitesseIA === v.id && <Ionicons name="checkmark-circle" size={20} color="#041c55" />}
            </TouchableOpacity>
          ))}
        </View>
      </View>
      
      {/* Switches */}
      <View style={styles.switchOption}>
        <Text style={styles.switchLabel}>Afficher les indices</Text>
        <Switch
          value={indicesActifs}
          onValueChange={setIndicesActifs}
          trackColor={{ false: '#555', true: '#f1c40f' }}
          thumbColor={indicesActifs ? '#fff' : '#ccc'}
        />
      </View>
      
      <View style={styles.switchOption}>
        <Text style={styles.switchLabel}>Chronomètre</Text>
        <Switch
          value={chronometreActif}
          onValueChange={setChronometreActif}
          trackColor={{ false: '#555', true: '#f1c40f' }}
          thumbColor={chronometreActif ? '#fff' : '#ccc'}
        />
      </View>
      
      <View style={styles.switchOption}>
        <Text style={styles.switchLabel}>Animations</Text>
        <Switch
          value={animationsActives}
          onValueChange={setAnimationsActives}
          trackColor={{ false: '#555', true: '#f1c40f' }}
          thumbColor={animationsActives ? '#fff' : '#ccc'}
        />
      </View>
    </View>
  );
  
  return (
    <ImageBackground 
      source={require('../../assets/images/Background2-4.png')} 
      style={styles.container}
      resizeMode="cover"
    >
        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={30} color="#fff" />
          </TouchableOpacity>
          <View>
            <Text style={styles.titre}>Configuration IA</Text>
            <Text style={styles.sousTitre}>Personnalisez votre adversaire</Text>
          </View>
          <View style={styles.coinContainer}>
            <Text style={styles.coinText}>💰 {user?.coins?.toLocaleString() || 0}</Text>
          </View>
        </View>
        
        {/* TABS */}
        <View style={styles.tabContainer}>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'difficulte' && styles.activeTab]}
            onPress={() => setActiveTab('difficulte')}
          >
            <Text style={[styles.tabText, activeTab === 'difficulte' && styles.activeTabText]}>
              Niveau de difficulté
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'options' && styles.activeTab]}
            onPress={() => setActiveTab('options')}
          >
            <Text style={[styles.tabText, activeTab === 'options' && styles.activeTabText]}>
              Options de jeu
            </Text>
          </TouchableOpacity>
        </View>

        {/* CONTENT */}
        <ScrollView style={styles.contentContainer} contentContainerStyle={styles.scrollContent}>
          {activeTab === 'difficulte' ? renderDifficultyTab() : renderOptionsTab()}
          
          <View style={{ height: 100 }} /> 
        </ScrollView>

        {/* FOOTER BUTTON */}
        <View style={styles.footer}>
          <TouchableOpacity 
            style={styles.boutonLancer}
            onPress={demarrerPartie}
          >
            <Text style={styles.boutonLancerTexte}>🎮 Lancer la partie</Text>
          </TouchableOpacity>
        </View>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: 50,
    backgroundColor: 'rgba(4, 28, 85, 0.9)',
  },
  coinContainer: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    padding: 8,
    borderRadius: 15,
  },
  coinText: {
    color: '#f1c40f',
    fontWeight: 'bold',
    fontSize: 16,
  },
  backButton: {
    padding: 5,
  },
  titre: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  sousTitre: {
    fontSize: 14,
    color: '#f1c40f',
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: 'rgba(241, 196, 15, 0.3)'
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8
  },
  activeTab: {
    backgroundColor: '#f1c40f',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ccc'
  },
  activeTabText: {
    color: '#041c55',
    fontWeight: 'bold'
  },
  contentContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 20
  },
  tabContent: {
    gap: 16
  },
  niveauCard: {
    backgroundColor: '#041c55',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f1c40f',
    shadowColor: '#f1c40f',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 5,
    elevation: 5
  },
  niveauCardActive: {
      backgroundColor: 'rgba(4, 28, 85, 0.8)',
      borderColor: '#f1c40f',
      borderWidth: 2,
  },
  niveauEmoji: {
    fontSize: 40,
    marginRight: 16
  },
  niveauInfo: {
    flex: 1
  },
  niveauTitre: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#f1c40f',
    marginBottom: 4
  },
  niveauDesc: {
    fontSize: 14,
    color: '#fff',
    marginBottom: 4
  },
  niveauTaux: {
    fontSize: 12,
    color: '#ccc',
    fontStyle: 'italic'
  },
  selectedIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    backgroundColor: '#f1c40f'
  },
  statsContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(241, 196, 15, 0.3)'
  },
  statsTexte: {
    fontSize: 12,
    fontWeight: '600',
    color: '#f1c40f'
  },
  option: {
    backgroundColor: '#041c55',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#f1c40f',
    shadowColor: '#f1c40f',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#f1c40f',
    marginBottom: 12
  },
  buttonGroup: {
    flexDirection: 'row',
    gap: 8
  },
  optionButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: '#f1c40f',
    alignItems: 'center',
    justifyContent: 'center'
  },
  optionButtonActive: {
    backgroundColor: '#f1c40f',
    borderColor: '#f1c40f'
  },
  optionButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center'
  },
  optionButtonTextActive: {
    color: '#041c55'
  },
  pickerContainer: {
    gap: 8
  },
  vitesseOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: '#f1c40f',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  vitesseOptionActive: {
    backgroundColor: '#f1c40f',
    borderColor: '#f1c40f'
  },
  vitesseTexte: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff'
  },
  vitesseTexteActive: {
    color: '#041c55'
  },
  switchOption: {
    backgroundColor: '#041c55',
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f1c40f',
    shadowColor: '#f1c40f',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 3,
    shadowRadius: 3,
    elevation: 3
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#f1c40f'
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: 'rgba(4, 28, 85, 0.9)',
    borderTopWidth: 1,
    borderTopColor: '#f1c40f'
  },
  boutonLancer: {
    backgroundColor: '#2ecc71',
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8
  },
  boutonLancerTexte: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff'
  },
  betDisplay: {
      flexDirection: 'row', 
      alignItems: 'center', 
      justifyContent: 'center',
      width: 140,
      height: 50,
      overflow: 'hidden',
      backgroundColor: 'rgba(0,0,0,0.3)',
      borderRadius: 25,
      marginHorizontal: 10,
      borderWidth: 1,
      borderColor: 'rgba(241, 196, 15, 0.3)'
  },
  betDisplayText: {
      color: '#f1c40f', 
      fontSize: 22, 
      fontWeight: 'bold', 
      width: 120,
      textAlign: 'center',
      textShadowColor: 'rgba(0, 0, 0, 0.75)',
      textShadowOffset: {width: -1, height: 1},
      textShadowRadius: 10
  }
});

export default ConfigurationJeuIA;
