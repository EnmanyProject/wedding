/**
 * Navigation Manager
 * Hybrid Design Architecture - Phase 2
 *
 * Purpose: Manages sidebar (desktop) and bottom navigation (mobile) dynamically
 * Responds to layout mode changes from ResponsiveDetector
 *
 * @version 2.0.0
 * @date 2025-10-11
 */

class NavigationManager {
  constructor() {
    this.currentMode = 'mobile';
    this.currentView = 'home';
    this.sidebarElement = null;
    this.bottomNavElement = null;

    // Wait for ResponsiveDetector to be available
    if (window.ResponsiveDetector) {
      this.init();
    } else {
      window.addEventListener('responsive-detector-ready', () => this.init());
    }
  }

  init() {
    console.log('🧭 [Navigation] Initializing Navigation Manager');

    // Get initial layout mode
    this.currentMode = window.ResponsiveDetector.getCurrentMode();
    console.log(`🧭 [Navigation] Initial mode: ${this.currentMode}`);

    // Setup layout change listener
    this.setupLayoutListener();

    // Initial render
    this.render();

    // Setup navigation event handlers
    this.setupEventHandlers();

    console.log('✅ [Navigation] Navigation Manager initialized');
  }

  setupLayoutListener() {
    window.addEventListener('layoutModeChange', (e) => {
      const newMode = e.detail.newMode;
      this.currentMode = newMode;
      console.log(`🔄 [Navigation] Layout changed to: ${newMode}`);
      this.render();
    });
  }

  render() {
    // 사이드바는 1280px 이상(desktop, large)에서만 표시
    const shouldShowSidebar = ['desktop', 'large'].includes(this.currentMode);

    if (shouldShowSidebar) {
      this.renderSidebar();
      this.hideBottomNav();
    } else {
      this.renderBottomNav();
      this.hideSidebar();
    }
  }

  renderBottomNav() {
    console.log('📱 [Navigation] Rendering bottom navigation');
    this.bottomNavElement = document.querySelector('.bottom-nav');

    if (this.bottomNavElement) {
      this.bottomNavElement.style.display = 'flex';
      this.bottomNavElement.classList.remove('hidden');
    }
  }

  hideBottomNav() {
    console.log('🖥️ [Navigation] Hiding bottom navigation');
    this.bottomNavElement = document.querySelector('.bottom-nav');

    if (this.bottomNavElement) {
      this.bottomNavElement.style.display = 'none';
      this.bottomNavElement.classList.add('hidden');
    }
  }

  renderSidebar() {
    console.log('🖥️ [Navigation] Rendering sidebar');

    // Check if sidebar already exists
    let sidebar = document.querySelector('.app-sidebar');

    if (!sidebar) {
      // Create sidebar element
      sidebar = this.createSidebarElement();
      document.body.insertBefore(sidebar, document.querySelector('#app') || document.body.firstChild);
    }

    // Show sidebar
    sidebar.style.display = 'flex';
    sidebar.classList.remove('hidden');
    this.sidebarElement = sidebar;

    // Add body class to enable sidebar CSS
    document.body.classList.add('has-sidebar');
  }

  hideSidebar() {
    console.log('📱 [Navigation] Hiding sidebar');
    const sidebar = document.querySelector('.app-sidebar');

    if (sidebar) {
      sidebar.style.display = 'none';
      sidebar.classList.add('hidden');
    }

    // Remove body class to disable sidebar CSS
    document.body.classList.remove('has-sidebar');
  }

  createSidebarElement() {
    const sidebar = document.createElement('aside');
    sidebar.className = 'app-sidebar';
    sidebar.setAttribute('role', 'navigation');
    sidebar.setAttribute('aria-label', 'Main Navigation');

    sidebar.innerHTML = `
      <div class="sidebar-header">
        <img src="/images/logo.png" alt="Wedding App Logo" class="sidebar-logo" onerror="this.style.display='none'">
        <h1 class="sidebar-title">누구나</h1>
      </div>

      <nav class="sidebar-nav">
        <a href="#home" class="sidebar-nav-item active" data-view="home" aria-current="page">
          <span class="nav-icon" aria-hidden="true">🏠</span>
          <span class="nav-label">홈</span>
        </a>
        <a href="#pawnshop" class="sidebar-nav-item" data-view="pawnshop">
          <span class="nav-icon" aria-hidden="true">🏦</span>
          <span class="nav-label">전당포</span>
        </a>
        <a href="#rankings" class="sidebar-nav-item" data-view="rankings">
          <span class="nav-icon" aria-hidden="true">🏆</span>
          <span class="nav-label">랭킹</span>
        </a>
        <a href="#meetings" class="sidebar-nav-item" data-view="meetings">
          <span class="nav-icon" aria-hidden="true">💕</span>
          <span class="nav-label">만남</span>
        </a>
        <a href="#dbety-special" class="sidebar-nav-item" id="sidebar-dbety-special-btn">
          <img src="/images/d-bety.png" alt="베티 특별 추천" class="nav-icon-img" aria-hidden="true">
          <span class="nav-label">특별 추천</span>
        </a>
      </nav>

      <div class="sidebar-footer">
        <div class="sidebar-user-info">
          <span class="user-avatar">👤</span>
          <span class="user-name">사용자</span>
        </div>
        <button class="sidebar-logout-btn" aria-label="로그아웃">
          <span aria-hidden="true">🚪</span>
          <span>로그아웃</span>
        </button>
      </div>
    `;

    return sidebar;
  }

  setupEventHandlers() {
    // Delegate events to document for dynamic content
    document.addEventListener('click', (e) => {
      const navItem = e.target.closest('.sidebar-nav-item');
      if (navItem && navItem.dataset.view) {
        e.preventDefault();
        this.handleNavigation(navItem.dataset.view);
      }

      // Handle D-Bety special button
      if (e.target.closest('#sidebar-dbety-special-btn')) {
        e.preventDefault();
        this.handleDBetySpecial();
      }
    });
  }

  handleNavigation(viewName) {
    console.log(`🧭 [Navigation] Navigating to: ${viewName}`);

    this.currentView = viewName;

    // Update active state in sidebar
    const sidebarItems = document.querySelectorAll('.sidebar-nav-item');
    sidebarItems.forEach(item => {
      if (item.dataset.view === viewName) {
        item.classList.add('active');
        item.setAttribute('aria-current', 'page');
      } else {
        item.classList.remove('active');
        item.removeAttribute('aria-current');
      }
    });

    // Update active state in bottom nav
    const bottomNavItems = document.querySelectorAll('.bottom-nav .nav-item');
    bottomNavItems.forEach(item => {
      if (item.dataset.view === viewName) {
        item.classList.add('active');
        item.setAttribute('aria-current', 'page');
      } else {
        item.classList.remove('active');
        item.removeAttribute('aria-current');
      }
    });

    // Switch view in UI Manager
    if (window.ui && typeof window.ui.switchView === 'function') {
      window.ui.switchView(viewName);
    }
  }

  handleDBetySpecial() {
    console.log('🎀 [Navigation] Opening D-Bety Special Modal');
    if (window.DBetySpecial && typeof window.DBetySpecial.openModal === 'function') {
      window.DBetySpecial.openModal();
    }
  }
}

// Create global instance
window.NavigationManager = new NavigationManager();
