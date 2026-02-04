import { Audio } from 'expo-av';
import { store } from '../redux/store';

let buttonSound = null;

export const playButtonSound = async () => {
  const state = store.getState();
  // Check if settings exist (might be undefined during initialization or migration)
  // Default to true if not found
  const isSoundEnabled = state.settings ? state.settings.isSoundEnabled : true;

  if (!isSoundEnabled) return;

  try {
    const { sound } = await Audio.Sound.createAsync(
      require('../../assets/song/bouton2.mp3')
    );
    buttonSound = sound;
    await sound.playAsync();
    
    // Libérer la ressource après la lecture
    sound.setOnPlaybackStatusUpdate(async (status) => {
      if (status.didJustFinish) {
        await sound.unloadAsync();
      }
    });
  } catch (error) {
    console.log('Error playing button sound', error);
  }
};
