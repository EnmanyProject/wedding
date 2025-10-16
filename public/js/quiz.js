// Quiz Management for A&B Meeting App
class QuizManager {
  constructor() {
    this.currentSession = null;
    this.currentTemplate = null;
    this.currentTargetId = null;
    this.selectedOption = null;
    this.modalOpenTime = 0; // ✅ FIX: 모달 타이밍 보호
    this.init();
  }

  init() {
    this.setupQuizModal();
    this.setupQuizEvents();
  }

  setupQuizModal() {
    // Start quiz button
    const startQuizBtn = document.getElementById('start-quiz-btn');
    if (startQuizBtn) {
      startQuizBtn.addEventListener('click', () => this.startRandomQuiz());
    }

    // Quiz option selection
    const leftOption = document.getElementById('quiz-option-left');
    const rightOption = document.getElementById('quiz-option-right');

    if (leftOption) {
      leftOption.addEventListener('click', () => this.selectOption('LEFT'));
    }

    if (rightOption) {
      rightOption.addEventListener('click', () => this.selectOption('RIGHT'));
    }

    // Result modal buttons
    const continueBtn = document.getElementById('continue-quiz-btn');
    const finishBtn = document.getElementById('finish-quiz-btn');

    if (continueBtn) {
      continueBtn.addEventListener('click', () => this.continueQuiz());
    }

    if (finishBtn) {
      finishBtn.addEventListener('click', () => this.finishQuiz());
    }
  }

  setupQuizEvents() {
    // Keyboard support for quiz options
    document.addEventListener('keydown', (e) => {
      const quizModal = document.getElementById('quiz-modal');
      const resultModal = document.getElementById('result-modal');

      if (quizModal && quizModal.classList.contains('active')) {
        // ✅ FIX: ESC 키 200ms 보호
        if (e.key === 'Escape') {
          const timeSinceOpen = Date.now() - this.modalOpenTime;
          if (timeSinceOpen > 200) {
            ui.closeModal('quiz-modal');
          }
          return;
        }

        if (e.key === 'ArrowLeft' || e.key === '1') {
          this.selectOption('LEFT');
        } else if (e.key === 'ArrowRight' || e.key === '2') {
          this.selectOption('RIGHT');
        } else if (e.key === 'Enter' && this.selectedOption) {
          this.submitAnswer();
        }
      }

      // ✅ FIX: Result 모달 ESC 처리
      if (resultModal && resultModal.classList.contains('active')) {
        if (e.key === 'Escape') {
          const timeSinceOpen = Date.now() - this.modalOpenTime;
          if (timeSinceOpen > 200) {
            ui.closeModal('result-modal');
          }
        }
      }
    });

    // ✅ FIX: 백드롭 클릭 처리 (quiz-modal)
    const quizModal = document.getElementById('quiz-modal');
    if (quizModal) {
      quizModal.addEventListener('click', (e) => {
        if (e.target === quizModal) {
          e.stopPropagation(); // ✅ FIX: 이벤트 전파 방지
          const timeSinceOpen = Date.now() - this.modalOpenTime;
          if (timeSinceOpen > 200) {
            ui.closeModal('quiz-modal');
          }
        }
      });
    }

    // ✅ FIX: 백드롭 클릭 처리 (result-modal)
    const resultModal = document.getElementById('result-modal');
    if (resultModal) {
      resultModal.addEventListener('click', (e) => {
        if (e.target === resultModal) {
          e.stopPropagation(); // ✅ FIX: 이벤트 전파 방지
          const timeSinceOpen = Date.now() - this.modalOpenTime;
          if (timeSinceOpen > 200) {
            ui.closeModal('result-modal');
          }
        }
      });
    }
  }

  // ✅ FIX: Helper function to ensure HTTP URL in development
  // Resolves ERR_SSL_PROTOCOL_ERROR when browser uses HTTPS but server is HTTP-only
  normalizeImageUrl(url) {
    if (!url) return url;

    // If already a full URL, return as-is
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }

    // If relative path, convert to absolute HTTP URL in development
    // This prevents browser from using HTTPS (page protocol) for HTTP-only server
    if (window.location.protocol === 'http:') {
      // Development: Force HTTP protocol
      const port = window.location.port || '3002';
      return `http://localhost:${port}${url.startsWith('/') ? url : '/' + url}`;
    }

