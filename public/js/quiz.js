// Quiz Management for A&B Meeting App
class QuizManager {
  constructor() {
    this.currentSession = null;
    this.currentTemplate = null;
    this.currentTargetId = null;
    this.selectedOption = null;
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
      if (document.getElementById('quiz-modal').classList.contains('active')) {
        if (e.key === 'ArrowLeft' || e.key === '1') {
          this.selectOption('LEFT');
        } else if (e.key === 'ArrowRight' || e.key === '2') {
          this.selectOption('RIGHT');
        } else if (e.key === 'Enter' && this.selectedOption) {
          this.submitAnswer();
        }
      }
    });
  }

  // Start quiz with random target
  async startRandomQuiz() {
    try {
      // Get available targets from rankings
      const rankingsData = await api.getMyRanking();
      const availableTargets = rankingsData.data.rankings.filter(r =>
        r.affinityScore < 60 // Can still quiz if not maxed out
      );

      if (availableTargets.length === 0) {
        ui.showToast('퀴즈할 수 있는 상대가 없습니다', 'warning');
        return;
      }

      // Select random target
      const randomTarget = availableTargets[Math.floor(Math.random() * availableTargets.length)];
      await this.startQuizWithTarget(randomTarget.targetId);
    } catch (error) {
      console.error('Error starting random quiz:', error);
      ui.showToast('퀴즈 시작 실패', 'error');
    }
  }

  // Start quiz with specific target
  async startQuizWithTarget(targetId) {
    try {
      this.currentTargetId = targetId;

      // Start quiz session
      const sessionData = await api.startQuizSession(targetId);
      this.currentSession = sessionData.data.session;

      // Update points display
      ui.updatePointsDisplay(sessionData.data.points_remaining);

      // Get quiz template
      await this.loadQuizTemplate();

      // Show quiz modal
      ui.openModal('quiz-modal');

      ui.showToast('퀴즈가 시작되었습니다! (1P 차감)', 'info');
    } catch (error) {
      console.error('Error starting quiz:', error);
      if (error.message.includes('Insufficient points')) {
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

    const { pair, visual, targetInfo, instructions } = this.currentTemplate;

    // Update question
    const questionElement = document.getElementById('quiz-question');
    if (questionElement) {
      questionElement.textContent = instructions;
    }

    // Update left option
    const leftLabelElement = document.getElementById('quiz-left-label');
    const leftImageElement = document.getElementById('quiz-left-image');

    if (leftLabelElement) {
      leftLabelElement.textContent = pair.left_label;
    }

    if (leftImageElement && visual?.left_asset_id) {
      leftImageElement.src = `/assets/traits/${visual.left_asset_id}`;
      leftImageElement.style.display = 'block';
    } else if (leftImageElement) {
      leftImageElement.style.display = 'none';
    }

    // Update right option
    const rightLabelElement = document.getElementById('quiz-right-label');
    const rightImageElement = document.getElementById('quiz-right-image');

    if (rightLabelElement) {
      rightLabelElement.textContent = pair.right_label;
    }

    if (rightImageElement && visual?.right_asset_id) {
      rightImageElement.src = `/assets/traits/${visual.right_asset_id}`;
      rightImageElement.style.display = 'block';
    } else if (rightImageElement) {
      rightImageElement.style.display = 'none';
    }

    // Update target info
    const targetInfoElement = document.getElementById('quiz-target-info');
    if (targetInfoElement && targetInfo) {
      targetInfoElement.innerHTML = `
        <div class="quiz-target">
          <div class="target-avatar">👤</div>
          <div class="target-name">${targetInfo.name}</div>
          <div class="target-photos">
            ${targetInfo.photos.slice(0, 3).map(photo =>
              `<img src="${photo.url}" alt="타겟 사진" class="target-photo">`
            ).join('')}
          </div>
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

    try {
      const answerData = await api.submitQuizAnswer(
        this.currentSession.id,
        this.currentTemplate.pair.id,
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
      resultIcon.textContent = '🎉';
      resultMessage.textContent = '정답입니다!';
      resultTitle.textContent = '정답! 🎉';
    } else {
      resultIcon.textContent = '😔';
      resultMessage.textContent = `아쉽게도 틀렸습니다. 정답은 "${target_choice === 'LEFT' ? this.currentTemplate.pair.left_label : this.currentTemplate.pair.right_label}"입니다.`;
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

    // Update points if penalty applied
    if (delta_points < 0) {
      // Get current points and update display
      setTimeout(async () => {
        try {
          const pointsData = await api.getMyPoints();
          ui.updatePointsDisplay(pointsData.data.balance);
        } catch (error) {
          console.error('Error updating points:', error);
        }
      }, 500);
    }

    // Show result modal
    ui.openModal('result-modal');
  }

  // Continue quiz with same target
  async continueQuiz() {
    ui.closeModal('result-modal');

    try {
      // Load new quiz template
      await this.loadQuizTemplate();

      // Show quiz modal again
      ui.openModal('quiz-modal');
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

      // Refresh home data to show updated rankings
      if (ui.currentView === 'home') {
        await ui.loadHomeData();
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
}

// Create global quiz instance
window.quiz = new QuizManager();