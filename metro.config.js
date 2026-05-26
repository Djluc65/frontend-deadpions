const { getDefaultConfig } = require('expo/metro-config');
const { resolve } = require('metro-resolver');

const config = getDefaultConfig(__dirname);

// Liste des modules natifs à désactiver uniquement sur le web
const nativeModulesToBlockOnWeb = [
  'react-native-google-mobile-ads',
  'react-native-iap',
  'react-native-webrtc',
  'expo-apple-authentication',
  'expo-tracking-transparency',
  '@stripe/stripe-react-native'
];

config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Metro résout 'punycode' via le champ 'module' (punycode.es6.js, ESM).
  // Quand whatwg-url fait require('punycode'), l'interop CJS→ESM supprime punycode.ucs2,
  // ce qui cause "Cannot read property 'decode' of undefined".
  // Forcer la version CJS (punycode.js) pour préserver punycode.ucs2.
  if (moduleName === 'punycode') {
    return { type: 'sourceFile', filePath: require.resolve('punycode/punycode.js') };
  }

  if (platform === 'web') {
    // Bloquer les modules natifs connus pour poser problème sur le web
    if (nativeModulesToBlockOnWeb.some(m => moduleName === m || moduleName.startsWith(m + '/'))) {
      return { type: 'empty' };
    }

    // Éviter les imports internes de react-native qui ne sont pas supportés sur le web
    if (moduleName.includes('codegenNativeCommands') || 
        moduleName.includes('NativeComponent') || 
        (moduleName.includes('react-native/Libraries/') && !moduleName.includes('react-native/Libraries/Image/AssetSourceResolver'))) {
      return { type: 'empty' };
    }
    
    // Forcer react-native vers react-native-web sur navigateur
    if (moduleName === 'react-native') {
      return resolve(context, 'react-native-web', platform);
    }
  }

  // Correction spécifique pour axios (toutes plateformes)
  if (moduleName === 'axios') {
    try {
      const axiosBrowserEntrypoint = require.resolve('axios/dist/browser/axios.cjs');
      return resolve(context, axiosBrowserEntrypoint, platform);
    } catch (e) {}
  }
  
  // Pour iOS et Android, on laisse Metro gérer normalement
  return resolve(context, moduleName, platform);
};

// Configuration des champs prioritaires adaptée à la plateforme
// Pour le web, on veut 'browser' en premier. 
// Pour le natif, on DOIT avoir 'react-native' en premier.
config.resolver.resolverMainFields = ['react-native', 'browser', 'module', 'main'];

module.exports = config;
