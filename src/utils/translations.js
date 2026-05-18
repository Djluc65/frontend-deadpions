// Wrapper de compatibilité — les anciens imports `translations[lang]` continuent de fonctionner.
// Le vrai système i18n est dans src/i18n/index.js (i18next).
// Pour tout nouveau code, utiliser directement : import { useTranslation } from 'react-i18next';
import i18n from '../i18n/index';

export const translations = new Proxy({}, {
  get(_, lang) {
    return new Proxy({}, {
      get(__, key) {
        const saved = i18n.language;
        if (lang && lang !== saved) i18n.changeLanguage(lang);
        const val = i18n.t(key);
        if (lang && lang !== saved) i18n.changeLanguage(saved);
        return val !== key ? val : (i18n.getResourceBundle('fr', 'translation')?.[key] ?? key);
      }
    });
  }
});
