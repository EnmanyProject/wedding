/**
 * D-Bety Special Recommendations Modal Handler
 * 베티의 특별 추천 모달 핸들러
 */

(function() {
    'use strict';

    // Modal elements
    let modal = null;
    let modalOverlay = null;
    let modalClose = null;
    let recButtons = [];

    /**
     * Initialize D-Bety Special Modal
     */
    function initDBetySpecialModal() {
        console.log('🎭 [D-Bety Special] Initializing modal...');

        // Get modal elements
        modal = document.getElementById('dbety-special-modal');
        modalOverlay = modal?.querySelector('.dbety-modal-overlay');
        modalClose = modal?.querySelector('.dbety-modal-close');
        recButtons = modal?.querySelectorAll('.dbety-rec-button') || [];

        if (!modal) {
            console.error('❌ [D-Bety Special] Modal element not found');
            return;
        }

        // Bind nav button click
        const navButton = document.getElementById('dbety-special-btn');
        if (navButton) {
            navButton.addEventListener('click', openModal);
            console.log('✅ [D-Bety Special] Nav button bound');
        }

        // Bind close button
        if (modalClose) {
            modalClose.addEventListener('click', closeModal);
            console.log('✅ [D-Bety Special] Close button bound');
        }

        // Bind overlay click
        if (modalOverlay) {
            modalOverlay.addEventListener('click', closeModal);
            console.log('✅ [D-Bety Special] Overlay click bound');
        }

        // Bind recommendation buttons
        recButtons.forEach(button => {
            button.addEventListener('click', handleRecommendationClick);
        });
        console.log(`✅ [D-Bety Special] ${recButtons.length} recommendation buttons bound`);

        // Bind ESC key
        document.addEventListener('keydown', handleKeyDown);
        console.log('✅ [D-Bety Special] Keyboard handler bound');

        console.log('🎉 [D-Bety Special] Modal initialization complete');
    }

    /**
     * Open modal
     */
    function openModal() {
        console.log('🔓 [D-Bety Special] Opening modal...');

        if (!modal) {
            console.error('❌ [D-Bety Special] Modal not initialized');
            return;
        }

        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden'; // Prevent body scroll

        // Focus trap
        setTimeout(() => {
            if (modalClose) {
                modalClose.focus();
            }
        }, 100);

        console.log('✅ [D-Bety Special] Modal opened');
    }

    /**
     * Close modal
     */
    function closeModal() {
        console.log('🔒 [D-Bety Special] Closing modal...');

        if (!modal) {
            return;
        }

        modal.style.display = 'none';
        document.body.style.overflow = ''; // Restore body scroll

        // Return focus to nav button
        const navButton = document.getElementById('dbety-special-btn');
        if (navButton) {
            navButton.focus();
        }

        console.log('✅ [D-Bety Special] Modal closed');
    }

    /**
     * Handle recommendation button click
     */
    function handleRecommendationClick(event) {
        const button = event.currentTarget;
        const type = button.dataset.type;

        console.log(`🎯 [D-Bety Special] Recommendation clicked: ${type}`);

        // Show "Under Development" toast
        showToast('개발중', '이 기능은 곧 출시됩니다! 💎', 'info');

        // Optional: Close modal after showing message
        // closeModal();
    }

    /**
     * Handle keyboard events
     */
    function handleKeyDown(event) {
        // ESC key closes modal
        if (event.key === 'Escape' && modal && modal.style.display === 'flex') {
            closeModal();
        }
    }

    /**
     * Show toast notification
     * @param {string} title - Toast title
     * @param {string} message - Toast message
     * @param {string} type - Toast type (success, error, info)
     */
    function showToast(title, message, type = 'info') {
        const container = document.getElementById('toast-container');
        if (!container) {
            console.warn('⚠️ [D-Bety Special] Toast container not found');
            alert(`${title}\n${message}`);
            return;
        }

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <div class="toast-header">
                <strong class="toast-title">${title}</strong>
                <button class="toast-close" aria-label="닫기">&times;</button>
            </div>
            <div class="toast-body">${message}</div>
        `;

        container.appendChild(toast);

        // Fade in
        setTimeout(() => {
            toast.classList.add('show');
        }, 10);

        // Close button
        const closeBtn = toast.querySelector('.toast-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                removeToast(toast);
            });
        }

        // Auto remove after 3 seconds
        setTimeout(() => {
            removeToast(toast);
        }, 3000);

        console.log(`📢 [D-Bety Special] Toast shown: ${title}`);
    }

    /**
     * Remove toast with animation
     * @param {HTMLElement} toast - Toast element to remove
     */
    function removeToast(toast) {
        if (!toast || !toast.parentNode) return;

        toast.classList.remove('show');
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initDBetySpecialModal);
    } else {
        initDBetySpecialModal();
    }

    // Export for potential external use
    window.DBetySpecial = {
        open: openModal,
        close: closeModal
    };

})();
