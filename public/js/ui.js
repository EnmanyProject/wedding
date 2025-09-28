// UI Management for A&B Meeting App
class UIManager {
  constructor() {
    this.currentView = 'home';
    this.socket = null;
    this.init();
  }

  init() {
    this.setupNavigation();
    this.setupModals();
    this.setupToasts();
    this.loadUserData();

    // Hide loading screen after initialization
    setTimeout(() => {
      document.getElementById('loading-screen').style.display = 'none';
      document.getElementById('app').style.display = 'block';
    }, 1000);
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
  }

  // Switch between views
  switchView(viewName) {
    // Hide all views
    document.querySelectorAll('.view').forEach(view => {
      view.classList.remove('active');
    });

    // Show target view
    const targetView = document.getElementById(`${viewName}-view`);
    if (targetView) {
      targetView.classList.add('active');
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

  // Load home view data
  async loadHomeData() {
    try {
      // Load points
      const pointsData = await api.getMyPoints();
      this.updatePointsDisplay(pointsData.data.balance);

      // Load basic rankings for home
      const rankingsData = await api.getMyRanking();
      this.updateHomeRankings(rankingsData.data.rankings.slice(0, 3));

      // Load meeting state
      const meetingData = await api.getMeetingState();
      this.updateHomeMeetings(meetingData.data.available_meetings.slice(0, 3));
    } catch (error) {
      console.error('Error loading home data:', error);
    }
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

  // Update home rankings
  updateHomeRankings(rankings) {
    const rankingsList = document.getElementById('rankings-list');
    if (!rankingsList) return;

    if (rankings.length === 0) {
      rankingsList.innerHTML = `
        <div class="ranking-placeholder">
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
      const imageUrl = thumbAsset?.url || '';

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
  }

  openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
  }

  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove('active');
      document.body.style.overflow = '';
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
}

// Create global UI instance
window.ui = new UIManager();