/**
 * Battle Royale 선호도 맞추기 시스템
 * 100명과 동시에 선보기 기능
 *
 * Phase 1: 기본 모달 표시 및 이벤트 연결
 */

class BattleRoyaleManager {
  constructor() {
    this.state = {
      currentRound: 0,
      totalRounds: 5,
      participants: [],
      survivors: [],
      sessionId: null,
      userAnswers: []
    };

    this.entryModal = null;
    this.gameModal = null;
    this.modalOpenTime = 0;

    this.init();
  }

  /**
   * 초기화
   */
  init() {
    console.log('🎮 [BattleRoyale] Initializing...');

    // DOM 요소 가져오기
    this.entryModal = document.getElementById('battle-royale-entry-modal');
    this.gameModal = document.getElementById('battle-royale-game-modal');

    if (!this.entryModal || !this.gameModal) {
      console.error('❌ [BattleRoyale] Modal elements not found');
      return;
    }

    // 이벤트 리스너 설정
    this.setupEventListeners();

    console.log('✅ [BattleRoyale] Initialized');
  }

  /**
   * 이벤트 리스너 설정
   */
  setupEventListeners() {
    // 1. 메인 버튼 클릭 → Entry Modal 표시
    const triggerBtn = document.getElementById('battle-royale-trigger');
    if (triggerBtn) {
      triggerBtn.addEventListener('click', () => {
        console.log('🎮 [BattleRoyale] Trigger button clicked');
        this.showEntryModal();
      });
    }

    // 2. Entry Modal 닫기 버튼
    const entryCloseBtn = this.entryModal.querySelector('.battle-modal-close');
    if (entryCloseBtn) {
      entryCloseBtn.addEventListener('click', () => {
        this.closeEntryModal();
      });
    }

    // 3. Entry Modal 오버레이 클릭 → 닫기 (200ms 보호)
    const entryOverlay = this.entryModal.querySelector('.battle-modal-overlay');
    if (entryOverlay) {
      entryOverlay.addEventListener('click', (e) => {
        const timeSinceOpen = Date.now() - this.modalOpenTime;
        if (timeSinceOpen > 200) {
          this.closeEntryModal();
        }
      });
    }

    // 4. 입장 버튼 클릭 → 게임 시작
    const entryBtn = document.getElementById('battle-entry-btn');
    if (entryBtn) {
      entryBtn.addEventListener('click', () => {
        console.log('🚀 [BattleRoyale] Entry button clicked');
        this.startGame();
      });
    }

    // 5. ESC 키로 모달 닫기
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const timeSinceOpen = Date.now() - this.modalOpenTime;
        if (timeSinceOpen > 200) {
          if (this.entryModal.classList.contains('active')) {
            this.closeEntryModal();
          } else if (this.gameModal.classList.contains('active')) {
            this.closeGameModal();
          }
        }
      }
    });
  }

  /**
   * Entry Modal 표시
   */
  showEntryModal() {
    console.log('🎮 [BattleRoyale] Opening entry modal...');

    this.modalOpenTime = Date.now();

    requestAnimationFrame(() => {
      this.entryModal.style.display = 'flex';
      requestAnimationFrame(() => {
        this.entryModal.classList.add('active');
        this.entryModal.setAttribute('aria-hidden', 'false');
      });
    });

    console.log('✅ [BattleRoyale] Entry modal opened');
  }

  /**
   * Entry Modal 닫기
   */
  closeEntryModal() {
    console.log('🎮 [BattleRoyale] Closing entry modal...');

    this.entryModal.classList.remove('active');
    this.entryModal.setAttribute('aria-hidden', 'true');

    setTimeout(() => {
      this.entryModal.style.display = 'none';
    }, 300); // CSS transition 시간

    console.log('✅ [BattleRoyale] Entry modal closed');
  }

  /**
   * Game Modal 표시
   */
  showGameModal() {
    console.log('🎮 [BattleRoyale] Opening game modal...');

    this.modalOpenTime = Date.now();

    requestAnimationFrame(() => {
      this.gameModal.style.display = 'flex';
      requestAnimationFrame(() => {
        this.gameModal.classList.add('active');
        this.gameModal.setAttribute('aria-hidden', 'false');
      });
    });

    console.log('✅ [BattleRoyale] Game modal opened');
  }

  /**
   * Game Modal 닫기
   */
  closeGameModal() {
    console.log('🎮 [BattleRoyale] Closing game modal...');

    this.gameModal.classList.remove('active');
    this.gameModal.setAttribute('aria-hidden', 'true');

    setTimeout(() => {
      this.gameModal.style.display = 'none';
    }, 300); // CSS transition 시간

    console.log('✅ [BattleRoyale] Game modal closed');
  }

  /**
   * 게임 시작
   */
  async startGame() {
    console.log('🚀 [BattleRoyale] Starting game...');

    // 1. Entry Modal 닫기
    this.closeEntryModal();

    // 2. 잠시 대기 (애니메이션 완료)
    await this.sleep(400);

    // 3. API 호출: 세션 시작 및 100명 데이터 가져오기
    try {
      console.log('📡 [BattleRoyale] Starting session...');

      // TODO: API 호출 (Phase 2에서 구현)
      // const response = await window.api.battleRoyale.startSession();

      // 임시 테스트 데이터
      this.state.participants = Array.from({ length: 100 }, (_, i) => ({
        id: `user-${i + 1}`,
        displayName: `유저${i + 1}`,
        profileImage: '/images/Bety1.png'
      }));

      this.state.survivors = [...this.state.participants];
      this.state.currentRound = 1;

      console.log('✅ [BattleRoyale] Session started');
      console.log(`👥 [BattleRoyale] ${this.state.participants.length}명 로드됨`);

      // 4. Waiting Room 렌더링
      this.renderWaitingRoom();

      // 5. Game Modal 표시
      this.showGameModal();

      // 6. 카운트다운 시작 (3초 후)
      await this.sleep(1000);
      await this.startCountdown();

      // 7. 첫 라운드 시작
      await this.playRound(1);

    } catch (error) {
      console.error('❌ [BattleRoyale] 게임 시작 실패:', error);

      // 에러 토스트 표시
      if (window.showToast) {
        window.showToast('게임 시작에 실패했습니다', 'error');
      }
    }
  }

  /**
   * Waiting Room 렌더링
   */
  renderWaitingRoom() {
    console.log('🎮 [BattleRoyale] Rendering waiting room...');

    const content = document.getElementById('battle-game-content');
    if (!content) return;

    // Waiting Room HTML
    content.innerHTML = `
      <div class="battle-waiting-room">
        <!-- Countdown Overlay -->
        <div class="countdown-overlay" id="countdown-overlay">
          <div class="countdown-number" id="countdown-number">3</div>
        </div>

        <!-- Partners Grid (100개) -->
        <div class="partners-grid" id="partners-grid">
          ${this.state.participants.map((partner, index) => `
            <div class="partner-circle" data-partner-id="${partner.id}">
              <img src="${partner.profileImage}" alt="${partner.displayName}">
            </div>
          `).join('')}
        </div>
      </div>
    `;

    console.log('✅ [BattleRoyale] Waiting room rendered');
  }

  /**
   * 카운트다운 시작
   */
  async startCountdown() {
    console.log('⏱️ [BattleRoyale] Starting countdown...');

    const overlay = document.getElementById('countdown-overlay');
    const numberEl = document.getElementById('countdown-number');

    if (!overlay || !numberEl) return;

    for (let i = 3; i >= 1; i--) {
      numberEl.textContent = i;
      numberEl.classList.add('countdown-bounce');
      await this.sleep(1000);
      numberEl.classList.remove('countdown-bounce');
    }

    // 카운트다운 오버레이 숨기기
    overlay.classList.add('hidden');

    console.log('✅ [BattleRoyale] Countdown finished');
  }

  /**
   * 라운드 진행
   */
  async playRound(roundNumber) {
    console.log(`🎮 [BattleRoyale] Playing round ${roundNumber}...`);

    // TODO: Phase 2에서 구현
    // 1. 퀴즈 로드
    // 2. 퀴즈 모달 표시
    // 3. 사용자 답변 대기
    // 4. 답변 제출
    // 5. 탈락 애니메이션
    // 6. 다음 라운드 또는 결과 표시

    // 임시 테스트: 2초 후 결과 표시
    await this.sleep(2000);

    alert(`🎉 Phase 1 테스트 완료!\n\n100명이 로드되었습니다.\n다음 Phase에서 실제 게임 로직을 구현합니다.`);

    this.closeGameModal();
  }

  /**
   * Sleep 헬퍼
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// 전역 초기화
document.addEventListener('DOMContentLoaded', () => {
  window.battleRoyaleManager = new BattleRoyaleManager();
});
