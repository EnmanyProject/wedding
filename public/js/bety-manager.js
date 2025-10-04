// 🎭 베티 캐릭터 매니저 - 표정 및 애니메이션 관리
class BetyManager {
  constructor() {
    this.isInitialized = false;
    this.currentExpression = 0;
    this.expressions = [
      { name: 'default', src: '/images/Bety1.png', mood: 'neutral' },
      { name: 'happy', src: '/images/Bety2.png', mood: 'positive' },
      { name: 'excited', src: '/images/Bety3.png', mood: 'positive' },
      { name: 'surprised', src: '/images/Bety4.png', mood: 'curious' },
      { name: 'cheerful', src: '/images/Bety5.png', mood: 'positive' },
      { name: 'wink', src: '/images/Bety6.png', mood: 'playful' },
      { name: 'lovely', src: '/images/Bety7.png', mood: 'romantic' }
    ];
    this.preloadedImages = new Map();
    this.animationInterval = null;
    this.contextualTimeout = null;
    this.isInteracting = false;

    this.init();
  }

  async init() {
    try {
      console.log('🎭 [Bety] Initializing Bety Manager...');

      // 베티 요소들 먼저 설정 (기본 이미지로)
      this.setupBetyElements();

      // 이미지 프리로드 (백그라운드에서) - 자동 애니메이션 시작 안 함
      this.preloadImages().then(() => {
        console.log('🎭 [Bety] Image preloading completed - waiting for app ready');
      }).catch(error => {
        console.warn('🎭 [Bety] Image preloading failed, using default images:', error);
      });

      // 컨텍스트 기반 표정 변화 설정
      this.setupContextualExpressions();

      // 로딩 완료 후에만 자동 표정 변화 시작
      this.waitForAppReady();

      this.isInitialized = true;
      console.log('🎭 [Bety] Manager initialized successfully (auto-animation delayed)');

      // 초기화 완료 이벤트 발생
      document.dispatchEvent(new CustomEvent('betyManagerReady'));

    } catch (error) {
      console.error('🎭 [Bety] Failed to initialize:', error);
      // 오류가 있어도 기본 기능은 동작하도록
      this.isInitialized = true;
      document.dispatchEvent(new CustomEvent('betyManagerReady'));
    }
  }

  // 앱 준비 완료 대기
  waitForAppReady() {
    // 로딩 화면이 숨겨질 때까지 대기
    const checkLoadingScreen = () => {
      const loadingScreen = document.getElementById('loading-screen');
      if (!loadingScreen || loadingScreen.style.display === 'none') {
        console.log('🎭 [Bety] App ready, starting auto expression cycle');
        // 3초 추가 대기 후 자동 애니메이션 시작
        setTimeout(() => {
          this.startAutoExpressionCycle();
        }, 3000);
      } else {
        // 500ms 후 다시 확인
        setTimeout(checkLoadingScreen, 500);
      }
    };

    checkLoadingScreen();
  }

