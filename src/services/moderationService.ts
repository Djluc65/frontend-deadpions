import axios from 'axios';
import { API_URL } from '../config';

/**
 * Service for moderation-related API calls.
 */
export const moderationService = {
  /**
   * Block a user.
   */
  blockUser: async (targetId: string, token: string) => {
    const response = await axios.post(`${API_URL}/users/${targetId}/block`, {}, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },

  /**
   * Unblock a user.
   */
  unblockUser: async (targetId: string, token: string) => {
    const response = await axios.delete(`${API_URL}/users/${targetId}/block`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },

  /**
   * Get list of blocked users.
   */
  getBlockedUsers: async (token: string) => {
    const response = await axios.get(`${API_URL}/users/me/blocked`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },

  /**
   * Submit a report.
   */
  submitReport: async (payload: {
    targetId: string;
    type: 'user' | 'message' | 'username';
    reason: string;
    details?: string;
    contextGameId?: string;
  }, token: string) => {
    const response = await axios.post(`${API_URL}/reports`, payload, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },

  /**
   * Update user privacy mode.
   */
  updatePrivacyMode: async (privacyMode: 'public' | 'friends_only', token: string) => {
    const response = await axios.patch(`${API_URL}/users/me/privacy`, { privacyMode }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  }
};
