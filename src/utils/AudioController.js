import { Audio } from 'expo-av';

let homeSound = null;
let gameSound = null;

export const AudioController = {
  async playHomeMusic(isMusicEnabled) {
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
      
      const { sound } = await Audio.Sound.createAsync(
        require('../../assets/song/AmbianceSonoreBackgroundHome2.mp3'),
        { isLooping: true, volume: 0.4 }
      );
      homeSound = sound;
      await sound.playAsync();
    } catch (error) {
      console.log('Error playing home music', error);
    }
  },

  async stopHomeMusic() {
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
