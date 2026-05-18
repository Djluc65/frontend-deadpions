import { Audio } from 'expo-av';
import { store } from '../redux/store';

let buttonSound = null;
let gameStartSound = null;
let lastButtonSoundAt = 0;
let buttonSoundInitPromise = null;

export const playButtonSound = async () => {
  const state = store.getState();
  // Check if settings exist (might be undefined during initialization or migration)
  // Default to true if not found
  const isSoundEnabled = state.settings ? state.settings.isSoundEnabled : true;

  if (!isSoundEnabled) return;

  try {
    const now = Date.now();
    if (now - lastButtonSoundAt < 180) return;
    lastButtonSoundAt = now;

    if (!buttonSound) {
      if (!buttonSoundInitPromise) {
        buttonSoundInitPromise = Audio.Sound.createAsync(
          require('../../assets/song/bouton2.mp3'),
          { shouldPlay: false }
        ).then(({ sound }) => {
          buttonSound = sound;
          return sound;
        }).finally(() => {
          buttonSoundInitPromise = null;
        });
      }
      await buttonSoundInitPromise;
    }

    if (!buttonSound) return;

    try {
      await buttonSound.stopAsync();
    } catch (_) {}

    try {
      await buttonSound.setPositionAsync(0);
    } catch (_) {}

    await buttonSound.playAsync();
  } catch (error) {
    console.log('Error playing button sound', error);
  }
};

export const playGameStartSound = async () => {
  const state = store.getState();
  const isSoundEnabled = state.settings ? state.settings.isSoundEnabled : true;
  if (!isSoundEnabled) return;

  try {
    if (gameStartSound) {
      try {
        await gameStartSound.unloadAsync();
      } catch (_) {}
      gameStartSound = null;
    }

    const { sound } = await Audio.Sound.createAsync(
      require('../../assets/song/sonsGamePlay.mp3')
    );
    gameStartSound = sound;
    await sound.playAsync();

    sound.setOnPlaybackStatusUpdate(async (status) => {
      if (status.didJustFinish) {
        try {
          await sound.unloadAsync();
        } catch (_) {}
        if (gameStartSound === sound) gameStartSound = null;
      }
    });
  } catch (error) {
    console.log('Error playing game start sound', error);
  }
};
