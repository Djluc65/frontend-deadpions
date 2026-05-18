import { useTranslation } from 'react-i18next';
import i18n, { SUPPORTED_LANGUAGES } from './index';

export function useTranslations() {
  const { t, i18n: inst } = useTranslation();
  return { t, lang: inst.language };
}

export function changeLanguage(lang) {
  if (SUPPORTED_LANGUAGES.includes(lang)) {
    return i18n.changeLanguage(lang);
  }
}

export { SUPPORTED_LANGUAGES };
