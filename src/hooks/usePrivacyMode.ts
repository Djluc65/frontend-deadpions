import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { moderationService } from '../services/moderationService';

export const usePrivacyMode = () => {
  const { token, user } = useSelector((state: any) => state.auth);
  const [privacyMode, setPrivacyMode] = useState<'public' | 'friends_only'>(user?.privacyMode || 'public');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user?.privacyMode) {
      setPrivacyMode(user.privacyMode);
    }
  }, [user]);

  const updatePrivacy = async (newMode: 'public' | 'friends_only') => {
    if (!token) return false;
    setLoading(true);
    try {
      await moderationService.updatePrivacyMode(newMode, token);
      setPrivacyMode(newMode);
      return true;
    } catch (error) {
      console.error('Error updating privacy mode:', error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  return { privacyMode, updatePrivacy, loading };
};
