import { useQuery } from '@tanstack/react-query';
import { API_URL } from '../config';
import { useSelector } from 'react-redux';

const fetchUser = async (token) => {
  if (!token) throw new Error('No token');
  const response = await fetch(`${API_URL}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!response.ok) {
    throw new Error('Network response was not ok');
  }
  return response.json();
};

export const useUser = () => {
  const token = useSelector((state) => state.auth.token);
  
  return useQuery({
    queryKey: ['user', token],
    queryFn: () => fetchUser(token),
    enabled: !!token,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};
