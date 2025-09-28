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
      console.log(`A&B Meeting App v${this.version} initializing...`);

      // Initialize core services
      await this.initializeServices();

      // Setup development tools if in dev mode
      if (this.isDevelopment()) {
        await this.setupDevelopmentTools();
      }

      // Setup real-time features
      this.setupWebSocket();

      // Setup PWA features
      this.setupPWA();

      // Setup analytics (anonymized)
      this.setupAnalytics();

      this.initialized = true;
      console.log('A&B Meeting App initialized successfully');

    } catch (error) {
      console.error('App initialization failed:', error);
      ui.showToast('앱 초기화 실패', 'error');
    }
  }

  // Initialize core services
  async initializeServices() {
    // Check if we're in development and seed data if needed
    if (this.isDevelopment()) {
      try {
        const summaryData = await api.getSeedSummary();
        if (summaryData.data.currentCounts.users === 0) {
          console.log('No seed data found, running development seeding...');
          await this.runDevelopmentSeed();
        }
      } catch (error) {
        console.warn('Could not check/seed development data:', error);
      }
    }

    // Initialize user session
    await this.initializeUserSession();
  }

  // Initialize user session
  async initializeUserSession() {
    // For demo purposes, create a test token if none exists
    if (!api.token) {
      console.log('No auth token found, creating demo session...');

      // In a real app, this would redirect to login
      // For demo, we'll create a dummy token and user
      api.setToken('demo-user-token-12345');

      // Store demo user info
      localStorage.setItem('demo_user', JSON.stringify({
        id: 'demo-user-1',
        name: '데모 사용자',
        email: 'demo@example.com'
      }));
    }

    // Load initial user data
    try {
      await ui.loadUserData();
    } catch (error) {
      console.error('Failed to load user data:', error);
    }
  }

  // Setup development tools
  async setupDevelopmentTools() {
    console.log('Setting up development tools...');

    // Add development menu
    this.addDevelopmentMenu();

    // Add keyboard shortcuts
    this.setupDevelopmentShortcuts();

    // Log current data status
    try {
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
      // Initialize Socket.IO (for chat and real-time updates)
      this.socket = io();

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
    // Update rankings if visible
    if (ui.currentView === 'rankings' || ui.currentView === 'home') {
      ui.loadViewData(ui.currentView);
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
    // Service Worker registration
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