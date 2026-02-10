import { Platform } from 'react-native';

// Replace with your computer's local IP address
// You can find it by running 'ipconfig' (Windows) or 'ifconfig' (Mac/Linux)
// Example: 'http://192.168.1.15:5001/api'

// Current IP found: 172.20.10.2
const LOCAL_IP = '172.20.10.2';
const PORT = '5001';

export const API_URL = process.env.EXPO_PUBLIC_API_URL || `http://${LOCAL_IP}:${PORT}/api`;

console.log('🔌 API URL:', API_URL);
console.log('🌍 MODE:', API_URL.includes('railway') ? 'PRODUCTION (LIGNE)' : 'LOCAL');
