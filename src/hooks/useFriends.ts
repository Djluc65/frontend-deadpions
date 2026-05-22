import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import axios from 'axios';
import { API_URL } from '../config';

export const useFriends = () => {
  const { token } = useSelector((state: any) => state.auth);
  const [friends, setFriends] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchFriends = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/friends`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFriends(response.data);
    } catch (error) {
      console.error('Error fetching friends:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRequests = async () => {
    if (!token) return;
    try {
      const response = await axios.get(`${API_URL}/friends/requests`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRequests(response.data);
    } catch (error) {
      console.error('Error fetching requests:', error);
    }
  };

  const sendRequest = async (targetId: string) => {
    if (!token) return false;
    try {
      await axios.post(`${API_URL}/friends/request`, { recipientId: targetId }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return true;
    } catch (error) {
      console.error('Error sending friend request:', error);
      return false;
    }
  };

  const acceptRequest = async (requestId: string) => {
    if (!token) return false;
    try {
      await axios.post(`${API_URL}/friends/accept`, { requestId }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchFriends();
      fetchRequests();
      return true;
    } catch (error) {
      console.error('Error accepting friend request:', error);
      return false;
    }
  };

  const declineRequest = async (requestId: string) => {
    if (!token) return false;
    try {
      await axios.post(`${API_URL}/friends/decline`, { requestId }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchRequests();
      return true;
    } catch (error) {
      console.error('Error declining friend request:', error);
      return false;
    }
  };

  const removeFriend = async (friendId: string) => {
    if (!token) return false;
    try {
      await axios.delete(`${API_URL}/friends/${friendId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchFriends();
      return true;
    } catch (error) {
      console.error('Error removing friend:', error);
      return false;
    }
  };

  useEffect(() => {
    fetchFriends();
    fetchRequests();
  }, [token]);

  return { 
    friends, 
    requests, 
    loading, 
    sendRequest, 
    acceptRequest, 
    declineRequest, 
    removeFriend, 
    refresh: () => { fetchFriends(); fetchRequests(); } 
  };
};