  // 이미지 프리로드 (성능 최적화)
  async preloadImages() {
    console.log('🎭 [Bety] Preloading expression images...');

    const loadPromises = this.expressions.map(expression => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          this.preloadedImages.set(expression.name, img);
          // 개별 이미지 로드 로그 제거 (너무 많음)
          resolve(img);
        };
        img.onerror = () => {
          console.warn(`❌ [Bety] Failed to load: ${expression.src}`);
          // 기본 이미지로 폴백
          const fallbackImg = new Image();
          fallbackImg.src = '/images/Bety1.png';
          this.preloadedImages.set(expression.name, fallbackImg);
          resolve(fallbackImg);
        };
        img.src = expression.src;
      });
    });

    try {
      await Promise.allSettled(loadPromises);
      console.log(`🎭 [Bety] All ${this.preloadedImages.size} images preloaded`);
    } catch (error) {
      console.warn('🎭 [Bety] Some images failed to preload:', error);
    }
  }

  // 베티 요소들 설정
  setupBetyElements() {
    // 웰컴 섹션의 베티
    const welcomeBety = document.getElementById('welcome-bety');
    if (welcomeBety) {
      this.setupBetyElement(welcomeBety, 'welcome');
    }

    // 로딩 화면의 베티
    const loadingBety = document.querySelector('.loading-character img');
    if (loadingBety) {
      this.setupBetyElement(loadingBety, 'loading');
    }

    // 기타 베티 요소들
    const allBetyElements = document.querySelectorAll('.bety-character, .bety-expressions');
    allBetyElements.forEach((element, index) => {
      this.setupBetyElement(element, `general-${index}`);
    });
  }

  // 개별 베티 요소 설정
  setupBetyElement(element, context) {
    if (!element) return;

    // 클릭 이벤트 추가
    element.addEventListener('click', () => this.onBetyClick(element, context));

    // 호버 효과 (터치 디바이스가 아닌 경우에만)
    if (window.matchMedia('(hover: hover)').matches) {
      element.addEventListener('mouseenter', () => this.onBetyHover(element, context));
      element.addEventListener('mouseleave', () => this.onBetyLeave(element, context));
    }

    // 접근성 속성 추가
    element.setAttribute('role', 'button');
    element.setAttribute('tabindex', '0');
    element.setAttribute('aria-label', '베티 캐릭터와 상호작용하기');

    // 키보드 이벤트
    element.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.onBetyClick(element, context);
      }
    });

    console.log(`🎭 [Bety] Element setup complete: ${context}`);
  }

  // 컨텍스트 기반 표정 변화 설정
  setupContextualExpressions() {
    // 퀴즈 시작 시
    document.addEventListener('quizStarted', () => {
      this.showExpression('excited', 2000);
    });

    // 퀴즈 정답 시
    document.addEventListener('quizCorrect', () => {
      this.showExpression('happy', 3000);
    });

    // 퀴즈 완료 시
    document.addEventListener('quizCompleted', () => {
      this.showExpression('cheerful', 4000);
    });

    // 새로운 매치 발견 시
    document.addEventListener('newMatch', () => {
      this.showExpression('lovely', 3000);
    });

    // 에러 발생 시
    document.addEventListener('appError', () => {
      this.showExpression('surprised', 2000);
    });

    // 뷰 전환 시
    document.addEventListener('viewChanged', (e) => {
      const viewName = e.detail?.view;
      if (viewName === 'rankings') {
        this.showExpression('excited', 1500);
      } else if (viewName === 'meetings') {
        this.showExpression('lovely', 1500);
      } else if (viewName === 'photos') {
        this.showExpression('happy', 1500);
      }
    });
  }

  // 자동 표정 변화 시작
  startAutoExpressionCycle() {
    if (this.animationInterval) {
      clearInterval(this.animationInterval);
    }

    // 5초마다 자동으로 표정 변화 (상호작용 중이 아닐 때만)
    this.animationInterval = setInterval(() => {
      if (!this.isInteracting) {
        this.nextExpression();
      }
    }, 5000);

    console.log('🎭 [Bety] Auto expression cycle started');
  }

  // 다음 표정으로 변경
  nextExpression() {
    this.currentExpression = (this.currentExpression + 1) % this.expressions.length;
    this.updateAllBetyElements(this.expressions[this.currentExpression]);
  }

  // 특정 표정 표시
  showExpression(expressionName, duration = 3000) {
    const expression = this.expressions.find(exp => exp.name === expressionName);
    if (!expression) {
      console.warn(`🎭 [Bety] Expression not found: ${expressionName}`);
      return;
    }

    // 상호작용 모드 활성화
    this.isInteracting = true;

    // 표정 변경
    this.updateAllBetyElements(expression);

    // 일정 시간 후 자동 모드로 복귀
    if (this.contextualTimeout) {
      clearTimeout(this.contextualTimeout);
    }

    this.contextualTimeout = setTimeout(() => {
      this.isInteracting = false;
      console.log(`🎭 [Bety] Returned to auto mode after ${duration}ms`);
    }, duration);

    console.log(`🎭 [Bety] Showing expression: ${expressionName} for ${duration}ms`);
  }

  // 모든 베티 요소 업데이트
  updateAllBetyElements(expression) {
    const allBetyElements = document.querySelectorAll('.bety-character, .bety-expressions, #welcome-bety');

    allBetyElements.forEach(element => {
      this.updateBetyElement(element, expression);
    });
  }

  // 개별 베티 요소 업데이트 (부드러운 전환 효과)
  updateBetyElement(element, expression) {
    if (!element || !expression) return;

    // 기존 이미지가 있는지 확인
    const currentSrc = element.src;
    if (currentSrc === expression.src) return; // 같은 이미지면 스킵

    // 부드러운 전환 효과
    element.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
    element.style.opacity = '0.7';
    element.style.transform = 'scale(0.95)';

    setTimeout(() => {
      // 프리로드된 이미지 사용
      const preloadedImg = this.preloadedImages.get(expression.name);
      if (preloadedImg) {
        element.src = preloadedImg.src;
      } else {
        element.src = expression.src;
      }

      // 표정에 따른 추가 클래스
      element.className = element.className.replace(/mood-\w+/g, '');
      element.classList.add(`mood-${expression.mood}`);

      // 전환 완료 효과
      element.style.opacity = '1';
      element.style.transform = 'scale(1.05)';

      setTimeout(() => {
        element.style.transform = 'scale(1)';
      }, 300);

    }, 150);
  }

  // 베티 클릭 이벤트
  onBetyClick(element, context) {
    console.log(`🎭 [Bety] Clicked: ${context}`);

    // 클릭 피드백 애니메이션
    element.style.transform = 'scale(0.9)';
    setTimeout(() => {
      element.style.transform = 'scale(1.1)';
      setTimeout(() => {
        element.style.transform = 'scale(1)';
      }, 200);
    }, 100);

    // 랜덤 긍정적 표정 표시
    const positiveExpressions = this.expressions.filter(exp =>
      exp.mood === 'positive' || exp.mood === 'playful'
    );
    const randomExpression = positiveExpressions[
      Math.floor(Math.random() * positiveExpressions.length)
    ];

    this.showExpression(randomExpression.name, 2000);

    // 햅틱 피드백 (지원되는 경우)
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }

    // 사운드 효과 (추후 추가 가능)
    this.playBetySound('click');

    // 커스텀 이벤트 발생
    document.dispatchEvent(new CustomEvent('betyInteraction', {
      detail: { context, type: 'click', expression: randomExpression.name }
    }));
  }

  // 베티 호버 이벤트
  onBetyHover(element, context) {
    if (this.isInteracting) return;

    // 호버 시 살짝 확대
    element.style.transform = 'scale(1.1)';

    // 호기심 표정으로 변경
    this.showExpression('surprised', 1000);
  }

  // 베티 호버 해제 이벤트
  onBetyLeave(element, context) {
    element.style.transform = 'scale(1)';
  }

  // 사운드 효과 (선택사항)
  playBetySound(type) {
    // 추후 사운드 파일이 있을 때 구현
    // const audio = new Audio(`/sounds/bety-${type}.mp3`);
    // audio.volume = 0.3;
    // audio.play().catch(() => {});
  }

  // 무드에 따른 표정 선택
  getExpressionByMood(mood) {
    const expressions = this.expressions.filter(exp => exp.mood === mood);
    return expressions[Math.floor(Math.random() * expressions.length)];
  }

  // 베티 매니저 정리
  destroy() {
    if (this.animationInterval) {
      clearInterval(this.animationInterval);
    }
    if (this.contextualTimeout) {
      clearTimeout(this.contextualTimeout);
    }
    this.preloadedImages.clear();
    console.log('🎭 [Bety] Manager destroyed');
  }

  // 상태 정보 반환
  getStatus() {
    return {
      initialized: this.isInitialized,
      currentExpression: this.expressions[this.currentExpression]?.name,
      preloadedCount: this.preloadedImages.size,
      isInteracting: this.isInteracting
    };
  }
}

// 전역 베티 매니저 인스턴스
let betyManager = null;

// DOM 로드 후 베티 매니저 초기화
document.addEventListener('DOMContentLoaded', () => {
  betyManager = new BetyManager();
});

// 전역 접근을 위한 export
window.BetyManager = BetyManager;
window.betyManager = betyManager;