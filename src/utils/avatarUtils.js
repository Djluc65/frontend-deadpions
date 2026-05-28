import { API_URL } from '../config';

export const PREMIUM_AVATARS = [
  { id: 'premium_1', source: require('../../assets/avatars/alba-ballesta-gonzalez-ilustracion.jpg') },
  { id: 'premium_2', source: require('../../assets/images/LogoDeadPions-nobg.png') },
  { id: 'premium_3', source: require('../../assets/avatars/daniel-merticariu-beard-frontexperiment.jpg') },
  { id: 'premium_4', source: require('../../assets/avatars/daniel-merticariu-luna-main-camera-1.jpg') },
  { id: 'premium_5', source: require('../../assets/avatars/lion2.png') },
  { id: 'premium_6', source: require('../../assets/avatars/lion_drawing_full_body.webp') },
  { id: 'premium_7', source: require('../../assets/avatars/michael-chang-night-king-5hh-2.jpg') },
  { id: 'premium_8', source: require('../../assets/avatars/nikita-cherkezov-delfis-img-5688.jpg') },
  { id: 'premium_9', source: require('../../assets/avatars/nikita-cherkezov-delfis-img-5689.jpg') },
  { id: 'premium_10', source: require('../../assets/images/LogoDeadPions-nobg.png') },
];

export const getAvatarSource = (avatarString) => {
  if (!avatarString) {
      return null; 
  }
  const raw = typeof avatarString === 'string' ? avatarString : `${avatarString}`;
  const normalized = raw.trim().replace(/`/g, '');
  if (!normalized) return null;

  // Check if it's a premium avatar ID
  const premiumAvatar = PREMIUM_AVATARS.find(a => a.id === normalized);
  if (premiumAvatar) {
    return premiumAvatar.source;
  }

  // Handle URL or relative path
  if (normalized.startsWith('http')) {
    return { uri: normalized };
  }
  
  if (normalized.startsWith('/uploads')) {
    return { uri: `${API_URL.replace('/api', '')}${normalized}` };
  }

  // Fallback (might be a direct URI string or legacy)
  return { uri: normalized };
};
