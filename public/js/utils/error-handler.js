// 🛡️ Centralized Error Handler for Wedding App

/**
 * @typedef {Object} ErrorResult
 * @property {boolean} handled - Whether error was handled
 * @property {string} message - User-friendly error message
 * @property {Error} originalError - Original error object
 * @property {boolean} [canRetry] - Whether operation can be retried
 * @property {Function} [retryFn] - Retry function if available
 */

/**
 * Centralized error handling utility
 */
export class ErrorHandler {
  /**
   * Standard API error handling with user-friendly messages
   * @param {Error} error - The error object
   * @param {string} context - Context where error occurred
   * @returns {ErrorResult}
   */
  static handleAPIError(error, context = 'API') {
    console.error(`🚨 [${context}]`, error);

    const errorMessages = {
      'Insufficient points': '포인트가 부족합니다',
      'TOO_MANY_REQUESTS': '요청이 너무 많습니다. 잠시 후 다시 시도해주세요',
      'SERVER_ERROR': '서버 오류가 발생했습니다',
      'NETWORK_ERROR': '네트워크 연결을 확인해주세요',
      '인증 토큰이 없습니다': '로그인이 필요합니다',
      'Unauthorized': '로그인이 필요합니다',
      'Forbidden': '권한이 없습니다',
      'Not Found': '요청한 리소스를 찾을 수 없습니다',
      'Bad Request': '잘못된 요청입니다',
      'Internal Server Error': '서버 오류가 발생했습니다'
    };

    const errorMessage = error.message || error.toString();
    const userMessage = errorMessages[errorMessage] ||
                       errorMessages[error.code] ||
                       errorMessage ||
                       '오류가 발생했습니다';

    if (window.ui) {
      window.ui.showToast(userMessage, 'error');
    }

    return {
      handled: true,
      message: userMessage,
      originalError: error
    };
  }

  /**
   * Network error handling with retry suggestion
   * @param {Error} error - Network error
   * @param {Function} [retryFn] - Optional retry function
   * @returns {ErrorResult}
   */
  static handleNetworkError(error, retryFn = null) {
    console.error('🚨 [Network]', error);

    const message = '네트워크 연결을 확인해주세요';

    if (window.ui) {
      window.ui.showToast(message, 'error');
    }

    return {
      handled: true,
      message,
      originalError: error,
      canRetry: !!retryFn,
      retryFn
    };
  }

  /**
   * Validation error handling
   * @param {string} field - Field that failed validation
   * @param {string} message - Validation error message
   * @returns {ErrorResult}
   */
  static handleValidationError(field, message) {
    console.warn(`⚠️ [Validation] ${field}:`, message);

    if (window.ui) {
      window.ui.showToast(message, 'warning');
    }

    return {
      handled: true,
      field,
      message,
      originalError: new Error(`Validation failed: ${field} - ${message}`)
    };
  }

  /**
   * Authentication error handling
   * @param {Error} error - Auth error
   * @returns {ErrorResult}
   */
  static handleAuthError(error) {
    console.error('🚨 [Auth]', error);

    const message = '로그인이 필요합니다';

    if (window.ui) {
      window.ui.showToast(message, 'warning');
    }

    // Could trigger login modal here
    return {
      handled: true,
      message,
      originalError: error,
      requiresAuth: true
    };
  }

  /**
   * Rate limit error handling
   * @param {Error} error - Rate limit error
   * @param {number} [retryAfter] - Seconds until retry allowed
   * @returns {ErrorResult}
   */
  static handleRateLimitError(error, retryAfter = 60) {
    console.warn('⚠️ [Rate Limit]', error);

    const message = `요청이 너무 많습니다. ${retryAfter}초 후 다시 시도해주세요`;

    if (window.ui) {
      window.ui.showToast(message, 'warning');
    }

    return {
      handled: true,
      message,
      originalError: error,
      retryAfter
    };
  }

  /**
   * Generic error handling fallback
   * @param {Error} error - Any error
   * @param {string} context - Error context
   * @returns {ErrorResult}
   */
  static handleGenericError(error, context = 'Unknown') {
    console.error(`🚨 [${context}]`, error);

    const message = error.message || '오류가 발생했습니다';

    if (window.ui) {
      window.ui.showToast(message, 'error');
    }

    return {
      handled: true,
      message,
      originalError: error
    };
  }

  /**
   * Log error for analytics/monitoring
   * @param {Error} error - Error to log
   * @param {Object} metadata - Additional context
   */
  static logError(error, metadata = {}) {
    const errorLog = {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      ...metadata
    };

    console.error('📊 [Error Log]', errorLog);

    // Could send to analytics service here
    // analytics.trackError(errorLog);
  }

  /**
   * Check if error is recoverable
   * @param {Error} error - Error to check
   * @returns {boolean}
   */
  static isRecoverable(error) {
    const recoverableErrors = [
      'TOO_MANY_REQUESTS',
      'NETWORK_ERROR',
      'TIMEOUT',
      'Service Unavailable'
    ];

    const errorMessage = error.message || error.code || '';
    return recoverableErrors.some(msg => errorMessage.includes(msg));
  }

  /**
   * Determine if error requires user action
   * @param {Error} error - Error to check
   * @returns {boolean}
   */
  static requiresUserAction(error) {
    const actionRequiredErrors = [
      'Insufficient points',
      'Unauthorized',
      'Forbidden',
      'Bad Request'
    ];

    const errorMessage = error.message || error.code || '';
    return actionRequiredErrors.some(msg => errorMessage.includes(msg));
  }
}

/**
 * Error boundary for wrapping async operations
 * @param {Function} fn - Async function to wrap
 * @param {string} context - Context for error handling
 * @returns {Function} Wrapped function with error handling
 */
export function withErrorBoundary(fn, context = 'Operation') {
  return async function(...args) {
    try {
      return await fn.apply(this, args);
    } catch (error) {
      ErrorHandler.logError(error, { context, args });
      return ErrorHandler.handleAPIError(error, context);
    }
  };
}

/**
 * Retry wrapper for operations that might fail temporarily
 * @param {Function} fn - Function to retry
 * @param {Object} options - Retry options
 * @returns {Promise<any>}
 */
export async function withRetry(fn, options = {}) {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    backoffMultiplier = 2,
    shouldRetry = (error) => ErrorHandler.isRecoverable(error)
  } = options;

  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt === maxRetries || !shouldRetry(error)) {
        throw error;
      }

      const delay = initialDelay * Math.pow(backoffMultiplier, attempt);
      console.log(`⏳ Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`);

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

// Export singleton instance for convenience
export const errorHandler = ErrorHandler;
