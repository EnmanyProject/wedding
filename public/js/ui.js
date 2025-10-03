// UI Management for A&B Meeting App
class UIManager {
  constructor() {
    this.currentView = 'home';
    this.socket = null;
    this.currentRankings = [];
    this.currentCardIndex = 0;
    this.swiperInitialized = false;
    this.currentPartners = [];
    this.currentPartnerIndex = 0;
    this.partnerSwiperInitialized = false;
    this.isPartnerSwiping = false;
    this.hintTimeout = null;
    this.isHintVisible = false;

    // ⚡ 성능 최적화 유틸리티 초기화
    this.initPerformanceUtils();

    this.init();
  }

  // 성능 유틸리티 초기화
  async initPerformanceUtils() {
    try {
      const perfModule = await import('/js/utils/performance.js');
      this.debounce = perfModule.debounce;
      this.throttle = perfModule.throttle;
      this.lazyLoader = perfModule.lazyLoader;
      this.perfTracker = perfModule.perfTracker;
      console.log('✅ [UI] 성능 유틸리티 로드 완료');
    } catch (error) {
      console.warn('⚠️ [UI] 성능 유틸리티 로드 실패:', error);
      // 폴백: 기본 함수
      this.debounce = (fn, delay) => {
        let timeout;
        return (...args) => {
          clearTimeout(timeout);
          timeout = setTimeout(() => fn(...args), delay);
        };
      };
      this.throttle = (fn, delay) => {
        let last = 0;
        return (...args) => {
          const now = Date.now();
          if (now - last >= delay) {
            last = now;
            fn(...args);
          }
        };
      };
    }
  }

  init() {
    this.setupNavigation();
    this.setupModals();
    this.setupToasts();

    // loadUserData는 App에서 호출하도록 변경 (토큰 설정 후)
    // this.loadUserData();

    // Hide loading screen after initialization with better event handling
    this.hideLoadingScreen();
  }

