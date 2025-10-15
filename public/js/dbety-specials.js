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
    let modalOpenTime = 0; // ✅ FIX: 모달 타이밍 보호

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

        // ✅ FIX: 백드롭 클릭 처리 (200ms 보호)
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    e.stopPropagation(); // ✅ FIX: 이벤트 전파 방지
                    const timeSinceOpen = Date.now() - modalOpenTime;
                    if (timeSinceOpen > 200) {
                        closeModal();
                    } else {
                        console.log('⏱️ [D-Bety Special] Click ignored - too soon after open (' + timeSinceOpen + 'ms < 200ms)');
                    }
                }
            });
            console.log('✅ [D-Bety Special] Backdrop click bound');
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
    function openModal(event) {
        console.log('🔓 [D-Bety Special] Opening modal...');

        // Prevent navigation event from firing
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }

        if (!modal) {
            console.error('❌ [D-Bety Special] Modal not initialized');
            return;
        }

        // ✅ FIX: 타임스탬프 먼저 기록
        modalOpenTime = Date.now();

        // ✅ FIX: requestAnimationFrame 사용
        requestAnimationFrame(() => {
            modal.style.display = 'flex';
            modal.setAttribute('aria-hidden', 'false'); // ✅ FIX: 접근성 개선
            document.body.style.overflow = 'hidden'; // Prevent body scroll
            console.log('✅ [D-Bety Special] Modal opened');

            // ✅ FIX: 포커스 관리 개선
            requestAnimationFrame(() => {
                if (modalClose) {
                    modalClose.focus();
                }
            });
        });
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
        modal.setAttribute('aria-hidden', 'true'); // ✅ FIX: 접근성 개선
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
        // ✅ FIX: ESC 키 200ms 보호
        if (event.key === 'Escape' && modal && modal.style.display === 'flex') {
            const timeSinceOpen = Date.now() - modalOpenTime;
            if (timeSinceOpen > 200) {
                closeModal();
            } else {
                console.log('⏱️ [D-Bety Special] ESC ignored - too soon after open (' + timeSinceOpen + 'ms < 200ms)');
            }
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
