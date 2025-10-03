// 💎 Reusable UI Component Utilities for Wedding App

/**
 * @typedef {Object} EmptyStateConfig
 * @property {string} [betyImage] - Bety character image URL
 * @property {string} [betyClass] - CSS classes for Bety character
 * @property {string} message - Empty state message
 * @property {string} [className] - Container CSS class
 * @property {string} [actionText] - Optional action button text
 * @property {Function} [onAction] - Optional action button callback
 */

/**
 * @typedef {Object} PaginationConfig
 * @property {HTMLElement} container - Pagination container element
 * @property {number} totalItems - Total number of items
 * @property {number} activeIndex - Current active index
 * @property {Function} onDotClick - Callback when pagination dot is clicked
 */

/**
 * Render empty state with Bety character
 * @param {HTMLElement} container - Container to render empty state in
 * @param {EmptyStateConfig} config - Empty state configuration
 */
export function renderEmptyState(container, config = {}) {
  const {
    betyImage = '/images/Bety3.png',
    betyClass = 'character-float character-clickable character-glow',
    message = '데이터가 없습니다',
    className = 'empty-state',
    actionText = null,
    onAction = null
  } = config;

  const actionButton = (actionText && onAction) ? `
    <button class="btn btn-primary empty-state-action" style="margin-top: 1rem;">
      ${actionText}
    </button>
  ` : '';

  container.innerHTML = `
    <div class="${className}" style="text-align: center; padding: 2rem;">
      <img
        src="${betyImage}"
        alt="Bety"
        class="bety-character ${betyClass}"
        style="width: 60px; height: 60px; margin-bottom: 1rem;"
      >
      <p style="color: #666; margin: 0;">${message}</p>
      ${actionButton}
    </div>
  `;

  if (actionText && onAction) {
    const button = container.querySelector('.empty-state-action');
    if (button) {
      button.addEventListener('click', onAction);
    }
  }

  console.log(`🎨 [UI] Empty state rendered: ${message}`);
}

/**
 * Update pagination dots
 * @param {HTMLElement} paginationElement - Pagination container
 * @param {number} totalItems - Total number of items
 * @param {number} activeIndex - Current active index
 * @param {Function} onDotClick - Click handler for dots
 */
export function updatePagination(paginationElement, totalItems, activeIndex, onDotClick) {
  if (!paginationElement) return;

  const dotsHTML = Array.from({ length: totalItems }, (_, i) =>
    `<span class="pagination-dot ${i === activeIndex ? 'active' : ''}" data-index="${i}"></span>`
  ).join('');

  paginationElement.innerHTML = dotsHTML;

  if (onDotClick) {
    paginationElement.querySelectorAll('.pagination-dot').forEach((dot, index) => {
      dot.addEventListener('click', () => onDotClick(index));
    });
  }

  console.log(`🎨 [UI] Pagination updated: ${activeIndex + 1}/${totalItems}`);
}

/**
 * Update navigation buttons state
 * @param {HTMLElement} prevBtn - Previous button element
 * @param {HTMLElement} nextBtn - Next button element
 * @param {boolean} canGoPrev - Whether previous is available
 * @param {boolean} canGoNext - Whether next is available
 */
export function updateNavigationButtons(prevBtn, nextBtn, canGoPrev, canGoNext) {
  if (prevBtn) {
    prevBtn.disabled = !canGoPrev;
    prevBtn.classList.toggle('disabled', !canGoPrev);
  }
  if (nextBtn) {
    nextBtn.disabled = !canGoNext;
    nextBtn.classList.toggle('disabled', !canGoNext);
  }
}

/**
 * Update counter display (e.g., "1 / 5")
 * @param {HTMLElement} counterElement - Counter display element
 * @param {number} current - Current index (0-based)
 * @param {number} total - Total number of items
 */
export function updateCounter(counterElement, current, total) {
  if (counterElement) {
    counterElement.textContent = `${current + 1} / ${total}`;
  }
}

/**
 * Create a card element with common structure
 * @param {Object} data - Card data
 * @param {Object} options - Card options
 * @returns {HTMLElement} Card element
 */
export function createCard(data, options = {}) {
  const {
    className = 'card',
    imageKey = 'image',
    titleKey = 'title',
    subtitleKey = 'subtitle',
    onClick = null
  } = options;

  const card = document.createElement('div');
  card.className = className;

  if (data[imageKey]) {
    const img = document.createElement('img');
    img.src = data[imageKey];
    img.alt = data[titleKey] || 'Image';
    card.appendChild(img);
  }

  if (data[titleKey]) {
    const title = document.createElement('h3');
    title.textContent = data[titleKey];
    card.appendChild(title);
  }

  if (data[subtitleKey]) {
    const subtitle = document.createElement('p');
    subtitle.textContent = data[subtitleKey];
    card.appendChild(subtitle);
  }

  if (onClick) {
    card.style.cursor = 'pointer';
    card.addEventListener('click', () => onClick(data));
  }

  return card;
}

/**
 * Show loading spinner in container
 * @param {HTMLElement} container - Container element
 * @param {string} [message] - Optional loading message
 */
