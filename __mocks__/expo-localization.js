// Mock Jest pour expo-localization (module natif indisponible en environnement Node)
const getLocales = () => [
  { languageCode: 'fr', regionCode: 'FR', languageTag: 'fr-FR', textDirection: 'ltr' },
];

const getCalendars = () => [
  { calendar: 'gregorian', timeZone: 'Europe/Paris' },
];

module.exports = {
  getLocales,
  getCalendars,
  locale: 'fr-FR',
  locales: ['fr-FR'],
  timezone: 'Europe/Paris',
  isRTL: false,
};
