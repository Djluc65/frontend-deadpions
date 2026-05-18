import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';

import fr from './locales/fr.json';
import en from './locales/en.json';
import ht from './locales/ht.json';
import es from './locales/es.json';
import pt from './locales/pt.json';
import de from './locales/de.json';
import ja from './locales/ja.json';
import zh from './locales/zh.json';

const SUPPORTED_LANGUAGES = ['fr', 'en', 'ht', 'es', 'pt', 'de', 'ja', 'zh'];

// Régions dont la langue officielle principale est le français
const FRENCH_REGIONS = new Set([
  'FR','BE','CH','LU','MC','BJ','BF','BI','CD','CF','CG','CI','CM','DJ',
  'GA','GF','GP','GN','GQ','HT','KM','MG','ML','MQ','MR','MU','NC','NE',
  'PF','PM','RE','RW','SC','SN','TD','TG','VU','WF','YT','MF','BL',
]);

export function detectDeviceLanguage() {
  const locales = Localization.getLocales();
  if (!locales || locales.length === 0) return 'en';
  const { languageCode, regionCode } = locales[0];
  if (SUPPORTED_LANGUAGES.includes(languageCode)) return languageCode;
  // Langue non supportée → fallback selon la région
  if (regionCode && FRENCH_REGIONS.has(regionCode)) return 'fr';
  return 'en';
}

function formatMissingKey(key) {
  const last = String(key || '').split('.').pop() || '';
  const pretty = last.replace(/_/g, ' ').trim();
  if (!pretty) return String(key || '');
  return pretty.charAt(0).toUpperCase() + pretty.slice(1);
}

i18n
  .use(initReactI18next)
  .init({
    resources: { fr, en, ht, es, pt, de, ja, zh },
    lng: detectDeviceLanguage(),
    fallbackLng: 'fr',
    defaultNS: 'translation',
    returnNull: false,
    returnEmptyString: false,
    parseMissingKeyHandler: formatMissingKey,
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
export { SUPPORTED_LANGUAGES };
