// Main Application Controller for A&B Meeting App
class App {
  constructor() {
    this.version = '1.0.0';
    this.initialized = false;
    this.socket = null;
    this.init();
  }

  async init() {
    try {
      SecurityUtils.safeLog(`A&B Meeting App v${this.version} initializing...`);

      // Initialize core services (베티 매니저 대기 제거)
      await this.initializeServices();

      // Setup development tools if in dev mode
      if (this.isDevelopment()) {
        await this.setupDevelopmentTools();
      }

      // Setup real-time features (임시 비활성화)
      // this.setupWebSocket();

      // Setup PWA features
      this.setupPWA();

      // Setup analytics (anonymized)
      this.setupAnalytics();

      this.initialized = true;
      SecurityUtils.safeLog('A&B Meeting App initialized successfully');

    } catch (error) {
      SecurityUtils.safeLog('App initialization failed:', error);
      // 오류가 있어도 앱은 표시
      if (window.ui) {
        ui.showToast('일부 기능이 제한될 수 있습니다', 'warning');
      }
    }
  }

  // 베티 매니저 준비 대기
  async waitForBetyManager() {
    return new Promise((resolve) => {
      if (window.betyManager && window.betyManager.isInitialized) {
        SecurityUtils.safeLog('🎭 [App] Bety Manager already ready');
        resolve();
        return;
      }

      // 베티 매니저 준비 이벤트 대기
      const handleBetyReady = () => {
        SecurityUtils.safeLog('🎭 [App] Bety Manager ready');
        document.removeEventListener('betyManagerReady', handleBetyReady);
        resolve();
      };

      document.addEventListener('betyManagerReady', handleBetyReady);

      // 타임아웃 설정 (5초 후 강제 진행)
      setTimeout(() => {
        SecurityUtils.safeLog('🎭 [App] Bety Manager timeout, proceeding without it');
        document.removeEventListener('betyManagerReady', handleBetyReady);
        resolve();
      }, 5000);
    });
  }

  // Initialize core services
  async initializeServices() {
    // Check if we're in development and seed data if needed
    if (this.isDevelopment()) {
      try {
        const summaryData = await api.getSeedSummary();
        if (summaryData.data.currentCounts.users === 0) {
          SecurityUtils.safeLog('No seed data found, running development seeding...');
          await this.runDevelopmentSeed();
        }
      } catch (error) {
        console.warn('Could not check/seed development data:', error);
      }
    }

    // Initialize user session
    await this.initializeUserSession();

    // User count is handled by HTML initialization
  }

  // Initialize user session
  async initializeUserSession() {
    // Clear any existing invalid tokens
    if (api.token) {
      console.log('Clearing existing token and re-authenticating...');
      api.setToken(null);
    }

    // For demo purposes, create a test token if none exists
    if (!api.token) {
      console.log('No auth token found, attempting dev auto-login...');

      try {
        // Development auto-login
        const response = await fetch('/api/auth/dev-login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const result = await response.json();
          console.log('Auto-login response:', result);
          api.setToken(result.data.token);

          // Store user info
          localStorage.setItem('user', JSON.stringify(result.data.user));
          SecurityUtils.safeLog('Auto-login successful:', result.data.user.name);
          SecurityUtils.safeLog('Token set:', SecurityUtils.maskToken(result.data.token));

          // Show admin link for development (always visible in dev)
          const adminLink = document.getElementById('admin-link');
          if (adminLink) {
            adminLink.style.display = 'block';
          }

          // Load user data only after successful login
          try {
            await ui.loadUserData();
          } catch (error) {
            console.error('Failed to load user data after auto-login:', error);
          }
        } else {
          console.warn('Auto-login failed, using demo session...');
          // Fallback to demo token
          api.setToken('demo-user-token-12345');
          localStorage.setItem('demo_user', JSON.stringify({
            id: 'demo-user-1',
            name: '데모 사용자',
            email: 'demo@example.com'
          }));
        }
      } catch (error) {
        console.warn('Auto-login error, using demo session:', error);
        // Fallback to demo token
        api.setToken('demo-user-token-12345');
        localStorage.setItem('demo_user', JSON.stringify({
          id: 'demo-user-1',
          name: '데모 사용자',
          email: 'demo@example.com'
        }));
      }
    }
  }

  // Setup development tools
  async setupDevelopmentTools() {
    console.log('Setting up development tools...');

    // Add development menu
    this.addDevelopmentMenu();

    // Add keyboard shortcuts
    this.setupDevelopmentShortcuts();

    // 잠시 대기 후 개발 데이터 상태 확인
    await new Promise(resolve => setTimeout(resolve, 500));

    // Log current data status
    try {
      console.log('Checking development data status...');
      const summary = await api.getSeedSummary();
      console.log('Development data status:', summary.data);
    } catch (error) {
      console.warn('Could not get development status:', error);
    }
  }

