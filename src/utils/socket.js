import io from 'socket.io-client';
import { API_URL } from '../config';

// Remove /api from URL for socket connection if present
const SOCKET_URL = API_URL.replace('/api', '');

export const socket = io(SOCKET_URL, {
  autoConnect: false,
  transports: ['websocket'],
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});
