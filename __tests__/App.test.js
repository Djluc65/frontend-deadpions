import React from 'react';
import renderer from 'react-test-renderer';
import App from '../App';

// Mocks
jest.mock('expo-font');
jest.mock('expo-splash-screen', () => ({
  preventAutoHideAsync: jest.fn().mockResolvedValue(true),
  hideAsync: jest.fn().mockResolvedValue(true),
}));
jest.mock('expo-linking', () => ({
  createURL: jest.fn(url => url),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  getInitialURL: jest.fn(() => Promise.resolve(null)),
  resolveScheme: jest.fn(() => 'deadpions'),
}));
jest.mock('expo-constants', () => ({
  manifest: {
    extra: {
      apiUrl: 'http://localhost:3000',
    },
  },
}));
jest.mock('../src/navigation/AppNavigator', () => {
  const { View } = require('react-native');
  return () => <View testID="AppNavigator" />;
});
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve()),
}));
jest.mock('react-native-gesture-handler', () => ({
  GestureHandlerRootView: 'GestureHandlerRootView',
}));
jest.mock('@stripe/stripe-react-native', () => ({
  StripeProvider: ({ children }) => children,
}));
jest.mock('expo-av', () => ({
  Audio: {
    Sound: {
      createAsync: jest.fn(() => Promise.resolve({ sound: { unloadAsync: jest.fn() } })),
    },
    setAudioModeAsync: jest.fn(),
  },
}));
jest.mock('expo-haptics', () => ({
  notificationAsync: jest.fn(),
  impactAsync: jest.fn(),
  selectionAsync: jest.fn(),
}));
jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    NavigationContainer: ({ children }) => children,
  };
});
jest.mock('redux-persist/integration/react', () => ({
  PersistGate: ({ children }) => children,
}));
jest.mock('expo-status-bar', () => ({
  StatusBar: () => 'StatusBar',
}));
jest.mock('../src/components/CoinsFeedback', () => 'CoinsFeedback');
jest.mock('../src/context/CoinsContext', () => ({
  CoinsProvider: ({ children }) => children,
  useCoins: () => ({
    balance: 1000,
    updateBalance: jest.fn(),
  }),
}));
jest.mock('@tanstack/react-query', () => ({
  QueryClientProvider: ({ children }) => children,
  QueryClient: jest.fn(),
}));
jest.mock('react-redux', () => ({
  Provider: ({ children }) => children,
  useDispatch: () => jest.fn(),
  useSelector: jest.fn(),
}));
jest.mock('../src/components/StripeProviderWrapper', () => ({
  StripeProviderWrapper: ({ children }) => children,
}));
jest.mock('../src/redux/store', () => ({
  store: {},
  persistor: {},
}));
jest.mock('../src/utils/queryClient', () => ({
  queryClient: {},
}));

describe('<App />', () => {
  it('renders correctly', async () => {
    const { act } = renderer;
    let component;
    await act(async () => {
      component = renderer.create(<App />);
    });
    const tree = component.toJSON();
    expect(tree).toMatchSnapshot();
  });
});
