import { Platform } from 'react-native';

// Initialize Meta SDK only if it's available
let FBSDK = null;

try {
  if (Platform.OS === 'ios') {
    // Try to import react-native-fbsdk-next
    const { AppEventsLogger } = require('react-native-fbsdk-next');
    FBSDK = { AppEventsLogger };
  }
} catch (error) {
  console.warn('[MetaAnalytics] SDK not available:', error);
}

/**
 * Track an event with Meta Analytics
 * @param {string} eventName - Name of the event (e.g., 'game_started', 'match_won')
 * @param {object} [params] - Optional parameters for the event
 */
export const trackMetaEvent = (eventName, params = {}) => {
  if (!FBSDK?.AppEventsLogger) {
    console.warn('[MetaAnalytics] SDK not initialized, skipping event:', eventName);
    return;
  }

  try {
    if (Platform.OS === 'ios') {
      FBSDK.AppEventsLogger.logEvent(eventName, params);
    }
    console.log('[MetaAnalytics] Tracked event:', eventName, params);
  } catch (error) {
    console.error('[MetaAnalytics] Error tracking event:', error);
  }
};

/**
 * Track game started event
 */
export const trackGameStarted = () => {
  trackMetaEvent('game_started');
};

/**
 * Track match won event
 * @param {string} gameType - Type of game (e.g., 'online', 'ai', 'tournament')
 * @param {number} coinsEarned - Coins earned from the match (optional)
 */
export const trackMatchWon = (gameType = 'unknown', coinsEarned = null) => {
  trackMetaEvent('match_won', {
    game_type: gameType,
    ...(coinsEarned !== null ? { coins_earned: coinsEarned } : {})
  });
};

/**
 * Track purchase event
 * @param {string} productId - ID of the purchased product
 * @param {string} productName - Name of the product
 * @param {number} amount - Amount spent
 * @param {string} currency - Currency code (e.g., 'EUR', 'USD')
 */
export const trackPurchase = (productId, productName, amount, currency = 'EUR') => {
  trackMetaEvent('purchase', {
    product_id: productId,
    product_name: productName,
    value: amount,
    currency: currency
  });
};
