/**
 * Card Grid Manager
 * Hybrid Design Architecture - Phase 3
 *
 * Purpose: Manages card display mode (grid vs swiper) based on layout
 * Desktop (1280px+): Grid layout with multiple columns
 * Mobile (<1280px): Swiper mode with single card
 *
 * @version 3.0.0
 * @date 2025-10-11
 */

class CardGridManager {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.currentMode = 'mobile';
    this.cards = [];
    this.gridColumns = 3; // Default columns for desktop

    if (!this.container) {
      console.error(`❌ [CardGrid] Container not found: ${containerId}`);
      return;
    }

    console.log(`🎴 [CardGrid] Initializing Card Grid Manager for: ${containerId}`);

    // Wait for ResponsiveDetector
    if (window.ResponsiveDetector) {
      this.init();
    } else {
      window.addEventListener('responsive-detector-ready', () => this.init());
    }
  }

  init() {
    // Get initial layout mode
    this.currentMode = window.ResponsiveDetector.getCurrentMode();
    console.log(`🎴 [CardGrid] Initial mode: ${this.currentMode} (${this.shouldShowGrid() ? 'Grid' : 'Swiper'})`);

    // Setup layout change listener
    this.setupLayoutListener();

    // 🔧 FIX: 초기 렌더링 건너뛰기 - ui.js가 이미 카드를 렌더링했음
    // Initial render는 setCards()가 호출될 때만 실행
    // this.render();
  }

  setupLayoutListener() {
    window.addEventListener('layoutModeChange', (e) => {
      const newMode = e.detail.newMode;
      const oldShouldShowGrid = this.shouldShowGrid();

      this.currentMode = newMode;
      const newShouldShowGrid = this.shouldShowGrid();

      // Only re-render if grid/swiper mode actually changed
      if (newShouldShowGrid !== oldShouldShowGrid) {
        console.log(`🔄 [CardGrid] Layout changed to: ${newMode} (${newShouldShowGrid ? 'Grid' : 'Swiper'})`);
        this.render();
      }
    });
  }

  shouldShowGrid() {
    // 그리드는 768px 이상(tablet, hybrid, desktop, large)에서 표시
    // 스와이프는 768px 미만(mobile)에서만 표시
    return ['tablet', 'hybrid', 'desktop', 'large'].includes(this.currentMode);
  }

  setCards(cards) {
    this.cards = cards || [];
    this.render();
  }

  render() {
    if (!this.container) return;

    if (this.shouldShowGrid()) {
      this.renderGrid();
    } else {
      this.renderSwiper();
    }
  }

  renderGrid() {
    console.log('🖥️ [CardGrid] Rendering grid layout');

    // Remove swiper mode classes
    this.container.classList.remove('swiper-mode');
    this.container.classList.add('grid-mode');

    // Remove any transform that might be left from swiper mode
    this.container.style.transform = '';
    this.container.style.transition = '';

    // Hide pagination and navigation controls
    this.hideSwiperControls();

    // Render cards in grid
    if (this.cards.length === 0) {
      this.renderEmptyGrid();
    } else {
      this.renderCardGrid();
    }
  }

  renderSwiper() {
    console.log('📱 [CardGrid] Rendering swiper layout');

    // Remove grid mode classes
    this.container.classList.remove('grid-mode');
    this.container.classList.add('swiper-mode');

    // Show pagination and navigation controls
    this.showSwiperControls();

    // Re-initialize swiper if needed
    // (This will be handled by existing MobileSwiper instances in ui.js)
    if (window.ui && window.ui.partnersSwiper) {
      // Force re-init swiper
      setTimeout(() => {
        window.ui.partnersSwiper.updatePosition(false);
      }, 100);
    }
  }

  renderEmptyGrid() {
    this.container.innerHTML = `
      <div class="empty-grid-message">
        <img src="/images/Bety6.png" alt="Empty" class="bety-character" style="width: 80px; height: 80px;">
        <p>아직 카드가 없습니다</p>
      </div>
    `;
  }

  renderCardGrid() {
    // Cards are already rendered by ui.js
    // This method just ensures grid layout is applied
    console.log(`🎴 [CardGrid] Grid layout applied with ${this.cards.length} cards`);
  }

  hideSwiperControls() {
    // Hide pagination dots
    const containerId = this.container.id;
    const paginationId = containerId.replace('-container', '-pagination');
    const pagination = document.getElementById(paginationId);
    if (pagination) {
      pagination.style.display = 'none';
    }

    // Hide navigation controls
    const controlsId = containerId.replace('-container', '-controls');
    const controls = document.getElementById(controlsId);
    if (controls) {
      controls.style.display = 'none';
    }
  }

  showSwiperControls() {
    // Show pagination dots
    const containerId = this.container.id;
    const paginationId = containerId.replace('-container', '-pagination');
    const pagination = document.getElementById(paginationId);
    if (pagination) {
      pagination.style.display = '';
    }

    // Show navigation controls
    const controlsId = containerId.replace('-container', '-controls');
    const controls = document.getElementById(controlsId);
    if (controls) {
      controls.style.display = '';
    }
  }

  destroy() {
    // Cleanup
    console.log('🗑️ [CardGrid] Destroying Card Grid Manager');
  }
}

// Export for use in other modules
window.CardGridManager = CardGridManager;
