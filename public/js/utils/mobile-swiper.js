/**
 * Mobile Swiper Component
 * 재사용 가능한 터치/스와이프 카드 네비게이션 컴포넌트
 */

export class MobileSwiper {
  constructor(config) {
    this.config = {
      containerSelector: config.containerSelector,
      prevBtnSelector: config.prevBtnSelector,
      nextBtnSelector: config.nextBtnSelector,
      paginationSelector: config.paginationSelector,
      counterSelector: config.counterSelector,

      // Callbacks
      onNavigate: config.onNavigate || (() => {}),
      onInteraction: config.onInteraction || (() => {}),

      // Options
      enableKeyboard: config.enableKeyboard !== false,
      enableVelocity: config.enableVelocity || false,
      threshold: config.threshold || 50,
      timeThreshold: config.timeThreshold || 300,

      // Advanced options for Partner swiper
      usePixelTransform: config.usePixelTransform || false,
      considerPadding: config.considerPadding || false
    };

    this.currentIndex = 0;
    this.totalItems = 0;
    this.isDragging = false;
    this.isInitialized = false;

    // Touch tracking
    this.startX = 0;
    this.currentX = 0;
    this.startTime = 0;
    this.hasMovedEnough = false;
    this.velocityTracker = [];
  }

  /**
   * Initialize swiper
   */
  init(totalItems) {
    if (this.isInitialized) return;

    this.totalItems = totalItems;
    this.currentIndex = 0;

    const container = document.querySelector(this.config.containerSelector);
    const prevBtn = document.querySelector(this.config.prevBtnSelector);
    const nextBtn = document.querySelector(this.config.nextBtnSelector);

    if (!container || !prevBtn || !nextBtn) {
      console.warn('[MobileSwiper] Required elements not found');
      return;
    }

    this.container = container;
    this.prevBtn = prevBtn;
    this.nextBtn = nextBtn;

    // Setup event handlers
    this.setupSwipeEvents();
    this.setupNavigationButtons();

    if (this.config.enableKeyboard) {
      this.setupKeyboardNavigation();
    }

    // Initial state
    this.updateNavigationButtons();
    this.updatePosition(false);

    this.isInitialized = true;
  }

  /**
   * Setup touch/swipe events
   */
  setupSwipeEvents() {
    const handleStart = (e) => {
      this.isDragging = true;
      this.hasMovedEnough = false;
      this.startTime = Date.now();
      this.startX = e.touches ? e.touches[0].clientX : e.clientX;
      this.currentX = this.startX;
      this.container.style.transition = 'none';

      if (this.config.enableVelocity) {
        this.velocityTracker = [{ time: this.startTime, x: this.startX }];
      }
    };

    const handleMove = (e) => {
      if (!this.isDragging) return;

      this.currentX = e.touches ? e.touches[0].clientX : e.clientX;
      const diffX = this.currentX - this.startX;

      // Track velocity
      if (this.config.enableVelocity) {
        const now = Date.now();
        this.velocityTracker.push({ time: now, x: this.currentX });
        this.velocityTracker = this.velocityTracker.filter(point => now - point.time < 100);
      }

      // Activate swipe mode after threshold
      if (Math.abs(diffX) > 10 && !this.hasMovedEnough) {
        this.hasMovedEnough = true;
        this.config.onInteraction();
      }

      // Update position during drag
      if (this.hasMovedEnough) {
        e.preventDefault();
        this.updateDragPosition(diffX);
      }
    };

    const handleEnd = () => {
      if (!this.isDragging) return;
      this.isDragging = false;

      const diffX = this.currentX - this.startX;
      const timeDiff = Date.now() - this.startTime;

      if (this.hasMovedEnough) {
        this.handleSwipeEnd(diffX, timeDiff);
      }

      this.hasMovedEnough = false;
    };

    // Mouse events
    this.container.addEventListener('mousedown', handleStart);
    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleEnd);

