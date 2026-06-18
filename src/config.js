import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Replace with your computer's local IP address
// You can find it by running 'ipconfig' (Windows) or 'ifconfig' (Mac/Linux)
// Example: 'http://192.168.1.15:5001/api'

// Fallback IP (used only if not in dev client and no env provided)
const LOCAL_IP = '172.20.10.2';
const PORT = '8081';
const PROD_API_URL = 'https://backend-deadpions-production.up.railway.app/api';

const envApiUrl = typeof process.env.EXPO_PUBLIC_API_URL === 'string'
  ? process.env.EXPO_PUBLIC_API_URL.trim()
  : '';

const looksLikeLocalUrl = (url) => {
  if (!url) return false;
  if (url.startsWith('http://')) return true;
  if (url.includes('localhost') || url.includes('127.0.0.1')) return true;
  if (url.match(/:\/\/10\.\d+\.\d+\.\d+/)) return true;
  if (url.match(/:\/\/192\.168\.\d+\.\d+/)) return true;
  if (url.match(/:\/\/172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+/)) return true;
  return false;
};

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

const isAndroidEmulator = (() => {
  if (Platform.OS !== 'android') return false;
  if (Constants.isDevice === false) return true;
  const model = Platform.constants?.Model;
  if (typeof model === 'string') {
    const m = model.toLowerCase();
    if (m.includes('sdk') || m.includes('emulator') || m.includes('android sdk built for')) return true;
  }
  return false;
})();

export const API_URL = (() => {
  if (__DEV__) {
    const candidate = envApiUrl || (hostFromExpo ? `http://${hostFromExpo}:${PORT}/api` : `http://${LOCAL_IP}:${PORT}/api`);

    if (isAndroidEmulator && looksLikeLocalUrl(candidate) && !candidate.includes('://10.0.2.2')) {
      const match = candidate.match(/^(https?:\/\/)([^:/]+)(:\d+)?(\/.*)$/);
      if (match) {
        const protocol = match[1];
        const portPart = match[3] || `:${PORT}`;
        const path = match[4] || '/api';
        return `${protocol}10.0.2.2${portPart}${path}`;
      }
      return `http://10.0.2.2:${PORT}/api`;
    }

    return candidate;
  }

  if (envApiUrl && envApiUrl.startsWith('https://') && !looksLikeLocalUrl(envApiUrl)) {
    return envApiUrl;
  }

  return PROD_API_URL;
})();

if (__DEV__) {
  console.log('🔌 API URL:', API_URL);
  console.log('🌍 MODE:', API_URL.includes('railway') ? 'PRODUCTION (LIGNE)' : 'LOCAL');
}

export const WEBSITE_URL = 'https://play.deadpions.eu';
