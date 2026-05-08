import { normalize, getResponsiveWidth, getResponsiveSize, CONTENT_WIDTH } from '../src/utils/responsive';

// Mocks
jest.mock('react-native', () => ({
  Dimensions: {
    get: jest.fn(() => ({
      width: 375,
      height: 667,
    })),
  },
  Platform: {
    OS: 'ios',
  },
  PixelRatio: {
    roundToNearestPixel: jest.fn((value) => Math.round(value)),
  },
}));

describe('Responsive Utilities', () => {
  describe('normalize', () => {
    it('should normalize size based on screen width', () => {
      const result = normalize(20);
      expect(result).toBe(20);
    });
  });

  describe('getResponsiveWidth', () => {
    it('should calculate responsive width without max', () => {
      const result = getResponsiveWidth(50);
      expect(result).toBe((50 * CONTENT_WIDTH) / 100);
    });

    it('should respect maxWidth constraint', () => {
      const result = getResponsiveWidth(100, 300);
      expect(result).toBe(300);
    });
  });

  describe('getResponsiveSize', () => {
    it('should return normalized size for non-tablet', () => {
      const result = getResponsiveSize(20);
      expect(result).toBe(20);
    });
  });
});
