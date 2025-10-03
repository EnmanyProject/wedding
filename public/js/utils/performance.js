// ⚡ Performance Utilities for Wedding App

/**
 * Debounce: 연속 호출 시 마지막 호출만 실행
 * @param {Function} fn - 실행할 함수
 * @param {number} delay - 지연 시간 (ms)
 */
export function debounce(fn, delay = 300) {
  let timeoutId;
  return function(...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn.apply(this, args), delay);
  };
}

/**
 * Throttle: 일정 시간마다 한 번만 실행
 * @param {Function} fn - 실행할 함수
 * @param {number} delay - 최소 간격 (ms)
 */
export function throttle(fn, delay = 300) {
  let lastCall = 0;
  return function(...args) {
    const now = Date.now();
    if (now - lastCall >= delay) {
      lastCall = now;
      fn.apply(this, args);
    }
  };
}

/**
 * Lazy Image Loader: Intersection Observer를 사용한 지연 로딩
 */
export class LazyImageLoader {
  constructor(options = {}) {
    this.options = {
      rootMargin: options.rootMargin || '50px',
      threshold: options.threshold || 0.01
    };

    this.observer = new IntersectionObserver(
      (entries) => this.handleIntersection(entries),
      this.options
    );

    this.loadedImages = new Set();
  }

  observe(images) {
    const imageArray = Array.isArray(images) ? images : [images];
    imageArray.forEach(img => {
      if (img && !this.loadedImages.has(img)) {
        this.observer.observe(img);
      }
    });
  }

  handleIntersection(entries) {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target;
        this.loadImage(img);
      }
    });
  }

  loadImage(img) {
    const src = img.getAttribute('data-src');

    if (src && !this.loadedImages.has(img)) {
      // 로딩 시작
      img.classList.add('loading');

      // 이미지 로드
      const tempImg = new Image();
      tempImg.onload = () => {
        img.src = src;
        img.removeAttribute('data-src');
        img.classList.remove('loading');
        img.classList.add('loaded');
        this.loadedImages.add(img);
        this.observer.unobserve(img);
      };

      tempImg.onerror = () => {
        console.warn('Image failed to load:', src);
        img.classList.remove('loading');
        img.classList.add('error');
        this.observer.unobserve(img);
      };

      tempImg.src = src;
    }
  }

  disconnect() {
    this.observer.disconnect();
    this.loadedImages.clear();
  }
}

/**
 * Request Animation Frame 기반 스케줄러
 */
export class RAFScheduler {
  constructor() {
    this.tasks = [];
    this.isRunning = false;
  }

  schedule(task, priority = 0) {
    this.tasks.push({ task, priority });
    this.tasks.sort((a, b) => b.priority - a.priority);

    if (!this.isRunning) {
      this.run();
    }
  }

  run() {
    if (this.tasks.length === 0) {
      this.isRunning = false;
      return;
    }

    this.isRunning = true;
    requestAnimationFrame(() => {
      const { task } = this.tasks.shift();
      task();
      this.run();
    });
  }
}

/**
 * Performance Mark 유틸리티
 */
export class PerformanceTracker {
  constructor() {
    this.marks = new Map();
  }

  start(label) {
    const mark = `${label}-start`;
    performance.mark(mark);
    this.marks.set(label, mark);
  }

  end(label) {
    const startMark = this.marks.get(label);
    if (!startMark) {
      console.warn(`No start mark found for: ${label}`);
      return null;
    }

    const endMark = `${label}-end`;
    performance.mark(endMark);

    const measureName = `measure-${label}`;
    performance.measure(measureName, startMark, endMark);

    const measure = performance.getEntriesByName(measureName)[0];
    const duration = measure ? measure.duration : null;

    // 정리
    performance.clearMarks(startMark);
    performance.clearMarks(endMark);
    performance.clearMeasures(measureName);
    this.marks.delete(label);

    console.log(`⏱️ [Performance] ${label}: ${duration?.toFixed(2)}ms`);
    return duration;
  }
}

/**
 * 메모리 효율적인 이벤트 핸들러 관리자
 */
export class EventDelegator {
  constructor(container) {
    this.container = container;
    this.handlers = new Map();
  }

  on(selector, eventType, handler) {
    const key = `${eventType}-${selector}`;

    if (!this.handlers.has(key)) {
      const delegatedHandler = (e) => {
        const target = e.target.closest(selector);
        if (target && this.container.contains(target)) {
          handler.call(target, e);
        }
      };

      this.container.addEventListener(eventType, delegatedHandler);
      this.handlers.set(key, delegatedHandler);
    }
  }

  off(selector, eventType) {
    const key = `${eventType}-${selector}`;
    const handler = this.handlers.get(key);

    if (handler) {
      this.container.removeEventListener(eventType, handler);
      this.handlers.delete(key);
    }
  }

  clear() {
    this.handlers.forEach((handler, key) => {
      const [eventType] = key.split('-');
      this.container.removeEventListener(eventType, handler);
    });
    this.handlers.clear();
  }
}

/**
 * 배치 DOM 업데이트 유틸리티
 */
export class BatchDOMUpdater {
  constructor() {
    this.updates = [];
    this.scheduled = false;
  }

  schedule(updateFn) {
    this.updates.push(updateFn);

    if (!this.scheduled) {
      this.scheduled = true;
      requestAnimationFrame(() => this.flush());
    }
  }

  flush() {
    // 모든 읽기 작업 먼저 수행 (레이아웃 thrashing 방지)
    const reads = this.updates.filter(u => u.type === 'read');
    reads.forEach(u => u.fn());

    // 쓰기 작업 수행
    const writes = this.updates.filter(u => u.type === 'write');
    writes.forEach(u => u.fn());

    this.updates = [];
    this.scheduled = false;
  }

  read(fn) {
    this.schedule({ type: 'read', fn });
  }

  write(fn) {
    this.schedule({ type: 'write', fn });
  }
}

// 전역 인스턴스 생성
export const lazyLoader = new LazyImageLoader();
export const rafScheduler = new RAFScheduler();
export const perfTracker = new PerformanceTracker();
export const batchUpdater = new BatchDOMUpdater();
