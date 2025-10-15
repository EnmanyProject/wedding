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

    // Auto-play resume timer
    this.resumeTimer = null;
    this.autoPlayIntervalMs = 3000; // Store interval for resume
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

      // Stop auto play on user interaction
      this.pauseAutoPlay();

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

        // Record swipe timestamp for click conflict prevention
        if (window.ui) {
          window.ui.lastSwipeTime = Date.now();
        }
      }

      this.hasMovedEnough = false;
    };

    // Store handlers for cleanup
    this.handleStart = handleStart;
    this.handleMove = handleMove;
    this.handleEnd = handleEnd;

    // Mouse events
    this.container.addEventListener('mousedown', this.handleStart);
    document.addEventListener('mousemove', this.handleMove);
    document.addEventListener('mouseup', this.handleEnd);

    // Touch events
    this.container.addEventListener('touchstart', this.handleStart, { passive: false });
    this.container.addEventListener('touchmove', this.handleMove, { passive: false });
    this.container.addEventListener('touchend', this.handleEnd);
  }

  /**
   * Update position during drag
   */
  updateDragPosition(diffX) {
    // Use scrollLeft for native scroll snap behavior
    const scrollContainer = this.container.parentElement;
    const cardWidth = scrollContainer.clientWidth;
    const currentScroll = this.currentIndex * cardWidth;

    // Apply drag offset (inverted because scrollLeft increases to the right)
    scrollContainer.scrollLeft = currentScroll - diffX;
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
    this.prevBtn.addEventListener('click', () => {
      this.pauseAutoPlay();
      this.navigate('prev');
    });
    this.nextBtn.addEventListener('click', () => {
      this.pauseAutoPlay();
      this.navigate('next');
    });
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

    // Haptic feedback (iOS/Android)
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
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
   * Update card position using native scroll snap
   */
  updatePosition(animated = true) {
    if (!this.container) return;

    const scrollContainer = this.container.parentElement;
    const cardWidth = scrollContainer.clientWidth;
    const targetScroll = this.currentIndex * cardWidth;

    // Use scrollTo with smooth behavior for animation
    if (animated) {
      scrollContainer.scrollTo({
        left: targetScroll,
        behavior: 'smooth'
      });
    } else {
      // Instant scroll for initialization
      scrollContainer.scrollLeft = targetScroll;
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

    const existingDots = pagination.querySelectorAll('.pagination-dot');

    // Reuse existing dots if count matches
    if (existingDots.length === this.totalItems) {
      existingDots.forEach((dot, i) => {
        const isActive = i === this.currentIndex;
        dot.classList.toggle('active', isActive);
        dot.setAttribute('aria-current', isActive ? 'true' : 'false');
      });
    } else {
      // Recreate dots only if count changed
      pagination.innerHTML = '';

      for (let i = 0; i < this.totalItems; i++) {
        const dot = document.createElement('button');
        dot.className = 'pagination-dot';
        dot.setAttribute('aria-label', `Go to slide ${i + 1}`);

        if (i === this.currentIndex) {
          dot.classList.add('active');
          dot.setAttribute('aria-current', 'true');
        } else {
          dot.setAttribute('aria-current', 'false');
        }

        dot.addEventListener('click', () => this.goTo(i));
        pagination.appendChild(dot);
      }
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
   * Start auto play
   */
  startAutoPlay(intervalMs = 3000) {
    this.stopAutoPlay(); // Clear any existing interval
    this.autoPlayIntervalMs = intervalMs; // Store for resume

    this.autoPlayInterval = setInterval(() => {
      // Move to next card, or loop back to first
      if (this.currentIndex < this.totalItems - 1) {
        this.navigate('next');
      } else {
        this.goTo(0, true); // Loop back to first card
      }
    }, intervalMs);

    console.log(`🔄 [MobileSwiper] Auto-play started (${intervalMs}ms interval)`);
  }

  /**
   * Stop auto play
   */
  stopAutoPlay() {
    if (this.autoPlayInterval) {
      clearInterval(this.autoPlayInterval);
      this.autoPlayInterval = null;
      console.log('⏸️ [MobileSwiper] Auto-play stopped');
    }
  }

  /**
   * Pause auto play temporarily (resume with resumeAutoPlay)
   * Automatically resumes after 10 seconds of inactivity
   */
  pauseAutoPlay() {
    if (this.autoPlayInterval) {
      this.stopAutoPlay();
      this.autoPlayWasPaused = true;

      // Clear any existing resume timer
      this.clearResumeTimer();

      // Set timer to auto-resume after 10 seconds
      this.resumeTimer = setTimeout(() => {
        console.log('⏱️ [MobileSwiper] 10s inactivity - auto-resuming...');
        this.resumeAutoPlay(this.autoPlayIntervalMs);
      }, 10000); // 10 seconds

      console.log('⏸️ [MobileSwiper] Auto-play paused (will resume in 10s)');
    }
  }

  /**
   * Clear resume timer
   */
  clearResumeTimer() {
    if (this.resumeTimer) {
      clearTimeout(this.resumeTimer);
      this.resumeTimer = null;
    }
  }

  /**
   * Resume auto play if it was paused
   */
  resumeAutoPlay(intervalMs = 3000) {
    this.clearResumeTimer(); // Clear any pending resume timer

    if (this.autoPlayWasPaused) {
      this.startAutoPlay(intervalMs);
      this.autoPlayWasPaused = false;
    }
  }

  /**
   * Destroy swiper and cleanup
   */
  destroy() {
    this.stopAutoPlay();
    this.clearResumeTimer();

    // Remove event listeners
    if (this.container && this.handleStart) {
      this.container.removeEventListener('mousedown', this.handleStart);
      this.container.removeEventListener('touchstart', this.handleStart);
    }

    if (this.handleMove) {
      document.removeEventListener('mousemove', this.handleMove);
      document.removeEventListener('touchmove', this.handleMove);
    }

    if (this.handleEnd) {
      document.removeEventListener('mouseup', this.handleEnd);
      document.removeEventListener('touchend', this.handleEnd);
    }

    // Clear handler references
    this.handleStart = null;
    this.handleMove = null;
    this.handleEnd = null;

    this.isInitialized = false;
    this.container = null;
    this.prevBtn = null;
    this.nextBtn = null;
  }
}
