/**
 * Feature Flags System
 * Wedding App - Unified Card System
 *
 * Purpose: Control gradual rollout of new card system
 * Usage: Check flags before rendering new components
 *
 * @version 1.0.0
 * @date 2025-10-11
 */

/**
 * Feature flag configuration
 * Enable/disable features for gradual rollout
 */
const FEATURES = {
  /**
   * New Card System
   * Unified card component architecture
   */
  NEW_CARD_SYSTEM: {
    // Master switch - set to true to enable
    enabled: false,

    // Gradual rollout percentage (0-100)
    rolloutPercentage: 0,

    // Allowlist of user IDs for beta testing
    allowlist: [],

    // Blocklist of user IDs to exclude
    blocklist: [],

    // Environment override
    enableInDev: true,
    enableInStaging: false,
    enableInProduction: false
  },

  /**
   * Card Variants
   * Control which card types use new system
   */
  CARD_VARIANTS: {
    partner: false,      // Partner/dating cards
    pawnshop: false,     // Pawnshop user cards
    profile: false,      // Profile modal cards
    ranking: false       // Ranking cards
  },

  /**
   * Accessibility Features
   */
  ACCESSIBILITY: {
    keyboardNavigation: true,
    screenReaderSupport: true,
    reducedMotion: true,
    highContrast: true
  },

  /**
   * Performance Features
   */
  PERFORMANCE: {
    lazyLoadImages: true,
    componentCaching: false,
    virtualScrolling: false
  }
};

/**
 * Check if a feature is enabled
 * @param {string} featureName - Feature name (e.g., 'NEW_CARD_SYSTEM')
 * @param {string|null} userId - Optional user ID for allowlist check
 * @returns {boolean} Whether feature is enabled
 */
function isFeatureEnabled(featureName, userId = null) {
  const feature = FEATURES[featureName];

  if (!feature) {
    console.warn(`[FeatureFlags] Unknown feature: ${featureName}`);
    return false;
  }

  // Check master switch
  if (!feature.enabled) {
    // Check environment overrides
    const env = getEnvironment();
    if (env === 'development' && feature.enableInDev) {
      return true;
    }
    if (env === 'staging' && feature.enableInStaging) {
      return true;
    }
    if (env === 'production' && feature.enableInProduction) {
      return true;
    }

    return false;
  }

  // Check blocklist
  if (userId && feature.blocklist && feature.blocklist.includes(userId)) {
    return false;
  }

  // Check allowlist
  if (userId && feature.allowlist && feature.allowlist.length > 0) {
    return feature.allowlist.includes(userId);
  }

  // Check rollout percentage
  if (feature.rolloutPercentage < 100) {
    if (!userId) {
      // Use random rollout if no user ID
      return Math.random() * 100 < feature.rolloutPercentage;
    }

    // Deterministic rollout based on user ID hash
    const hash = hashUserId(userId);
    return hash < feature.rolloutPercentage;
  }

  return true;
}

/**
 * Check if a card variant should use new system
 * @param {string} variant - Card variant (partner, pawnshop, profile, ranking)
 * @returns {boolean} Whether to use new card system
 */
function useNewCardSystem(variant) {
  // Check if new card system is enabled globally
  if (!isFeatureEnabled('NEW_CARD_SYSTEM')) {
    return false;
  }

  // Check specific variant flag
  const variantFlags = FEATURES.CARD_VARIANTS;
  return variantFlags[variant] || false;
}

/**
 * Get current environment
 * @returns {string} Environment name (development, staging, production)
 */
function getEnvironment() {
  // Check hostname
  const hostname = window.location.hostname;

  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'development';
  }

  if (hostname.includes('staging') || hostname.includes('test')) {
    return 'staging';
  }

  return 'production';
}

/**
 * Hash user ID for deterministic rollout
 * @param {string} userId - User ID
 * @returns {number} Hash value (0-99)
 */
function hashUserId(userId) {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    const char = userId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash) % 100;
}

/**
 * Log feature flag status (for debugging)
 */
function logFeatureFlags() {
  console.group('[FeatureFlags] Current Configuration');
  console.log('Environment:', getEnvironment());
  console.log('New Card System:', isFeatureEnabled('NEW_CARD_SYSTEM'));
  console.log('Card Variants:', FEATURES.CARD_VARIANTS);
  console.log('Accessibility:', FEATURES.ACCESSIBILITY);
  console.log('Performance:', FEATURES.PERFORMANCE);
  console.groupEnd();
}

/**
 * Enable a feature (for testing)
 * @param {string} featureName - Feature name
 */
function enableFeature(featureName) {
  if (FEATURES[featureName]) {
    FEATURES[featureName].enabled = true;
    console.log(`[FeatureFlags] Enabled feature: ${featureName}`);
  }
}

/**
 * Disable a feature (for testing)
 * @param {string} featureName - Feature name
 */
function disableFeature(featureName) {
  if (FEATURES[featureName]) {
    FEATURES[featureName].enabled = false;
    console.log(`[FeatureFlags] Disabled feature: ${featureName}`);
  }
}

// Log flags on load (only in development)
if (getEnvironment() === 'development') {
  logFeatureFlags();
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    FEATURES,
    isFeatureEnabled,
    useNewCardSystem,
    getEnvironment,
    enableFeature,
    disableFeature,
    logFeatureFlags
  };
} else {
  window.FeatureFlags = {
    FEATURES,
    isFeatureEnabled,
    useNewCardSystem,
    getEnvironment,
    enableFeature,
    disableFeature,
    logFeatureFlags
  };
}
