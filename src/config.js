import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Replace with your computer's local IP address
// You can find it by running 'ipconfig' (Windows) or 'ifconfig' (Mac/Linux)
// Example: 'http://192.168.1.15:5001/api'

// Fallback IP (used only if not in dev client and no env provided)
const LOCAL_IP = '172.20.10.2';
const PORT = '5001';

// Try to infer host from Expo dev environment (Dev Client / metro)
const hostFromExpo = (() => {
  const hostUri = Constants.expoConfig?.hostUri || Constants.manifest2?.extra?.expoClient?.hostUri || Constants.manifest?.debuggerHost;
  if (typeof hostUri === 'string') {
    const base = hostUri.split(':')[0];
    if (base && base.match(/^\d+\.\d+\.\d+\.\d+$/)) {
      return base;
    }
  }
  return null;
})();

export const API_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  (hostFromExpo ? `http://${hostFromExpo}:${PORT}/api` : `http://${LOCAL_IP}:${PORT}/api`);

console.log('🔌 API URL:', API_URL);
console.log('🌍 MODE:', API_URL.includes('railway') ? 'PRODUCTION (LIGNE)' : 'LOCAL');
