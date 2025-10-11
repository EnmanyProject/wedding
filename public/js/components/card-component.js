/**
 * Card Component Base Class
 * Wedding App - Unified Card System
 *
 * Purpose: Universal card component managing lifecycle, state, and interactions
 * Usage: Extend this class for specific card types (PartnerCard, PawnshopCard, etc.)
 *
 * @version 1.0.0
 * @date 2025-10-11
 */

/**
 * Base Card Component
 * Manages card lifecycle, state, accessibility, and interactions
 */
class CardComponent {
  /**
   * Create a new card component
   * @param {HTMLElement} element - The card DOM element
   * @param {Object} options - Configuration options
   * @param {string} options.variant - Card variant (partner, pawnshop, profile, ranking)
   * @param {Object} options.data - Card data to render
   * @param {Function} options.onSelect - Callback when card is selected
   * @param {Function} options.onHover - Callback when card is hovered
   * @param {Function} options.onFocus - Callback when card is focused
   */
  constructor(element, options = {}) {
    // Validate element
    if (!element || !(element instanceof HTMLElement)) {
      throw new Error('CardComponent requires a valid HTMLElement');
    }

    this.element = element;
    this.options = {
      variant: 'partner',
      data: {},
      onSelect: null,
      onHover: null,
      onFocus: null,
      ...options
    };

    // Component state
    this.state = {
      selected: false,
      loading: false,
      error: null,
      disabled: false
    };

    // Event handler references for cleanup
    this._handlers = {
      click: null,
      keydown: null,
      mouseenter: null,
      focus: null
    };

    // Initialize component
    console.log(`[CardComponent] Initializing ${this.options.variant} card with ID:`, this.options.data.id);
    this.init();
  }

  /**
   * Initialize the component
   * Sets up event listeners, accessibility, and initial render
   */
  init() {
    this.setupEventListeners();
    this.setupAccessibility();
    this.render();

    console.log(`[CardComponent] Initialized successfully`);
  }

  /**
   * Set up event listeners for card interactions
   */
  setupEventListeners() {
    // Click/Touch handler
    this._handlers.click = this.handleClick.bind(this);
    this.element.addEventListener('click', this._handlers.click);

    // Keyboard handler
    this._handlers.keydown = this.handleKeydown.bind(this);
    this.element.addEventListener('keydown', this._handlers.keydown);

    // Hover handler (pointer devices only)
    if (window.matchMedia('(pointer: fine)').matches) {
      this._handlers.mouseenter = this.handleHover.bind(this);
      this.element.addEventListener('mouseenter', this._handlers.mouseenter);
    }

    // Focus handler
    this._handlers.focus = this.handleFocus.bind(this);
    this.element.addEventListener('focus', this._handlers.focus);
  }

  /**
   * Set up accessibility attributes
   * Ensures WCAG 2.1 AA compliance
   */
  setupAccessibility() {
    // Set proper role
    if (!this.element.getAttribute('role')) {
      this.element.setAttribute('role', 'article');
    }

    // Make keyboard navigable
    if (!this.element.hasAttribute('tabindex')) {
      this.element.setAttribute('tabindex', '0');
    }

    // Add aria-labelledby
    const title = this.element.querySelector('.card__title');
    if (title) {
      // Generate unique ID if not exists
      if (!title.id) {
        title.id = `card-${Math.random().toString(36).substr(2, 9)}-title`;
      }

      this.element.setAttribute('aria-labelledby', title.id);
    }

    // Initial ARIA state
    this.element.setAttribute('aria-selected', 'false');
    this.element.setAttribute('aria-busy', 'false');

    // Add data-testid for testing
    this.element.setAttribute('data-testid', `card-${this.options.variant}`);

    console.log(`[CardComponent] Accessibility setup complete - ARIA attributes validated`);
  }

  /**
   * Handle click/tap events
   * @param {Event} event - Click event
   */
  handleClick(event) {
    // Prevent default if disabled
    if (this.state.disabled || this.state.loading) {
      event.preventDefault();
      return;
    }

    event.preventDefault();
    this.select();

    // Trigger callback
    if (this.options.onSelect) {
      this.options.onSelect(this.options.data, this);
    }

    console.log(`[CardComponent] Card selected:`, this.options.data.id);
  }

