const createExpoWebpackConfigAsync = require('@expo/webpack-config');
const { InjectManifest } = require('workbox-webpack-plugin');
const path = require('path');

module.exports = async function (env, argv) {
  const config = await createExpoWebpackConfigAsync(env, argv);

  if (env.mode === 'production') {
    config.plugins.push(
      new InjectManifest({
        swSrc: path.resolve(__dirname, 'src/sw.js'),
        swDest: 'sw.js',
      })
    );
  }

  return config;
};
