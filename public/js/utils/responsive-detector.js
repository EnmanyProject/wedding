/* ==========================================
   RESPONSIVE DETECTOR
   Phase 1: Layout Mode Detection System
   ========================================== */

/**
 * ResponsiveDetector 클래스
 * 화면 크기 변화를 감지하고 적절한 레이아웃 모드로 전환합니다.
 *
 * Layout Modes:
 * - mobile: < 768px (모바일 - 하단 네비게이션)
 * - tablet: 768px - 1023px (태블릿 - 적응형 레이아웃)
 * - hybrid: 1024px - 1279px (하이브리드 - 사이드바 토글 가능)
 * - desktop: 1280px - 1919px (데스크톱 - 고정 사이드바 + 그리드)
 * - large: 1920px+ (대형 데스크톱 - 우측 패널 추가)
 */
class ResponsiveDetector {
  constructor() {
    // Breakpoint 정의 (design-tokens.css와 일치)
    this.breakpoints = {
      mobile: 768,
      tablet: 1024,
      desktop: 1280,
      large: 1920
    };

    // 현재 모드 감지
    this.currentMode = this.detectMode();

    // 리스너 설정
    this.setupListeners();

    // 초기 모드 적용
    this.applyMode(this.currentMode);

    console.log(`📱 [ResponsiveDetector] Initialized with mode: ${this.currentMode}`);
  }

  /**
   * 현재 화면 크기에 따라 레이아웃 모드를 감지합니다.
   * @returns {string} 레이아웃 모드 ('mobile', 'tablet', 'hybrid', 'desktop', 'large')
   */
  detectMode() {
    const width = window.innerWidth;

    if (width < this.breakpoints.mobile) {
      return 'mobile';
    } else if (width < this.breakpoints.tablet) {
      return 'tablet';
    } else if (width < this.breakpoints.desktop) {
      return 'hybrid';
    } else if (width < this.breakpoints.large) {
      return 'desktop';
    } else {
      return 'large';
    }
  }

  /**
   * Resize 이벤트 리스너를 설정합니다.
   * 250ms 디바운스를 적용하여 성능을 최적화합니다.
   */
  setupListeners() {
    let resizeTimer;

    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        const newMode = this.detectMode();

        if (newMode !== this.currentMode) {
          console.log(`📱 [ResponsiveDetector] Mode changed: ${this.currentMode} → ${newMode}`);
          this.handleModeChange(this.currentMode, newMode);
          this.currentMode = newMode;
        }
      }, 250); // 250ms 디바운스
    });
  }

  /**
   * 레이아웃 모드가 변경될 때 호출됩니다.
   * @param {string} oldMode - 이전 레이아웃 모드
   * @param {string} newMode - 새로운 레이아웃 모드
   */
  handleModeChange(oldMode, newMode) {
    // HTML 요소에 data 속성 설정
    this.applyMode(newMode);

    // 커스텀 이벤트 발행
    this.triggerModeChange(oldMode, newMode);
  }

  /**
   * 현재 모드를 HTML document에 적용합니다.
   * @param {string} mode - 적용할 레이아웃 모드
   */
  applyMode(mode) {
    // <html> 요소에 data-layout-mode 속성 설정
    document.documentElement.setAttribute('data-layout-mode', mode);

    // body에 클래스 추가 (CSS 스타일링 용이성)
    document.body.className = document.body.className
      .replace(/layout-mode-\w+/g, '')
      .trim();
    document.body.classList.add(`layout-mode-${mode}`);
  }

  /**
   * 레이아웃 모드 변경 이벤트를 발행합니다.
   * @param {string} oldMode - 이전 레이아웃 모드
   * @param {string} newMode - 새로운 레이아웃 모드
   */
  triggerModeChange(oldMode, newMode) {
    window.dispatchEvent(new CustomEvent('layoutModeChange', {
      detail: {
        oldMode,
        newMode,
        width: window.innerWidth,
        height: window.innerHeight
      }
    }));
  }

  /**
   * 현재 레이아웃 모드를 반환합니다.
   * @returns {string} 현재 레이아웃 모드
   */
  getCurrentMode() {
    return this.currentMode;
  }

  /**
   * 모바일 모드 여부를 반환합니다.
   * @returns {boolean} 모바일 모드이면 true
   */
  isMobile() {
    return this.currentMode === 'mobile';
  }

  /**
   * 태블릿 모드 여부를 반환합니다.
   * @returns {boolean} 태블릿 모드이면 true
   */
  isTablet() {
    return this.currentMode === 'tablet';
  }

  /**
   * 하이브리드 모드 여부를 반환합니다.
   * @returns {boolean} 하이브리드 모드이면 true
   */
  isHybrid() {
    return this.currentMode === 'hybrid';
  }

  /**
   * 데스크톱 모드 여부를 반환합니다 (hybrid, desktop, large 포함).
   * @returns {boolean} 데스크톱 모드이면 true
   */
  isDesktop() {
    return ['hybrid', 'desktop', 'large'].includes(this.currentMode);
  }

  /**
   * 대형 데스크톱 모드 여부를 반환합니다.
   * @returns {boolean} 대형 데스크톱 모드이면 true
   */
  isLargeDesktop() {
    return this.currentMode === 'large';
  }

  /**
   * 특정 브레이크포인트 이상인지 확인합니다.
   * @param {string} breakpoint - 브레이크포인트 이름 ('mobile', 'tablet', 'desktop', 'large')
   * @returns {boolean} 현재 화면이 지정된 브레이크포인트 이상이면 true
   */
  isAbove(breakpoint) {
    const width = window.innerWidth;
    return width >= this.breakpoints[breakpoint];
  }

  /**
   * 특정 브레이크포인트 미만인지 확인합니다.
   * @param {string} breakpoint - 브레이크포인트 이름 ('mobile', 'tablet', 'desktop', 'large')
   * @returns {boolean} 현재 화면이 지정된 브레이크포인트 미만이면 true
   */
  isBelow(breakpoint) {
    const width = window.innerWidth;
    return width < this.breakpoints[breakpoint];
  }

  /**
   * 현재 화면 크기 정보를 반환합니다.
   * @returns {Object} 화면 크기 정보 객체
   */
  getScreenInfo() {
    return {
      mode: this.currentMode,
      width: window.innerWidth,
      height: window.innerHeight,
      isMobile: this.isMobile(),
      isTablet: this.isTablet(),
      isHybrid: this.isHybrid(),
      isDesktop: this.isDesktop(),
      isLargeDesktop: this.isLargeDesktop()
    };
  }
}

// 전역 인스턴스 생성
window.ResponsiveDetector = new ResponsiveDetector();

// 디버깅 헬퍼 (콘솔에서 확인 가능)
window.getLayoutMode = () => window.ResponsiveDetector.getCurrentMode();
window.getScreenInfo = () => window.ResponsiveDetector.getScreenInfo();

// 모듈 export (ES6 모듈 환경에서 사용 시)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ResponsiveDetector;
}

console.log('✅ [ResponsiveDetector] Module loaded successfully');
