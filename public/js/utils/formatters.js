// 📐 Data Formatting Utilities for Wedding App

/**
 * Format relative time in Korean (e.g., "5분 전", "2시간 전")
 * @param {string|Date} dateString - Date string or Date object
 * @returns {string} Formatted relative time
 */
export function formatRelativeTime(dateString) {
  if (!dateString) return '';

  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';

  const now = new Date();
  const diffMs = now - date;
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);

  if (diffSecs < 10) return '방금 전';
  if (diffSecs < 60) return `${diffSecs}초 전`;
  if (diffMins < 60) return `${diffMins}분 전`;
  if (diffHours < 24) return `${diffHours}시간 전`;
  if (diffDays < 7) return `${diffDays}일 전`;
  if (diffWeeks < 4) return `${diffWeeks}주 전`;
  if (diffMonths < 12) return `${diffMonths}개월 전`;
  return `${diffYears}년 전`;
}

/**
 * Format absolute date in Korean (e.g., "2024년 1월 15일")
 * @param {string|Date} dateString - Date string or Date object
 * @param {Object} [options] - Formatting options
 * @returns {string} Formatted date
 */
export function formatDate(dateString, options = {}) {
  if (!dateString) return '';

  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';

  const {
    includeTime = false,
    includeSeconds = false,
    format = 'long' // 'long', 'short', 'medium'
  } = options;

  if (format === 'short') {
    // 2024.01.15
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}.${month}.${day}`;
  }

  if (format === 'medium') {
    // 1월 15일
    return date.toLocaleDateString('ko-KR', {
      month: 'long',
      day: 'numeric'
    });
  }

  // long format (default)
  const dateFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  };

  if (includeTime) {
    dateFormatOptions.hour = '2-digit';
    dateFormatOptions.minute = '2-digit';
    if (includeSeconds) {
      dateFormatOptions.second = '2-digit';
    }
  }

  return date.toLocaleString('ko-KR', dateFormatOptions);
}

/**
 * Format number with K/M/B suffixes
 * @param {number} num - Number to format
 * @param {Object} [options] - Formatting options
 * @returns {string} Formatted number
 */
export function formatCompactNumber(num, options = {}) {
  if (typeof num !== 'number' || isNaN(num)) return '0';

  const {
    decimals = 1,
    useKorean = true // 만, 억 instead of K, M
  } = options;

  if (useKorean) {
    const billion = 100000000; // 억
    const tenThousand = 10000; // 만

    if (num >= billion) {
      return `${(num / billion).toFixed(decimals)}억`;
    }
    if (num >= tenThousand) {
      return `${(num / tenThousand).toFixed(decimals)}만`;
    }
    return num.toLocaleString('ko-KR');
  }

  // International format
  if (num >= 1000000000) return `${(num / 1000000000).toFixed(decimals)}B`;
  if (num >= 1000000) return `${(num / 1000000).toFixed(decimals)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(decimals)}K`;
  return num.toLocaleString('ko-KR');
}

/**
 * Format number with commas
 * @param {number} num - Number to format
 * @returns {string} Formatted number
 */
export function formatNumber(num) {
  if (typeof num !== 'number' || isNaN(num)) return '0';
  return num.toLocaleString('ko-KR');
}

/**
 * Format percentage
 * @param {number} value - Value to format (0-100)
 * @param {number} [decimals=0] - Number of decimal places
 * @returns {string} Formatted percentage
 */
export function formatPercentage(value, decimals = 0) {
  if (typeof value !== 'number' || isNaN(value)) return '0%';
  return `${value.toFixed(decimals)}%`;
}

/**
 * Truncate text with ellipsis
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length
 * @param {string} [suffix='...'] - Suffix to append
 * @returns {string} Truncated text
 */
export function truncateText(text, maxLength, suffix = '...') {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - suffix.length) + suffix;
}

/**
 * Format file size in human-readable format
 * @param {number} bytes - File size in bytes
 * @returns {string} Formatted file size
 */
export function formatFileSize(bytes) {
  if (typeof bytes !== 'number' || isNaN(bytes)) return '0 B';

  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

/**
 * Format duration in human-readable format
 * @param {number} seconds - Duration in seconds
 * @returns {string} Formatted duration
 */
export function formatDuration(seconds) {
  if (typeof seconds !== 'number' || isNaN(seconds)) return '0초';

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}시간 ${minutes}분`;
  }
  if (minutes > 0) {
    return `${minutes}분 ${secs}초`;
  }
  return `${secs}초`;
}

/**
 * Format phone number (Korean format)
 * @param {string} phoneNumber - Phone number to format
 * @returns {string} Formatted phone number
 */
export function formatPhoneNumber(phoneNumber) {
  if (!phoneNumber) return '';

  // Remove all non-digit characters
  const cleaned = phoneNumber.replace(/\D/g, '');

  // Format based on length
  if (cleaned.length === 10) {
    // 02-1234-5678 or 031-123-4567
    return cleaned.replace(/(\d{2})(\d{3,4})(\d{4})/, '$1-$2-$3');
  }
  if (cleaned.length === 11) {
    // 010-1234-5678
    return cleaned.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3');
  }
  return phoneNumber;
}

/**
 * Format currency (Korean Won)
 * @param {number} amount - Amount to format
 * @param {boolean} [includeSymbol=true] - Whether to include ₩ symbol
 * @returns {string} Formatted currency
 */
export function formatCurrency(amount, includeSymbol = true) {
  if (typeof amount !== 'number' || isNaN(amount)) return includeSymbol ? '₩0' : '0';

  const formatted = amount.toLocaleString('ko-KR');
  return includeSymbol ? `₩${formatted}` : formatted;
}

/**
 * Capitalize first letter of string
 * @param {string} str - String to capitalize
 * @returns {string} Capitalized string
 */
export function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * Convert to title case
 * @param {string} str - String to convert
 * @returns {string} Title case string
 */
export function toTitleCase(str) {
  if (!str) return '';
  return str.split(' ')
    .map(word => capitalize(word))
    .join(' ');
}

/**
 * Parse integer safely
 * @param {any} value - Value to parse
 * @param {number} [defaultValue=0] - Default value if parsing fails
 * @returns {number} Parsed integer
 */
export function safeParseInt(value, defaultValue = 0) {
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Parse float safely
 * @param {any} value - Value to parse
 * @param {number} [defaultValue=0] - Default value if parsing fails
 * @returns {number} Parsed float
 */
export function safeParseFloat(value, defaultValue = 0) {
  const parsed = parseFloat(value);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Clamp number between min and max
 * @param {number} value - Value to clamp
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number} Clamped value
 */
export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

/**
 * Generate random ID
 * @param {number} [length=8] - ID length
 * @returns {string} Random ID
 */
export function generateId(length = 8) {
  return Math.random().toString(36).substring(2, 2 + length);
}

/**
 * Sleep/delay utility
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Export all formatters as a single object
export const formatters = {
  formatRelativeTime,
  formatDate,
  formatCompactNumber,
  formatNumber,
  formatPercentage,
  truncateText,
  formatFileSize,
  formatDuration,
  formatPhoneNumber,
  formatCurrency,
  capitalize,
  toTitleCase,
  safeParseInt,
  safeParseFloat,
  clamp,
  generateId,
  sleep
};

export default formatters;
