// 🔄 로딩 상태 매니저 - 성능 최적화된 로딩 UI
class LoadingManager {
  constructor() {
    this.activeLoaders = new Map();
    this.loadingStates = new Set();
    this.globalLoading = false;
    this.loadingQueue = [];
    this.performanceMonitor = {
      startTimes: new Map(),
      loadingMetrics: []
    };

    this.init();
  }

  init() {
    console.log('🔄 [Loading] Initializing Loading Manager...');

    // 전역 로딩 인터셉터 설정
    this.setupGlobalInterceptors();

    // 성능 모니터링 설정
    this.setupPerformanceMonitoring();

    // 로딩 UI 요소 준비
    this.prepareLoadingElements();

    console.log('🔄 [Loading] Manager initialized successfully');
  }

  // 전역 API 요청 인터셉터 설정
  setupGlobalInterceptors() {
    // API 요청 시작/종료 모니터링
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const requestId = this.generateRequestId();
      const url = args[0];

      // API 요청 시작 로딩
      if (this.shouldShowLoading(url)) {
        this.showAPILoading(requestId, url);
      }

      try {
        const response = await originalFetch(...args);

        // API 요청 완료
        if (this.shouldShowLoading(url)) {
          this.hideAPILoading(requestId);
        }

        return response;
      } catch (error) {
        // API 요청 실패
        if (this.shouldShowLoading(url)) {
          this.hideAPILoading(requestId);
        }
        throw error;
      }
    };
  }

  // 성능 모니터링 설정
  setupPerformanceMonitoring() {
    // 페이지 로드 성능 측정
    window.addEventListener('load', () => {
      const navigationTiming = performance.getEntriesByType('navigation')[0];
      if (navigationTiming) {
        console.log('🔄 [Loading] Page load metrics:', {
          domContentLoaded: navigationTiming.domContentLoadedEventEnd - navigationTiming.domContentLoadedEventStart,
          loadComplete: navigationTiming.loadEventEnd - navigationTiming.loadEventStart,
          total: navigationTiming.loadEventEnd - navigationTiming.fetchStart
        });
      }
    });

    // 리소스 로딩 성능 모니터링
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.name.includes('.css') || entry.name.includes('.js') || entry.name.includes('.png')) {
          this.recordResourceMetric(entry);
        }
      }
    });

    if (typeof PerformanceObserver !== 'undefined') {
      observer.observe({ entryTypes: ['resource'] });
    }
  }

  // 로딩 UI 요소 준비
  prepareLoadingElements() {
    // 글로벌 로딩 오버레이 생성
    this.createGlobalLoadingOverlay();

    // 인라인 로딩 스피너 템플릿 생성
    this.createInlineSpinnerTemplate();

    // 베티 로딩 템플릿 생성
    this.createBetyLoadingTemplate();
  }

  // 글로벌 로딩 오버레이 생성
  createGlobalLoadingOverlay() {
    const existingOverlay = document.getElementById('global-loading-overlay');
    if (existingOverlay) {
      // Ensure it's hidden on init
      existingOverlay.style.display = 'none';
      existingOverlay.classList.add('hidden');
      return;
    }

    const overlay = document.createElement('div');
    overlay.id = 'global-loading-overlay';
    overlay.className = 'global-loading-overlay hidden';
    overlay.innerHTML = `
      <div class="loading-content">
        <div class="loading-character">
          <img src="/images/Bety1.png" alt="로딩 중..." class="bety-character loading-pulse">
        </div>
        <div class="loading-spinner" aria-hidden="true"></div>
        <p class="loading-text">잠시만 기다려주세요...</p>
        <div class="loading-progress">
          <div class="progress-bar">
            <div class="progress-fill" style="width: 0%"></div>
          </div>
          <span class="progress-text">0%</span>
        </div>
      </div>
    `;

    // 스타일 추가
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(18, 18, 18, 0.95);
      backdrop-filter: blur(10px);
      z-index: 9999;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.3s ease;
    `;

    document.body.appendChild(overlay);
  }

  // 인라인 스피너 템플릿 생성
  createInlineSpinnerTemplate() {
    if (document.getElementById('inline-spinner-template')) return;

    const template = document.createElement('template');
    template.id = 'inline-spinner-template';
    template.innerHTML = `
      <div class="inline-loading">
        <div class="spinner-small" aria-hidden="true"></div>
        <span class="loading-label">로딩중...</span>
      </div>
    `;

    document.head.appendChild(template);
  }

  // 베티 로딩 템플릿 생성
  createBetyLoadingTemplate() {
    if (document.getElementById('bety-loading-template')) return;

    const template = document.createElement('template');
    template.id = 'bety-loading-template';
    template.innerHTML = `
      <div class="bety-loading">
        <img src="/images/Bety3.png" alt="베티가 열심히 작업중..." class="bety-working">
        <p class="bety-message">베티가 열심히 준비하고 있어요! 🎭</p>
      </div>
    `;

    document.head.appendChild(template);
  }

  // ================================
  // 로딩 상태 관리 메서드
  // ================================

  // 글로벌 로딩 표시
  showGlobalLoading(message = '로딩중...', showProgress = false) {
    const loadingId = this.generateRequestId();
    console.log('🔄 [Loading] Showing global loading:', loadingId);

    this.globalLoading = true;
    this.performanceMonitor.startTimes.set(loadingId, Date.now());

    const overlay = document.getElementById('global-loading-overlay');
    if (overlay) {
      const textElement = overlay.querySelector('.loading-text');
      if (textElement) {
        textElement.textContent = message;
      }

      const progressElement = overlay.querySelector('.loading-progress');
      if (progressElement) {
        progressElement.style.display = showProgress ? 'block' : 'none';
      }

      overlay.style.display = 'flex';
      overlay.classList.remove('hidden');

      // 베티 애니메이션 시작 (베티 매니저 준비되었을 때만)
      if (window.betyManager && window.betyManager.isInitialized) {
        window.betyManager.showExpression('excited', 0); // 무한 지속
      }
    }

    return loadingId;
  }

  // 글로벌 로딩 숨기기
  hideGlobalLoading(loadingId) {
    console.log('🔄 [Loading] Hiding global loading:', loadingId);

    this.globalLoading = false;

    // 성능 메트릭 기록
    this.recordLoadingMetric(loadingId, 'global');

    const overlay = document.getElementById('global-loading-overlay');
    if (overlay) {
      overlay.style.display = 'none';
      overlay.classList.add('hidden');

      // 베티 애니메이션 복원 (베티 매니저 준비되었을 때만)
      if (window.betyManager && window.betyManager.isInitialized) {
        window.betyManager.showExpression('happy', 2000);
      }
    }
  }

  // 진행률 업데이트
  updateProgress(percentage, text = '') {
    const overlay = document.getElementById('global-loading-overlay');
    if (!overlay) return;

    const progressFill = overlay.querySelector('.progress-fill');
    const progressText = overlay.querySelector('.progress-text');

    if (progressFill) {
      progressFill.style.width = `${Math.min(Math.max(percentage, 0), 100)}%`;
    }

    if (progressText) {
      progressText.textContent = text || `${Math.round(percentage)}%`;
    }
  }

  // 인라인 로딩 표시
  showInlineLoading(element, message = '로딩중...') {
    if (!element) return null;

    const loadingId = this.generateRequestId();
    const template = document.getElementById('inline-spinner-template');

    if (template) {
      const loadingElement = template.content.cloneNode(true);
      const labelElement = loadingElement.querySelector('.loading-label');

      if (labelElement) {
        labelElement.textContent = message;
      }

      // 원본 내용 백업
      element.dataset.originalContent = element.innerHTML;
      element.dataset.loadingId = loadingId;

      // 로딩 UI 삽입
      element.innerHTML = '';
      element.appendChild(loadingElement);
      element.classList.add('loading-state');

      this.activeLoaders.set(loadingId, element);
    }

    return loadingId;
  }

  // 인라인 로딩 숨기기
  hideInlineLoading(loadingId) {
    const element = this.activeLoaders.get(loadingId);
    if (!element) return;

    // 원본 내용 복원
    const originalContent = element.dataset.originalContent;
    if (originalContent) {
      element.innerHTML = originalContent;
      delete element.dataset.originalContent;
      delete element.dataset.loadingId;
    }

    element.classList.remove('loading-state');
    this.activeLoaders.delete(loadingId);

    console.log('🔄 [Loading] Inline loading hidden:', loadingId);
  }

  // 베티 로딩 표시
  showBetyLoading(container, message = '베티가 준비중이에요! 🎭') {
    if (!container) return null;

    const loadingId = this.generateRequestId();
    const template = document.getElementById('bety-loading-template');

    if (template) {
      const loadingElement = template.content.cloneNode(true);
      const messageElement = loadingElement.querySelector('.bety-message');

      if (messageElement) {
        messageElement.textContent = message;
      }

      // 원본 내용 백업
      container.dataset.originalContent = container.innerHTML;
      container.dataset.loadingId = loadingId;

      // 베티 로딩 UI 삽입
      container.innerHTML = '';
      container.appendChild(loadingElement);
      container.classList.add('bety-loading-state');

      this.activeLoaders.set(loadingId, container);

      // 베티 애니메이션 활성화 (베티 매니저 준비되었을 때만)
      if (window.betyManager && window.betyManager.isInitialized) {
        window.betyManager.showExpression('excited', 0);
      }
    }

    return loadingId;
  }

  // API 요청 로딩 (자동)
  showAPILoading(requestId, url) {
    this.loadingStates.add(requestId);
    console.log('🔄 [Loading] API loading started:', this.getSimplifiedUrl(url));

    // 긴 요청(3초 이상)에 대해서만 글로벌 로딩 표시
    setTimeout(() => {
      if (this.loadingStates.has(requestId)) {
        this.showGlobalLoading('서버와 통신중...');
      }
    }, 3000);
  }

  // API 요청 로딩 숨기기
  hideAPILoading(requestId) {
    this.loadingStates.delete(requestId);
    console.log('🔄 [Loading] API loading completed');

    // 모든 API 요청이 완료되면 글로벌 로딩 숨기기
    if (this.loadingStates.size === 0 && this.globalLoading) {
      this.hideGlobalLoading(requestId);
    }
  }

  // ================================
  // 헬퍼 메서드
  // ================================

  // 요청 ID 생성
  generateRequestId() {
    return `loading_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // URL 단순화
  getSimplifiedUrl(url) {
    try {
      return new URL(url).pathname;
    } catch {
      return url;
    }
  }

  // 로딩을 표시할지 결정
  shouldShowLoading(url) {
    const skipPatterns = [
      '/images/',
      '/css/',
      '/js/',
      '.png',
      '.jpg',
      '.svg',
      '/stats'  // 통계는 백그라운드 로딩
    ];

    return !skipPatterns.some(pattern => url.includes(pattern));
  }

  // 성능 메트릭 기록
  recordLoadingMetric(loadingId, type) {
    const startTime = this.performanceMonitor.startTimes.get(loadingId);
    if (startTime) {
      const duration = Date.now() - startTime;
      this.performanceMonitor.loadingMetrics.push({
        type,
        duration,
        timestamp: Date.now()
      });

      this.performanceMonitor.startTimes.delete(loadingId);
      console.log(`🔄 [Loading] ${type} completed in ${duration}ms`);
    }
  }

  // 리소스 메트릭 기록
  recordResourceMetric(entry) {
    const { name, duration, transferSize } = entry;
    // 이미지 로딩 로그는 너무 많아서 비활성화
    const url = this.getSimplifiedUrl(name);
    if (!url.includes('.png') && !url.includes('.jpg') && !url.includes('.jpeg')) {
      console.log(`🔄 [Loading] Resource loaded: ${url} (${Math.round(duration)}ms, ${Math.round(transferSize/1024)}KB)`);
    }
  }

  // ================================
  // 상태 확인 및 관리
  // ================================

  // 현재 로딩 상태 확인
  isLoading() {
    return this.globalLoading || this.loadingStates.size > 0 || this.activeLoaders.size > 0;
  }

  // 모든 로딩 상태 정리
  clearAllLoading() {
    console.log('🔄 [Loading] Clearing all loading states...');

    // 글로벌 로딩 숨기기
    if (this.globalLoading) {
      this.hideGlobalLoading('cleanup');
    }

    // 모든 인라인 로딩 정리
    for (const [loadingId, element] of this.activeLoaders) {
      this.hideInlineLoading(loadingId);
    }

    // 상태 초기화
    this.loadingStates.clear();
    this.activeLoaders.clear();
    this.globalLoading = false;

    console.log('🔄 [Loading] All loading states cleared');
  }

  // 성능 메트릭 리포트
  getPerformanceReport() {
    const metrics = this.performanceMonitor.loadingMetrics;
    if (metrics.length === 0) return null;

    const avgDuration = metrics.reduce((sum, metric) => sum + metric.duration, 0) / metrics.length;
    const maxDuration = Math.max(...metrics.map(m => m.duration));

    return {
      totalLoads: metrics.length,
      averageDuration: Math.round(avgDuration),
      maxDuration: Math.round(maxDuration),
      byType: metrics.reduce((acc, metric) => {
        acc[metric.type] = (acc[metric.type] || 0) + 1;
        return acc;
      }, {})
    };
  }

  // 매니저 정리
  destroy() {
    this.clearAllLoading();

    // 오버레이 제거
    const overlay = document.getElementById('global-loading-overlay');
    if (overlay) {
      overlay.remove();
    }

    console.log('🔄 [Loading] Manager destroyed');
  }
}

// 전역 로딩 매니저 인스턴스
let loadingManager = null;

// DOM 로드 후 로딩 매니저 초기화
document.addEventListener('DOMContentLoaded', () => {
  loadingManager = new LoadingManager();

  // 페이지 언로드 시 정리
  window.addEventListener('beforeunload', () => {
    if (loadingManager) {
      loadingManager.destroy();
    }
  });
});

// 전역 접근을 위한 export
window.LoadingManager = LoadingManager;
window.loadingManager = loadingManager;