export function showLoading(container, message = '로딩 중...') {
  if (!container) return;

  container.innerHTML = `
    <div class="loading-state" style="text-align: center; padding: 2rem;">
      <div class="spinner" style="width: 40px; height: 40px; margin: 0 auto 1rem; border: 3px solid #f3f3f3; border-top: 3px solid #4CAF50; border-radius: 50%; animation: spin 1s linear infinite;"></div>
      <p style="color: #666;">${message}</p>
    </div>
  `;
}

/**
 * Hide loading state and show content
 * @param {HTMLElement} container - Container element
 */
export function hideLoading(container) {
  if (!container) return;

  const loadingState = container.querySelector('.loading-state');
  if (loadingState) {
    loadingState.remove();
  }
}

/**
 * Create a badge element
 * @param {string} text - Badge text
 * @param {string} [type] - Badge type (success, warning, error, info)
 * @returns {HTMLElement} Badge element
 */
export function createBadge(text, type = 'info') {
  const badge = document.createElement('span');
  badge.className = `badge badge-${type}`;
  badge.textContent = text;

  const colors = {
    success: '#4CAF50',
    warning: '#FF9800',
    error: '#F44336',
    info: '#2196F3'
  };

  badge.style.backgroundColor = colors[type] || colors.info;
  badge.style.color = 'white';
  badge.style.padding = '0.25rem 0.5rem';
  badge.style.borderRadius = '12px';
  badge.style.fontSize = '0.75rem';
  badge.style.fontWeight = 'bold';

  return badge;
}

/**
 * Animate element entrance
 * @param {HTMLElement} element - Element to animate
 * @param {string} [animation] - Animation type (fadeIn, slideIn, scaleIn)
 * @param {number} [duration] - Animation duration in ms
 */
export function animateEntrance(element, animation = 'fadeIn', duration = 300) {
  if (!element) return;

  const animations = {
    fadeIn: {
      from: { opacity: 0 },
      to: { opacity: 1 }
    },
    slideIn: {
      from: { opacity: 0, transform: 'translateY(20px)' },
      to: { opacity: 1, transform: 'translateY(0)' }
    },
    scaleIn: {
      from: { opacity: 0, transform: 'scale(0.9)' },
      to: { opacity: 1, transform: 'scale(1)' }
    }
  };

  const anim = animations[animation] || animations.fadeIn;

  Object.assign(element.style, anim.from);
  element.style.transition = `all ${duration}ms ease`;

  requestAnimationFrame(() => {
    Object.assign(element.style, anim.to);
  });
}

/**
 * Create a divider element
 * @param {string} [text] - Optional divider text
 * @returns {HTMLElement} Divider element
 */
export function createDivider(text = null) {
  const divider = document.createElement('div');
  divider.className = 'divider';
  divider.style.display = 'flex';
  divider.style.alignItems = 'center';
  divider.style.margin = '1rem 0';

  if (text) {
    divider.innerHTML = `
      <div style="flex: 1; height: 1px; background: #ddd;"></div>
      <span style="padding: 0 1rem; color: #666; font-size: 0.875rem;">${text}</span>
      <div style="flex: 1; height: 1px; background: #ddd;"></div>
    `;
  } else {
    divider.style.height = '1px';
    divider.style.background = '#ddd';
  }

  return divider;
}

/**
 * Truncate text with ellipsis
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} Truncated text
 */
export function truncateText(text, maxLength) {
  if (!text || text.length <= maxLength) return text || '';
  return text.substring(0, maxLength) + '...';
}

/**
 * Format number with commas
 * @param {number} num - Number to format
 * @returns {string} Formatted number
 */
export function formatNumber(num) {
  if (typeof num !== 'number') return '0';
  return num.toLocaleString('ko-KR');
}

/**
 * Debounce function execution
 * @param {Function} fn - Function to debounce
 * @param {number} delay - Delay in milliseconds
 * @returns {Function} Debounced function
 */
export function debounce(fn, delay = 300) {
  let timeoutId;
  return function(...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn.apply(this, args), delay);
  };
}

/**
 * Check if element is in viewport
 * @param {HTMLElement} element - Element to check
 * @returns {boolean} Whether element is visible
 */
export function isInViewport(element) {
  if (!element) return false;

  const rect = element.getBoundingClientRect();
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
  );
}

/**
 * Smooth scroll to element
 * @param {HTMLElement} element - Element to scroll to
 * @param {Object} [options] - Scroll options
 */
export function scrollToElement(element, options = {}) {
  if (!element) return;

  const {
    block = 'start',
    behavior = 'smooth',
    offset = 0
  } = options;

  const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
  const offsetPosition = elementPosition - offset;

  window.scrollTo({
    top: offsetPosition,
    behavior
  });
}

// Export all utilities as named exports
export const uiComponents = {
  renderEmptyState,
  updatePagination,
  updateNavigationButtons,
  updateCounter,
  createCard,
  showLoading,
  hideLoading,
  createBadge,
  animateEntrance,
  createDivider,
  truncateText,
  formatNumber,
  debounce,
  isInViewport,
  scrollToElement
};