  // Add development menu
  addDevelopmentMenu() {
    const devMenu = document.createElement('div');
    devMenu.id = 'dev-menu';
    devMenu.style.cssText = `
      position: fixed;
      top: 10px;
      left: 10px;
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 10px;
      border-radius: 8px;
      font-size: 12px;
      z-index: 9999;
      display: none;
    `;

    devMenu.innerHTML = `
      <div style="margin-bottom: 10px; font-weight: bold;">🛠️ Dev Tools</div>
      <button onclick="app.runDevelopmentSeed()">Seed Data</button>
      <button onclick="app.resetDevelopmentData()">Reset Data</button>
      <button onclick="app.showDevelopmentInfo()">Show Info</button>
      <button onclick="app.toggleDevMenu()">Hide</button>
    `;

    // Style buttons
    devMenu.querySelectorAll('button').forEach(btn => {
      btn.style.cssText = `
        background: #333;
        color: white;
        border: 1px solid #666;
        padding: 4px 8px;
        margin: 2px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 11px;
      `;
    });

    document.body.appendChild(devMenu);
  }

  // Setup development keyboard shortcuts
  setupDevelopmentShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Ctrl+Shift+D: Toggle dev menu
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        this.toggleDevMenu();
      }

      // Ctrl+Shift+S: Quick seed
      if (e.ctrlKey && e.shiftKey && e.key === 'S') {
        e.preventDefault();
        this.runDevelopmentSeed();
      }

      // Ctrl+Shift+R: Reset data
      if (e.ctrlKey && e.shiftKey && e.key === 'R') {
        e.preventDefault();
        this.resetDevelopmentData();
      }
    });
  }

  // Toggle development menu
  toggleDevMenu() {
    const menu = document.getElementById('dev-menu');
    if (menu) {
      menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
    }
  }

  // Run development seeding
  async runDevelopmentSeed() {
    try {
      ui.showToast('개발 데이터 시딩 중...', 'info');

      const result = await api.seedData({
        user_count: 20,
        trait_pairs: 30,
        photos_per_user: 3,
        quiz_sessions: 30,
        reset_first: false
      });

      console.log('Seed result:', result.data);
      ui.showToast(`시딩 완료! ${result.data.stats.usersCreated}명 사용자 생성`, 'success');

      // Reload current view
      await ui.loadViewData(ui.currentView);

    } catch (error) {
      console.error('Seeding failed:', error);
      ui.showToast('시딩 실패: ' + error.message, 'error');
    }
  }

  // Reset development data
  async resetDevelopmentData() {
    if (!confirm('모든 개발 데이터를 삭제하시겠습니까?')) {
      return;
    }

    try {
      ui.showToast('데이터 리셋 중...', 'info');

      await api.resetData();
      ui.showToast('데이터 리셋 완료', 'success');

      // Reload current view
      await ui.loadViewData(ui.currentView);

    } catch (error) {
      console.error('Reset failed:', error);
      ui.showToast('리셋 실패: ' + error.message, 'error');
    }
  }

  // Show development info
  async showDevelopmentInfo() {
    try {
      const [summary, config] = await Promise.all([
        api.getSeedSummary(),
        api.getDevConfig()
      ]);

      const info = `
Development Status:
- Users: ${summary.data.currentCounts.users}
- Photos: ${summary.data.currentCounts.photos}
- Trait Pairs: ${summary.data.currentCounts.traitPairs}
- Quiz Sessions: ${summary.data.currentCounts.quizSessions}

Configuration:
- Environment: ${config.data.node_env}
- Affinity T1: ${config.data.affinity_thresholds.t1}
- Affinity T2: ${config.data.affinity_thresholds.t2}
- Affinity T3: ${config.data.affinity_thresholds.t3}
- Quiz Cost: ${config.data.quiz_config.enter_cost}P
      `.trim();

      alert(info);

    } catch (error) {
      console.error('Failed to get dev info:', error);
      ui.showToast('개발 정보 조회 실패', 'error');
    }
  }

  // Setup WebSocket for real-time features
  setupWebSocket() {
    try {
      // Initialize Socket.IO with limited reconnection attempts
      this.socket = io({
        timeout: 5000,
        reconnection: true,
        reconnectionAttempts: 3,
        reconnectionDelay: 2000
      });

      this.socket.on('connect', () => {
        console.log('WebSocket connected');
      });

      this.socket.on('disconnect', () => {
        console.log('WebSocket disconnected');
      });

      // Listen for real-time events
      this.socket.on('new_message', (data) => {
        this.handleNewMessage(data);
      });

      this.socket.on('affinity_update', (data) => {
        this.handleAffinityUpdate(data);
      });

      this.socket.on('photo_processed', (data) => {
        this.handlePhotoProcessed(data);
      });

    } catch (error) {
      console.warn('WebSocket setup failed:', error);
    }
  }

  // Handle real-time message
  handleNewMessage(data) {
    // Update UI if in meetings view
    if (ui.currentView === 'meetings') {
      ui.loadMeetingsData();
    }

    // Show notification if not in the specific chat
    ui.showToast('새 메시지가 도착했습니다', 'info');
  }

  // Handle affinity update
  handleAffinityUpdate(data) {
    // 성능 최적화: 캐시가 자동으로 무효화되므로 즉시 갱신하지 않음
    // 사용자가 페이지를 새로고침하거나 다른 뷰로 이동했다가 돌아올 때 자동으로 새 데이터 로드
    console.log('📈 [Affinity] Update received - cache will refresh on next data request');

    // 현재 화면이 랭킹이라면 사용자에게 새로고침 힌트 제공
    if (ui.currentView === 'rankings') {
      ui.showToast('호감도 업데이트됨! 새로고침하면 최신 랭킹을 볼 수 있습니다', 'info');
    }
  }

  // Handle photo processing completion
  handlePhotoProcessed(data) {
    if (data.status === 'approved') {
      ui.showToast('사진 처리가 완료되었습니다!', 'success');
    } else if (data.status === 'rejected') {
      ui.showToast('사진이 검토에서 거부되었습니다', 'error');
    }

    // Refresh photos if in photos view
    if (ui.currentView === 'photos') {
      ui.loadPhotosData();
    }
  }

  // Setup PWA features
  setupPWA() {
    // 개발 환경에서는 Service Worker 비활성화 (캐싱 문제 방지)
    const isDevelopment = location.hostname === 'localhost' || location.hostname === '127.0.0.1';

    if (isDevelopment) {
      console.log('🛠️ Development mode: Service Worker disabled for better dev experience');

      // 기존 Service Worker가 있다면 제거
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(registrations => {
          registrations.forEach(registration => {
            registration.unregister();
            console.log('🗑️ Unregistered existing Service Worker');
          });
        });
      }
      return;
    }

    // 프로덕션 환경에서만 Service Worker 등록
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then(registration => {
          console.log('SW registered:', registration);
        })
        .catch(error => {
          console.warn('SW registration failed:', error);
        });
    }

    // App install prompt
    let deferredPrompt;
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;

      // Show install button
      this.showInstallPrompt(deferredPrompt);
    });
  }

  // Show PWA install prompt
  showInstallPrompt(deferredPrompt) {
    const installBtn = document.createElement('button');
    installBtn.textContent = '앱 설치';
    installBtn.className = 'btn btn-secondary';
    installBtn.style.cssText = `
      position: fixed;
      bottom: 80px;
      right: 20px;
      z-index: 1000;
    `;

    installBtn.addEventListener('click', async () => {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;

      if (outcome === 'accepted') {
        ui.showToast('앱이 설치되었습니다!', 'success');
      }

      installBtn.remove();
      deferredPrompt = null;
    });

    document.body.appendChild(installBtn);

    // Auto-hide after 10 seconds
    setTimeout(() => {
      if (installBtn.parentElement) {
        installBtn.remove();
      }
    }, 10000);
  }

  // Setup analytics
  setupAnalytics() {
    // Basic anonymized analytics
    this.trackEvent('app_start', {
      version: this.version,
      user_agent: navigator.userAgent.substring(0, 100),
      screen_resolution: `${screen.width}x${screen.height}`,
      timestamp: new Date().toISOString()
    });

    // Track view changes
    const originalSwitchView = ui.switchView;
    ui.switchView = (viewName) => {
      this.trackEvent('view_change', { view: viewName });
      originalSwitchView.call(ui, viewName);
    };
  }

  // Track analytics event
  trackEvent(eventName, data = {}) {
    try {
      // In a real app, send to analytics service
      console.log('Analytics:', eventName, data);

      // Store locally for demo
      const events = JSON.parse(localStorage.getItem('analytics_events') || '[]');
      events.push({
        event: eventName,
        data,
        timestamp: new Date().toISOString()
      });

      // Keep only last 100 events
      if (events.length > 100) {
        events.splice(0, events.length - 100);
      }

      localStorage.setItem('analytics_events', JSON.stringify(events));
    } catch (error) {
      console.warn('Analytics tracking failed:', error);
    }
  }

  // Utility: Check if in development
  isDevelopment() {
    return window.location.hostname === 'localhost' ||
           window.location.hostname === '127.0.0.1' ||
           window.location.hostname === '';
  }

  // Utility: Get app version
  getVersion() {
    return this.version;
  }

  // Utility: Get app status
  getStatus() {
    return {
      initialized: this.initialized,
      version: this.version,
      socketConnected: this.socket?.connected || false,
      currentView: ui.currentView,
      isDevelopment: this.isDevelopment()
    };
  }

  // Error handling
  handleError(error, context = 'Unknown') {
    console.error(`App Error [${context}]:`, error);

    this.trackEvent('app_error', {
      context,
      error: error.message,
      stack: error.stack?.substring(0, 500)
    });

    ui.showToast('오류가 발생했습니다', 'error');
  }

  // Cleanup on page unload
  cleanup() {
    if (this.socket) {
      this.socket.disconnect();
    }

    this.trackEvent('app_end', {
      session_duration: Date.now() - this.startTime
    });
  }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.app = new App();
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  if (window.app) {
    window.app.cleanup();
  }
});

