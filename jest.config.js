module.exports = {
  preset: 'react-native',
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|react-redux|@react-native-async-storage|@tanstack|immer|redux-persist)'
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  moduleNameMapper: {
    '^expo-localization$': '<rootDir>/__mocks__/expo-localization.js',
    '^expo-keep-awake$': '<rootDir>/__mocks__/expo-keep-awake.js',
  },
};