    // Production: Return relative URL (HTTPS handled by reverse proxy)
    return url;
  }

  // Note: startRandomQuiz is no longer used for main UI
  // User avatars in home view now handle quiz starting directly
  async startRandomQuiz() {
    ui.showToast('홈 화면에서 사용자 아바타를 선택해주세요', 'info');
  }

  // Start quiz with specific target
  async startQuizWithTarget(targetId) {
    try {
      console.log('🎯 [Quiz] startQuizWithTarget 시작:', targetId);
      this.currentTargetId = targetId;

      // Start quiz session
      console.log('🎯 [Quiz] API 호출 시작 - startQuizSession');
      const sessionData = await api.startQuizSession(targetId);
      console.log('🎯 [Quiz] 세션 데이터 수신:', sessionData);
      this.currentSession = sessionData.data.session;

      // Get quiz template
      console.log('🎯 [Quiz] 퀴즈 템플릿 로드 시작');
      await this.loadQuizTemplate();
      console.log('🎯 [Quiz] 퀴즈 템플릿 로드 완료');

      // Show quiz modal
      console.log('🎯 [Quiz] 모달 열기 시도');
      const modal = document.getElementById('quiz-modal');
      console.log('🎯 [Quiz] 모달 요소 확인:', modal);

      // ✅ FIX: 타임스탬프 먼저 기록
      this.modalOpenTime = Date.now();

      // ✅ FIX: requestAnimationFrame 사용
      requestAnimationFrame(() => {
        ui.openModal('quiz-modal');
        console.log('🎯 [Quiz] 모달 열기 완료');
      });
    } catch (error) {
      console.error('🎯 [Quiz] Error starting quiz:', error);
      if (error.message.includes('Insufficient points') || error.message.includes('포인트가 부족')) {
        ui.showToast('포인트가 부족합니다', 'error');
      } else {
        ui.showToast(error.message || '퀴즈 시작 실패', 'error');
      }
    }
  }

  // Load quiz template
  async loadQuizTemplate() {
    try {
      const templateData = await api.getQuizTemplate(null, this.currentTargetId);
      this.currentTemplate = templateData.data;

      this.renderQuizTemplate();
    } catch (error) {
      console.error('Error loading quiz template:', error);
      ui.showToast('퀴즈 템플릿 로딩 실패', 'error');
    }
  }

  // Render quiz template in modal
  renderQuizTemplate() {
    if (!this.currentTemplate) return;

    const { quiz, targetInfo, instructions } = this.currentTemplate;

    // Update question
    const questionElement = document.getElementById('quiz-question');
    if (questionElement) {
      questionElement.textContent = instructions;
    }

    // Handle both old (trait_pairs) and new (ab_quizzes) data structures
    const leftLabel = quiz.option_a_title || quiz.left_label || quiz.left;
    const rightLabel = quiz.option_b_title || quiz.right_label || quiz.right;
    const leftImage = quiz.option_a_image || quiz.left_image;
    const rightImage = quiz.option_b_image || quiz.right_image;

    // Update left option (Option A)
    const leftLabelElement = document.getElementById('quiz-left-label');
    const leftImageElement = document.getElementById('quiz-left-image');

    if (leftLabelElement) {
      leftLabelElement.textContent = leftLabel;
    }

    if (leftImageElement && leftImage) {
      leftImageElement.src = leftImage;
      leftImageElement.style.display = 'block';
    } else if (leftImageElement) {
      leftImageElement.style.display = 'none';
    }

    // Update right option (Option B)
    const rightLabelElement = document.getElementById('quiz-right-label');
    const rightImageElement = document.getElementById('quiz-right-image');

    if (rightLabelElement) {
      rightLabelElement.textContent = rightLabel;
    }

    if (rightImageElement && rightImage) {
      rightImageElement.src = rightImage;
      rightImageElement.style.display = 'block';
    } else if (rightImageElement) {
      rightImageElement.style.display = 'none';
    }

    // Update target info
    const targetInfoElement = document.getElementById('quiz-target-info');
    if (targetInfoElement && targetInfo) {
      const displayName = targetInfo.display_name || targetInfo.name;
      const avatarIcon = this.getAnimalIcon ? this.getAnimalIcon(displayName) : '👤';

      // ✅ FIX: Normalize photo URLs to prevent ERR_SSL_PROTOCOL_ERROR
      // Browser interprets relative URLs using page protocol (HTTPS), but server is HTTP-only
      const photosHTML = targetInfo.photos && Array.isArray(targetInfo.photos) && targetInfo.photos.length > 0
        ? `<div class="target-photos">
            ${targetInfo.photos.slice(0, 3).map(photo => {
              const normalizedUrl = this.normalizeImageUrl(photo.storage_key);
              return `<img src="${normalizedUrl}" alt="타겟 사진" class="target-photo">`;
            }).join('')}
          </div>`
        : '';

      targetInfoElement.innerHTML = `
        <div class="quiz-target">
          <div class="target-avatar">${avatarIcon}</div>
          <div class="target-name">${displayName}</div>
          ${photosHTML}
        </div>
      `;
    }

    // Reset selection
    this.selectedOption = null;
    this.updateOptionSelection();
  }

  // Select quiz option
  selectOption(option) {
    this.selectedOption = option;
    this.updateOptionSelection();

    // Auto-submit after short delay for better UX
    setTimeout(() => {
      if (this.selectedOption === option) {
        this.submitAnswer();
      }
    }, 800);
  }

  // Update visual selection state
  updateOptionSelection() {
    const leftOption = document.getElementById('quiz-option-left');
    const rightOption = document.getElementById('quiz-option-right');

    if (leftOption) {
      leftOption.classList.toggle('selected', this.selectedOption === 'LEFT');
    }

    if (rightOption) {
      rightOption.classList.toggle('selected', this.selectedOption === 'RIGHT');
    }
  }

  // Submit quiz answer
  async submitAnswer() {
    if (!this.selectedOption || !this.currentSession || !this.currentTemplate) {
      return;
    }

    // Check if this is an admin quiz
    if (this.currentSession.type === 'admin_quiz') {
      this.submitAdminQuizAnswer();
      return;
    }

    try {
      // Handle both old (pair_id) and new (quiz_id) data structures
      const quizId = this.currentTemplate.quiz.id || this.currentTemplate.quiz.pair_id;

      const answerData = await api.submitQuizAnswer(
        this.currentSession.id,
        quizId,
        this.selectedOption
      );

      // Close quiz modal
      ui.closeModal('quiz-modal');

      // Show result
      this.showQuizResult(answerData.data);

    } catch (error) {
      console.error('Error submitting answer:', error);
      ui.showToast(error.message || '답변 제출 실패', 'error');
    }
  }

  // Show quiz result
  showQuizResult(result) {
    const {
      correct,
      target_choice,
      delta_affinity,
      delta_points,
      affinity_score,
      stages_unlocked
    } = result;

    // Update result modal content
    const resultIcon = document.getElementById('result-icon');
    const resultMessage = document.getElementById('result-message');
    const resultTitle = document.getElementById('result-title');

    if (correct) {
      // 베티 신난 표정으로 점프 애니메이션
      if (window.betyManager && window.betyManager.showExpression) {
        window.betyManager.showExpression('excited', 3000);
      }

      resultIcon.innerHTML = '<img src="/images/Bety2.png" class="bety-jump" style="width: 100px; height: 100px;" alt="신난 베티">';
      resultMessage.textContent = '정답입니다!';
      resultTitle.textContent = '정답! 🎉';
    } else {
      resultIcon.textContent = '😔';
      const quiz = this.currentTemplate.quiz;
      const correctAnswer = target_choice === 'LEFT'
        ? (quiz.option_a_title || quiz.left_label || quiz.left)
        : (quiz.option_b_title || quiz.right_label || quiz.right);
      resultMessage.textContent = `아쉽게도 틀렸습니다. 정답은 "${correctAnswer}"입니다.`;
      resultTitle.textContent = '오답 😔';
    }

    // Update stats
    const affinityChange = document.getElementById('affinity-change');
    const currentAffinity = document.getElementById('current-affinity');

    if (affinityChange) {
      affinityChange.textContent = delta_affinity >= 0 ? `+${delta_affinity}` : `${delta_affinity}`;
      affinityChange.style.color = delta_affinity >= 0 ? 'var(--success-color)' : 'var(--error-color)';
    }

    if (currentAffinity) {
      currentAffinity.textContent = affinity_score;
    }

    // Show unlock message if any stages were unlocked
    const unlockMessage = document.getElementById('unlock-message');
    if (unlockMessage) {
      if (stages_unlocked && stages_unlocked.length > 0) {
        unlockMessage.style.display = 'block';
        unlockMessage.querySelector('.unlock-text').textContent =
          `🎊 새로운 사진이 해금되었습니다! (Stage ${stages_unlocked.join(', ')})`;
      } else {
        unlockMessage.style.display = 'none';
      }
    }

    // Show result modal
    // ✅ FIX: 타임스탬프 먼저 기록
    this.modalOpenTime = Date.now();

    // ✅ FIX: requestAnimationFrame 사용
    requestAnimationFrame(() => {
      ui.openModal('result-modal');
    });
  }

  // Continue quiz with same target
  async continueQuiz() {
    ui.closeModal('result-modal');

    try {
      // Load new quiz template
      await this.loadQuizTemplate();

      // Show quiz modal again
      // ✅ FIX: 타임스탬프 먼저 기록
      this.modalOpenTime = Date.now();

      // ✅ FIX: requestAnimationFrame 사용
      requestAnimationFrame(() => {
        ui.openModal('quiz-modal');
      });
    } catch (error) {
      console.error('Error continuing quiz:', error);
      ui.showToast('퀴즈 계속하기 실패', 'error');
    }
  }

  // Finish quiz session
  async finishQuiz() {
    ui.closeModal('result-modal');

    try {
      if (this.currentSession) {
        await api.endQuizSession(this.currentSession.id);
      }

      // Reset state
      this.currentSession = null;
      this.currentTemplate = null;
      this.currentTargetId = null;
      this.selectedOption = null;

      // 성능 최적화: 캐시가 무효화되었으므로 즉시 새로고침하지 않음
      // 사용자가 홈으로 돌아갈 때 자동으로 새 데이터가 로드됨
      console.log('✅ [Quiz] Answer submitted - ranking cache invalidated, will refresh on next home view');

      // 사용자에게 업데이트된 랭킹을 보고 싶다면 홈으로 이동하라는 힌트 제공
      if (ui.currentView !== 'home') {
        ui.showToast('퀴즈 완료! 홈에서 업데이트된 랭킹을 확인하세요 🏆', 'success');
      }

      ui.showToast('퀴즈가 완료되었습니다!', 'success');
    } catch (error) {
      console.error('Error finishing quiz:', error);
    }
  }

  // Get quiz history
  async getQuizHistory(page = 1) {
    try {
      const historyData = await api.getQuizSessions(page, 10);
      return historyData.data;
    } catch (error) {
      console.error('Error getting quiz history:', error);
      throw error;
    }
  }

  // Calculate quiz statistics
  calculateStats(sessions) {
    if (!sessions || sessions.length === 0) {
      return {
        totalQuizzes: 0,
        totalQuestions: 0,
        correctAnswers: 0,
        accuracy: 0,
        averageScore: 0
      };
    }

    const totalQuizzes = sessions.length;
    const totalQuestions = sessions.reduce((sum, session) => sum + session.question_count, 0);
    const correctAnswers = sessions.reduce((sum, session) => sum + session.correct_count, 0);
    const accuracy = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0;

    return {
      totalQuizzes,
      totalQuestions,
      correctAnswers,
      accuracy: Math.round(accuracy),
      averageScore: Math.round(accuracy)
    };
  }

  // Reset quiz state (utility)
  resetState() {
    this.currentSession = null;
    this.currentTemplate = null;
    this.currentTargetId = null;
    this.selectedOption = null;

    // Close any open modals
    ui.closeModal('quiz-modal');
    ui.closeModal('result-modal');
  }

  // 동물 이름에 따른 이모지 아이콘 반환
  getAnimalIcon(displayName) {
    const animalIcons = {
      '코알라': '🐨',
      '팬더': '🐼',
      '햄스터': '🐹',
      '토끼': '🐰',
      '사자': '🦁',
      '여우': '🦊',
      '고양이': '🐱',
      '백조': '🦢',
      '다람쥐': '🐿️',
      '곰': '🐻',
      '펭귄': '🐧',
      '양': '🐑',
      '독수리': '🦅',
      '물개': '🦭',
      '늑대': '🐺',
      '별': '⭐',
      '돌고래': '🐬',
      '사슴': '🦌',
      '나비': '🦋',
      '벌': '🐝',
      '강아지': '🐶'
    };

    // 가상 아이디에서 동물 이름 추출하여 아이콘 반환
    for (const [animal, icon] of Object.entries(animalIcons)) {
      if (displayName.includes(animal)) {
        return icon;
      }
    }

    // 기본 아이콘
    return '👤';
  }

  // Admin Quiz Functions
  async startAdminQuiz() {
    try {
      console.log('🎯 [AdminQuiz] 어드민 퀴즈 시작');

      // Get random admin quiz
      const quizData = await api.getRandomAdminQuiz();
      console.log('🎯 [AdminQuiz] 랜덤 퀴즈 데이터:', quizData);

      if (!quizData.success || !quizData.data) {
        ui.showToast('어드민 퀴즈를 불러올 수 없습니다', 'error');
        return;
      }

      // Load admin quiz template
      this.loadAdminQuizTemplate(quizData.data);

      // Show quiz modal
      // ✅ FIX: 타임스탬프 먼저 기록
      this.modalOpenTime = Date.now();

      // ✅ FIX: requestAnimationFrame 사용
      requestAnimationFrame(() => {
        ui.openModal('quiz-modal');
        console.log('🎯 [AdminQuiz] 어드민 퀴즈 모달 열기 완료');
      });

      ui.showToast('🎭 베티의 특별 퀴즈가 시작됩니다!', 'info');
    } catch (error) {
      console.error('🎯 [AdminQuiz] Error starting admin quiz:', error);
      ui.showToast('어드민 퀴즈 시작 실패', 'error');
    }
  }

  loadAdminQuizTemplate(quiz) {
    console.log('🎯 [AdminQuiz] 템플릿 로드:', quiz);

    // Mock template structure for admin quiz
    this.currentTemplate = {
      quiz: {
        id: quiz.id,
        title: quiz.title,
        description: quiz.description,
        option_a_title: quiz.option_a_title,
        option_a_description: quiz.option_a_description,
        option_b_title: quiz.option_b_title,
        option_b_description: quiz.option_b_description,
        category: quiz.category
      }
    };

    // Set mock session for admin quiz
    this.currentSession = {
      id: 'admin-quiz-session',
      type: 'admin_quiz'
    };
    this.currentTargetId = null; // No target for admin quiz
    this.selectedOption = null;

    // Update UI elements
    this.updateQuizUI();
  }

  updateQuizUI() {
    const quiz = this.currentTemplate.quiz;

    // Update quiz content
    const quizTitle = document.getElementById('quiz-title');
    const quizDescription = document.getElementById('quiz-description');
    const leftOption = document.getElementById('quiz-option-left');
    const rightOption = document.getElementById('quiz-option-right');

    if (quizTitle) {
      quizTitle.textContent = quiz.title || '베티의 특별 퀴즈';
    }

    if (quizDescription) {
      quizDescription.textContent = quiz.description || '당신의 선택은?';
    }

    if (leftOption) {
      const leftTitle = leftOption.querySelector('.option-title');
      const leftDesc = leftOption.querySelector('.option-description');

      if (leftTitle) leftTitle.textContent = quiz.option_a_title || 'Option A';
      if (leftDesc) leftDesc.textContent = quiz.option_a_description || '';
    }

    if (rightOption) {
      const rightTitle = rightOption.querySelector('.option-title');
      const rightDesc = rightOption.querySelector('.option-description');

      if (rightTitle) rightTitle.textContent = quiz.option_b_title || 'Option B';
      if (rightDesc) rightDesc.textContent = quiz.option_b_description || '';
    }

    console.log('🎯 [AdminQuiz] UI 업데이트 완료');
  }

  // Override submitAnswer for admin quiz
  async submitAdminQuizAnswer() {
    if (!this.selectedOption || !this.currentTemplate) {
      return;
    }

    try {
      console.log('🎯 [AdminQuiz] 답변 제출:', this.selectedOption);

      // Close quiz modal
      ui.closeModal('quiz-modal');

      // Show admin quiz result
      this.showAdminQuizResult();

    } catch (error) {
      console.error('🎯 [AdminQuiz] Error submitting admin quiz answer:', error);
      ui.showToast('답변 제출 실패', 'error');
    }
  }

  showAdminQuizResult() {
    const quiz = this.currentTemplate.quiz;
    const selectedOption = this.selectedOption;

    // Update result modal content for admin quiz
    const resultIcon = document.getElementById('result-icon');
    const resultMessage = document.getElementById('result-message');
    const resultTitle = document.getElementById('result-title');

    if (resultIcon) resultIcon.textContent = '🎭';
    if (resultTitle) resultTitle.textContent = '베티의 퀴즈 완료! 🎭';

    const selectedAnswer = selectedOption === 'LEFT' ? quiz.option_a_title : quiz.option_b_title;
    if (resultMessage) {
      resultMessage.textContent = `당신의 선택: "${selectedAnswer}"\n베티가 당신의 취향을 기록했습니다! 📝`;
    }

    // Hide affinity-related elements for admin quiz
    const affinityChange = document.getElementById('affinity-change');
    const currentAffinity = document.getElementById('current-affinity');
    const unlockMessage = document.getElementById('unlock-message');

    if (affinityChange) affinityChange.style.display = 'none';
    if (currentAffinity) currentAffinity.style.display = 'none';
    if (unlockMessage) unlockMessage.style.display = 'none';

    // Show result modal
    // ✅ FIX: 타임스탬프 먼저 기록
    this.modalOpenTime = Date.now();

    // ✅ FIX: requestAnimationFrame 사용
    requestAnimationFrame(() => {
      ui.openModal('result-modal');
      console.log('🎯 [AdminQuiz] 결과 표시 완료');
    });
  }
}

// Create global quiz instance
window.quiz = new QuizManager();