  // Navigation setup
  setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
      item.addEventListener('click', () => {
        const view = item.dataset.view;
        this.switchView(view);
      });
    });

    // 베티 매니저에게 표정 변화 위임 (setupBetyExpressions 제거)
  }

  // 로딩 화면 즉시 숨기기 (무한 로딩 방지)
  hideLoadingScreen() {
    // 즉시 로딩 화면 숨기기
    const loadingScreen = document.getElementById('loading-screen');
    const app = document.getElementById('app');

    if (loadingScreen && app) {
      loadingScreen.style.display = 'none';
      app.style.display = 'block';
      console.log('✅ [UI] Loading screen hidden immediately');
    }

    // 매니저들 백그라운드 초기화
    setTimeout(() => {
      console.log('🎭 [UI] UI initialization complete');
    }, 100);
  }

  // Switch between views with enhanced animations
  switchView(viewName) {
    // Hide all views
    document.querySelectorAll('.view').forEach(view => {
      view.classList.remove('active', 'show');
    });

    // Show target view with animation
    const targetView = document.getElementById(`${viewName}-view`);
    if (targetView) {
      targetView.classList.add('active');
      // Add animation class after a small delay
      setTimeout(() => {
        targetView.classList.add('show');
      }, 50);
    }

    // Update navigation
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.remove('active');
      if (item.dataset.view === viewName) {
        item.classList.add('active');
      }
    });

    this.currentView = viewName;

    // Load view-specific data
    this.loadViewData(viewName);
  }

  // Load data for specific view
  async loadViewData(viewName) {
    try {
      switch (viewName) {
        case 'home':
          await this.loadHomeData();
          break;
        case 'photos':
          await this.loadPhotosData();
          break;
        case 'rankings':
          await this.loadRankingsData();
          break;
        case 'meetings':
          await this.loadMeetingsData();
          break;
      }
    } catch (error) {
      console.error(`Error loading ${viewName} data:`, error);
      this.showToast('데이터 로딩 중 오류가 발생했습니다', 'error');
    }
  }

  // Load home view data with enhanced error handling and circuit breaker
  async loadHomeData() {
    try {
      // 🔧 Rate Limiting
      const now = Date.now();
      const lastLoad = parseInt(localStorage.getItem('lastHomeDataLoad') || '0');
      const MIN_INTERVAL = 5000; // 5초

      if (lastLoad && (now - lastLoad) < MIN_INTERVAL) {
        console.log('🚫 [UI] Rate limit: 호출 무시');
        return;
      }

      localStorage.setItem('lastHomeDataLoad', now.toString());
      console.log('✅ [UI] loadHomeData 시작');

      // 🔧 Promise.allSettled로 독립적 처리
      const results = await Promise.allSettled([
        this.loadPointsData(),
        this.loadUserAvatarsData(),
        this.loadRankingsPreview(),
        this.loadMeetingsPreview()
      ]);

      // 결과 분석
      const failed = results.filter(r => r.status === 'rejected').length;

      if (failed === 0) {
        console.log('🎉 [UI] 모든 데이터 로딩 성공');
        localStorage.removeItem('homeDataFailureCount');
      } else if (failed < results.length) {
        console.warn(`⚠️ [UI] 일부 실패: ${failed}/${results.length}`);
        this.showToast('일부 데이터를 불러오지 못했습니다', 'warning');
      } else {
        throw new Error('전체 데이터 로딩 실패');
      }

    } catch (error) {
      console.error('🚨 [UI] 데이터 로딩 실패:', error);
      this.showToast('데이터를 불러오지 못했습니다', 'error');
      this.initializeDefaultHomeData();
    }
  }

  // 🔧 NEW: 개별 데이터 로딩 메서드들
  async loadPointsData() {
    try {
      const pointsData = await api.getMyPoints();
      this.updatePointsDisplay(pointsData.data.balance);
      return { success: true };
    } catch (error) {
      console.warn('⚠️ Points failed:', error);
      this.updatePointsDisplay(0);
      throw error;
    }
  }

  async loadUserAvatarsData() {
    try {
      await this.loadUserAvatars();
      return { success: true };
    } catch (error) {
      console.warn('⚠️ Avatars failed:', error);
      this.updateUserAvatars([]);
      throw error;
    }
  }

  async loadRankingsPreview() {
    try {
      const rankingsData = await api.getMyRanking();
      this.updateHomeRankings(rankingsData.data.rankings.slice(0, 3));
      return { success: true };
    } catch (error) {
      console.warn('⚠️ Rankings failed:', error);
      this.updateHomeRankings([]);
      throw error;
    }
  }

  async loadMeetingsPreview() {
    try {
      const meetingData = await api.getMeetingState();
      this.updateHomeMeetings(meetingData.data.available_meetings.slice(0, 3));
      return { success: true };
    } catch (error) {
      console.warn('⚠️ Meetings failed:', error);
      this.updateHomeMeetings([]);
      throw error;
    }
  }

  // 🛡️ 기본값으로 홈 화면 초기화
  initializeDefaultHomeData() {
    console.log('🔄 [UI] 기본값으로 홈 화면 초기화');
    this.updatePointsDisplay(0);
    this.updateUserAvatars([]);
    this.updateHomeRankings([]);
    this.updateHomeMeetings([]);
  }

  // Load photos data
  async loadPhotosData() {
    try {
      const photosData = await api.getMyPhotos();
      this.renderUserPhotos(photosData.data.photos);
    } catch (error) {
      console.error('Error loading photos:', error);
      this.showToast('사진 데이터 로딩 실패', 'error');
    }
  }

  // Load rankings data
  async loadRankingsData() {
    try {
      const rankingsData = await api.getMyRanking();
      this.renderDetailedRankings(rankingsData.data.rankings);
    } catch (error) {
      console.error('Error loading rankings:', error);
      this.showToast('랭킹 데이터 로딩 실패', 'error');
    }
  }

  // Load meetings data
  async loadMeetingsData() {
    try {
      const meetingData = await api.getMeetingState();
      this.renderAvailableMeetings(meetingData.data.available_meetings);
      this.renderActiveMeetings(meetingData.data.active_chats);
    } catch (error) {
      console.error('Error loading meetings:', error);
      this.showToast('만남 데이터 로딩 실패', 'error');
    }
  }

  // Update points display
  updatePointsDisplay(points) {
    const pointsElement = document.getElementById('user-points');
    if (pointsElement) {
      pointsElement.textContent = points.toLocaleString();
    }
  }

  // Update user avatars display with fallback
  updateUserAvatars(avatars) {
    console.log('🔄 [UI] updateUserAvatars called with:', avatars.length, 'avatars');
    // This function provides a fallback when user avatars fail to load
    // In a real implementation, this would update the user avatar display
    // For now, we'll just log the fallback
  }

  // Update home rankings
  updateHomeRankings(rankings) {
    const rankingsList = document.getElementById('rankings-list');
    if (!rankingsList) return;

    if (rankings.length === 0) {
      rankingsList.innerHTML = `
        <div class="ranking-placeholder">
          <img src="/images/Bety3.png" alt="Bety" class="bety-character character-float character-clickable character-glow" style="width: 60px; height: 60px; margin-bottom: 1rem;">
          <p>퀴즈를 시작하면 랭킹이 표시됩니다</p>
        </div>
      `;
      return;
    }

    rankingsList.innerHTML = rankings.map((ranking, index) => `
      <div class="ranking-item" data-target-id="${ranking.targetId}">
        <div class="ranking-position">${index + 1}</div>
        <div class="ranking-info">
          <div class="ranking-name">${ranking.targetName}</div>
          <div class="ranking-score">호감도: ${ranking.affinityScore}</div>
        </div>
        <div class="ranking-actions">
          ${ranking.canMeet ? '💕' : '🔒'}
        </div>
      </div>
    `).join('');
  }

  // Update home meetings
  updateHomeMeetings(meetings) {
    const meetingsList = document.getElementById('meetings-list');
    if (!meetingsList) return;

    if (meetings.length === 0) {
      meetingsList.innerHTML = `
        <div class="meeting-placeholder">
          <img src="/images/Bety4.png" alt="Bety" class="bety-character character-pulse character-clickable" style="width: 60px; height: 60px; margin-bottom: 1rem;">
          <p>호감도가 충분히 높아지면 만남이 가능합니다</p>
        </div>
      `;
      return;
    }

    meetingsList.innerHTML = meetings.map(meeting => `
      <div class="meeting-item" data-target-id="${meeting.target_id}">
        <div class="meeting-avatar">👤</div>
        <div class="meeting-info">
          <div class="meeting-name">${meeting.target_name}</div>
          <div class="meeting-score">호감도: ${meeting.affinity_score}</div>
        </div>
        <div class="meeting-actions">
          <button class="btn btn-primary btn-sm" onclick="ui.enterMeeting('${meeting.target_id}')">
            만나기
          </button>
        </div>
      </div>
    `).join('');
  }

  // Render user photos
  renderUserPhotos(photos) {
    const photosGrid = document.getElementById('user-photos-grid');
    if (!photosGrid) return;

    if (photos.length === 0) {
      photosGrid.innerHTML = `
        <div class="photo-placeholder">
          <div class="placeholder-icon">📷</div>
          <p>첫 번째 사진을 추가해보세요</p>
        </div>
      `;
      return;
    }

    photosGrid.innerHTML = photos.map(photo => {
      const thumbAsset = photo.assets.find(asset => asset.variant === 'THUMB');
      const imageUrl = thumbAsset?.storage_key ? `/api/assets/${thumbAsset.storage_key}` : '';

      return `
        <div class="photo-item" data-photo-id="${photo.id}">
          <img src="${imageUrl}" alt="사진 ${photo.order_idx + 1}" loading="lazy">
          <div class="photo-overlay">
            <button class="btn btn-danger btn-sm" onclick="ui.deletePhoto('${photo.id}')">
              삭제
            </button>
          </div>
          <div class="photo-status ${photo.moderation_status.toLowerCase()}">${photo.moderation_status}</div>
        </div>
      `;
    }).join('');
  }

  // Render detailed rankings
  renderDetailedRankings(rankings) {
    const rankingsContainer = document.getElementById('detailed-rankings');
    if (!rankingsContainer) return;

    if (rankings.length === 0) {
      rankingsContainer.innerHTML = `
        <div class="ranking-placeholder">
          <img src="/images/Bety3.png" alt="Bety" class="bety-character character-float character-clickable character-glow" style="width: 60px; height: 60px; margin-bottom: 1rem;">
          <p>아직 호감도 데이터가 없습니다</p>
        </div>
      `;
      return;
    }

    rankingsContainer.innerHTML = rankings.map((ranking, index) => `
      <div class="ranking-card" data-target-id="${ranking.targetId}">
        <div class="ranking-header">
          <div class="ranking-position">#${index + 1}</div>
          <div class="ranking-name">${ranking.targetName}</div>
          <div class="ranking-score">${ranking.affinityScore}</div>
        </div>
        <div class="ranking-details">
          <div class="detail-item">
            <span>해금된 사진: ${ranking.photosUnlocked}장</span>
          </div>
          <div class="detail-item">
            <span>만남 가능: ${ranking.canMeet ? '✅' : '❌'}</span>
          </div>
        </div>
        <div class="ranking-actions">
          <button class="btn btn-primary btn-sm" onclick="quiz.startQuizWithTarget('${ranking.targetId}')">
            퀴즈하기
          </button>
          ${ranking.canMeet ? `
            <button class="btn btn-secondary btn-sm" onclick="ui.enterMeeting('${ranking.targetId}')">
              만나기
            </button>
          ` : ''}
        </div>
      </div>
    `).join('');
  }

  // Render empty swiper
  renderEmptySwiper() {
    const cardsContainer = document.getElementById('user-cards-container');
    const pagination = document.getElementById('swiper-pagination');
    const controls = document.getElementById('swiper-controls');

    if (cardsContainer) {
      cardsContainer.innerHTML = `
        <div class="user-card empty">
          <div class="card-content">
            <div class="empty-state">
              <img src="/images/Bety3.png" alt="Bety" class="bety-character character-float character-clickable character-glow">
              <h3>아직 호감도 데이터가 없습니다</h3>
              <p>퀴즈를 시작하여 다른 사용자들과 친밀도를 쌓아보세요!</p>
            </div>
          </div>
        </div>
      `;
    }

    if (pagination) pagination.innerHTML = '';
    if (controls) {
      const counter = controls.querySelector('#user-counter');
      if (counter) counter.textContent = '0 / 0';
      this.updateNavigationButtons(false, false);
    }
  }

  // Render mobile cards
  renderMobileCards(rankings) {
    const cardsContainer = document.getElementById('user-cards-container');
    if (!cardsContainer) return;

    const cardsHTML = rankings.map((ranking, index) => {
      const avatarIcon = this.getAnimalIcon(ranking.targetName);
      const affinityLevel = this.getAffinityLevel(ranking.affinityScore);

      return `
        <div class="user-card" data-target-id="${ranking.targetId}" data-index="${index}">
          <div class="card-content">
            <div class="user-avatar-large">
              <div class="avatar-icon">${avatarIcon}</div>
              <div class="rank-badge">#${index + 1}</div>
            </div>
            <div class="user-info">
              <h3 class="user-name">${ranking.targetName}</h3>
              <div class="affinity-info">
                <div class="affinity-score">
                  <span class="score-value">${ranking.affinityScore}</span>
                  <span class="score-label">호감도</span>
                </div>
                <div class="affinity-level ${affinityLevel.class}">
                  ${affinityLevel.text}
                </div>
              </div>
            </div>
            <div class="user-stats">
              <div class="stat-item">
                <span class="stat-icon">📷</span>
                <span class="stat-value">${ranking.photosUnlocked}</span>
                <span class="stat-label">해금된 사진</span>
              </div>
              <div class="stat-item">
                <span class="stat-icon">${ranking.canMeet ? '💕' : '🔒'}</span>
                <span class="stat-value">${ranking.canMeet ? '가능' : '불가'}</span>
                <span class="stat-label">만남</span>
              </div>
            </div>
            <div class="card-actions">
              <button class="action-btn primary" onclick="quiz.startQuizWithTarget('${ranking.targetId}')">
                <span class="btn-icon">🎯</span>
                <span class="btn-text">퀴즈하기</span>
              </button>
              ${ranking.canMeet ? `
                <button class="action-btn secondary" onclick="ui.enterMeeting('${ranking.targetId}')">
                  <span class="btn-icon">💬</span>
                  <span class="btn-text">만나기</span>
                </button>
              ` : `
                <button class="action-btn disabled" disabled>
                  <span class="btn-icon">🔒</span>
                  <span class="btn-text">호감도 부족</span>
                </button>
              `}
            </div>
          </div>
        </div>
      `;
    }).join('');

    cardsContainer.innerHTML = cardsHTML;
    this.updatePagination(rankings.length);
    this.updateCounter(0, rankings.length);
  }

  // Initialize mobile swiper functionality
  initializeMobileSwiper() {
    if (this.swiperInitialized) return;

    const cardsContainer = document.getElementById('user-cards-container');
    const prevBtn = document.getElementById('prev-user-btn');
    const nextBtn = document.getElementById('next-user-btn');

    if (!cardsContainer || !prevBtn || !nextBtn) return;

    // Touch/swipe event handlers
    this.setupSwipeEvents(cardsContainer);

    // Navigation button handlers
    prevBtn.addEventListener('click', () => this.navigateCard('prev'));
    nextBtn.addEventListener('click', () => this.navigateCard('next'));

    // Initial state
    this.updateNavigationButtons(false, this.currentRankings.length > 1);
    this.updateCardPosition();

    this.swiperInitialized = true;
  }

  // Setup swipe events
  setupSwipeEvents(container) {
    let startX = 0;
    let currentX = 0;
    let isDragging = false;
    let startTime = 0;

    const handleStart = (e) => {
      isDragging = true;
      startTime = Date.now();
      startX = e.touches ? e.touches[0].clientX : e.clientX;
      currentX = startX;
      container.style.transition = 'none';
    };

    const handleMove = (e) => {
      if (!isDragging) return;
      e.preventDefault();

      currentX = e.touches ? e.touches[0].clientX : e.clientX;
      const diffX = currentX - startX;
      const currentTransform = -this.currentCardIndex * 100;
      container.style.transform = `translateX(${currentTransform + (diffX / container.offsetWidth) * 100}%)`;
    };

    const handleEnd = () => {
      if (!isDragging) return;
      isDragging = false;

      const diffX = currentX - startX;
      const threshold = 50;
      const timeThreshold = 300;
      const timeDiff = Date.now() - startTime;

      container.style.transition = 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)';

      if (Math.abs(diffX) > threshold || (Math.abs(diffX) > 20 && timeDiff < timeThreshold)) {
        if (diffX > 0 && this.currentCardIndex > 0) {
          this.navigateCard('prev');
        } else if (diffX < 0 && this.currentCardIndex < this.currentRankings.length - 1) {
          this.navigateCard('next');
        } else {
          this.updateCardPosition();
        }
      } else {
        this.updateCardPosition();
      }
    };

    // Mouse events
    container.addEventListener('mousedown', handleStart);
    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleEnd);

    // Touch events
    container.addEventListener('touchstart', handleStart, { passive: false });
    container.addEventListener('touchmove', handleMove, { passive: false });
    container.addEventListener('touchend', handleEnd);

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
      if (this.currentView !== 'rankings') return;

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        this.navigateCard('prev');
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        this.navigateCard('next');
      }
    });
  }

  // Navigate to specific card
  navigateCard(direction) {
    if (!this.currentRankings || this.currentRankings.length === 0) return;

    const maxIndex = this.currentRankings.length - 1;

    if (direction === 'prev' && this.currentCardIndex > 0) {
      this.currentCardIndex--;
    } else if (direction === 'next' && this.currentCardIndex < maxIndex) {
      this.currentCardIndex++;
    } else {
      return; // No change needed
    }

    this.updateCardPosition();
    this.updateNavigationButtons(
      this.currentCardIndex > 0,
      this.currentCardIndex < maxIndex
    );
    this.updateCounter(this.currentCardIndex, this.currentRankings.length);
    this.updatePaginationActive(this.currentCardIndex);
  }

  // Update card position
  updateCardPosition() {
    const cardsContainer = document.getElementById('user-cards-container');
    if (cardsContainer) {
      cardsContainer.style.transform = `translateX(-${this.currentCardIndex * 100}%)`;
    }
  }

  // Update navigation buttons
  updateNavigationButtons(canGoPrev, canGoNext) {
    const prevBtn = document.getElementById('prev-user-btn');
    const nextBtn = document.getElementById('next-user-btn');

    if (prevBtn) {
      prevBtn.disabled = !canGoPrev;
      prevBtn.classList.toggle('disabled', !canGoPrev);
    }
    if (nextBtn) {
      nextBtn.disabled = !canGoNext;
      nextBtn.classList.toggle('disabled', !canGoNext);
    }
  }

  // Update pagination dots
  updatePagination(totalCards) {
    const pagination = document.getElementById('swiper-pagination');
    if (!pagination) return;

    const dotsHTML = Array.from({ length: totalCards }, (_, i) =>
      `<span class="pagination-dot ${i === 0 ? 'active' : ''}" data-index="${i}"></span>`
    ).join('');

    pagination.innerHTML = dotsHTML;

    // Add click handlers to dots
    pagination.querySelectorAll('.pagination-dot').forEach((dot, index) => {
      dot.addEventListener('click', () => {
        this.currentCardIndex = index;
        this.updateCardPosition();
        this.updateNavigationButtons(
          index > 0,
          index < totalCards - 1
        );
        this.updateCounter(index, totalCards);
        this.updatePaginationActive(index);
      });
    });
  }

  // Update active pagination dot
  updatePaginationActive(activeIndex) {
    const dots = document.querySelectorAll('.pagination-dot');
    dots.forEach((dot, index) => {
      dot.classList.toggle('active', index === activeIndex);
    });
  }

  // Update counter
  updateCounter(current, total) {
    const counter = document.getElementById('user-counter');
    if (counter) {
      counter.textContent = `${current + 1} / ${total}`;
    }
  }

  // Get affinity level information
  getAffinityLevel(score) {
    if (score >= 80) return { class: 'level-high', text: '최고 친밀' };
    if (score >= 60) return { class: 'level-good', text: '높은 친밀' };
    if (score >= 40) return { class: 'level-medium', text: '보통 친밀' };
    if (score >= 20) return { class: 'level-low', text: '낮은 친밀' };
    return { class: 'level-very-low', text: '친밀도 부족' };
  }

  // Modal management
  setupModals() {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
      const closeBtn = modal.querySelector('.modal-close');
      if (closeBtn) {
        closeBtn.addEventListener('click', () => this.closeModal(modal.id));
      }

      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          this.closeModal(modal.id);
        }
      });
    });

    // ESC key to close modal
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const openModal = document.querySelector('.modal.active, .modal[aria-hidden="false"]');
        if (openModal) {
          this.closeModal(openModal.id);
        }
      }
    });
  }

  openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add('active');
      modal.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';

      // Focus on modal for accessibility
      const firstFocusable = modal.querySelector('button, input, [tabindex]:not([tabindex="-1"])');
      if (firstFocusable) {
        setTimeout(() => firstFocusable.focus(), 100);
      }
    }
  }

  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove('active');
      modal.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';

      // Return focus to the element that opened the modal
      const openButton = document.getElementById('start-quiz-btn');
      if (openButton && modalId === 'quiz-modal') {
        openButton.focus();
      }
    }
  }

  // Toast notifications
  setupToasts() {
    this.toastContainer = document.getElementById('toast-container');
  }

  showToast(message, type = 'info', duration = 3000) {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <div class="toast-content">
        <span class="toast-message">${message}</span>
        <button class="toast-close" onclick="this.parentElement.parentElement.remove()">&times;</button>
      </div>
    `;

    this.toastContainer.appendChild(toast);

    // Auto-remove after duration
    setTimeout(() => {
      if (toast.parentElement) {
        toast.remove();
      }
    }, duration);
  }

  // Enter meeting
  async enterMeeting(targetId) {
    try {
      const response = await api.enterMeeting(targetId);
      this.showToast('만남이 시작되었습니다! 💕', 'success');

      // Switch to meetings view and show chat
      this.switchView('meetings');
      // TODO: Open chat interface
    } catch (error) {
      this.showToast(error.message || '만남 시작 실패', 'error');
    }
  }

  // Delete photo
  async deletePhoto(photoId) {
    if (!confirm('정말로 이 사진을 삭제하시겠습니까?')) {
      return;
    }

    try {
      await api.deletePhoto(photoId);
      this.showToast('사진이 삭제되었습니다', 'success');
      this.loadPhotosData(); // Refresh photos
    } catch (error) {
      this.showToast(error.message || '사진 삭제 실패', 'error');
    }
  }

  // Load user data on app start
  async loadUserData() {
    try {
      // Check if user is logged in
      if (!api.token) {
        // For demo purposes, create a dummy token
        // In real app, this would redirect to login
        api.setToken('demo-token-12345');
      }

      await this.loadHomeData();
    } catch (error) {
      console.error('Error loading user data:', error);
      this.showToast('사용자 데이터 로딩 실패', 'error');
    }
  }

  // Format date/time
  formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return '방금 전';
    if (diffMins < 60) return `${diffMins}분 전`;
    if (diffHours < 24) return `${diffHours}시간 전`;
    if (diffDays < 7) return `${diffDays}일 전`;

    return date.toLocaleDateString('ko-KR');
  }

  // Utility: truncate text
  truncateText(text, maxLength) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }

  // Utility: format numbers
  formatNumber(num) {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  }

  // Load user avatars for quiz selection
  async loadUserAvatars() {
    try {
      console.log('🎭 [UI] 사용자 아바타 로딩 중...');
      const targetsData = await api.getAvailableQuizTargets();
      const targets = targetsData.data.targets;

      console.log('👥 [UI] 로드된 사용자 수:', targets.length);
      this.renderUserAvatars(targets);
    } catch (error) {
      console.error('Error loading user avatars:', error);
      const grid = document.getElementById('user-avatars-grid');
      if (grid) {
        grid.innerHTML = `
          <div class="avatars-loading">
            <img src="/images/Bety6.png" alt="베티 매니저" class="bety-character character-wiggle" style="width: 50px; height: 50px;">
            <p>사용자 로딩 실패</p>
          </div>
        `;
      }
    }
  }

  // Render user avatars as partner swiper cards
  renderUserAvatars(targets) {
    const partnerSwiper = document.getElementById('mobile-partner-swiper');
    if (!partnerSwiper) return;

    if (targets.length === 0) {
      this.renderEmptyPartnerSwiper();
      return;
    }

    this.currentPartners = targets;
    this.currentPartnerIndex = 0;
    this.renderPartnerCards(targets);
    this.initializePartnerSwiper();
  }

  // Render empty partner swiper
  renderEmptyPartnerSwiper() {
    const cardsContainer = document.getElementById('partner-cards-container');
    const pagination = document.getElementById('partner-swiper-pagination');
    const controls = document.getElementById('partner-swiper-controls');

    if (cardsContainer) {
      cardsContainer.innerHTML = `
        <div class="partner-card empty">
          <div class="card-content">
            <div class="loading-character">
              <img src="/images/Bety6.png" alt="베티 매니저" class="bety-character character-wiggle">
            </div>
            <h3>퀴즈를 답한 사용자가 없습니다</h3>
            <p>나중에 다시 확인해주세요!</p>
          </div>
        </div>
      `;
    }

    if (pagination) pagination.innerHTML = '';
    if (controls) {
      const counter = controls.querySelector('#partner-counter');
      if (counter) counter.textContent = '0 / 0';
      this.updatePartnerNavigationButtons(false, false);
    }
  }

  // Render partner cards
  renderPartnerCards(targets) {
    const cardsContainer = document.getElementById('partner-cards-container');
    if (!cardsContainer) return;

    const cardsHTML = targets.map((target, index) => {
      const displayName = target.display_name_for_ui || target.display_name || target.name;
      const avatarIcon = this.getAnimalIcon(target.display_name || target.name);

      // 여성 특화 프로필 이미지 생성 (더 현실적인 스타일)
      const femaleImageStyles = [
        'lorelei-neutral', 'avataaars-neutral', 'adventurer-neutral',
        'fun-emoji', 'miniavs', 'notionists-neutral', 'personas'
      ];
      const styleIndex = target.name.charCodeAt(0) % femaleImageStyles.length;
      const selectedStyle = femaleImageStyles[styleIndex];

      // 각 사용자별로 고유한 색상 조합
      const colorSchemes = [
        'ffd1dc,ffb3ba,fce4ec', // 핑크 톤
        'e1f5fe,b3e5fc,81d4fa', // 블루 톤
        'f3e5f5,e1bee7,ce93d8', // 퍼플 톤
        'fff3e0,ffcc80,ffb74d', // 오렌지 톤
        'f1f8e9,c8e6c9,a5d6a7', // 그린 톤
        'fce4ec,f8bbd9,f48fb1', // 로즈 톤
        'e8f5e8,c8e6c9,a5d6a7'  // 민트 톤
      ];
      const colorIndex = target.name.charCodeAt(1) % colorSchemes.length;
      const backgroundColor = colorSchemes[colorIndex];

      const profileImageUrl = target.profile_image_url ||
        `https://api.dicebear.com/7.x/${selectedStyle}/svg?seed=${encodeURIComponent(target.name + 'female')}&backgroundColor=${backgroundColor}&scale=120&radius=50&backgroundType=gradientLinear&flip=false`;

      return `
        <div class="partner-card" data-user-id="${target.id}" data-user-name="${target.name}" data-index="${index}">
          <div class="card-content">
            <div class="partner-avatar-large">
              <img src="${profileImageUrl}" alt="${displayName}" class="profile-image">
            </div>
            <div class="partner-info">
              <h3>${displayName}</h3>
            </div>
            <div class="partner-quiz-stats">
              <div class="partner-stat-item">
                <span class="partner-stat-icon">🎯</span>
                <span class="partner-stat-value">${target.quiz_count}</span>
                <span class="partner-stat-label">퀴즈 참여</span>
              </div>
              <div class="partner-stat-item">
                <span class="partner-stat-icon">💕</span>
                <span class="partner-stat-value">${target.affinity_score || 0}</span>
                <span class="partner-stat-label">친밀도</span>
              </div>
            </div>
            <div class="partner-actions">
              <div class="partner-action-hint" id="hint-${index}" style="display: none;">
                <span class="hint-icon">👆</span>
                <span class="hint-text">카드를 눌러 퀴즈 시작</span>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');

    cardsContainer.innerHTML = cardsHTML;
    this.updatePartnerPagination(targets.length);
    this.updatePartnerCounter(0, targets.length);

    // 카드 클릭 이벤트 추가
    const partnerCards = cardsContainer.querySelectorAll('.partner-card');
    partnerCards.forEach(card => {
      card.addEventListener('click', (e) => {
        console.log('🎯 [Click] 카드 클릭 감지:', {
          isPartnerSwiping: this.isPartnerSwiping,
          userId: card.getAttribute('data-user-id'),
          userName: card.getAttribute('data-user-name')
        });

        // 스와이프 중이 아닐 때만 클릭 처리
        if (!this.isPartnerSwiping) {
          console.log('✅ [Click] 클릭 이벤트 처리 시작');

          // 카드 클릭 시 사용자 상호작용 감지
          this.onUserInteraction();

          const userId = card.getAttribute('data-user-id');
          const userName = card.getAttribute('data-user-name');
          this.selectUserForQuiz(userId, userName);
        } else {
          console.log('❌ [Click] 클릭 무시됨 - 스와이프 모드 활성화 상태');
        }
      });
    });

    // 5초 후 힌트 표시 시작
    this.startHintTimer();
  }

  // Initialize partner swiper functionality
  initializePartnerSwiper() {
    if (this.partnerSwiperInitialized) return;

    const cardsContainer = document.getElementById('partner-cards-container');
    const prevBtn = document.getElementById('prev-partner-btn');
    const nextBtn = document.getElementById('next-partner-btn');

    if (!cardsContainer || !prevBtn || !nextBtn) return;

    // Touch/swipe event handlers
    this.setupPartnerSwipeEvents(cardsContainer);

    // Navigation button handlers
    prevBtn.addEventListener('click', () => {
      console.log('🔼 [Button] 이전 버튼 클릭');
      this.navigatePartnerCard('prev', false, true); // 버튼 클릭임을 표시
    });
    nextBtn.addEventListener('click', () => {
      console.log('🔽 [Button] 다음 버튼 클릭');
      this.navigatePartnerCard('next', false, true); // 버튼 클릭임을 표시
    });

    // Initial state - 애니메이션 없이 즉시 정렬
    this.currentPartnerIndex = 0; // 인덱스 초기화
    this.updatePartnerNavigationButtons(false, this.currentPartners.length > 1);
    this.snapToPartnerCard(false); // 애니메이션 없이 초기 위치 설정

    console.log('🎬 [Init] 파트너 카드 초기화 완료:', {
      index: this.currentPartnerIndex,
      totalCards: this.currentPartners.length,
      animated: false
    });

    // 레이아웃 안정화를 위한 지연된 재정렬
    setTimeout(() => {
      console.log('🔄 [Stabilize] 레이아웃 안정화 재정렬 실행');
      this.snapToPartnerCard(false); // 레이아웃 완전 로드 후 위치 확정
    }, 100);

    // 힌트 타이머 시작
    this.startHintTimer();

    // 화면 크기 변경 감지 및 재정렬
    this.setupPartnerResizeHandler();

    this.partnerSwiperInitialized = true;
  }

  // Setup partner swipe events
  setupPartnerSwipeEvents(container) {
    let startX = 0;
    let currentX = 0;
    let isDragging = false;
    let startTime = 0;
    let hasMovedEnough = false;
    let velocityTracker = []; // 속도 추적을 위한 배열
    let lastMoveTime = 0;

    const handleStart = (e) => {
      isDragging = true;
      hasMovedEnough = false;
      // 터치 시작 시에는 즉시 스와이프 모드로 설정하지 않음
      startTime = Date.now();
      lastMoveTime = startTime;
      startX = e.touches ? e.touches[0].clientX : e.clientX;
      currentX = startX;
      container.style.transition = 'none';

      // 속도 추적 초기화
      velocityTracker = [{ time: startTime, x: startX }];

      console.log('👆 [Touch] 터치 시작:', { startX, time: startTime });
    };

    const handleMove = (e) => {
      if (!isDragging) return;

      const now = Date.now();
      currentX = e.touches ? e.touches[0].clientX : e.clientX;
      const diffX = currentX - startX;

      // 속도 추적을 위한 데이터 수집 (최근 100ms 내의 데이터만 유지)
      velocityTracker.push({ time: now, x: currentX });
      velocityTracker = velocityTracker.filter(point => now - point.time < 100);

      // 일정 거리 이상 움직인 경우에만 스와이프 모드로 설정
      if (Math.abs(diffX) > 10 && !hasMovedEnough) {
        hasMovedEnough = true;
        this.isPartnerSwiping = true;
        this.onUserInteraction(); // 실제 스와이프 시작 시에만 상호작용 감지
        console.log('🔄 [Touch] 스와이프 모드 활성화:', { diffX });
      }

      // 실제 스와이프가 시작된 경우에만 이동 처리
      if (hasMovedEnough) {
        e.preventDefault();

        // 개선된 정확한 이동 계산 - snapToPartnerCard와 동일한 로직 사용
        const swiperContainer = document.getElementById('mobile-partner-swiper');
        const containerRect = swiperContainer.getBoundingClientRect();
        const containerWidth = containerRect.width;

        // CSS margin/padding 고려한 실제 카드 폭 계산
        const computedStyle = getComputedStyle(swiperContainer);
        const paddingLeft = parseFloat(computedStyle.paddingLeft) || 0;
        const paddingRight = parseFloat(computedStyle.paddingRight) || 0;
        const effectiveWidth = containerWidth - paddingLeft - paddingRight;

        const currentPosition = -this.currentPartnerIndex * effectiveWidth;
        const newPosition = currentPosition + diffX;

        container.style.transform = `translateX(${newPosition}px)`;
      }
    };

    const handleEnd = () => {
      if (!isDragging) return;
      isDragging = false;

      const diffX = currentX - startX;
      const threshold = 50;
      const timeThreshold = 300;
      const timeDiff = Date.now() - startTime;

      console.log('🏁 [Touch] 터치 종료:', {
        diffX,
        timeDiff,
        hasMovedEnough,
        isPartnerSwiping: this.isPartnerSwiping
      });

      // 스와이프가 실제로 발생했는지 확인
      if (hasMovedEnough) {
        // 개선된 스와이프 거리 비율 계산 - 정확한 컨테이너 크기 사용
        const swiperContainer = document.getElementById('mobile-partner-swiper');
        const containerRect = swiperContainer.getBoundingClientRect();
        const containerWidth = containerRect.width;

        // CSS margin/padding 고려한 실제 카드 폭 계산
        const computedStyle = getComputedStyle(swiperContainer);
        const paddingLeft = parseFloat(computedStyle.paddingLeft) || 0;
        const paddingRight = parseFloat(computedStyle.paddingRight) || 0;
        const effectiveWidth = containerWidth - paddingLeft - paddingRight;

        const swipeRatio = Math.abs(diffX) / effectiveWidth;

        // 정교한 속도 계산 (최근 이동 데이터 기반)
        let velocity = 0;
        if (velocityTracker.length >= 2) {
          const recent = velocityTracker[velocityTracker.length - 1];
          const previous = velocityTracker[0];
          const timeDelta = recent.time - previous.time;
          const distanceDelta = recent.x - previous.x;
          velocity = timeDelta > 0 ? distanceDelta / timeDelta : 0; // px/ms
        }

        // 스와이프 속도 분류 (관성 효과용)
        const absVelocity = Math.abs(velocity);
        const velocityThresholds = {
          slow: 0.3,      // 느린 스와이프 (부드러운 애니메이션)
          medium: 0.8,    // 중간 스와이프
          fast: 1.5       // 빠른 스와이프 (스냅 효과)
        };

        let swipeType = 'slow';
        let isFastSwipe = false;

        if (absVelocity > velocityThresholds.fast) {
          swipeType = 'fast';
          isFastSwipe = true;
        } else if (absVelocity > velocityThresholds.medium) {
          swipeType = 'medium';
        }

        console.log('📱 [Swipe] 관성 효과 스와이프 감지:', {
          diffX,
          containerWidth,
          swipeRatio,
          timeDiff,
          velocity: velocity.toFixed(3) + 'px/ms',
          absVelocity: absVelocity.toFixed(3),
          swipeType,
          isFastSwipe,
          trackerPoints: velocityTracker.length,
          threshold: '15% 또는 25px + 300ms 또는 빠른 스와이프'
        });

        // 더 민감한 스와이프 감지: 빠른 스와이프도 고려
        if (swipeRatio > 0.15 || (Math.abs(diffX) > 25 && timeDiff < timeThreshold) || isFastSwipe) {
          // 스와이프 동작 감지 - 이미 onUserInteraction은 move에서 호출됨

          if (diffX > 0 && this.currentPartnerIndex > 0) {
            this.navigatePartnerCard('prev', { isFastSwipe, swipeType, velocity: absVelocity });
          } else if (diffX < 0 && this.currentPartnerIndex < this.currentPartners.length - 1) {
            this.navigatePartnerCard('next', { isFastSwipe, swipeType, velocity: absVelocity });
          } else {
            this.snapToPartnerCard(true, { isFastSwipe, swipeType, velocity: absVelocity });
          }

          // 실제 스와이프 발생 시에만 딜레이 적용
          setTimeout(() => {
            this.isPartnerSwiping = false;
            console.log('✅ [Touch] 스와이프 플래그 해제 (딜레이)');
          }, 150);
        } else {
          // 스와이프 거리가 부족한 경우 원위치
          this.snapToPartnerCard();
          this.isPartnerSwiping = false;
          console.log('✅ [Touch] 스와이프 플래그 해제 (거리 부족)');
        }
      } else {
        // 실제 스와이프가 발생하지 않은 경우 (단순 탭) - 즉시 플래그 해제
        this.isPartnerSwiping = false;
        console.log('✅ [Touch] 단순 탭 감지 - 스와이프 플래그 즉시 해제');
      }
    };

    // Mouse events
    container.addEventListener('mousedown', handleStart);
    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleEnd);

    // Touch events
    container.addEventListener('touchstart', handleStart, { passive: false });
    container.addEventListener('touchmove', handleMove, { passive: false });
    container.addEventListener('touchend', handleEnd);
  }

  // Setup resize handler for partner swiper
  setupPartnerResizeHandler() {
    // ⚡ 성능 최적화: debounce 적용
    const resizeHandler = () => {
      console.log('📱 [Resize] 화면 크기 변경 감지, 카드 위치 재조정');
      this.snapToPartnerCard(false); // 리사이즈 시에는 애니메이션 없이 즉시 이동
    };

    // debounce가 로드되었으면 사용, 아니면 기본 setTimeout 방식
    const handleResize = this.debounce ?
      this.debounce(resizeHandler, 250) :
      resizeHandler;

    window.addEventListener('resize', handleResize);

    // orientationchange도 debounce 적용
    const orientationHandler = () => {
      console.log('📱 [Orientation] 화면 방향 변경 감지, 카드 위치 재조정');
      this.snapToPartnerCard(false);
    };

    const handleOrientation = this.debounce ?
      this.debounce(orientationHandler, 300) :
      orientationHandler;

    window.addEventListener('orientationchange', handleOrientation);
  }

  // Navigate partner cards
  navigatePartnerCard(direction, swipeInfo = false, isButtonClick = false) {
    // 스와이프 정보 파싱 (하위 호환성 유지)
    let isFastSwipe = false;
    let swipeType = 'slow';
    let velocity = 0;

    if (typeof swipeInfo === 'object' && swipeInfo !== null) {
      // 새로운 객체 형태의 스와이프 정보
      isFastSwipe = swipeInfo.isFastSwipe || false;
      swipeType = swipeInfo.swipeType || 'slow';
      velocity = swipeInfo.velocity || 0;
    } else {
      // 기존 boolean 형태 (하위 호환성)
      isFastSwipe = swipeInfo;
    }
    if (!this.currentPartners || this.currentPartners.length === 0) return;

    // 사용자 상호작용 감지
    this.onUserInteraction();

    const maxIndex = this.currentPartners.length - 1;
    const oldIndex = this.currentPartnerIndex;

    if (direction === 'prev' && this.currentPartnerIndex > 0) {
      this.currentPartnerIndex--;
    } else if (direction === 'next' && this.currentPartnerIndex < maxIndex) {
      this.currentPartnerIndex++;
    } else {
      console.log(`⚠️ [Navigation] 이동 불가: ${direction}, 현재 인덱스: ${this.currentPartnerIndex}, 최대: ${maxIndex}`);
      return;
    }

    console.log(`🎯 [Navigation] 관성 효과 카드 이동: ${oldIndex} → ${this.currentPartnerIndex} (${direction}${isButtonClick ? ', 버튼 클릭' : ''}, ${swipeType}, v=${velocity.toFixed(2)})`);

    // 버튼 클릭의 경우 더 정밀한 정렬을 위해 부드러운 애니메이션 사용
    if (isButtonClick) {
      this.snapToPartnerCard(true, { isFastSwipe: false, swipeType: 'slow', velocity: 0 }); // 항상 부드러운 애니메이션

      // 정렬 검증을 위한 딜레이 후 재검사
      setTimeout(() => {
        this.verifyAndFixAlignment();
      }, 450); // 애니메이션 완료 후
    } else {
      this.snapToPartnerCard(true, { isFastSwipe, swipeType, velocity });
    }
    this.updatePartnerNavigationButtons(
      this.currentPartnerIndex > 0,
      this.currentPartnerIndex < maxIndex
    );
    this.updatePartnerCounter(this.currentPartnerIndex, this.currentPartners.length);
    this.updatePartnerPaginationActive(this.currentPartnerIndex);
  }

  // Snap to exact card position with smooth transition
  snapToPartnerCard(animate = true, swipeInfo = false) {
    // 스와이프 정보 파싱 (하위 호환성 유지)
    let isFastSwipe = false;
    let swipeType = 'slow';
    let velocity = 0;

    if (typeof swipeInfo === 'object' && swipeInfo !== null) {
      // 새로운 객체 형태의 스와이프 정보
      isFastSwipe = swipeInfo.isFastSwipe || false;
      swipeType = swipeInfo.swipeType || 'slow';
      velocity = swipeInfo.velocity || 0;
    } else {
      // 기존 boolean 형태 (하위 호환성)
      isFastSwipe = swipeInfo;
      swipeType = isFastSwipe ? 'fast' : 'slow';
    }
    const cardsContainer = document.getElementById('partner-cards-container');
    if (!cardsContainer) return;

    // 정확한 스냅 포지션 계산 - 부모 컨테이너 기준
    const swiperContainer = document.getElementById('mobile-partner-swiper');
    if (!swiperContainer) return;

    // 크기 계산을 getBoundingClientRect()로 통일
    const containerRect = swiperContainer.getBoundingClientRect();
    const containerWidth = containerRect.width;

    // 실제 카드 크기 확인 (margin 고려)
    const cards = cardsContainer.querySelectorAll('.partner-card');
    if (cards.length === 0) return;

    const firstCard = cards[0];
    const cardRect = firstCard.getBoundingClientRect();
    const cardStyle = getComputedStyle(firstCard);
    const cardMarginLeft = parseFloat(cardStyle.marginLeft) || 0;
    const cardMarginRight = parseFloat(cardStyle.marginRight) || 0;

    // 실제 카드 간격 = 카드 너비 + 양쪽 마진
    const cardSpacing = cardRect.width + cardMarginLeft + cardMarginRight;
    const targetPosition = -(this.currentPartnerIndex * cardSpacing);

    // 스와이프 속도에 따른 다이나믹 애니메이션 타이밍 조정
    const animationConfig = {
      slow: {
        duration: 650,     // 느린 스와이프: 더 길고 부드러운 애니메이션
        easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)' // ease-out-quad (부드럽게)
      },
      medium: {
        duration: 450,     // 중간 스와이프: 적당한 속도
        easing: 'cubic-bezier(0.4, 0.0, 0.2, 1)' // ease-in-out (균형잡힌)
      },
      fast: {
        duration: 280,     // 빠른 스와이프: 빠르고 반응적
        easing: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)' // ease-back (약간의 탄성)
      }
    };

    // 속도 기반 애니메이션 설정 선택
    const config = animationConfig[swipeType] || animationConfig.slow;

    // 관성 효과: 속도가 높을수록 약간 더 빠르게 (최대 20% 단축)
    const velocityFactor = Math.min(velocity * 0.1, 0.2); // 0~0.2 범위
    const finalDuration = Math.round(config.duration * (1 - velocityFactor));

    const duration = finalDuration;
    const easing = config.easing;

    // 카드 크기 동기화 정보 로깅 (강제 변경하지 않음)
    console.log('🔧 [Snap] 카드 크기 분석:', {
      containerWidth: containerWidth,
      cardWidth: cardRect.width,
      cardMarginLeft,
      cardMarginRight,
      cardSpacing,
      targetPosition
    });

    console.log('📍 [Snap] 관성 효과 부드러운 스냅:', {
      currentIndex: this.currentPartnerIndex,
      containerWidth: containerWidth,
      cardSpacing,
      targetPosition,
      animate,
      swipeType,
      velocity: velocity.toFixed(3),
      velocityFactor: velocityFactor.toFixed(3),
      baseDuration: config.duration + 'ms',
      finalDuration: duration + 'ms',
      easing: config.easing
    });

    if (animate) {
      // 스와이프 속도에 따른 부드러운 전환
      cardsContainer.style.transition = `transform ${duration}ms ${easing}`;
      cardsContainer.style.transform = `translateX(${targetPosition}px)`;

      // 전환 완료 후 transition 제거 및 위치 재검증
      setTimeout(() => {
        cardsContainer.style.transition = 'none';

        // 정확한 위치 재검증 및 강제 수정
        const finalPosition = -(this.currentPartnerIndex * cardSpacing);
        const currentTransform = cardsContainer.style.transform;
        const currentMatrix = new WebKitCSSMatrix(currentTransform);
        const currentX = currentMatrix.m41; // translateX 값

        // 1px 이상의 오차가 있으면 수정
        if (Math.abs(currentX - finalPosition) > 1) {
          console.warn('⚠️ [Snap] 애니메이션 후 위치 오차 감지 및 수정:', {
            expected: finalPosition,
            actual: currentX,
            diff: Math.abs(currentX - finalPosition)
          });
          cardsContainer.style.transform = `translateX(${finalPosition}px)`;
        }
      }, duration + 50); // 약간의 여유 시간 추가
    } else {
      // 즉시 이동 (리사이즈 등의 경우)
      cardsContainer.style.transition = 'none';
      cardsContainer.style.transform = `translateX(${targetPosition}px)`;

      // 즉시 모드에서도 정확성 검증
      requestAnimationFrame(() => {
        const currentTransform = cardsContainer.style.transform;
        if (!currentTransform.includes(`translateX(${targetPosition}px)`)) {
          console.warn('⚠️ [Snap] 즉시 모드 위치 오차 수정');
          cardsContainer.style.transform = `translateX(${targetPosition}px)`;
        }
      });
    }
  }

  // Update partner card position (즉시 업데이트용)
  updatePartnerCardPosition() {
    const cardsContainer = document.getElementById('partner-cards-container');
    if (!cardsContainer) return;

    // 부모 컨테이너 기준으로 일관된 계산 (snapToPartnerCard와 동일한 방식)
    const swiperContainer = document.getElementById('mobile-partner-swiper');
    if (!swiperContainer) return;

    const containerRect = swiperContainer.getBoundingClientRect();
    const containerWidth = containerRect.width;

    // 실제 카드 크기 확인 (margin 고려)
    const cards = cardsContainer.querySelectorAll('.partner-card');
    if (cards.length === 0) return;

    const firstCard = cards[0];
    const cardRect = firstCard.getBoundingClientRect();
    const cardStyle = getComputedStyle(firstCard);
    const cardMarginLeft = parseFloat(cardStyle.marginLeft) || 0;
    const cardMarginRight = parseFloat(cardStyle.marginRight) || 0;

    // 실제 카드 간격 = 카드 너비 + 양쪽 마진
    const cardSpacing = cardRect.width + cardMarginLeft + cardMarginRight;
    const targetPosition = -(this.currentPartnerIndex * cardSpacing);

    console.log('🔄 [Update] 카드 크기 통일 위치 업데이트:', {
      currentIndex: this.currentPartnerIndex,
      containerWidth,
      cardSpacing,
      targetPosition
    });

    cardsContainer.style.transition = 'none';
    cardsContainer.style.transform = `translateX(${targetPosition}px)`;
  }

  // Update partner navigation buttons
  updatePartnerNavigationButtons(canGoPrev, canGoNext) {
    const prevBtn = document.getElementById('prev-partner-btn');
    const nextBtn = document.getElementById('next-partner-btn');

    if (prevBtn) {
      prevBtn.disabled = !canGoPrev;
      prevBtn.classList.toggle('disabled', !canGoPrev);
    }
    if (nextBtn) {
      nextBtn.disabled = !canGoNext;
      nextBtn.classList.toggle('disabled', !canGoNext);
    }
  }

  // Update partner pagination
  updatePartnerPagination(totalCards) {
    const pagination = document.getElementById('partner-swiper-pagination');
    if (!pagination) return;

    const dotsHTML = Array.from({ length: totalCards }, (_, i) =>
      `<span class="pagination-dot ${i === 0 ? 'active' : ''}" data-index="${i}"></span>`
    ).join('');

    pagination.innerHTML = dotsHTML;

    // Add click handlers to dots
    pagination.querySelectorAll('.pagination-dot').forEach((dot, index) => {
      dot.addEventListener('click', () => {
        // 페이지네이션 클릭 감지
        this.onUserInteraction();

        this.currentPartnerIndex = index;
        this.snapToPartnerCard();
        this.updatePartnerNavigationButtons(
          index > 0,
          index < totalCards - 1
        );
        this.updatePartnerCounter(index, totalCards);
        this.updatePartnerPaginationActive(index);
      });
    });
  }

  // Update active partner pagination dot
  updatePartnerPaginationActive(activeIndex) {
    const dots = document.querySelectorAll('#partner-swiper-pagination .pagination-dot');
    dots.forEach((dot, index) => {
      dot.classList.toggle('active', index === activeIndex);
    });
  }

  // Update partner counter
  updatePartnerCounter(current, total) {
    const counter = document.getElementById('partner-counter');
    if (counter) {
      counter.textContent = `${current + 1} / ${total}`;
    }
  }

  // 힌트 타이머 시작
  startHintTimer() {
    this.clearHintTimer();
    this.hintTimeout = setTimeout(() => {
      this.showCurrentHint();
    }, 5000);
  }

  // 힌트 타이머 클리어
  clearHintTimer() {
    if (this.hintTimeout) {
      clearTimeout(this.hintTimeout);
      this.hintTimeout = null;
    }
  }

  // 현재 카드의 힌트 표시
  showCurrentHint() {
    this.hideAllHints();
    const currentHint = document.getElementById(`hint-${this.currentPartnerIndex}`);
    if (currentHint) {
      currentHint.style.display = 'flex';
      this.isHintVisible = true;
    }
  }

  // 모든 힌트 숨기기
  hideAllHints() {
    const hints = document.querySelectorAll('.partner-action-hint');
    hints.forEach(hint => {
      hint.style.display = 'none';
    });
    this.isHintVisible = false;
  }

  // 움직임이 감지되었을 때 힌트 숨기기
  onUserInteraction() {
    this.hideAllHints();
    this.clearHintTimer();
    this.startHintTimer();
  }

  // Handle user selection for quiz
  async selectUserForQuiz(userId, userName) {
    try {
      console.log('🎯 [UI] 사용자 선택:', { userId, userName });
      console.log('🎯 [UI] quiz 객체 확인:', window.quiz);

      // Start quiz with selected user
      if (window.quiz && typeof window.quiz.startQuizWithTarget === 'function') {
        console.log('🎯 [UI] quiz.startQuizWithTarget 호출 시작');
        await quiz.startQuizWithTarget(userId);
        console.log('🎯 [UI] quiz.startQuizWithTarget 호출 완료');
      } else {
        console.error('🎯 [UI] quiz 객체 또는 startQuizWithTarget 메서드를 찾을 수 없음');
        this.showToast('퀴즈 시스템을 초기화할 수 없습니다', 'error');
      }
    } catch (error) {
      console.error('Error starting quiz with user:', error);
      this.showToast('퀴즈 시작 실패: ' + error.message, 'error');
    }
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

  // 🧪 스와이프 테스트 함수들
  simulateSwipe(direction, speed = 'normal', distance = 150) {
    console.log(`🧪 [Test] 스와이프 시뮬레이션 시작: ${direction}, ${speed}, ${distance}px`);

    const swiper = document.getElementById('mobile-partner-swiper');
    if (!swiper) {
      console.error('❌ [Test] 모바일 스와이퍼를 찾을 수 없습니다');
      return false;
    }

    const swiperBox = swiper.getBoundingClientRect();
    const startX = direction === 'left' ? swiperBox.width * 0.8 : swiperBox.width * 0.2;
    const endX = direction === 'left' ? swiperBox.width * 0.2 : swiperBox.width * 0.8;
    const centerY = swiperBox.height / 2;

    // 속도별 타이밍 설정
    const timings = {
      'slow': 800,
      'normal': 300,
      'fast': 150,
      'veryfast': 50
    };

    const duration = timings[speed] || 300;

    console.log(`🧪 [Test] 시뮬레이션 파라미터:`, {
      startX, endX, centerY, duration,
      swiperWidth: swiperBox.width,
      direction, speed
    });

    // Touch 이벤트 시뮬레이션
    const startEvent = new TouchEvent('touchstart', {
      touches: [{
        clientX: startX,
        clientY: centerY,
        identifier: 0
      }],
      bubbles: true,
      cancelable: true
    });

    const moveEvent = new TouchEvent('touchmove', {
      touches: [{
        clientX: endX,
        clientY: centerY,
        identifier: 0
      }],
      bubbles: true,
      cancelable: true
    });

    const endEvent = new TouchEvent('touchend', {
      changedTouches: [{
        clientX: endX,
        clientY: centerY,
        identifier: 0
      }],
      bubbles: true,
      cancelable: true
    });

    // 이벤트 순차 실행
    swiper.dispatchEvent(startEvent);
    console.log('🧪 [Test] touchstart 이벤트 발생');

    setTimeout(() => {
      swiper.dispatchEvent(moveEvent);
      console.log('🧪 [Test] touchmove 이벤트 발생');

      setTimeout(() => {
        swiper.dispatchEvent(endEvent);
        console.log('🧪 [Test] touchend 이벤트 발생');
        console.log('✅ [Test] 스와이프 시뮬레이션 완료');
      }, 50);
    }, duration);

    return true;
  }

  testAllSwipeSpeeds() {
    console.log('🚀 [Test] 전체 스와이프 속도 테스트 시작');

    const tests = [
      { direction: 'left', speed: 'slow', delay: 0 },
      { direction: 'right', speed: 'normal', delay: 2000 },
      { direction: 'left', speed: 'fast', delay: 4000 },
      { direction: 'right', speed: 'veryfast', delay: 6000 }
    ];

    tests.forEach((test, index) => {
      setTimeout(() => {
        console.log(`\n🧪 [Test] ${index + 1}/${tests.length}: ${test.speed} 스와이프 (${test.direction})`);
        this.simulateSwipe(test.direction, test.speed);
      }, test.delay);
    });

    setTimeout(() => {
      console.log('\n📊 [Test] 전체 테스트 완료 - 정렬 상태 확인');
      this.checkAlignment();
    }, 8000);
  }

  checkAlignment() {
    const cardsContainer = document.getElementById('partner-cards-container');
    const swiperContainer = document.getElementById('mobile-partner-swiper');

    if (!cardsContainer || !swiperContainer) {
      console.error('❌ [Test] 컨테이너를 찾을 수 없습니다');
      return false;
    }

    // 크기 계산을 getBoundingClientRect()로 통일
    const containerRect = swiperContainer.getBoundingClientRect();
    const containerWidth = containerRect.width;

    // 실제 카드 크기 확인 (margin 고려)
    const cards = document.querySelectorAll('.partner-card');
    if (cards.length === 0) return false;

    const firstCard = cards[0];
    const cardRect = firstCard.getBoundingClientRect();
    const cardStyle = getComputedStyle(firstCard);
    const cardMarginLeft = parseFloat(cardStyle.marginLeft) || 0;
    const cardMarginRight = parseFloat(cardStyle.marginRight) || 0;

    // 실제 카드 간격 = 카드 너비 + 양쪽 마진
    const cardSpacing = cardRect.width + cardMarginLeft + cardMarginRight;
    const expectedPosition = -(this.currentPartnerIndex * cardSpacing);
    const currentTransform = cardsContainer.style.transform;

    console.log('📊 [Test] 카드 크기 통일 정렬 분석:', {
      currentIndex: this.currentPartnerIndex,
      containerWidth,
      cardWidth: cardRect.width,
      cardMarginLeft,
      cardMarginRight,
      cardSpacing,
      expectedPosition: expectedPosition + 'px',
      actualTransform: currentTransform
    });

    const isAligned = currentTransform.includes(`translateX(${expectedPosition}px)`);

    if (isAligned) {
      console.log('✅ [Test] 카드가 정확히 정렬되어 있습니다');
    } else {
      console.warn('⚠️ [Test] 카드 정렬에 오차가 있습니다');
    }

    return isAligned;
  }

  // 정렬 검증 및 수정
  verifyAndFixAlignment() {
    const cardsContainer = document.getElementById('partner-cards-container');
    const swiperContainer = document.getElementById('mobile-partner-swiper');

    if (!cardsContainer || !swiperContainer) {
      console.error('❌ [Verify] 컨테이너를 찾을 수 없습니다');
      return;
    }

    // 크기 계산을 getBoundingClientRect()로 통일
    const containerRect = swiperContainer.getBoundingClientRect();
    const containerWidth = containerRect.width;

    // 실제 카드 크기 확인 (margin 고려)
    const cards = cardsContainer.querySelectorAll('.partner-card');
    if (cards.length === 0) return;

    const firstCard = cards[0];
    const cardRect = firstCard.getBoundingClientRect();
    const cardStyle = getComputedStyle(firstCard);
    const cardMarginLeft = parseFloat(cardStyle.marginLeft) || 0;
    const cardMarginRight = parseFloat(cardStyle.marginRight) || 0;

    // 실제 카드 간격 = 카드 너비 + 양쪽 마진
    const cardSpacing = cardRect.width + cardMarginLeft + cardMarginRight;
    const expectedPosition = -(this.currentPartnerIndex * cardSpacing);
    const currentTransform = cardsContainer.style.transform;

    console.log('🔍 [Verify] 카드 크기 통일 정렬 검증:', {
      currentIndex: this.currentPartnerIndex,
      containerWidth,
      cardWidth: cardRect.width,
      cardMarginLeft,
      cardMarginRight,
      cardSpacing,
      expectedPosition: expectedPosition + 'px',
      actualTransform: currentTransform
    });

    // 현재 transform에서 translateX 값 추출
    const transformMatch = currentTransform.match(/translateX\((-?\d+(?:\.\d+)?)px\)/);
    const actualPosition = transformMatch ? parseFloat(transformMatch[1]) : 0;

    const positionDiff = Math.abs(actualPosition - expectedPosition);
    const tolerance = 1; // 1px 허용 오차

    console.log('📊 [Verify] 위치 분석:', {
      expectedPosition,
      actualPosition,
      positionDiff,
      tolerance,
      needsCorrection: positionDiff > tolerance
    });

    if (positionDiff > tolerance) {
      console.warn('⚠️ [Verify] 위치 오차 감지 - 재정렬 실행');

      // 즉시 정확한 위치로 수정
      cardsContainer.style.transition = 'transform 0.2s ease-out';
      cardsContainer.style.transform = `translateX(${expectedPosition}px)`;

      // transition 정리
      setTimeout(() => {
        cardsContainer.style.transition = 'none';
        console.log('✅ [Verify] 재정렬 완료:', expectedPosition + 'px');
      }, 200);
    } else {
      console.log('✅ [Verify] 정렬 상태 정상');
    }
  }
}

// Create global UI instance
window.ui = new UIManager();