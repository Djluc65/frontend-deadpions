const { getDefaultConfig } = require('expo/metro-config');
const { resolve } = require('metro-resolver');

const config = getDefaultConfig(__dirname);

config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];
config.resolver.unstable_conditionNames = ['react-native', 'browser', 'require', 'default'];
config.resolver.unstable_enablePackageExports = true;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'axios') {
    const axiosBrowserEntrypoint = require.resolve('axios/dist/browser/axios.cjs');
    return resolve(context, axiosBrowserEntrypoint, platform);
  }
  return resolve(context, moduleName, platform);
};

module.exports = config;
