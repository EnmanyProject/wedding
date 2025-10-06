/**
 * Ring Currency System Frontend Components
 * Phase 1A: Core Ring UI & Animation System
 */

class RingSystem {
    constructor() {
        this.balance = 0;
        this.totalEarned = 0;
        this.totalSpent = 0;
        this.transactionHistory = [];
        this.currentStreak = 0;
        this.isInitialized = false;
        
        this.init();
    }

    async init() {
        console.log('💍 Ring System initializing...');
        
        // Create ring balance display in header
        this.createRingHeader();
        
        // Load initial balance
        await this.loadBalance();
        
        // Check for daily login bonus
        await this.checkDailyLogin();
        
        this.isInitialized = true;
        console.log('✅ Ring System initialized');
    }

    // Create ring balance display in header
    createRingHeader() {
        const headerStats = document.querySelector('.header-stats');
        if (!headerStats) {
            console.warn('No header stats section found for ring display');
            return;
        }

        const ringDisplay = document.createElement('div');
        ringDisplay.className = 'ring-balance-header';
        ringDisplay.innerHTML = `
            <div class="ring-display" id="ring-display" onclick="window.ringSystem?.openWallet()" title="링 지갑 열기">
                <div class="ring-icon">💍</div>
                <div class="ring-amount" id="ring-amount">--</div>
                <div class="ring-plus" id="ring-plus">+0</div>
            </div>
        `;

        // Insert after points display but before notifications
        const pointsDisplay = headerStats.querySelector('.points-display');
        if (pointsDisplay) {
            pointsDisplay.insertAdjacentElement('afterend', ringDisplay);
        } else {
            headerStats.prepend(ringDisplay);
        }
    }

    // Load user's ring balance
    async loadBalance() {
        try {
            const response = await fetch('/api/rings/balance', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.updateBalance(data.balance, data.total_earned, data.total_spent);
            } else {
                console.warn('Failed to load ring balance');
            }
        } catch (error) {
            console.error('Error loading ring balance:', error);
        }
    }

    // Update balance display with animation
    updateBalance(newBalance, totalEarned = null, totalSpent = null) {
        const oldBalance = this.balance;
        this.balance = newBalance;
        
        if (totalEarned !== null) this.totalEarned = totalEarned;
        if (totalSpent !== null) this.totalSpent = totalSpent;

        const amountEl = document.getElementById('ring-amount');
        if (!amountEl) return;

        // Animate counter
        this.animateCounter(amountEl, oldBalance, newBalance);

        // Show gain animation if balance increased
        if (newBalance > oldBalance) {
            this.showGainAnimation(newBalance - oldBalance);
        }
    }

    // Animate counter from old to new value
    animateCounter(element, from, to) {
        const duration = 800;
        const startTime = performance.now();

        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Easing function (ease-out)
            const easeOut = 1 - Math.pow(1 - progress, 3);
            
            const current = Math.round(from + (to - from) * easeOut);
            element.textContent = current.toLocaleString();

            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };

