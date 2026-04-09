import React from 'react';
import renderer from 'react-test-renderer';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { AppState } from 'react-native';
import { useAdManager } from '../src/ads/AdSystem';
import { appAlert } from '../src/services/appAlert';
import { socket } from '../src/utils/socket';

jest.mock('expo-constants', () => ({
  expoConfig: {
    extra: {
      apiUrl: 'http://localhost:3000',
    },
  },
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve()),
  mergeItem: jest.fn(() => Promise.resolve()),
  clear: jest.fn(() => Promise.resolve()),
  getAllKeys: jest.fn(() => Promise.resolve([])),
  multiGet: jest.fn(() => Promise.resolve([])),
  multiSet: jest.fn(() => Promise.resolve()),
  multiRemove: jest.fn(() => Promise.resolve()),
}));

// Mocks
jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
  useDispatch: jest.fn(),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

jest.mock('../src/ads/AdSystem', () => ({
  useAdManager: jest.fn(),
}));

jest.mock('../src/services/appAlert', () => ({
  appAlert: jest.fn(),
}));

jest.mock('../src/utils/socket', () => ({
  socket: {
    on: jest.fn(),
    off: jest.fn(),
    emit: jest.fn(),
    connected: true,
    connect: jest.fn(),
  },
}));

jest.mock('../src/utils/responsive', () => ({
  getResponsiveSize: jest.fn((val) => val),
}));

const SessionController = require('../src/components/SessionController').default;

describe('SessionController', () => {
  const { act } = renderer;
  let mockNavigation;
  let mockAdManager;
  let mockDispatch;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockNavigation = {
      getState: jest.fn(() => ({
        index: 0,
        routes: [{ name: 'Home' }],
      })),
      addListener: jest.fn(() => jest.fn()),
      navigate: jest.fn(),
    };
    useNavigation.mockReturnValue(mockNavigation);

    mockDispatch = jest.fn();
    useDispatch.mockReturnValue(mockDispatch);

    mockAdManager = {
      showAds: true,
      prepareRewarded: jest.fn(),
      showRewarded: jest.fn(),
    };
    useAdManager.mockReturnValue(mockAdManager);

    useSelector.mockImplementation((selector) => {
      return selector({
        auth: {
          token: 'fake-token',
          user: { _id: 'user-123', pseudo: 'TestUser' },
        },
      });
    });

    // Mock fetch
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ inGame: false }),
      })
    );
  });

  it('renders without crashing (returns null)', async () => {
    let component;
    await act(async () => {
      component = renderer.create(<SessionController />);
    });
    expect(component.toJSON()).toBeNull();
  });

  it('prompts for login reward when landing on Home after login', async () => {
    jest.useFakeTimers();
    
    await act(async () => {
      renderer.create(<SessionController />);
    });

    // Fast-forward for the setTimeout in SessionController
    await act(async () => {
      jest.advanceTimersByTime(400);
    });

    expect(appAlert).toHaveBeenCalledWith(
      'Bonus de connexion',
      expect.any(String),
      expect.any(Array)
    );
    
    jest.useRealTimers();
  });

  it('tracks active game ID from socket events', async () => {
    await act(async () => {
      renderer.create(<SessionController />);
    });

    // Find the game_start listener
    const handleGameStart = socket.on.mock.calls.find(call => call[0] === 'game_start')[1];
    
    await act(async () => {
      handleGameStart({ gameId: 'game-456' });
    });

    // activeGameId is internal (ref), but we can verify it by triggering a session check
    // If we trigger a reconnect, it should now call fetch with the gameId
    const handleReconnect = socket.on.mock.calls.find(call => call[0] === 'connect')[1];
    
    await act(async () => {
      handleReconnect();
    });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('gameId=game-456'),
      expect.any(Object)
    );
  });

  it('clears active game ID when returning to Home', async () => {
    await act(async () => {
      renderer.create(<SessionController />);
    });

    // Set an active game
    const handleGameStart = socket.on.mock.calls.find(call => call[0] === 'game_start')[1];
    await act(async () => {
      handleGameStart({ gameId: 'game-456' });
    });

    // Find the navigation listener
    const navListener = mockNavigation.addListener.mock.calls.find(call => call[0] === 'state')[1];
    
    // Simulate navigating to Home
    await act(async () => {
      navListener({
        data: {
          state: {
            index: 0,
            routes: [{ name: 'Home' }],
          },
        },
      });
    });

    // Now if we reconnect, it should NOT fetch because activeGameId is null
    const handleReconnect = socket.on.mock.calls.find(call => call[0] === 'connect')[1];
    global.fetch.mockClear();
    
    await act(async () => {
      handleReconnect();
    });

    expect(global.fetch).not.toHaveBeenCalled();
  });
});
