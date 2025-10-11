// UI Management for A&B Meeting App
import { ErrorHandler } from '/js/utils/error-handler.js';
import {
  renderEmptyState,
  updatePagination,
  updateNavigationButtons,
  showLoading,
  hideLoading
} from '/js/utils/ui-components.js';
import {
  formatRelativeTime,
  formatCompactNumber
} from '/js/utils/formatters.js';
import { MobileSwiper } from '/js/utils/mobile-swiper.js';

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
        // Only switch view if data-view attribute exists
        if (view) {
          this.switchView(view);
        }
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

      // Force hide any loading overlays
      const globalOverlay = document.getElementById('global-loading-overlay');
      if (globalOverlay) {
        globalOverlay.style.display = 'none';
        globalOverlay.classList.add('hidden');
        console.log('✅ [UI] 글로벌 로딩 오버레이 강제 숨김');
      }

    } catch (error) {
      console.error('🚨 [UI] 데이터 로딩 실패:', error);
      this.showToast('데이터를 불러오지 못했습니다', 'error');
      this.initializeDefaultHomeData();

      // Force hide any loading overlays even on error
      const globalOverlay = document.getElementById('global-loading-overlay');
      if (globalOverlay) {
        globalOverlay.style.display = 'none';
        globalOverlay.classList.add('hidden');
        console.log('✅ [UI] 에러 후 글로벌 로딩 오버레이 강제 숨김');
      }
    }
  }

  // 🔧 NEW: 개별 데이터 로딩 메서드들
  async loadPointsData() {
    // Points display removed - using Ring system instead
    return { success: true };
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
      // Load recommendations first
      await this.loadRecommendations();

      // Then load rankings
      const rankingsData = await api.getMyRanking();
      this.renderDetailedRankings(rankingsData.data.rankings);
    } catch (error) {
      console.error('Error loading rankings:', error);
      this.showToast('랭킹 데이터 로딩 실패', 'error');
    }
  }

  // Load daily recommendations
  async loadRecommendations() {
    const recommendationsList = document.getElementById('recommendations-list');
    if (!recommendationsList) return;

    try {
      // Show loading state
      recommendationsList.innerHTML = `
        <div class="recommendations-loading">
          <div class="spinner"></div>
        </div>
      `;

      const response = await api.getTodayRecommendations();

      if (response.success && response.recommendations && response.recommendations.length > 0) {
        this.renderRecommendations(response.recommendations);
      } else {
        // No recommendations available
        recommendationsList.innerHTML = `
          <div class="recommendations-empty">
            <img src="/images/Bety1.png" alt="Bety" class="bety-character character-float" style="width: 60px; height: 60px; margin-bottom: 1rem;">
            <p>아직 추천이 없습니다</p>
          </div>
        `;
      }
    } catch (error) {
      console.error('Error loading recommendations:', error);
      recommendationsList.innerHTML = `
        <div class="recommendations-empty">
          <img src="/images/Bety6.png" alt="Bety" class="bety-character" style="width: 60px; height: 60px; margin-bottom: 1rem;">
          <p>추천을 불러오지 못했습니다</p>
        </div>
      `;
    }
  }

  // Render recommendations
  renderRecommendations(recommendations) {
    const recommendationsList = document.getElementById('recommendations-list');
    if (!recommendationsList) return;

    recommendationsList.innerHTML = recommendations.map(rec => `
      <div class="recommendation-card" data-id="${rec.id}" data-user-id="${rec.recommendedUserId}">
        <div class="recommendation-rank">${rec.rank}</div>
        <div class="recommendation-content">
          <div class="recommendation-avatar">
            ${rec.userDisplayName.charAt(0)}
          </div>
          <div class="recommendation-info">
            <div class="recommendation-name">${rec.userDisplayName}</div>
            <div class="recommendation-meta">
              <span>${rec.userAge}세</span>
              <span>${rec.userRegion}</span>
            </div>
            <div class="recommendation-score-bar">
              <div class="score-label">
                <span>매칭 점수</span>
                <span>${rec.score}점</span>
              </div>
              <div class="score-progress">
                <div class="score-fill" style="width: ${rec.score}%"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `).join('');

    // Add click event listeners
    recommendationsList.querySelectorAll('.recommendation-card').forEach(card => {
      card.addEventListener('click', async () => {
        const recommendationId = card.dataset.id;
        const userId = card.dataset.userId;

        // Mark as clicked
        card.classList.add('clicked');
        await api.markRecommendationClicked(recommendationId);

        // Start quiz
        await api.markRecommendationQuizStarted(recommendationId);
        await this.startQuiz(userId);
      });
    });
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

  // Render empty swiper (delegated to ui-components utility)
  renderEmptySwiper() {
    const cardsContainer = document.getElementById('user-cards-container');
    const pagination = document.getElementById('swiper-pagination');
    const controls = document.getElementById('swiper-controls');

    if (cardsContainer) {
      renderEmptyState(cardsContainer, {
        message: '아직 호감도 데이터가 없습니다',
        description: '퀴즈를 시작하여 다른 사용자들과 친밀도를 쌓아보세요!',
        betyImage: '/images/Bety3.png',
        containerClass: 'user-card empty'
      });
    }

    if (pagination) pagination.innerHTML = '';
    if (controls) {
      const counter = controls.querySelector('#user-counter');
      if (counter) counter.textContent = '0 / 0';
      updateNavigationButtons(controls.querySelector('#prev-user-btn'), controls.querySelector('#next-user-btn'), false, false);
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

    // Create MobileSwiper instance for Rankings
    this.rankingsSwiper = new MobileSwiper({
      containerSelector: '#user-cards-container',
      prevBtnSelector: '#prev-user-btn',
      nextBtnSelector: '#next-user-btn',
      paginationSelector: '#swiper-pagination',
      counterSelector: '#swiper-counter',

      onNavigate: (index, direction) => {
        this.currentCardIndex = index;
        this.updatePaginationActive(index);
      },

      onInteraction: () => {
        // User interaction callback
      },

      enableKeyboard: true,
      enableVelocity: false,
      usePixelTransform: false,
      considerPadding: false
    });

    this.rankingsSwiper.init(this.currentRankings.length);
    this.swiperInitialized = true;
  }


  // Update pagination dots (delegated to ui-components utility)
  updatePagination(totalCards) {
    const pagination = document.getElementById('swiper-pagination');
    updatePagination(pagination, totalCards, this.currentCardIndex, (index) => {
      this.currentCardIndex = index;
      this.updateCardPosition();
      this.updateNavigationButtons(
        index > 0,
        index < totalCards - 1
      );
      this.updateCounter(index, totalCards);
    });
  }

  // Update active pagination dot (delegated to ui-components utility)
  updatePaginationActive(activeIndex) {
    const pagination = document.getElementById('swiper-pagination');
    updatePagination(pagination, this.currentRankings.length, activeIndex);
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

    // Profile modal "매칭점수+" button
    const startMatchingBtn = document.getElementById('start-matching-btn');
    if (startMatchingBtn) {
      startMatchingBtn.addEventListener('click', () => {
        const userId = startMatchingBtn.dataset.userId;
        if (userId) {
          this.startQuizFromProfile(userId);
        } else {
          console.error('👤 [Profile Modal] userId가 설정되지 않음');
          this.showToast('사용자 정보를 찾을 수 없습니다', 'error');
        }
      });
    }
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
      // Remove focus from any element inside the modal before hiding
      const focusedElement = modal.querySelector(':focus');
      if (focusedElement) {
        focusedElement.blur();
      }

      modal.classList.remove('active');
      modal.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';

      // Return focus to the element that opened the modal or body
      setTimeout(() => {
        const openButton = document.getElementById('start-quiz-btn');
        if (openButton && modalId === 'quiz-modal') {
          openButton.focus();
        } else {
          // Fallback: focus on body to ensure focus is outside modal
          document.body.focus();
        }
      }, 50);
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

  // Format date/time (delegated to formatters utility)
  formatDate(dateString) {
    return formatRelativeTime(dateString);
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

    // Check if we're in desktop mode for grid layout
    const isDesktop = window.ResponsiveDetector && window.ResponsiveDetector.isDesktop();

    if (isDesktop) {
      this.renderPartnerGrid(targets);
    } else {
      this.renderPartnerCards(targets);
      this.initializePartnerSwiper();
    }

    // Update CardGridManager if available
    if (window.partnerGridManager && typeof window.partnerGridManager.setCards === 'function') {
      window.partnerGridManager.setCards(targets);
    }
  }

  // Render partner cards in grid mode (desktop)
  renderPartnerGrid(targets) {
    console.log('🖥️ [UI] Rendering partner cards in grid mode');
    const cardsContainer = document.getElementById('partner-cards-container');
    if (!cardsContainer) return;

    // Add grid mode class
    cardsContainer.classList.add('grid-mode');
    cardsContainer.classList.remove('swiper-mode');

    // Render all cards (no swiper initialization needed)
    this.renderPartnerCards(targets);

    // Hide swiper controls
    const pagination = document.getElementById('partner-swiper-pagination');
    const controls = document.getElementById('partner-swiper-controls');
    if (pagination) pagination.style.display = 'none';
    if (controls) controls.style.display = 'none';
  }

  // Render empty partner swiper (delegated to ui-components utility)
  renderEmptyPartnerSwiper() {
    const cardsContainer = document.getElementById('partner-cards-container');
    const pagination = document.getElementById('partner-swiper-pagination');
    const controls = document.getElementById('partner-swiper-controls');

    if (cardsContainer) {
      renderEmptyState(cardsContainer, {
        message: '퀴즈를 답한 사용자가 없습니다',
        description: '나중에 다시 확인해주세요!',
        betyImage: '/images/Bety6.png',
        betyClass: 'character-wiggle',
        containerClass: 'partner-card empty'
      });
    }

    if (pagination) pagination.innerHTML = '';
    if (controls) {
      const counter = controls.querySelector('#partner-counter');
      if (counter) counter.textContent = '0 / 0';
      updateNavigationButtons(controls.querySelector('#prev-partner-btn'), controls.querySelector('#next-partner-btn'), false, false);
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
            <p class="partner-username">${displayName}</p>
            <div class="partner-info">
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

    // Create MobileSwiper instance for Partners
    this.partnersSwiper = new MobileSwiper({
      containerSelector: '#partner-cards-container',
      prevBtnSelector: '#prev-partner-btn',
      nextBtnSelector: '#next-partner-btn',
      paginationSelector: '#partner-pagination',
      counterSelector: '#partner-counter',

      onNavigate: (index, direction) => {
        this.currentPartnerIndex = index;
        console.log(`🔄 [Partner] Navigated to ${index} (${direction})`);
      },

      onInteraction: () => {
        this.isPartnerSwiping = true;
        this.onUserInteraction();
      },

      enableKeyboard: false, // Partner swiper doesn't use keyboard
      enableVelocity: true, // Partners uses advanced velocity tracking
      usePixelTransform: false, // Use percentage-based transforms for accuracy
      considerPadding: false // No padding calculation needed
    });

    this.currentPartnerIndex = 0;
    this.partnersSwiper.init(this.currentPartners.length);

    // Initial stabilization
    setTimeout(() => {
      this.partnersSwiper.updatePosition(false);

      // Start auto-play after 3 seconds (3000ms interval)
      console.log('🎬 [Partner Swiper] Auto-play starting in 3 seconds...');
      setTimeout(() => {
        if (this.currentPartners.length > 1) {
          this.partnersSwiper.startAutoPlay(3000);
        }
      }, 3000);
    }, 100);

    // Start hint timer
    this.startHintTimer();

    // Setup resize handler
    this.setupPartnerResizeHandler();

    this.partnerSwiperInitialized = true;
  }


  // Setup resize handler for partner swiper
  setupPartnerResizeHandler() {
    // ⚡ 성능 최적화: debounce 적용
    const resizeHandler = () => {
      console.log('📱 [Resize] 화면 크기 변경 감지, 카드 위치 재조정');
      if (this.partnersSwiper) {
        this.partnersSwiper.updatePosition(false); // 리사이즈 시에는 애니메이션 없이 즉시 이동
      }
    };

    // debounce가 로드되었으면 사용, 아니면 기본 setTimeout 방식
    const handleResize = this.debounce ?
      this.debounce(resizeHandler, 250) :
      resizeHandler;

    window.addEventListener('resize', handleResize);

    // orientationchange도 debounce 적용
    const orientationHandler = () => {
      console.log('📱 [Orientation] 화면 방향 변경 감지, 카드 위치 재조정');
      if (this.partnersSwiper) {
        this.partnersSwiper.updatePosition(false);
      }
    };

    const handleOrientation = this.debounce ?
      this.debounce(orientationHandler, 300) :
      orientationHandler;

    window.addEventListener('orientationchange', handleOrientation);
  }





  // Update partner pagination (delegated to ui-components utility)
  updatePartnerPagination(totalCards) {
    const pagination = document.getElementById('partner-swiper-pagination');
    updatePagination(pagination, totalCards, this.currentPartnerIndex, (index) => {
      this.onUserInteraction();
      if (this.partnersSwiper) {
        this.partnersSwiper.goTo(index, true);
      }
      // Navigation buttons are now handled automatically by MobileSwiper
      this.updatePartnerCounter(index, totalCards);
    });
  }

  // Update active partner pagination dot (delegated to ui-components utility)
  updatePartnerPaginationActive(activeIndex) {
    const pagination = document.getElementById('partner-swiper-pagination');
    updatePagination(pagination, this.currentPartners.length, activeIndex);
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

      // Find user data from currentPartners
      const userData = this.currentPartners.find(p => p.id === userId);
      if (!userData) {
        console.error('🎯 [UI] 사용자 데이터를 찾을 수 없음:', userId);
        this.showToast('사용자 정보를 불러올 수 없습니다', 'error');
        return;
      }

      // Show profile preview modal instead of starting quiz directly
      this.showUserProfileModal(userId, userData);
    } catch (error) {
      console.error('Error selecting user for quiz:', error);
      this.showToast('오류가 발생했습니다: ' + error.message, 'error');
    }
  }

  // Show user profile preview modal
  showUserProfileModal(userId, userData) {
    console.log('👤 [Profile Modal] 모달 표시:', { userId, userData });

    const modal = document.getElementById('user-profile-modal');
    const profileImage = document.getElementById('profile-preview-image');
    const verificationGrid = document.getElementById('verification-grid');
    const startMatchingBtn = document.getElementById('start-matching-btn');

    if (!modal || !profileImage || !verificationGrid || !startMatchingBtn) {
      console.error('👤 [Profile Modal] 모달 요소를 찾을 수 없음');
      return;
    }

    // Set profile image
    const displayName = userData.display_name_for_ui || userData.display_name || userData.name;
    const femaleImageStyles = [
      'lorelei-neutral', 'avataaars-neutral', 'adventurer-neutral',
      'fun-emoji', 'miniavs', 'notionists-neutral', 'personas'
    ];
    const styleIndex = userData.name.charCodeAt(0) % femaleImageStyles.length;
    const selectedStyle = femaleImageStyles[styleIndex];
    const colorSchemes = [
      'ffd1dc,ffb3ba,fce4ec', 'e1f5fe,b3e5fc,81d4fa', 'f3e5f5,e1bee7,ce93d8',
      'fff3e0,ffcc80,ffb74d', 'f1f8e9,c8e6c9,a5d6a7', 'fce4ec,f8bbd9,f48fb1',
      'e8f5e8,c8e6c9,a5d6a7'
    ];
    const colorIndex = userData.name.charCodeAt(1) % colorSchemes.length;
    const backgroundColor = colorSchemes[colorIndex];

    profileImage.src = userData.profile_image_url ||
      `https://api.dicebear.com/7.x/${selectedStyle}/svg?seed=${encodeURIComponent(userData.name + 'female')}&backgroundColor=${backgroundColor}&scale=120&radius=50&backgroundType=gradientLinear&flip=false`;
    profileImage.alt = `${displayName} 프로필`;

    // Render verification icons
    this.renderVerificationIcons(verificationGrid, userData);

    // Show modal
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';

    // Store current user ID for matching button
    startMatchingBtn.dataset.userId = userId;

    console.log('✅ [Profile Modal] 모달 표시 완료');
  }

  // Render verification icons (원형 배지 스타일)
  renderVerificationIcons(container, userData) {
    // Mock verification data (실제로는 백엔드에서 가져와야 함)
    const verifications = [
      { icon: '✅', label: '본인인증', verified: true },
      { icon: '🎂', label: '나이', verified: true },
      { icon: '📍', label: '지역', verified: true },
      { icon: '🎓', label: '학력', verified: true },
      { icon: '💰', label: '소득', verified: Math.random() > 0.5 },
      { icon: '🏠', label: '재산', verified: Math.random() > 0.5 },
      { icon: '💼', label: '직업', verified: Math.random() > 0.5 }
    ];

    const html = verifications.map(v => `
      <div class="verification-item ${v.verified ? 'verified' : 'unverified'}" data-label="${v.label}">
        <span class="verification-icon">${v.icon}</span>
        <span class="verification-status ${v.verified ? 'verified' : 'unverified'}">${v.verified ? '✓' : '✗'}</span>
      </div>
    `).join('');

    container.innerHTML = html;
  }

  // Close user profile modal
  closeUserProfileModal() {
    console.log('❌ [Profile Modal] 모달 닫기 요청');
    this.closeModal('user-profile-modal');
  }

  // Start quiz from profile modal
  async startQuizFromProfile(userId) {
    try {
      console.log('🎯 [Profile Modal] 퀴즈 시작:', userId);

      // Close profile modal
      this.closeUserProfileModal();

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
      console.error('Error starting quiz from profile:', error);
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