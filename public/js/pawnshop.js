/**
 * 전당포 시스템 JavaScript (v2 - 올바른 개념)
 *
 * 사용자가 정보/사진을 제공 → Ring 획득
 * 다른 사용자가 정보 열람 → 제공자가 Ring 획득
 */

(function() {
  'use strict';

  /**
   * 전당포 시스템 클래스
   */
  class PawnshopSystem {
    constructor() {
      // Modals
      this.pawnPhotoModal = null;
      this.pawnInfoModal = null;
      this.viewOthersModal = null;
      this.bankbookModal = null;

      // Buttons
      this.bankbookBtn = null;
      this.pawnPhotoBtn = null;
      this.pawnInfoBtn = null;
      this.viewOthersBtn = null;

      // State
      this.isInitialized = false;
      this.selectedInfoType = null;
      this.selectedPhoto = null;
      this.mockTransactions = [];
      this.mockUsers = [];
      this.modalOpenTime = 0; // ✅ FIX: 모달 타이밍 보호

      // Ring 화폐 시스템 참조
      this.ringSystem = window.RingSystem;
    }

    /**
     * 초기화
     */
    init() {
      if (this.isInitialized) {
        console.log('🏦 [Pawnshop] Already initialized');
        return;
      }

      console.log('🏦 [Pawnshop] Initializing pawnshop system...');

      // DOM 요소 가져오기
      this.bankbookBtn = document.getElementById('bankbook-btn');
      this.pawnPhotoBtn = document.getElementById('pawn-photo-btn');
      this.pawnInfoBtn = document.getElementById('pawn-info-btn');
      this.viewOthersBtn = document.getElementById('view-others-btn');

      this.pawnPhotoModal = document.getElementById('pawn-photo-modal');
      this.pawnInfoModal = document.getElementById('pawn-info-modal');
      this.viewOthersModal = document.getElementById('view-others-modal');
      this.bankbookModal = document.getElementById('bankbook-modal');

      if (!this.bankbookBtn || !this.pawnPhotoBtn || !this.pawnInfoBtn || !this.viewOthersBtn) {
        console.error('🏦 [Pawnshop] Required buttons not found');
        return;
      }

      if (!this.pawnPhotoModal || !this.pawnInfoModal || !this.viewOthersModal || !this.bankbookModal) {
        console.error('🏦 [Pawnshop] Required modals not found');
        return;
      }

      // 이벤트 리스너 설정
      this.setupEventListeners();

      // Mock 데이터 로드
      this.loadMockData();

      this.isInitialized = true;
      console.log('✅ [Pawnshop] System initialized');
    }

    /**
     * 이벤트 리스너 설정
     */
    setupEventListeners() {
      // Bankbook 버튼
      this.bankbookBtn.addEventListener('click', (e) => {
        e.stopPropagation(); // ✅ FIX: 이벤트 전파 방지
        this.openBankbook();
      });

      // Action 버튼들
      this.pawnPhotoBtn.addEventListener('click', (e) => {
        e.stopPropagation(); // ✅ FIX: 이벤트 전파 방지
        this.openPawnPhoto();
      });
      this.pawnInfoBtn.addEventListener('click', (e) => {
        e.stopPropagation(); // ✅ FIX: 이벤트 전파 방지
        this.openPawnInfo();
      });
      this.viewOthersBtn.addEventListener('click', (e) => {
        e.stopPropagation(); // ✅ FIX: 이벤트 전파 방지
        this.openViewOthers();
      });

      // 모달 닫기 버튼들
      const closeButtons = document.querySelectorAll('.pawnshop-modal-close');
      closeButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
          const modal = e.target.closest('.pawnshop-modal');
          this.closeModal(modal);
        });
      });

      // 오버레이 클릭 시 닫기
      const overlays = document.querySelectorAll('.pawnshop-modal-overlay');
      overlays.forEach(overlay => {
        overlay.addEventListener('click', (e) => {
          // ✅ FIX: 오버레이 자체를 클릭한 경우만 닫기
          if (e.target === overlay) {
            // ✅ FIX: 500ms 보호 - 모달 열린 직후 클릭 무시 (200ms → 500ms)
            const timeSinceOpen = Date.now() - this.modalOpenTime;
            console.log('🕐 [Pawnshop] Overlay clicked - time since open:', timeSinceOpen + 'ms');
            if (timeSinceOpen > 500) {
              const modal = overlay.closest('.pawnshop-modal');
              console.log('🚪 [Pawnshop] Closing modal via overlay click');
              this.closeModal(modal);
            } else {
              console.log('⏱️ [Pawnshop] Overlay click ignored - too soon after open (' + timeSinceOpen + 'ms < 500ms)');
            }
          } else {
            console.log('🎯 [Pawnshop] Click target is not overlay, ignoring');
          }
        }, true); // ✅ FIX: useCapture = true로 이벤트 캡처 단계에서 처리
      });

      // ESC 키로 닫기
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          // ✅ FIX: 500ms 보호 - 모달 열린 직후 ESC 무시 (200ms → 500ms)
          const timeSinceOpen = Date.now() - this.modalOpenTime;
          console.log('⌨️ [Pawnshop] ESC pressed - time since open:', timeSinceOpen + 'ms');
          if (timeSinceOpen > 500) {
            console.log('🚪 [Pawnshop] Closing modal via ESC key');
            this.closeAllModals();
          } else {
            console.log('⏱️ [Pawnshop] ESC ignored - too soon after open (' + timeSinceOpen + 'ms < 500ms)');
          }
        }
      });

      // 사진 업로드 관련
      this.setupPhotoUpload();

      // 정보 맡기기 관련
      this.setupInfoPawn();
    }

    /**
     * 사진 업로드 이벤트 설정
     */
    setupPhotoUpload() {
      const photoInput = document.getElementById('pawn-photo-input');
      const submitPhotoBtn = document.getElementById('submit-photo-btn');
      const removePhotoBtn = document.getElementById('remove-photo-btn');

      if (!photoInput || !submitPhotoBtn || !removePhotoBtn) return;

      // 사진 선택
      photoInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file && file.type.startsWith('image/')) {
          this.handlePhotoSelect(file);
          submitPhotoBtn.disabled = false;
        }
      });

      // 사진 제거
      removePhotoBtn.addEventListener('click', () => {
        this.clearPhotoPreview();
        submitPhotoBtn.disabled = true;
      });

      // 사진 제출
      submitPhotoBtn.addEventListener('click', () => {
        if (this.selectedPhoto) {
          this.submitPhoto();
        }
      });
    }

    /**
     * 정보 맡기기 이벤트 설정
     */
    setupInfoPawn() {
      const infoTypeCards = document.querySelectorAll('.info-type-card');
      const infoInputArea = document.getElementById('info-input-area');
      const infoTextarea = document.getElementById('info-textarea');
      const charCount = document.getElementById('char-count');
      const submitInfoBtn = document.getElementById('submit-info-btn');

      if (!infoInputArea || !infoTextarea || !charCount || !submitInfoBtn) return;

      // 정보 타입 선택
      infoTypeCards.forEach(card => {
        card.addEventListener('click', () => {
          // 선택 상태 업데이트
          infoTypeCards.forEach(c => c.classList.remove('selected'));
          card.classList.add('selected');

          // 선택된 타입 저장
          this.selectedInfoType = card.dataset.type;

          // 입력 영역 표시
          infoInputArea.style.display = 'block';
          infoTextarea.focus();
        });
      });

      // 글자 수 카운터
      infoTextarea.addEventListener('input', () => {
        charCount.textContent = infoTextarea.value.length;
      });

      // 정보 제출
      submitInfoBtn.addEventListener('click', () => {
        const text = infoTextarea.value.trim();
        if (text && this.selectedInfoType) {
          this.submitInfo(this.selectedInfoType, text);
        } else {
          this.showToast('정보를 입력해주세요', 'error');
        }
      });
    }

    /**
     * 사진 선택 처리
     */
    handlePhotoSelect(file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        this.selectedPhoto = {
          file: file,
          dataURL: e.target.result
        };

        // 미리보기 표시
        const photoPreviewArea = document.getElementById('photo-preview-area');
        const photoPreviewImg = document.getElementById('photo-preview-img');
        const photoUploadLabel = document.querySelector('.photo-upload-label');

        if (photoPreviewArea && photoPreviewImg && photoUploadLabel) {
          photoPreviewImg.src = e.target.result;
          photoUploadLabel.style.display = 'none';
          photoPreviewArea.style.display = 'block';
        }
      };
      reader.readAsDataURL(file);
    }

    /**
     * 사진 미리보기 초기화
     */
    clearPhotoPreview() {
      this.selectedPhoto = null;

      const photoInput = document.getElementById('pawn-photo-input');
      const photoPreviewArea = document.getElementById('photo-preview-area');
      const photoUploadLabel = document.querySelector('.photo-upload-label');

      if (photoInput) photoInput.value = '';
      if (photoPreviewArea) photoPreviewArea.style.display = 'none';
      if (photoUploadLabel) photoUploadLabel.style.display = 'flex';
    }

    /**
     * 사진 제출
     */
    async submitPhoto() {
      console.log('📸 [Pawnshop] Submitting photo...');

      // Mock: Ring 지급
      const rewardAmount = 50;

      if (this.ringSystem) {
        await this.ringSystem.earnRings(rewardAmount, '사진 맡기기');
      }

      // Mock: 거래 내역 추가
      this.addTransaction('사진 맡기기', rewardAmount, 'earned');

      this.showToast(`사진을 맡기고 ${rewardAmount}💍을 받았어요!`, 'success');
      this.clearPhotoPreview();
      this.closeModal(this.pawnPhotoModal);

      console.log('✅ [Pawnshop] Photo submitted');
    }

    /**
     * 정보 제출
     */
    async submitInfo(type, text) {
      console.log(`📝 [Pawnshop] Submitting info (${type}):`, text);

      // Mock: Ring 지급
      const rewards = {
        'ideal-type': 50,
        'career': 30,
        'hobbies': 20
      };
      const rewardAmount = rewards[type] || 20;

      const typeNames = {
        'ideal-type': '이상형 정보',
        'career': '직업 & 학력 정보',
        'hobbies': '취미 & 관심사'
      };
      const typeName = typeNames[type] || '정보';

      if (this.ringSystem) {
        await this.ringSystem.earnRings(rewardAmount, `${typeName} 맡기기`);
      }

      // Mock: 거래 내역 추가
      this.addTransaction(`${typeName} 맡기기`, rewardAmount, 'earned');

      this.showToast(`${typeName}를 맡기고 ${rewardAmount}💍을 받았어요!`, 'success');

      // 입력 초기화
      const infoTextarea = document.getElementById('info-textarea');
      const infoInputArea = document.getElementById('info-input-area');
      const infoTypeCards = document.querySelectorAll('.info-type-card');

      if (infoTextarea) infoTextarea.value = '';
      if (infoInputArea) infoInputArea.style.display = 'none';
      infoTypeCards.forEach(c => c.classList.remove('selected'));
      this.selectedInfoType = null;

      this.closeModal(this.pawnInfoModal);

      console.log('✅ [Pawnshop] Info submitted');
    }

    /**
     * 거래 내역 추가 (Mock)
     */
    addTransaction(type, amount, category) {
      this.mockTransactions.unshift({
        id: Date.now(),
        type: type,
        amount: amount,
        category: category, // 'earned' or 'spent'
        date: new Date().toISOString()
      });

      // 최대 50개까지만 저장
      if (this.mockTransactions.length > 50) {
        this.mockTransactions = this.mockTransactions.slice(0, 50);
      }
    }

    /**
     * Mock 데이터 로드
     */
    loadMockData() {
      // Mock 사용자 데이터
      this.mockUsers = [
        { id: 1, name: '김민지', age: 28, region: '서울', image: '/images/profiles/user1.jpg' },
        { id: 2, name: '이수진', age: 26, region: '경기', image: '/images/profiles/user2.jpg' },
        { id: 3, name: '박서연', age: 30, region: '부산', image: '/images/profiles/user3.jpg' },
        { id: 4, name: '최은영', age: 27, region: '인천', image: '/images/profiles/user4.jpg' },
        { id: 5, name: '정하늘', age: 29, region: '대전', image: '/images/profiles/user5.jpg' },
        { id: 6, name: '강미래', age: 25, region: '광주', image: '/images/profiles/user6.jpg' }
      ];

      // Mock 거래 내역
      this.mockTransactions = [
        {
          id: 1,
          type: '사진 맡기기',
          amount: 50,
          category: 'earned',
          date: new Date(Date.now() - 86400000).toISOString() // 1일 전
        },
        {
          id: 2,
          type: '이상형 정보 맡기기',
          amount: 50,
          category: 'earned',
          date: new Date(Date.now() - 172800000).toISOString() // 2일 전
        },
        {
          id: 3,
          type: '다른 유저 정보 열람',
          amount: 30,
          category: 'spent',
          date: new Date(Date.now() - 259200000).toISOString() // 3일 전
        }
      ];
    }

    /**
     * Bankbook 모달 열기
     */
    openBankbook() {
      console.log('🏦 [Pawnshop] Opening bankbook modal...');

      // 거래 내역 렌더링
      this.renderTransactions();

      // 통계 업데이트
      this.updateBankbookSummary();

      this.openModal(this.bankbookModal);
    }

    /**
     * Bankbook 요약 통계 업데이트
     */
    updateBankbookSummary() {
      const totalEarned = this.mockTransactions
        .filter(t => t.category === 'earned')
        .reduce((sum, t) => sum + t.amount, 0);

      const totalSpent = this.mockTransactions
        .filter(t => t.category === 'spent')
        .reduce((sum, t) => sum + t.amount, 0);

      const netProfit = totalEarned - totalSpent;

      const totalEarnedEl = document.getElementById('total-earned');
      const totalSpentEl = document.getElementById('total-spent');
      const netProfitEl = document.getElementById('net-profit');

      if (totalEarnedEl) totalEarnedEl.textContent = `${totalEarned} 💍`;
      if (totalSpentEl) totalSpentEl.textContent = `${totalSpent} 💍`;
      if (netProfitEl) netProfitEl.textContent = `${netProfit} 💍`;
    }

    /**
     * 거래 내역 렌더링
     */
    renderTransactions() {
      const transactionList = document.getElementById('transaction-list');
      if (!transactionList) return;

      if (this.mockTransactions.length === 0) {
        transactionList.innerHTML = `
          <div class="empty-transactions">
            <img src="/images/d-bety.png" alt="Empty" class="dbety-empty" style="width: 60px; height: 60px;">
            <p>아직 거래 내역이 없어요</p>
          </div>
        `;
        return;
      }

      transactionList.innerHTML = this.mockTransactions.map(transaction => {
        const date = new Date(transaction.date);
        const dateStr = this.formatDate(date);
        const amountClass = transaction.category === 'earned' ? 'earned' : 'spent';
        const amountPrefix = transaction.category === 'earned' ? '+' : '-';

        return `
          <div class="transaction-item">
            <div class="transaction-info">
              <div class="transaction-type">${transaction.type}</div>
              <div class="transaction-date">${dateStr}</div>
            </div>
            <div class="transaction-amount ${amountClass}">
              ${amountPrefix}${transaction.amount} 💍
            </div>
          </div>
        `;
      }).join('');
    }

    /**
     * 날짜 포맷
     */
    formatDate(date) {
      const now = new Date();
      const diffMs = now - date;
      const diffSecs = Math.floor(diffMs / 1000);
      const diffMins = Math.floor(diffSecs / 60);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffDays === 0) {
        if (diffHours === 0) {
          if (diffMins === 0) {
            return '방금 전';
          }
          return `${diffMins}분 전`;
        }
        return `${diffHours}시간 전`;
      } else if (diffDays === 1) {
        return '어제';
      } else if (diffDays < 7) {
        return `${diffDays}일 전`;
      } else {
        const month = date.getMonth() + 1;
        const day = date.getDate();
        return `${month}월 ${day}일`;
      }
    }

    /**
     * 사진 맡기기 모달 열기
     */
    openPawnPhoto() {
      console.log('📸 [Pawnshop] Opening pawn photo modal...');
      this.openModal(this.pawnPhotoModal);
    }

    /**
     * 정보 맡기기 모달 열기
     */
    openPawnInfo() {
      console.log('📝 [Pawnshop] Opening pawn info modal...');
      this.openModal(this.pawnInfoModal);
    }

    /**
     * 다른 사람 정보 보기 모달 열기
     */
    openViewOthers() {
      console.log('👀 [Pawnshop] Opening view others modal...');

      // 사용자 카드 렌더링
      this.renderUserCards();

      this.openModal(this.viewOthersModal);
    }

    /**
     * 사용자 카드 렌더링
     */
    renderUserCards() {
      const itemsGrid = document.getElementById('pawnshop-items-grid');
      if (!itemsGrid) return;

      itemsGrid.innerHTML = this.mockUsers.map(user => `
        <div class="pawnshop-user-card" data-user-id="${user.id}">
          <div class="pawnshop-card-avatar">
            <img src="${user.image}" alt="${user.name}">
          </div>
          <div class="pawnshop-card-name">${user.name}</div>
          <div class="pawnshop-card-info">
            ${user.age}세 · ${user.region}
          </div>
        </div>
      `).join('');

      // 카드 클릭 이벤트
      itemsGrid.querySelectorAll('.pawnshop-user-card').forEach(card => {
        card.addEventListener('click', () => {
          const userId = card.dataset.userId;
          this.handleUserCardClick(userId);
        });
      });
    }

    /**
     * 사용자 카드 클릭 처리
     */
    async handleUserCardClick(userId) {
      console.log('🔍 [Pawnshop] Viewing user info:', userId);

      // Mock: Ring 지출
      const cost = 30;

      if (this.ringSystem) {
        const currentRings = this.ringSystem.getCurrentRings();

        if (currentRings < cost) {
          this.showToast(`링이 부족합니다! (필요: ${cost}💍, 보유: ${currentRings}💍)`, 'error');
          return;
        }

        const success = await this.ringSystem.spendRings(cost, '다른 유저 정보 열람');

        if (success) {
          this.addTransaction('다른 유저 정보 열람', cost, 'spent');
          this.showToast(`정보를 열람했습니다! (-${cost}💍)`, 'success');

          // 실제로는 여기서 정보 표시
          alert('실제 구현 시: 이 사용자의 맡긴 정보가 표시됩니다.');
        } else {
          this.showToast('정보 열람에 실패했습니다.', 'error');
        }
      } else {
        // Ring 시스템 없을 때 Mock 처리
        console.log(`👀 [Pawnshop] Viewing user info (${cost} rings)`);
        this.showToast(`정보를 열람했습니다! (개발중)`, 'info');
      }
    }

    /**
     * 모달 열기
     */
    openModal(modal) {
      if (!modal) {
        console.error('🏦 [Pawnshop] Cannot open modal - modal is null');
        return;
      }

      // ✅ FIX: 타임스탬프 먼저 기록
      this.modalOpenTime = Date.now();
      console.log('🏦 [Pawnshop] Modal opening timestamp:', this.modalOpenTime);

      // ✅ FIX: requestAnimationFrame으로 타이밍 개선
      requestAnimationFrame(() => {
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        console.log('✅ [Pawnshop] Modal opened:', modal.id);
      });
    }

    /**
     * 모달 닫기
     */
    closeModal(modal) {
      if (!modal) return;
      modal.style.display = 'none';
      document.body.style.overflow = '';
    }

    /**
     * 모든 모달 닫기
     */
    closeAllModals() {
      this.closeModal(this.pawnPhotoModal);
      this.closeModal(this.pawnInfoModal);
      this.closeModal(this.viewOthersModal);
      this.closeModal(this.bankbookModal);
    }

    /**
     * 토스트 메시지 표시
     */
    showToast(message, type = 'info') {
      const toastContainer = document.getElementById('toast-container');
      if (!toastContainer) {
        console.warn('Toast container not found');
        return;
      }

      const toast = document.createElement('div');
      toast.className = `toast toast-${type}`;
      toast.textContent = message;
      toast.style.cssText = `
        padding: 1rem 1.5rem;
        background: ${type === 'error' ? '#d32f2f' : type === 'success' ? '#388e3c' : '#1976d2'};
        color: white;
        border-radius: 8px;
        margin-bottom: 0.5rem;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        animation: slideInRight 0.3s ease;
      `;

      toastContainer.appendChild(toast);

      setTimeout(() => {
        toast.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => toast.remove(), 300);
      }, 3000);
    }
  }

  // 전역 노출
  window.PawnshopSystem = PawnshopSystem;

  // 자동 초기화
  document.addEventListener('DOMContentLoaded', () => {
    const pawnshop = new PawnshopSystem();
    pawnshop.init();
    window.pawnshop = pawnshop;
  });

})();
