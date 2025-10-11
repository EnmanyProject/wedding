/**
 * Modal Manager
 * Hybrid Design Architecture - Phase 4
 *
 * Purpose: Manages modal display modes (center dialog vs bottom sheet)
 * Desktop (1280px+): Center dialog with backdrop
 * Mobile (<1280px): Bottom sheet (existing behavior)
 *
 * @version 4.0.0
 * @date 2025-10-11
 */

class ModalManager {
  constructor() {
    this.openModals = [];
    this.isDesktop = false;

    // Wait for ResponsiveDetector
    if (window.ResponsiveDetector) {
      this.init();
    } else {
      window.addEventListener('responsive-detector-ready', () => this.init());
    }
  }

  init() {
    console.log('🪟 [Modal] Initializing Modal Manager');

    // Get initial layout mode
    this.isDesktop = window.ResponsiveDetector.isDesktop();

    // Setup layout change listener
    this.setupLayoutListener();

    // Setup global modal event handlers
    this.setupEventHandlers();

    console.log('✅ [Modal] Modal Manager initialized');
  }

  setupLayoutListener() {
    window.addEventListener('layoutModeChange', (e) => {
      const newIsDesktop = e.detail.mode === 'desktop';

      if (newIsDesktop !== this.isDesktop) {
        this.isDesktop = newIsDesktop;
        console.log(`🔄 [Modal] Layout changed to: ${this.isDesktop ? 'Desktop' : 'Mobile'}`);

        // Update all open modals
        this.openModals.forEach(modalId => {
          this.updateModalLayout(modalId);
        });
      }
    });
  }

  setupEventHandlers() {
    // ESC key handler
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.openModals.length > 0) {
        const topModal = this.openModals[this.openModals.length - 1];
        this.close(topModal);
      }
    });

    // Click outside handler (delegate to document)
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('modal') ||
          e.target.classList.contains('modal-overlay') ||
          e.target.classList.contains('pawnshop-modal-overlay') ||
          e.target.classList.contains('dbety-modal-overlay')) {
        const modal = e.target.closest('.modal, .pawnshop-modal, .dbety-modal');
        if (modal && modal.id) {
          this.close(modal.id);
        }
      }

      // Close button handler
      if (e.target.classList.contains('modal-close') ||
          e.target.classList.contains('pawnshop-modal-close') ||
          e.target.classList.contains('dbety-modal-close')) {
        const modal = e.target.closest('.modal, .pawnshop-modal, .dbety-modal');
        if (modal && modal.id) {
          this.close(modal.id);
        }
      }
    });
  }

  open(modalId, options = {}) {
    const modal = document.getElementById(modalId);
    if (!modal) {
      console.error(`❌ [Modal] Modal not found: ${modalId}`);
      return;
    }

    console.log(`🪟 [Modal] Opening modal: ${modalId}`);

    // Apply layout-specific classes
    this.updateModalLayout(modalId);

    // Show modal
    modal.style.display = 'flex';
    modal.classList.add('show');
    modal.setAttribute('aria-hidden', 'false');

    // Prevent body scroll
    document.body.style.overflow = 'hidden';

    // Track open modal
    if (!this.openModals.includes(modalId)) {
      this.openModals.push(modalId);
    }

    // Focus management
    setTimeout(() => {
      const firstFocusable = modal.querySelector('button, input, [tabindex]:not([tabindex="-1"])');
      if (firstFocusable) {
        firstFocusable.focus();
      }
    }, 100);

    // Custom open callback
    if (options.onOpen && typeof options.onOpen === 'function') {
      options.onOpen(modal);
    }
  }

  close(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) {
      console.error(`❌ [Modal] Modal not found: ${modalId}`);
      return;
    }

    console.log(`🪟 [Modal] Closing modal: ${modalId}`);

    // Hide modal
    modal.style.display = 'none';
    modal.classList.remove('show');
    modal.setAttribute('aria-hidden', 'true');

    // Remove from tracking
    this.openModals = this.openModals.filter(id => id !== modalId);

    // Restore body scroll if no modals are open
    if (this.openModals.length === 0) {
      document.body.style.overflow = '';
    }

    // Return focus
    setTimeout(() => {
      document.body.focus();
    }, 50);
  }

  updateModalLayout(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;

    const modalContent = modal.querySelector('.modal-content, .pawnshop-modal-content, .dbety-modal-content');
    if (!modalContent) return;

    if (this.isDesktop) {
      // Desktop: Center dialog
      modal.classList.add('modal-center');
      modal.classList.remove('modal-bottom-sheet');
      console.log(`🖥️ [Modal] ${modalId}: Center dialog mode`);
    } else {
      // Mobile: Bottom sheet
      modal.classList.add('modal-bottom-sheet');
      modal.classList.remove('modal-center');
      console.log(`📱 [Modal] ${modalId}: Bottom sheet mode`);
    }
  }

  closeAll() {
    console.log('🪟 [Modal] Closing all modals');
    [...this.openModals].forEach(modalId => {
      this.close(modalId);
    });
  }

  isOpen(modalId) {
    return this.openModals.includes(modalId);
  }

  getOpenModals() {
    return [...this.openModals];
  }
}

// Create global instance
window.ModalManager = new ModalManager();

// Provide backward compatibility with existing UI code
if (!window.ui) {
  window.ui = {};
}

// Override existing modal methods to use ModalManager
const originalOpenModal = window.ui.openModal;
const originalCloseModal = window.ui.closeModal;

window.ui.openModal = function(modalId, options) {
  window.ModalManager.open(modalId, options);
  // Call original if it exists
  if (originalOpenModal && typeof originalOpenModal === 'function') {
    originalOpenModal.call(this, modalId);
  }
};

window.ui.closeModal = function(modalId) {
  window.ModalManager.close(modalId);
  // Call original if it exists
  if (originalCloseModal && typeof originalCloseModal === 'function') {
    originalCloseModal.call(this, modalId);
  }
};