// Global error handler
window.addEventListener('error', (e) => {
  if (window.app) {
    window.app.handleError(e.error, 'Global');
  }
});

// Unhandled promise rejection handler
window.addEventListener('unhandledrejection', (e) => {
  if (window.app) {
    window.app.handleError(e.reason, 'Promise');
  }
});

// Bety Character Manager
class BetyCharacterManager {
  constructor() {
    this.characters = [
      { image: '/images/Bety1.png', animation: 'character-wiggle', action: '안내' },
      { image: '/images/Bety2.png', animation: 'character-dance', action: '축하' },
      { image: '/images/Bety3.png', animation: 'character-excited', action: '환영' },
      { image: '/images/Bety4.png', animation: 'character-pulse', action: '응원' },
      { image: '/images/Bety5.png', animation: 'character-float', action: '행복' },
      { image: '/images/Bety55.png', animation: 'loading-bounce', action: '로딩' },
      { image: '/images/Bety6.png', animation: 'character-wiggle', action: '매니저' },
      { image: '/images/Bety7.png', animation: 'character-dance', action: '파티' }
    ];
    this.currentCharacterIndex = 0;
    this.init();
  }

  init() {
    this.startRandomActions();
    this.setupClickInteraction();
  }

  getRandomCharacter() {
    return this.characters[Math.floor(Math.random() * this.characters.length)];
  }

