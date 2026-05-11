const { getDefaultConfig } = require('expo/metro-config');
const { resolve } = require('metro-resolver');

const config = getDefaultConfig(__dirname);

// Liste des modules natifs à désactiver complètement sur le web
const nativeModulesToBlock = [
  'react-native-google-mobile-ads',
  'react-native-iap',
  'react-native-webrtc',
  'react-native-nitro-modules',
  'expo-apple-authentication',
  'expo-tracking-transparency',
  '@stripe/stripe-react-native'
];

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web') {
    // Bloquer les modules natifs connus pour poser problème sur le web
    if (nativeModulesToBlock.some(m => moduleName === m || moduleName.startsWith(m + '/'))) {
      return { type: 'empty' };
    }

    // Éviter les imports internes de react-native qui ne sont pas supportés sur le web
    if (moduleName.includes('codegenNativeCommands') || 
        moduleName.includes('NativeComponent') || 
        (moduleName.includes('react-native/Libraries/') && !moduleName.includes('react-native/Libraries/Image/AssetSourceResolver'))) {
      return { type: 'empty' };
    }
    
    // Forcer react-native vers react-native-web
    if (moduleName === 'react-native') {
      return resolve(context, 'react-native-web', platform);
    }
  }

  // Correction spécifique pour axios
  if (moduleName === 'axios') {
    try {
      const axiosBrowserEntrypoint = require.resolve('axios/dist/browser/axios.cjs');
      return resolve(context, axiosBrowserEntrypoint, platform);
    } catch (e) {}
  }
  
  return resolve(context, moduleName, platform);
};

// Configuration pour Expo 52 Web
config.resolver.unstable_enablePackageExports = false;
config.resolver.resolverMainFields = ['browser', 'module', 'main'];

module.exports = config;
