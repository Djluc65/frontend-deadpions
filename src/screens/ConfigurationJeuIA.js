import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Switch, ImageBackground, SafeAreaView } from 'react-native';
import { T } from '../utils/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { playButtonSound } from '../utils/soundManager';
import { getResponsiveSize, SCREEN_WIDTH } from '../utils/responsive';
import { appAlert } from '../services/appAlert';

const width = SCREEN_WIDTH;

const BET_OPTIONS = [
  100, 250, 500, 1000, 2500, 5000, 10000, 25000, 50000, 
  100000, 250000, 500000, 1000000, 2500000, 5000000, 
  10000000, 25000000, 50000000, 100000000, 250000000, 
  500000000, 1000000000, 2500000000, 5000000000
];

const ConfigurationJeuIA = ({ navigation }) => {
  const user = useSelector(state => state.auth.user);
  const canBet = Boolean(user?.isPremium || user?.isEarlyAccess);
  const [activeTab, setActiveTab] = useState('difficulte'); // 'difficulte' | 'options'
  const [difficulte, setDifficulte] = useState('moyen');
  const [premierJoueur, setPremierJoueur] = useState('joueur');
  const [couleurJoueur, setCouleurJoueur] = useState('noir');
  const [vitesseIA, setVitesseIA] = useState('normal');
  const [indicesActifs, setIndicesActifs] = useState(false);
  const [chronometreActif, setChronometreActif] = useState(true);
  const [animationsActives, setAnimationsActives] = useState(true);
  const [betAmount, setBetAmount] = useState(canBet ? 100 : 0);
  
  const [statistiques, setStatistiques] = useState({
    facile: { jouees: 0, gagnees: 0 },
    moyen: { jouees: 0, gagnees: 0 },
    difficile: { jouees: 0, gagnees: 0 }
  });
  const [tournamentStarter, setTournamentStarter] = useState('joueur'); // Persiste le starter du prochain tournoi
  
  // Charger les statistiques et le starter au montage
  React.useEffect(() => {
    chargerDonneesInitiales();
  }, []);

  React.useEffect(() => {
    if (!canBet && betAmount !== 0) setBetAmount(0);
    if (canBet && betAmount === 0) setBetAmount(100);
  }, [canBet]);
  
  const chargerDonneesInitiales = async () => {
    try {
      const stats = await AsyncStorage.getItem('statsIA');
      if (stats) {
        setStatistiques(JSON.parse(stats));
      }
      const savedStarter = await AsyncStorage.getItem('tournamentIAStarter');
      if (savedStarter) {
        setTournamentStarter(savedStarter);
      }
    } catch (error) {
      console.error('Erreur chargement données initiales:', error);
    }
  };
  
  const demarrerPartie = async () => {
    // Vérification du solde
    const effectiveBet = canBet ? betAmount : 0;
    if (effectiveBet > (user?.coins || 0)) {
        appAlert('Solde insuffisant', `Vous n'avez pas assez de coins pour parier ${betAmount.toLocaleString()} coins.`);
        return;
    }

    // Déterminer qui commence réellement
    let joueurDebut = premierJoueur;
    const isTournament = activeTab === 'options' && indicesActifs === false; // On détecte si c'est le mode tournoi selon tes réglages UI (à affiner si besoin)
    
    if (premierJoueur === 'aleatoire') {
      joueurDebut = Math.random() < 0.5 ? 'joueur' : 'ia';
    } else if (isTournament) {
      // En mode tournoi, on utilise le starter persistant pour la PARTIE 1
      joueurDebut = tournamentStarter;
      
      // On prépare déjà l'inversion pour le PROCHAIN tournoi (ou le bouton Rejouer du tournoi complet)
      const nextTournamentStarter = tournamentStarter === 'joueur' ? 'ia' : 'joueur';
      await AsyncStorage.setItem('tournamentIAStarter', nextTournamentStarter);
      setTournamentStarter(nextTournamentStarter);
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
      betAmount: effectiveBet,
      configIA: {
        difficulte,
        premierJoueur: joueurDebut,
        couleurs,
        vitesseIA,
        indicesActifs,
        chronometreActif,
        animationsActives,
        mode: isTournament ? 'tournament' : 'single',
        tournamentSettings: isTournament ? {
            gameNumber: 1,
            totalGames: 3, // ou la valeur choisie dans ton UI
            starterPartie1: joueurDebut 
        } : null
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

  const handleDifficultySelect = (niveau) => {
    if (niveau.id === 'difficile' && !user?.isPremium && !user?.isEarlyAccess) {
        appAlert(
            "Fonctionnalité Premium", 
            "L'IA Expert est réservée aux membres DeadPions+. Abonnez-vous pour débloquer le coach stratégique !",
            [
                 { text: "Annuler", style: "cancel" },
                 { text: "Voir l'offre", onPress: () => {
                     // Naviguer vers le TabNavigator 'Home' puis vers l'onglet 'Magasin'
                     navigation.navigate('Home', { screen: 'Magasin' });
                 }}
             ]
         );
         return;
     }
    playButtonSound();
    setDifficulte(niveau.id);
  };

  const renderDifficultyTab = () => (
    <View style={styles.tabContent}>
      {niveaux.map(niveau => (
        <TouchableOpacity
          key={niveau.id}
          style={[
            styles.niveauCard,
            difficulte === niveau.id && styles.niveauCardActive
          ]}
          onPress={() => handleDifficultySelect(niveau)}
        >
          <Text style={styles.niveauEmoji}>{niveau.emoji}</Text>
          <View style={styles.niveauInfo}>
            <Text style={styles.niveauTitre}>{niveau.titre}</Text>
            <Text style={styles.niveauDesc}>{niveau.description}</Text>
            {niveau.id === 'difficile' && !user?.isPremium && !user?.isEarlyAccess && (
                 <Text style={{color: T.gold, fontSize: getResponsiveSize(12), marginTop: getResponsiveSize(4)}}>🔒 Premium Requis</Text>
            )}
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
              <Ionicons name="checkmark" size={getResponsiveSize(16)} color="#041c55" />
            </View>
          )}
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderOptionsTab = () => (
    <View style={styles.tabContent}>
      {canBet && (
          <View style={styles.option}>
            <Text style={styles.optionLabel}>Mise (coins)</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginVertical: getResponsiveSize(10) }}>
                <TouchableOpacity 
                    onPress={() => {
                        playButtonSound();
                        const currentIndex = BET_OPTIONS.indexOf(betAmount);
                        if (currentIndex > 0) setBetAmount(BET_OPTIONS[currentIndex - 1]);
                    }}
                    disabled={BET_OPTIONS.indexOf(betAmount) <= 0}
                    style={{ padding: getResponsiveSize(10), opacity: BET_OPTIONS.indexOf(betAmount) <= 0 ? 0.3 : 1 }}
                >
                    <Ionicons name="remove-circle-outline" size={getResponsiveSize(40)} color="#fff" />
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
                    style={{ padding: getResponsiveSize(10), opacity: BET_OPTIONS.indexOf(betAmount) >= BET_OPTIONS.length - 1 ? 0.3 : 1 }}
                >
                    <Ionicons name="add-circle-outline" size={getResponsiveSize(40)} color="#fff" />
                </TouchableOpacity>
            </View>
          </View>
      )}

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
                <Text style={opt.iconColor ? { color: opt.iconColor, fontSize: getResponsiveSize(16) } : { fontSize: getResponsiveSize(16) }}>
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
              {vitesseIA === v.id && <Ionicons name="checkmark-circle" size={getResponsiveSize(20)} color="#041c55" />}
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
        <View style={styles.bgOverlay} pointerEvents="none" />
        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={getResponsiveSize(30)} color="#fff" />
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
  bgOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(5,9,15,0.55)',
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: getResponsiveSize(20),
    paddingTop: getResponsiveSize(50),
    backgroundColor: T.bg1,
    borderBottomWidth: 1,
    borderBottomColor: T.borderSoft,
  },
  coinContainer: {
    backgroundColor: T.bg2,
    paddingVertical: getResponsiveSize(6),
    paddingHorizontal: getResponsiveSize(12),
    borderRadius: getResponsiveSize(T.radiusPill),
    borderWidth: 1,
    borderColor: T.border,
  },
  coinText: {
    color: T.gold,
    fontWeight: '800',
    fontSize: getResponsiveSize(14),
  },
  backButton: {
    padding: getResponsiveSize(8),
    backgroundColor: T.bg2,
    borderRadius: getResponsiveSize(T.radiusMd),
    borderWidth: 1,
    borderColor: T.borderSoft,
  },
  titre: {
    fontSize: getResponsiveSize(18),
    fontWeight: '800',
    color: T.text,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  sousTitre: {
    fontSize: getResponsiveSize(12),
    color: T.gold,
    textAlign: 'right',
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: getResponsiveSize(16),
    marginVertical: getResponsiveSize(12),
    backgroundColor: T.bg2,
    borderRadius: getResponsiveSize(T.radiusMd),
    padding: getResponsiveSize(4),
    borderWidth: 1,
    borderColor: T.borderSoft,
  },
  tab: {
    flex: 1,
    paddingVertical: getResponsiveSize(10),
    alignItems: 'center',
    borderRadius: getResponsiveSize(T.radiusSm),
  },
  activeTab: {
    backgroundColor: T.gold,
  },
  tabText: {
    fontSize: getResponsiveSize(13),
    fontWeight: '600',
    color: T.textMuted,
  },
  activeTabText: {
    color: '#1B1305',
    fontWeight: '800',
  },
  contentContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: getResponsiveSize(16),
    paddingBottom: getResponsiveSize(20),
  },
  tabContent: {
    gap: getResponsiveSize(14),
  },
  niveauCard: {
    backgroundColor: T.bg2,
    borderRadius: getResponsiveSize(T.radiusMd),
    padding: getResponsiveSize(14),
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: T.borderSoft,
    ...T.shadowCard,
  },
  niveauCardActive: {
    borderColor: T.gold,
    borderWidth: 2,
  },
  niveauEmoji: {
    fontSize: getResponsiveSize(36),
    marginRight: getResponsiveSize(14),
  },
  niveauInfo: {
    flex: 1,
  },
  niveauTitre: {
    fontSize: getResponsiveSize(16),
    fontWeight: '800',
    color: T.text,
    marginBottom: getResponsiveSize(3),
  },
  niveauDesc: {
    fontSize: getResponsiveSize(13),
    color: T.textDim,
    marginBottom: getResponsiveSize(3),
  },
  niveauTaux: {
    fontSize: getResponsiveSize(11),
    color: T.textMuted,
    fontStyle: 'italic',
  },
  selectedIndicator: {
    width: getResponsiveSize(24),
    height: getResponsiveSize(24),
    borderRadius: getResponsiveSize(12),
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: getResponsiveSize(8),
    backgroundColor: T.gold,
  },
  statsContainer: {
    marginTop: getResponsiveSize(6),
    paddingTop: getResponsiveSize(6),
    borderTopWidth: 1,
    borderTopColor: T.borderSoft,
  },
  statsTexte: {
    fontSize: getResponsiveSize(11),
    fontWeight: '600',
    color: T.gold,
  },
  option: {
    backgroundColor: T.bg2,
    borderRadius: getResponsiveSize(T.radiusMd),
    padding: getResponsiveSize(14),
    marginBottom: getResponsiveSize(10),
    borderWidth: 1,
    borderColor: T.borderSoft,
  },
  optionLabel: {
    fontSize: getResponsiveSize(14),
    fontWeight: '800',
    color: T.gold,
    marginBottom: getResponsiveSize(10),
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  buttonGroup: {
    flexDirection: 'row',
    gap: getResponsiveSize(8),
  },
  optionButton: {
    flex: 1,
    paddingVertical: getResponsiveSize(10),
    paddingHorizontal: getResponsiveSize(8),
    borderRadius: getResponsiveSize(T.radiusSm),
    backgroundColor: T.bg3,
    borderWidth: 1,
    borderColor: T.borderSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionButtonActive: {
    backgroundColor: T.gold,
    borderColor: T.gold,
  },
  optionButtonText: {
    fontSize: getResponsiveSize(12),
    fontWeight: '700',
    color: T.textDim,
    textAlign: 'center',
  },
  optionButtonTextActive: {
    color: '#1B1305',
  },
  pickerContainer: {
    gap: getResponsiveSize(8),
  },
  vitesseOption: {
    paddingVertical: getResponsiveSize(10),
    paddingHorizontal: getResponsiveSize(14),
    borderRadius: getResponsiveSize(T.radiusSm),
    backgroundColor: T.bg3,
    borderWidth: 1,
    borderColor: T.borderSoft,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  vitesseOptionActive: {
    backgroundColor: T.gold,
    borderColor: T.gold,
  },
  vitesseTexte: {
    fontSize: getResponsiveSize(13),
    fontWeight: '600',
    color: T.textDim,
  },
  vitesseTexteActive: {
    color: '#1B1305',
  },
  switchOption: {
    backgroundColor: T.bg2,
    borderRadius: getResponsiveSize(T.radiusMd),
    padding: getResponsiveSize(14),
    marginBottom: getResponsiveSize(10),
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: T.borderSoft,
  },
  switchLabel: {
    fontSize: getResponsiveSize(14),
    fontWeight: '700',
    color: T.text,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: getResponsiveSize(16),
    backgroundColor: T.bg1,
    borderTopWidth: 1,
    borderTopColor: T.borderSoft,
  },
  boutonLancer: {
    backgroundColor: T.green,
    paddingVertical: getResponsiveSize(14),
    borderRadius: getResponsiveSize(T.radiusMd),
    alignItems: 'center',
    ...T.shadowBtn,
  },
  boutonLancerTexte: {
    fontSize: getResponsiveSize(16),
    fontWeight: '800',
    color: '#fff',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  betDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: getResponsiveSize(140),
    height: getResponsiveSize(50),
    overflow: 'hidden',
    backgroundColor: T.bg3,
    borderRadius: getResponsiveSize(T.radiusPill),
    marginHorizontal: getResponsiveSize(10),
    borderWidth: 1,
    borderColor: T.border,
  },
  betDisplayText: {
    color: T.gold,
    fontSize: getResponsiveSize(22),
    fontWeight: '900',
    width: getResponsiveSize(120),
    textAlign: 'center',
  },
});

export default ConfigurationJeuIA;