    // Touch events
    this.container.addEventListener('touchstart', handleStart, { passive: false });
    this.container.addEventListener('touchmove', handleMove, { passive: false });
    this.container.addEventListener('touchend', handleEnd);
  }

  /**
   * Update position during drag
   */
  updateDragPosition(diffX) {
    if (this.config.usePixelTransform && this.config.considerPadding) {
      // Advanced pixel-based transform (Partners swiper)
      const containerRect = this.container.parentElement.getBoundingClientRect();
      const containerWidth = containerRect.width;
      const computedStyle = getComputedStyle(this.container.parentElement);
      const paddingLeft = parseFloat(computedStyle.paddingLeft) || 0;
      const paddingRight = parseFloat(computedStyle.paddingRight) || 0;
      const effectiveWidth = containerWidth - paddingLeft - paddingRight;

      const currentPosition = -this.currentIndex * effectiveWidth;
      const newPosition = currentPosition + diffX;
      this.container.style.transform = `translateX(${newPosition}px)`;
    } else {
      // Simple percentage-based transform (Rankings swiper)
      const currentTransform = -this.currentIndex * 100;
      const offset = (diffX / this.container.offsetWidth) * 100;
      this.container.style.transform = `translateX(${currentTransform + offset}%)`;
    }
  }

  /**
   * Handle swipe end
   */
  handleSwipeEnd(diffX, timeDiff) {
    const threshold = this.config.threshold;
    const timeThreshold = this.config.timeThreshold;

    // Calculate velocity if enabled
    let shouldSwipe = Math.abs(diffX) > threshold;

    if (this.config.enableVelocity && this.velocityTracker.length >= 2) {
      const recent = this.velocityTracker[this.velocityTracker.length - 1];
      const older = this.velocityTracker[0];
      const timeDelta = recent.time - older.time;
      const distanceDelta = recent.x - older.x;
      const velocity = timeDelta > 0 ? Math.abs(distanceDelta / timeDelta) : 0;

      // Fast swipe detection
      if (velocity > 0.5 && Math.abs(diffX) > 20) {
        shouldSwipe = true;
      }
    }

    // Quick swipe detection
    if (Math.abs(diffX) > 20 && timeDiff < timeThreshold) {
      shouldSwipe = true;
    }

    // Navigate or snap back
    if (shouldSwipe) {
      if (diffX > 0 && this.currentIndex > 0) {
        this.navigate('prev');
      } else if (diffX < 0 && this.currentIndex < this.totalItems - 1) {
        this.navigate('next');
      } else {
        this.updatePosition(true);
      }
    } else {
      this.updatePosition(true);
    }
  }

  /**
   * Setup navigation button events
   */
  setupNavigationButtons() {
    this.prevBtn.addEventListener('click', () => this.navigate('prev'));
    this.nextBtn.addEventListener('click', () => this.navigate('next'));
  }

  /**
   * Setup keyboard navigation
   */
  setupKeyboardNavigation() {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        this.navigate('prev');
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        this.navigate('next');
      }
    });
  }

  /**
   * Navigate to prev/next card
   */
  navigate(direction) {
    const maxIndex = this.totalItems - 1;

    if (direction === 'prev' && this.currentIndex > 0) {
      this.currentIndex--;
    } else if (direction === 'next' && this.currentIndex < maxIndex) {
      this.currentIndex++;
    } else {
      return; // No change
    }

    this.updatePosition(true);
    this.updateNavigationButtons();
    this.updatePagination();
    this.updateCounter();

    // Callback
    this.config.onNavigate(this.currentIndex, direction);
  }

  /**
   * Go to specific index
   */
  goTo(index, animated = true) {
    if (index < 0 || index >= this.totalItems) return;

    this.currentIndex = index;
    this.updatePosition(animated);
    this.updateNavigationButtons();
    this.updatePagination();
    this.updateCounter();

    this.config.onNavigate(this.currentIndex, 'goto');
  }

  /**
   * Update card position
   */
  updatePosition(animated = true) {
    if (!this.container) return;

    if (animated) {
      this.container.style.transition = 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
    } else {
      this.container.style.transition = 'none';
    }

    if (this.config.usePixelTransform && this.config.considerPadding) {
      // Pixel-based transform with padding consideration
      const containerRect = this.container.parentElement.getBoundingClientRect();
      const containerWidth = containerRect.width;
      const computedStyle = getComputedStyle(this.container.parentElement);
      const paddingLeft = parseFloat(computedStyle.paddingLeft) || 0;
      const paddingRight = parseFloat(computedStyle.paddingRight) || 0;
      const effectiveWidth = containerWidth - paddingLeft - paddingRight;

      const position = -this.currentIndex * effectiveWidth;
      this.container.style.transform = `translateX(${position}px)`;
    } else {
      // Simple percentage transform
      this.container.style.transform = `translateX(-${this.currentIndex * 100}%)`;
    }
  }

  /**
   * Update navigation button states
   */
  updateNavigationButtons() {
    const canGoPrev = this.currentIndex > 0;
    const canGoNext = this.currentIndex < this.totalItems - 1;

    this.prevBtn.disabled = !canGoPrev;
    this.prevBtn.classList.toggle('disabled', !canGoPrev);

    this.nextBtn.disabled = !canGoNext;
    this.nextBtn.classList.toggle('disabled', !canGoNext);
  }

  /**
   * Update pagination dots
   */
  updatePagination() {
    const pagination = document.querySelector(this.config.paginationSelector);
    if (!pagination) return;

    // Clear existing dots
    pagination.innerHTML = '';

    // Create new dots
    for (let i = 0; i < this.totalItems; i++) {
      const dot = document.createElement('button');
      dot.className = 'pagination-dot';
      dot.setAttribute('aria-label', `Go to slide ${i + 1}`);

      if (i === this.currentIndex) {
        dot.classList.add('active');
        dot.setAttribute('aria-current', 'true');
      }

      dot.addEventListener('click', () => this.goTo(i));
      pagination.appendChild(dot);
    }
  }

  /**
   * Update counter display
   */
  updateCounter() {
    const counter = document.querySelector(this.config.counterSelector);
    if (!counter) return;

    counter.textContent = `${this.currentIndex + 1} / ${this.totalItems}`;
  }

  /**
   * Reset swiper
   */
  reset() {
    this.currentIndex = 0;
    this.updatePosition(false);
    this.updateNavigationButtons();
    this.updatePagination();
    this.updateCounter();
  }

  /**
   * Update total items and refresh
   */
  updateTotalItems(newTotal) {
    this.totalItems = newTotal;

    // Adjust current index if needed
    if (this.currentIndex >= newTotal) {
      this.currentIndex = Math.max(0, newTotal - 1);
    }

    this.updatePosition(false);
    this.updateNavigationButtons();
    this.updatePagination();
    this.updateCounter();
  }

  /**
   * Destroy swiper and cleanup
   */
  destroy() {
    // Remove event listeners (would need to store handlers for proper cleanup)
    this.isInitialized = false;
    this.container = null;
    this.prevBtn = null;
    this.nextBtn = null;
  }
}
