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

      // API 호출
      const response = await window.api.startBattleRoyale();

      if (!response.success) {
        throw new Error(response.error || '세션 시작 실패');
      }

      // 세션 및 참가자 데이터 저장
      this.state.sessionId = response.data.session.id;
      this.state.totalRounds = response.data.session.total_rounds;
      this.state.participants = response.data.participants.map(p => ({
        id: p.user_id,
        displayName: p.display_name,
        profileImage: p.profile_image || '/images/Bety1.png',
        answer: p.answer
      }));

      this.state.survivors = [...this.state.participants];
      this.state.currentRound = 1;

      console.log('✅ [BattleRoyale] Session started');
      console.log(`🎮 [BattleRoyale] Session ID: ${this.state.sessionId}`);
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
        window.showToast(error.message || '게임 시작에 실패했습니다', 'error');
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

    try {
      // 1. API에서 라운드 데이터 로드
      console.log(`📡 [BattleRoyale] Loading round ${roundNumber} data...`);
      const response = await window.api.getBattleRoyaleRound(this.state.sessionId, roundNumber);

      if (!response.success) {
        throw new Error(response.error || '라운드 데이터 로드 실패');
      }

      const { question, survivors } = response.data;

      console.log(`✅ [BattleRoyale] Round ${roundNumber} loaded:`, {
        question: question.question,
        survivors: survivors.length
      });

      // 2. 생존자 업데이트 (라운드 2부터는 이전 라운드 생존자)
      if (roundNumber > 1) {
        this.state.survivors = survivors.map(s => ({
          id: s.user_id,
          displayName: s.display_name,
          profileImage: s.profile_image || '/images/Bety1.png',
          answer: s.answer
        }));

        // Waiting Room 업데이트 (탈락자 제거)
        this.updateWaitingRoom();
      }

      // 3. 퀴즈 UI 렌더링
      this.renderQuizUI(roundNumber, question);

      // 4. 사용자 답변 대기 (Promise로 처리)
      const userAnswer = await this.waitForUserAnswer();

      console.log(`👤 [BattleRoyale] User answered: ${userAnswer}`);

      // 5. 답변 제출 API 호출
      console.log(`📡 [BattleRoyale] Submitting answer...`);
      const submitResponse = await window.api.submitBattleRoyaleAnswer(
        this.state.sessionId,
        roundNumber,
        userAnswer
      );

      if (!submitResponse.success) {
        throw new Error(submitResponse.error || '답변 제출 실패');
      }

      const result = submitResponse.data;

      console.log(`✅ [BattleRoyale] Answer submitted:`, {
        survivors_before: result.survivors_before,
        survivors_after: result.survivors_after,
        eliminated: result.eliminated_count
      });

      // 사용자 답변 기록
      this.state.userAnswers.push({
        round: roundNumber,
        question: question.question,
        answer: userAnswer
      });

      // 6. 라운드 결과 화면 표시 (NEW! - 감정적 임팩트)
      await this.showRoundResults(result, roundNumber, question);

      // 7. 탈락 애니메이션
      await this.playEliminationAnimation(result.eliminated_ids);

      // 8. 다음 라운드 또는 결과 표시
      if (roundNumber < this.state.totalRounds) {
        // 다음 라운드로
        await this.sleep(1000);
        await this.playRound(roundNumber + 1);
      } else {
        // 최종 결과 표시
        await this.showFinalResults();
      }

    } catch (error) {
      console.error(`❌ [BattleRoyale] Round ${roundNumber} 실패:`, error);

      if (window.showToast) {
        window.showToast(error.message || '라운드 진행 실패', 'error');
      }

      this.closeGameModal();
    }
  }

  /**
   * Waiting Room 업데이트 (탈락자 제거)
   */
  updateWaitingRoom() {
    const grid = document.getElementById('partners-grid');
    if (!grid) return;

    const survivorIds = new Set(this.state.survivors.map(s => s.id));

    // 탈락자 원 제거
    const circles = grid.querySelectorAll('.partner-circle');
    circles.forEach(circle => {
      const partnerId = circle.dataset.partnerId;
      if (!survivorIds.has(partnerId)) {
        circle.remove();
      }
    });

    console.log(`🔄 [BattleRoyale] Waiting room updated: ${this.state.survivors.length} survivors`);
  }

  /**
   * 퀴즈 UI 렌더링 (100명 그리드 위에 오버레이)
   */
  renderQuizUI(roundNumber, question) {
    console.log(`🎨 [BattleRoyale] Rendering quiz UI for round ${roundNumber}...`);

    const content = document.getElementById('battle-game-content');
    if (!content) return;

    // 100명 그리드는 유지하고, 퀴즈는 오버레이로 표시
    const existingGrid = content.querySelector('.partners-grid');

    if (!existingGrid) {
      // 그리드가 없으면 생성
      this.renderWaitingRoom();
    }

    // 퀴즈 오버레이 추가
    const existingOverlay = content.querySelector('.quiz-overlay');
    if (existingOverlay) {
      existingOverlay.remove();
    }

    const quizOverlay = document.createElement('div');
    quizOverlay.className = 'quiz-overlay';
    quizOverlay.innerHTML = `
      <div class="battle-quiz-container">
        <div class="quiz-header">
          <h2>Round ${roundNumber} / ${this.state.totalRounds}</h2>
          <p class="quiz-category">${question.category}</p>
        </div>

        <div class="quiz-question">
          <p>${question.question}</p>
        </div>

        <div class="quiz-options">
          <button class="quiz-option-btn" data-answer="LEFT">
            <span class="option-label">LEFT</span>
            <span class="option-text">${question.option_left}</span>
          </button>
          <button class="quiz-option-btn" data-answer="RIGHT">
            <span class="option-label">RIGHT</span>
            <span class="option-text">${question.option_right}</span>
          </button>
        </div>

        <div class="quiz-survivors-count">
          <p>현재 생존자: <strong>${this.state.survivors.length}</strong>명</p>
        </div>
      </div>
    `;

    content.appendChild(quizOverlay);

    console.log(`✅ [BattleRoyale] Quiz UI rendered`);
  }

  /**
   * 사용자 답변 대기
   */
  waitForUserAnswer() {
    return new Promise((resolve) => {
      const buttons = document.querySelectorAll('.quiz-option-btn');

      const handleClick = (e) => {
        const answer = e.currentTarget.dataset.answer;

        // 버튼 비활성화
        buttons.forEach(btn => {
          btn.disabled = true;
          btn.classList.remove('selected');
        });

        // 선택된 버튼 강조
        e.currentTarget.classList.add('selected');

        // 이벤트 리스너 제거
        buttons.forEach(btn => btn.removeEventListener('click', handleClick));

        resolve(answer);
      };

      buttons.forEach(btn => {
        btn.addEventListener('click', handleClick);
      });
    });
  }

  /**
   * 라운드 결과 화면 표시 (100명 그리드 + 탈락 시각화)
   */
  async showRoundResults(result, roundNumber, question) {
    console.log(`📊 [BattleRoyale] Showing round ${roundNumber} results...`);

    const content = document.getElementById('battle-game-content');
    if (!content) return;

    // 퀴즈 오버레이 제거
    const quizOverlay = content.querySelector('.quiz-overlay');
    if (quizOverlay) {
      quizOverlay.remove();
    }

    // 감정적 메시지 생성
    const eliminationPercentage = Math.round((result.eliminated_count / result.survivors_before) * 100);
    let emotionalMessage = '';

    if (eliminationPercentage >= 80) {
      emotionalMessage = '대부분이 탈락했습니다... 😱';
    } else if (eliminationPercentage >= 50) {
      emotionalMessage = '절반 이상이 사라졌습니다... 😢';
    } else if (eliminationPercentage >= 30) {
      emotionalMessage = '많은 사람들이 떠났습니다... 😔';
    } else if (eliminationPercentage > 0) {
      emotionalMessage = '일부가 탈락했습니다';
    } else {
      emotionalMessage = '모두 같은 선택을 했습니다! 🎉';
    }

    // 결과 오버레이 추가 (100명 그리드 위에 표시)
    const resultsOverlay = document.createElement('div');
    resultsOverlay.className = 'round-results-info-overlay';
    resultsOverlay.innerHTML = `
      <div class="round-results-info">
        <h2>Round ${roundNumber} 결과</h2>
        <p class="round-question">"${question.question}"</p>
        <p class="user-choice">당신의 선택: <strong>${result.user_answer === 'LEFT' ? question.option_left : question.option_right}</strong></p>

        <div class="elimination-summary">
          <div class="elimination-count">
            <span class="eliminated-icon">💔</span>
            <span class="eliminated-number">${result.eliminated_count}명 탈락</span>
          </div>
          <p class="emotional-message">${emotionalMessage}</p>
        </div>

        <div class="continue-hint">
          <p>탈락자들이 사라지는 것을 지켜보세요...</p>
        </div>
      </div>
    `;

    content.appendChild(resultsOverlay);

    console.log(`✅ [BattleRoyale] Round results overlay shown`);

    // 1.5초 대기 (사용자가 메시지 읽을 시간)
    await this.sleep(1500);

    // 결과 오버레이 제거
    resultsOverlay.remove();

    console.log(`👉 [BattleRoyale] Proceeding to elimination animation`);
  }

  /**
   * 탈락 애니메이션 (빨갛게 변하면서 사라짐)
   */
  async playEliminationAnimation(eliminatedIds) {
    console.log(`💥 [BattleRoyale] Playing elimination animation for ${eliminatedIds.length} participants...`);

    const grid = document.getElementById('partners-grid');
    if (!grid) return;

    // Phase 1: 탈락자들을 빨간색으로 변경 (0.5초에 걸쳐 하나씩)
    for (let i = 0; i < eliminatedIds.length; i++) {
      const id = eliminatedIds[i];
      const circle = grid.querySelector(`[data-partner-id="${id}"]`);
      if (circle) {
        circle.classList.add('eliminating');
      }

      // 빠르게 연속으로 빨갛게 변함
      if (i % 10 === 0) {
        await this.sleep(50);
      }
    }

    // Phase 2: 모든 탈락자가 빨갛게 변한 후 1초 대기
    await this.sleep(1000);

    // Phase 3: 탈락자들이 사라짐 (동시에)
    eliminatedIds.forEach(id => {
      const circle = grid.querySelector(`[data-partner-id="${id}"]`);
      if (circle) {
        circle.classList.add('eliminated');
      }
    });

    // 애니메이션 완료 대기
    await this.sleep(1500);

    // 탈락자 원 제거
    eliminatedIds.forEach(id => {
      const circle = grid.querySelector(`[data-partner-id="${id}"]`);
      if (circle) {
        circle.remove();
      }
    });

    console.log(`✅ [BattleRoyale] Elimination animation complete`);
  }

  /**
   * 최종 결과 표시
   */
  async showFinalResults() {
    console.log('🎉 [BattleRoyale] Showing final results...');

    try {
      // API에서 최종 결과 로드
      const response = await window.api.getBattleRoyaleResult(this.state.sessionId);

      if (!response.success) {
        throw new Error(response.error || '최종 결과 로드 실패');
      }

      const result = response.data;

      console.log(`✅ [BattleRoyale] Final results loaded:`, {
        initial: result.initial_count,
        final: result.final_survivor_count
      });

      // 최종 결과 UI 렌더링
      this.renderFinalResultsUI(result);

    } catch (error) {
      console.error('❌ [BattleRoyale] 최종 결과 표시 실패:', error);

      if (window.showToast) {
        window.showToast(error.message || '최종 결과 표시 실패', 'error');
      }
    }
  }

  /**
   * 최종 결과 UI 렌더링
   */
  renderFinalResultsUI(result) {
    console.log('🎨 [BattleRoyale] Rendering final results UI...');

    const content = document.getElementById('battle-game-content');
    if (!content) return;

    content.innerHTML = `
      <div class="battle-results-container">
        <div class="results-header">
          <h2>🎉 Battle Royale 완료!</h2>
        </div>

        <div class="results-stats">
          <div class="stat-item">
            <span class="stat-label">시작</span>
            <span class="stat-value">${result.initial_count}명</span>
          </div>
          <div class="stat-arrow">→</div>
          <div class="stat-item">
            <span class="stat-label">최종 생존</span>
            <span class="stat-value highlight">${result.final_survivor_count}명</span>
          </div>
        </div>

        <div class="results-survivors">
          <h3>최종 생존자 (${result.survivors.length}명)</h3>
          <div class="survivors-grid">
            ${result.survivors.map(s => `
              <div class="survivor-card">
                <img src="${s.profile_image}" alt="${s.display_name}">
                <p>${s.display_name}</p>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="results-actions">
          <button class="btn-primary" id="add-to-recommendations-btn">
            추천 목록에 추가하기
          </button>
          <button class="btn-secondary" id="close-results-btn">
            닫기
          </button>
        </div>
      </div>
    `;

    // 이벤트 리스너 추가
    const addBtn = document.getElementById('add-to-recommendations-btn');
    const closeBtn = document.getElementById('close-results-btn');

    if (addBtn) {
      addBtn.addEventListener('click', () => this.addSurvivorsToRecommendations());
    }

    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.closeGameModal());
    }

    console.log('✅ [BattleRoyale] Final results UI rendered');
  }

  /**
   * 생존자를 추천 목록에 추가
   */
  async addSurvivorsToRecommendations() {
    console.log('📝 [BattleRoyale] Adding survivors to recommendations...');

    try {
      const response = await window.api.addBattleRoyaleSurvivorsToRecommendations(this.state.sessionId);

      if (!response.success) {
        throw new Error(response.error || '추천 목록 추가 실패');
      }

      console.log(`✅ [BattleRoyale] Added ${response.data.added_count} survivors to recommendations`);

      if (window.showToast) {
        window.showToast(`${response.data.added_count}명을 추천 목록에 추가했습니다`, 'success');
      }

      // 모달 닫기
      setTimeout(() => {
        this.closeGameModal();
      }, 1500);

    } catch (error) {
      console.error('❌ [BattleRoyale] 추천 목록 추가 실패:', error);

      if (window.showToast) {
        window.showToast(error.message || '추천 목록 추가 실패', 'error');
      }
    }
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
