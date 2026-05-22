import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { moderationService } from '../services/moderationService';
// Assuming there's a way to update the user in the store, e.g., via a profile update action
// If not, we'll just manage local state for now.

export const useBlockUser = (targetId: string) => {
  const { token, user } = useSelector((state: any) => state.auth);
  const [isBlocked, setIsBlocked] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user?.blockedUsers) {
      setIsBlocked(user.blockedUsers.includes(targetId));
    }
  }, [user, targetId]);

  const block = async () => {
    if (!token) return false;
    setLoading(true);
    try {
      await moderationService.blockUser(targetId, token);
      setIsBlocked(true);
      // Optional: dispatch an action to update the user object in Redux
      return true;
    } catch (error) {
      console.error('Error blocking user:', error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const unblock = async () => {
    if (!token) return false;
    setLoading(true);
    try {
      await moderationService.unblockUser(targetId, token);
      setIsBlocked(false);
      return true;
    } catch (error) {
      console.error('Error unblocking user:', error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  return { isBlocked, block, unblock, loading };
};