        requestAnimationFrame(animate);
    }

    // Show ring gain animation
    showGainAnimation(amount) {
        const plusEl = document.getElementById('ring-plus');
        if (!plusEl) return;

        plusEl.textContent = `+${amount}`;
        plusEl.classList.add('ring-gain-show');

        setTimeout(() => {
            plusEl.classList.remove('ring-gain-show');
        }, 2000);

        // Particle effect
        this.createRingParticles(amount);
    }

    // Create floating ring particles
    createRingParticles(amount) {
        const ringDisplay = document.getElementById('ring-display');
        if (!ringDisplay) return;

        const particleCount = Math.min(amount, 10); // Max 10 particles

        for (let i = 0; i < particleCount; i++) {
            setTimeout(() => {
                const particle = document.createElement('div');
                particle.className = 'ring-particle';
                particle.innerHTML = '💍';
                
                // Random starting position around the ring display
                const rect = ringDisplay.getBoundingClientRect();
                particle.style.left = `${rect.left + rect.width / 2}px`;
                particle.style.top = `${rect.top + rect.height / 2}px`;

                document.body.appendChild(particle);

                // Animate particle
                setTimeout(() => {
                    particle.style.transform = `translateY(-100px) translateX(${(Math.random() - 0.5) * 200}px)`;
                    particle.style.opacity = '0';
                }, 100);

                // Remove particle
                setTimeout(() => {
                    particle.remove();
                }, 1000);
            }, i * 100);
        }
    }

    // Check and process daily login bonus
    async checkDailyLogin() {
        try {
            const response = await fetch('/api/rings/daily-login', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                if (data.awarded) {
                    this.showDailyLoginBonus(data.amount, data.streak);
                    await this.loadBalance(); // Refresh balance
                }
                this.currentStreak = data.streak;
            }
        } catch (error) {
            console.error('Error checking daily login:', error);
        }
    }

    // Show daily login bonus modal
    showDailyLoginBonus(amount, streak) {
        const modal = document.createElement('div');
        modal.className = 'ring-modal daily-login-modal';
        modal.innerHTML = `
            <div class="ring-modal-content">
                <div class="modal-header">
                    <h2>일일 로그인 보너스! 🎉</h2>
                </div>
                <div class="modal-body">
                    <div class="bonus-animation">
                        <div class="ring-icon-large">💍</div>
                        <div class="bonus-amount">+${amount}</div>
                    </div>
                    <div class="streak-info">
                        <div class="streak-text">${streak}일 연속 로그인</div>
                        <div class="streak-bar">
                            <div class="streak-progress" style="width: ${(streak % 7) * 14.28}%"></div>
                        </div>
                        <div class="streak-hint">7일 연속 로그인 시 추가 보너스!</div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-ring-primary" onclick="this.closest('.ring-modal').remove()">
                        받았습니다! ✨
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Auto-close after 5 seconds
        setTimeout(() => {
            if (modal.parentNode) {
                modal.remove();
            }
        }, 5000);
    }

    // Award rings for quiz correct answer
    async awardQuizRings(correct, metadata = {}) {
        if (!correct) return 0;

        try {
            const response = await fetch('/api/rings/quiz-reward', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ correct, metadata })
            });

            if (response.ok) {
                const data = await response.json();
                if (data.awarded) {
                    this.updateBalance(data.balance.balance, data.balance.total_earned, data.balance.total_spent);
                    this.showQuizReward(data.amount);
                    return data.amount;
                }
            }
        } catch (error) {
            console.error('Error awarding quiz rings:', error);
        }

        return 0;
    }

    // Show quiz reward notification
    showQuizReward(amount) {
        const notification = document.createElement('div');
        notification.className = 'ring-notification quiz-reward';
        notification.innerHTML = `
            <div class="notification-content">
                <span class="ring-icon">💍</span>
                <span class="reward-text">+${amount} 정답 보상!</span>
            </div>
        `;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.classList.add('show');
        }, 100);

        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    // Award rings for photo upload
    async awardPhotoRings(photoId) {
        try {
            const response = await fetch('/api/rings/photo-reward', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ photo_id: photoId })
            });

            if (response.ok) {
                const data = await response.json();
                if (data.awarded) {
                    this.updateBalance(data.balance.balance, data.balance.total_earned, data.balance.total_spent);
                    this.showPhotoReward(data.amount);
                    return data.amount;
                }
            }
        } catch (error) {
            console.error('Error awarding photo rings:', error);
        }

        return 0;
    }

    // Show photo upload reward notification
    showPhotoReward(amount) {
        const notification = document.createElement('div');
        notification.className = 'ring-notification photo-reward';
        notification.innerHTML = `
            <div class="notification-content">
                <span class="ring-icon">💍</span>
                <span class="reward-text">+${amount} 사진 업로드 보상!</span>
            </div>
        `;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.classList.add('show');
        }, 100);

        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    // Spend rings
    async spendRings(amount, transactionType, description = '', metadata = {}) {
        try {
            const response = await fetch('/api/rings/spend', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    amount,
                    transaction_type: transactionType,
                    description,
                    metadata
                })
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    this.updateBalance(data.balance.balance, data.balance.total_earned, data.balance.total_spent);
                    return true;
                }
            } else {
                const error = await response.json();
                this.showError(error.error || 'Failed to spend rings');
            }
        } catch (error) {
            console.error('Error spending rings:', error);
            this.showError('Network error occurred');
        }

        return false;
    }

    // Check if user can afford something
    async canAfford(amount) {
        try {
            const response = await fetch('/api/rings/can-afford', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ amount })
            });

            if (response.ok) {
                const data = await response.json();
                return data.can_afford;
            }
        } catch (error) {
            console.error('Error checking affordability:', error);
        }

        return false;
    }

    // Show error notification
    showError(message) {
        const notification = document.createElement('div');
        notification.className = 'ring-notification error';
        notification.innerHTML = `
            <div class="notification-content">
                <span class="error-icon">❌</span>
                <span class="error-text">${message}</span>
            </div>
        `;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.classList.add('show');
        }, 100);

        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 4000);
    }

    // Get transaction history
    async getTransactionHistory(limit = 20, offset = 0) {
        try {
            const response = await fetch(`/api/rings/transactions?limit=${limit}&offset=${offset}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.transactionHistory = data;
                return data;
            }
        } catch (error) {
            console.error('Error getting transaction history:', error);
        }

        return [];
    }

    // Open ring wallet modal
    async openWallet() {
        await this.loadBalance();
        const transactions = await this.getTransactionHistory();

        const modal = document.createElement('div');
        modal.className = 'ring-modal wallet-modal';
        modal.innerHTML = `
            <div class="ring-modal-content large">
                <div class="modal-header">
                    <h2>💍 링 지갑</h2>
                    <button class="close-btn" onclick="this.closest('.ring-modal').remove()">×</button>
                </div>
                <div class="modal-body">
                    <div class="wallet-summary">
                        <div class="balance-card">
                            <div class="balance-label">현재 보유</div>
                            <div class="balance-amount">${this.balance.toLocaleString()}</div>
                            <div class="balance-icon">💍</div>
                        </div>
                        <div class="stats-grid">
                            <div class="stat-item">
                                <div class="stat-value">${this.totalEarned.toLocaleString()}</div>
                                <div class="stat-label">총 획득</div>
                            </div>
                            <div class="stat-item">
                                <div class="stat-value">${this.totalSpent.toLocaleString()}</div>
                                <div class="stat-label">총 사용</div>
                            </div>
                            <div class="stat-item">
                                <div class="stat-value">${this.currentStreak}</div>
                                <div class="stat-label">연속 로그인</div>
                            </div>
                        </div>
                    </div>
                    <div class="transaction-history">
                        <h3>거래 내역</h3>
                        <div class="transaction-list">
                            ${this.renderTransactionHistory(transactions)}
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
    }

    // Render transaction history
    renderTransactionHistory(transactions) {
        if (!transactions || transactions.length === 0) {
            return '<div class="no-transactions">거래 내역이 없습니다.</div>';
        }

        return transactions.map(tx => {
            const isPositive = tx.amount > 0;
            const icon = this.getTransactionIcon(tx.transaction_type);
            const date = new Date(tx.created_at).toLocaleDateString('ko-KR');
            
            return `
                <div class="transaction-item ${isPositive ? 'positive' : 'negative'}">
                    <div class="transaction-icon">${icon}</div>
                    <div class="transaction-info">
                        <div class="transaction-description">${tx.description}</div>
                        <div class="transaction-date">${date}</div>
                    </div>
                    <div class="transaction-amount ${isPositive ? 'positive' : 'negative'}">
                        ${isPositive ? '+' : ''}${tx.amount.toLocaleString()}
                    </div>
                </div>
            `;
        }).join('');
    }

    // Get icon for transaction type
    getTransactionIcon(type) {
        const icons = {
            'SIGNUP_BONUS': '🎁',
            'DAILY_LOGIN': '📅',
            'QUIZ_CORRECT': '✅',
            'PHOTO_UPLOAD': '📸',
            'PROFILE_COMPLETE': '👤',
            'INVITE_FRIEND': '👥',
            'STREAK_BONUS': '🔥',
            'SPECIAL_EVENT': '🎉',
            'QUIZ_PLAY': '🎯',
            'PHOTO_UNLOCK': '🔓',
            'PREMIUM_FEATURE': '⭐',
            'GIFT_RING': '💝',
            'PURCHASE_ITEM': '🛒',
            'ADMIN_ADJUST': '⚙️'
        };

        return icons[type] || '💍';
    }
}

// Initialize global ring system
let ringSystem;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Wait for auth system to be ready
    setTimeout(() => {
        if (localStorage.getItem('authToken')) {
            ringSystem = new RingSystem();
            window.ringSystem = ringSystem; // Make globally accessible
        } else {
            console.log('💍 Ring System waiting for authentication...');
            // Try again after auth
            const checkAuth = setInterval(() => {
                if (localStorage.getItem('authToken')) {
                    ringSystem = new RingSystem();
                    window.ringSystem = ringSystem;
                    clearInterval(checkAuth);
                }
            }, 1000);
        }
    }, 1000);
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = RingSystem;
} else {
    window.RingSystem = RingSystem;
}