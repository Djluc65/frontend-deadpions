import { Audio } from 'expo-av';

let homeSound = null;
let gameSound = null;
let isHomeLoading = false;
let shouldStopHome = false;
let activeGameScreens = 0;
let isRematchMode = false;

export const AudioController = {
  get isRematchMode() {
    return isRematchMode;
  },

  setRematchMode(value) {
    isRematchMode = value;
    console.log('Rematch Mode set to:', value);
  },

  notifyGameEnter() {
    activeGameScreens++;
    isRematchMode = false; // Reset on new game entry
    console.log('Game Enter: activeGameScreens =', activeGameScreens);
    this.stopHomeMusic(); // Ensure home music stops when entering a game
  },

  notifyGameExit() {
    if (activeGameScreens > 0) {
      activeGameScreens--;
    }
    if (activeGameScreens === 0) {
      this.stopGameMusic();
    }
    console.log('Game Exit: activeGameScreens =', activeGameScreens);
  },

  async playHomeMusic(isMusicEnabled) {
    // Prevent home music if a game is still active
    if (activeGameScreens > 0) {
      console.log('Skipping Home Music: Game(s) still active');
      return;
    }

    if (isRematchMode) {
      console.log('Skipping Home Music: Rematch in progress');
      return;
    }

    if (!isMusicEnabled) {
      await this.stopHomeMusic();
      return;
    }
    
    try {
      if (homeSound) {
        const status = await homeSound.getStatusAsync();
        if (status.isPlaying) return;
        await homeSound.playAsync();
        return;
      }
      
      // Si déjà en cours de chargement, on ne lance pas une deuxième requête
      if (isHomeLoading) return;

      isHomeLoading = true;
      shouldStopHome = false;
      
      const { sound } = await Audio.Sound.createAsync(
        require('../../assets/song/AmbianceSonoreBackgroundHome2.mp3'),
        { isLooping: true, volume: 0.4 }
      );

      // Si stopHomeMusic a été appelé pendant le chargement
      if (shouldStopHome) {
        await sound.unloadAsync();
        isHomeLoading = false;
        return;
      }

      homeSound = sound;
      isHomeLoading = false;
      await sound.playAsync();
    } catch (error) {
      isHomeLoading = false;
      console.log('Error playing home music', error);
    }
  },

  async stopHomeMusic() {
    shouldStopHome = true; // Signal d'arrêt pour le chargement en cours
    if (homeSound) {
      try {
        await homeSound.stopAsync();
        await homeSound.unloadAsync();
        homeSound = null;
      } catch (e) {
        console.log('Error stopping home music', e);
      }
    }
  },

  async playGameMusic(isMusicEnabled) {
    if (!isMusicEnabled) {
      await this.stopGameMusic();
      return;
    }

    try {
      if (gameSound) {
        const status = await gameSound.getStatusAsync();
        if (status.isPlaying) return;
        await gameSound.playAsync();
        return;
      }

      const { sound } = await Audio.Sound.createAsync(
        require('../../assets/song/Sons de gameplay.mp3'),
        { isLooping: false, volume: 0.5 }
      );
      gameSound = sound;
      await sound.playAsync();
    } catch (error) {
      console.log('Error playing game music', error);
    }
  },

  async stopGameMusic() {
    if (gameSound) {
      try {
        await gameSound.stopAsync();
        await gameSound.unloadAsync();
        gameSound = null;
      } catch (e) {
        console.log('Error stopping game music', e);
      }
    }
  },

  async playVictorySound(isSoundEnabled) {
    if (!isSoundEnabled) return;
    try {
      const { sound } = await Audio.Sound.createAsync(
        require('../../assets/song/game-over-deep-male-voice-clip-352695.mp3')
      );
      await sound.playAsync();
      
      sound.setOnPlaybackStatusUpdate(async (status) => {
        if (status.didJustFinish) {
          try {
            await sound.unloadAsync();
          } catch (e) {
             // ignore
          }
        }
      });
    } catch (error) {
      console.log('Error playing victory sound', error);
    }
  }
};