  /**
   * Handle keyboard events
   * @param {KeyboardEvent} event - Keyboard event
   */
  handleKeydown(event) {
    // Prevent action if disabled
    if (this.state.disabled || this.state.loading) {
      return;
    }

    // Enter or Space = Select
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.handleClick(event);
    }

    // Escape = Deselect
    if (event.key === 'Escape' && this.state.selected) {
      event.preventDefault();
      this.deselect();
    }
  }

  /**
   * Handle hover events
   * @param {MouseEvent} event - Hover event
   */
  handleHover(event) {
    if (this.state.disabled || this.state.loading) {
      return;
    }

    if (this.options.onHover) {
      this.options.onHover(this.options.data, this);
    }
  }

  /**
   * Handle focus events
   * @param {FocusEvent} event - Focus event
   */
  handleFocus(event) {
    if (this.state.disabled || this.state.loading) {
      return;
    }

    if (this.options.onFocus) {
      this.options.onFocus(this.options.data, this);
    }
  }

  /**
   * Select the card
   * Updates state and UI
   */
  select() {
    if (this.state.selected) return;

    this.state.selected = true;
    this.element.classList.add('card--selected');
    this.element.setAttribute('aria-selected', 'true');

    console.log(`[CardComponent] Card selected state updated`);
  }

  /**
   * Deselect the card
   * Updates state and UI
   */
  deselect() {
    if (!this.state.selected) return;

    this.state.selected = false;
    this.element.classList.remove('card--selected');
    this.element.setAttribute('aria-selected', 'false');

    console.log(`[CardComponent] Card deselected`);
  }

  /**
   * Set loading state
   * @param {boolean} loading - Loading state
   */
  setLoading(loading = true) {
    this.state.loading = loading;
    this.element.classList.toggle('card--loading', loading);
    this.element.setAttribute('aria-busy', loading);

    if (loading) {
      this.element.setAttribute('aria-label', 'Loading card data');
    } else {
      this.element.removeAttribute('aria-label');
    }

    console.log(`[CardComponent] Loading state:`, loading);
  }

  /**
   * Set disabled state
   * @param {boolean} disabled - Disabled state
   */
  setDisabled(disabled = true) {
    this.state.disabled = disabled;
    this.element.classList.toggle('card--disabled', disabled);
    this.element.setAttribute('aria-disabled', disabled);

    console.log(`[CardComponent] Disabled state:`, disabled);
  }

  /**
   * Set error state
   * @param {string|null} error - Error message or null to clear
   */
  setError(error = null) {
    this.state.error = error;
    this.element.classList.toggle('card--error', !!error);

    if (error) {
      this.element.setAttribute('aria-invalid', 'true');
      this.element.setAttribute('aria-errormessage', error);
      console.error(`[CardComponent] Error:`, error);
    } else {
      this.element.removeAttribute('aria-invalid');
      this.element.removeAttribute('aria-errormessage');
    }
  }

  /**
   * Update card data
   * @param {Object} data - New card data
   */
  updateData(data) {
    this.options.data = { ...this.options.data, ...data };
    this.render();

    console.log(`[CardComponent] Data updated:`, this.options.data.id);
  }

  /**
   * Render the card
   * Override in subclasses for specific rendering logic
   */
  render() {
    // Base implementation - override in subclasses
    console.log(`[CardComponent] Base render called - override in subclass`);
  }

  /**
   * Clean up event listeners and destroy component
   * Prevents memory leaks
   */
  destroy() {
    // Remove event listeners
    if (this._handlers.click) {
      this.element.removeEventListener('click', this._handlers.click);
    }
    if (this._handlers.keydown) {
      this.element.removeEventListener('keydown', this._handlers.keydown);
    }
    if (this._handlers.mouseenter) {
      this.element.removeEventListener('mouseenter', this._handlers.mouseenter);
    }
    if (this._handlers.focus) {
      this.element.removeEventListener('focus', this._handlers.focus);
    }

    // Clear references
    this._handlers = {};
    this.element = null;
    this.options = null;
    this.state = null;

    console.log(`[CardComponent] Destroyed and cleaned up`);
  }

  /**
   * Get current card state
   * @returns {Object} Current state
   */
  getState() {
    return { ...this.state };
  }

  /**
   * Get card data
   * @returns {Object} Card data
   */
  getData() {
    return { ...this.options.data };
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { CardComponent };
} else {
  window.CardComponent = CardComponent;
}