  updateBetyCharacter(element, character) {
    if (!element) return;

    // 기존 애니메이션 클래스 제거
    element.className = element.className.replace(/character-\w+|loading-\w+/g, '');

    // 새로운 캐릭터와 애니메이션 적용
    element.src = character.image;
    element.classList.add('bety-character', character.animation);
    element.title = `베티 - ${character.action}`;
  }

  startRandomActions() {
    // 10초마다 랜덤 액션 변경
    setInterval(() => {
      const betyElements = document.querySelectorAll('.bety-character');
      betyElements.forEach(element => {
        const randomCharacter = this.getRandomCharacter();
        this.updateBetyCharacter(element, randomCharacter);
      });
    }, 10000);
  }

  setupClickInteraction() {
    // 클릭하면 즉시 액션 변경
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('bety-character')) {
        // Check if this is a character-clickable element (special quiz trigger)
        if (e.target.classList.contains('character-clickable')) {
          console.log('🎭 [Character] Clickable character clicked, starting admin quiz');

          // Start admin quiz instead of regular character action
          if (window.quiz && window.quiz.startAdminQuiz) {
            window.quiz.startAdminQuiz();
          } else {
            console.error('Quiz manager not available');
            if (window.ui && window.ui.showToast) {
              window.ui.showToast('퀴즈 기능을 불러올 수 없습니다', 'error');
            }
          }
          return; // Don't proceed with regular character animation
        }

        // Regular character interaction
        const randomCharacter = this.getRandomCharacter();
        this.updateBetyCharacter(e.target, randomCharacter);

        // 클릭 시 특별한 메시지 표시
        if (window.ui && window.ui.showToast) {
          const messages = [
            `베티가 ${randomCharacter.action} 중이에요! 💖`,
            '베티와 함께 운명의 반려자를 찾아봐요! 🌟',
            '베티가 당신을 응원하고 있어요! 🎉',
            '베티의 특별한 액션을 확인해보세요! ✨'
          ];
          const randomMessage = messages[Math.floor(Math.random() * messages.length)];
          window.ui.showToast(randomMessage, 'info', 3000);
        }
      }
    });
  }

  // 특정 상황에 맞는 캐릭터 선택
  getCharacterForSituation(situation) {
    const situationMap = {
      'loading': this.characters.find(c => c.action === '로딩'),
      'welcome': this.characters.find(c => c.action === '환영'),
      'celebration': this.characters.find(c => c.action === '축하'),
      'encouragement': this.characters.find(c => c.action === '응원'),
      'party': this.characters.find(c => c.action === '파티')
    };

    return situationMap[situation] || this.getRandomCharacter();
  }
}

// Bety 캐릭터 매니저 초기화
window.addEventListener('DOMContentLoaded', () => {
  window.betyManager = new BetyCharacterManager();
});