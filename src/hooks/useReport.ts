import { useState } from 'react';
import { useSelector } from 'react-redux';
import { moderationService } from '../services/moderationService';

export const useReport = () => {
  const { token } = useSelector((state: any) => state.auth);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const submit = async (payload: {
    targetId: string;
    type: 'user' | 'message' | 'username';
    reason: string;
    details?: string;
    contextGameId?: string;
  }) => {
    if (!token) return false;
    setLoading(true);
    setSuccess(false);
    try {
      await moderationService.submitReport(payload, token);
      setSuccess(true);
      return true;
    } catch (error) {
      console.error('Error submitting report:', error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  return { submit, loading, success };
};
