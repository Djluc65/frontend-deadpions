import { API_URL } from '../config';

export const PREMIUM_AVATARS = [
  { id: 'premium_1', source: require('../../assets/avatars/alba-ballesta-gonzalez-ilustracion.jpg') },
  { id: 'premium_2', source: require('../../assets/avatars/chris-knight-event-banner-pve-varkolak.jpg') },
  { id: 'premium_3', source: require('../../assets/avatars/daniel-merticariu-beard-frontexperiment.jpg') },
  { id: 'premium_4', source: require('../../assets/avatars/daniel-merticariu-luna-main-camera-1.jpg') },
  { id: 'premium_5', source: require('../../assets/avatars/hicham-habchi-sbe3.jpg') },
  { id: 'premium_6', source: require('../../assets/avatars/ilse-harting-cutie.jpg') },
  { id: 'premium_7', source: require('../../assets/avatars/michael-chang-night-king-5hh-2.jpg') },
  { id: 'premium_8', source: require('../../assets/avatars/nikita-cherkezov-delfis-img-5688.jpg') },
  { id: 'premium_9', source: require('../../assets/avatars/nikita-cherkezov-delfis-img-5689.jpg') },
  { id: 'premium_10', source: require('../../assets/avatars/nikita-cherkezov-delfis-img-5690.jpg') },
];

export const getAvatarSource = (avatarString) => {
  if (!avatarString) {
      return null; 
  }

  // Check if it's a premium avatar ID
  const premiumAvatar = PREMIUM_AVATARS.find(a => a.id === avatarString);
  if (premiumAvatar) {
    return premiumAvatar.source;
  }

  // Handle URL or relative path
  if (avatarString.startsWith('http')) {
    return { uri: avatarString };
  }
  
  if (avatarString.startsWith('/uploads')) {
    return { uri: `${API_URL.replace('/api', '')}${avatarString}` };
  }

  // Fallback (might be a direct URI string or legacy)
  return { uri: avatarString };
};
