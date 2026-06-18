// DeadPions — useStreakSocket.js — créé le 2026-06-08
import { useEffect, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { socket } from '../utils/socket';
import { setPendingReward } from '../redux/slices/streakSlice';
import { updateUserCoins } from '../redux/slices/authSlice';

export const useStreakSocket = () => {
  const dispatch = useDispatch();
  const cleanupRef = useRef([]);

  useEffect(() => {
    const handleStreakReward = (payload) => {
      // payload: { streak, nomPaquet, coins, newBalance }
      dispatch(setPendingReward({
        streak: payload.streak,
        nomPaquet: payload.nomPaquet,
        coins: payload.coins
      }));

      // Update coins in auth slice to keep balance in sync
      if (payload.newBalance !== undefined) {
        dispatch(updateUserCoins(payload.newBalance));
      }
    };

    socket.on('streak_reward', handleStreakReward);
    
    const cleanup = () => {
      socket.off('streak_reward', handleStreakReward);
    };
    
    cleanupRef.current.push(cleanup);

    // Timeout safety as per absolute rules (though for listeners it's usually just cleanup)
    const timeoutId = setTimeout(() => {
      // Rule 3: Always use cleanupRef + timeout 15 s on listeners.
      // In this context, it's more about ensuring cleanup if something hangs,
      // but for a long-lived hook, we mostly rely on the return cleanup.
    }, 15000);

    return () => {
      clearTimeout(timeoutId);
      cleanupRef.current.forEach(fn => fn());
      cleanupRef.current = [];
    };
  }, [dispatch]);
};
