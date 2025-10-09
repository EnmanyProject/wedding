/**
 * 전당포 시스템 - Pawnshop System
 *
 * 링 화폐를 사용하여 상대방의 정보를 미리 확인하는 기능
 */

(function() {
  'use strict';

  /**
   * 전당포 시스템 클래스
   */
  class PawnshopSystem {
    constructor() {
      this.modal = null;
      this.modalOverlay = null;
      this.closeBtn = null;
      this.currentUser = null;
      this.isInitialized = false;

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
      this.modal = document.getElementById('pawnshop-modal');
      this.modalOverlay = this.modal?.querySelector('.pawnshop-modal-overlay');
      this.closeBtn = this.modal?.querySelector('.pawnshop-modal-close');
      this.itemsGrid = document.getElementById('pawnshop-items-grid');

      if (!this.modal || !this.modalOverlay || !this.closeBtn) {
        console.error('🏦 [Pawnshop] Required elements not found');
        return;
      }

      // 이벤트 리스너 설정
      this.setupEventListeners();

      // Mock 데이터 로드
      this.loadMockUsers();

      this.isInitialized = true;
      console.log('✅ [Pawnshop] System initialized');
    }

    /**
     * 이벤트 리스너 설정
     */
    setupEventListeners() {
      // 닫기 버튼
      this.closeBtn.addEventListener('click', () => this.close());

      // 오버레이 클릭 시 닫기
      this.modalOverlay.addEventListener('click', () => this.close());

      // ESC 키로 닫기
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && this.modal.style.display !== 'none') {
          this.close();
        }
      });

      // Unlock 버튼 이벤트 위임
      this.modal.addEventListener('click', (e) => {
        const unlockBtn = e.target.closest('.pawnshop-unlock-btn');
        if (unlockBtn) {
          this.handleUnlock(unlockBtn.dataset.type);
        }
      });
    }

    /**
     * Mock 사용자 데이터 로드
     */
    loadMockUsers() {
      const mockUsers = [
        { id: 1, name: '김민지', age: 28, region: '서울', image: '/images/profiles/user1.jpg' },
        { id: 2, name: '이수진', age: 26, region: '경기', image: '/images/profiles/user2.jpg' },
        { id: 3, name: '박서연', age: 30, region: '부산', image: '/images/profiles/user3.jpg' },
        { id: 4, name: '최은영', age: 27, region: '인천', image: '/images/profiles/user4.jpg' },
        { id: 5, name: '정하늘', age: 29, region: '대전', image: '/images/profiles/user5.jpg' },
        { id: 6, name: '강미래', age: 25, region: '광주', image: '/images/profiles/user6.jpg' }
      ];

      this.renderUserCards(mockUsers);
    }

    /**
     * 사용자 카드 렌더링
     */
    renderUserCards(users) {
      if (!this.itemsGrid) return;

      this.itemsGrid.innerHTML = users.map(user => `
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
      this.itemsGrid.querySelectorAll('.pawnshop-user-card').forEach(card => {
        card.addEventListener('click', () => {
          const userId = card.dataset.userId;
          const user = users.find(u => u.id === parseInt(userId));
          if (user) {
            this.open(user);
          }
        });
      });
    }

    /**
     * 모달 열기
     */
    open(user) {
      if (!this.modal) return;

      this.currentUser = user;

      // 사용자 정보 업데이트
      const userImage = document.getElementById('pawnshop-user-image');
      const userName = document.getElementById('pawnshop-user-name');
      const userAge = document.getElementById('pawnshop-user-age');
      const userRegion = document.getElementById('pawnshop-user-region');

      if (userImage) userImage.src = user.image;
      if (userName) userName.textContent = user.name;
      if (userAge) userAge.textContent = `${user.age}세`;
      if (userRegion) userRegion.textContent = user.region;

      // 모달 표시
      this.modal.style.display = 'flex';
      document.body.style.overflow = 'hidden';

      console.log(`🏦 [Pawnshop] Opened for user: ${user.name}`);
    }

    /**
     * 모달 닫기
     */
    close() {
      if (!this.modal) return;

      this.modal.style.display = 'none';
      document.body.style.overflow = '';
      this.currentUser = null;

      console.log('🏦 [Pawnshop] Modal closed');
    }

    /**
     * 정보 해금 처리
     */
    async handleUnlock(type) {
      if (!this.currentUser) return;

      // 링 가격 설정
      const prices = {
        'ideal-type': 50,
        'career-education': 30,
        'hobbies': 20,
        'photo': 100
      };

      const price = prices[type] || 0;
      const typeNames = {
        'ideal-type': '이상형 정보',
        'career-education': '직업 & 학력 정보',
        'hobbies': '취미 & 관심사',
        'photo': '추가 사진 1장'
      };

      const typeName = typeNames[type] || '정보';

      // Ring 잔액 확인 (Ring 시스템이 있을 경우)
      if (this.ringSystem) {
        const currentRings = this.ringSystem.getCurrentRings();

        if (currentRings < price) {
          this.showToast(`링이 부족합니다! (필요: ${price}💍, 보유: ${currentRings}💍)`, 'error');
          return;
        }

        // Ring 차감
        const success = await this.ringSystem.spendRings(price, `전당포 - ${typeName} 해금`);

        if (success) {
          this.showToast(`${typeName}을(를) 해금했습니다! (-${price}💍)`, 'success');
          this.showUnlockedInfo(type);
        } else {
          this.showToast('정보 해금에 실패했습니다.', 'error');
        }
      } else {
        // Ring 시스템 없을 때 Mock 처리
        console.log(`🏦 [Pawnshop] Unlocking ${typeName} (${price} rings)`);
        this.showToast(`${typeName}을(를) 해금했습니다! (개발중)`, 'info');
        this.showUnlockedInfo(type);
      }
    }

    /**
     * 해금된 정보 표시
     */
    showUnlockedInfo(type) {
      const mockInfo = {
        'ideal-type': '키 175cm 이상, 다정하고 유머러스한 성격, 운동을 즐기는 분',
        'career-education': '대학교 졸업, IT 업계 종사 (5년차 개발자)',
        'hobbies': '요가, 독서, 영화 감상, 여행, 베이킹',
        'photo': '추가 사진 1장이 해금되었습니다!'
      };

      const info = mockInfo[type] || '정보를 불러올 수 없습니다.';

      alert(`✨ 해금된 정보:\n\n${info}`);
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
