// 💾 API Cache Manager for Wedding App

/**
 * API 응답 캐싱 시스템
 */
export class APICache {
  constructor(options = {}) {
    this.cache = new Map();
    this.ttl = options.ttl || 5 * 60 * 1000; // 기본 5분
    this.maxSize = options.maxSize || 50; // 최대 캐시 항목 수
  }

  /**
   * 캐시 키 생성
   */
  generateKey(url, params = {}) {
    const paramStr = Object.keys(params)
      .sort()
      .map(key => `${key}=${params[key]}`)
      .join('&');

    return paramStr ? `${url}?${paramStr}` : url;
  }

  /**
   * 캐시에 데이터 저장
   */
  set(key, value, customTTL = null) {
    // 캐시 크기 제한
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
      console.log('💾 [Cache] Oldest entry removed:', oldestKey);
    }

    const entry = {
      value,
      timestamp: Date.now(),
      ttl: customTTL || this.ttl
    };

    this.cache.set(key, entry);
    console.log('💾 [Cache] Stored:', key);
  }

  /**
   * 캐시에서 데이터 조회
   */
  get(key) {
    const entry = this.cache.get(key);

    if (!entry) {
      console.log('💾 [Cache] Miss:', key);
      return null;
    }

    const age = Date.now() - entry.timestamp;

    if (age > entry.ttl) {
      this.cache.delete(key);
      console.log('💾 [Cache] Expired:', key);
      return null;
    }

    console.log('💾 [Cache] Hit:', key, `(age: ${Math.round(age / 1000)}s)`);
    return entry.value;
  }

  /**
   * 특정 키 패턴으로 시작하는 항목 삭제
   */
  invalidate(pattern) {
    let count = 0;
    for (const key of this.cache.keys()) {
      if (key.startsWith(pattern)) {
        this.cache.delete(key);
        count++;
      }
    }
    console.log(`💾 [Cache] Invalidated ${count} entries matching: ${pattern}`);
  }

  /**
   * 전체 캐시 삭제
   */
  clear() {
    const size = this.cache.size;
    this.cache.clear();
    console.log(`💾 [Cache] Cleared ${size} entries`);
  }

  /**
   * 캐시 상태 조회
   */
  getStats() {
    const now = Date.now();
    let valid = 0;
    let expired = 0;

    this.cache.forEach((entry) => {
      const age = now - entry.timestamp;
      if (age <= entry.ttl) {
        valid++;
      } else {
        expired++;
      }
    });

    return {
      total: this.cache.size,
      valid,
      expired,
      maxSize: this.maxSize
    };
  }
}

/**
 * 로컬 스토리지 기반 영구 캐시
 */
export class PersistentCache {
  constructor(prefix = 'wedding_cache_', ttl = 24 * 60 * 60 * 1000) {
    this.prefix = prefix;
    this.ttl = ttl; // 기본 24시간
  }

  set(key, value, customTTL = null) {
    try {
      const entry = {
        value,
        timestamp: Date.now(),
        ttl: customTTL || this.ttl
      };

      localStorage.setItem(
        `${this.prefix}${key}`,
        JSON.stringify(entry)
      );
      console.log('💿 [Persistent] Stored:', key);
    } catch (error) {
      console.warn('💿 [Persistent] Storage failed:', error);
      // 용량 초과 시 오래된 항목 삭제
      this.cleanup();
    }
  }

  get(key) {
    try {
      const data = localStorage.getItem(`${this.prefix}${key}`);
      if (!data) return null;

      const entry = JSON.parse(data);
      const age = Date.now() - entry.timestamp;

      if (age > entry.ttl) {
        this.remove(key);
        console.log('💿 [Persistent] Expired:', key);
        return null;
      }

      console.log('💿 [Persistent] Hit:', key);
      return entry.value;
    } catch (error) {
      console.warn('💿 [Persistent] Read failed:', error);
      return null;
    }
  }

  remove(key) {
    localStorage.removeItem(`${this.prefix}${key}`);
  }

  clear() {
    const keys = Object.keys(localStorage);
    let count = 0;

    keys.forEach(key => {
      if (key.startsWith(this.prefix)) {
        localStorage.removeItem(key);
        count++;
      }
    });

    console.log(`💿 [Persistent] Cleared ${count} entries`);
  }

  cleanup() {
    const keys = Object.keys(localStorage);
    const entries = [];

    // 만료된 항목과 타임스탬프 수집
    keys.forEach(key => {
      if (key.startsWith(this.prefix)) {
        try {
          const data = localStorage.getItem(key);
          const entry = JSON.parse(data);
          const age = Date.now() - entry.timestamp;

          entries.push({
            key,
            timestamp: entry.timestamp,
            expired: age > entry.ttl
          });
        } catch (error) {
          // 파싱 실패한 항목은 삭제
          localStorage.removeItem(key);
        }
      }
    });

    // 만료된 항목 삭제
    let removed = 0;
    entries.forEach(entry => {
      if (entry.expired) {
        localStorage.removeItem(entry.key);
        removed++;
      }
    });

    console.log(`💿 [Persistent] Cleanup: removed ${removed} expired entries`);

    // 여전히 용량이 부족하면 오래된 항목부터 삭제
    if (removed === 0) {
      entries.sort((a, b) => a.timestamp - b.timestamp);
      const toRemove = Math.ceil(entries.length * 0.3); // 30% 삭제

      for (let i = 0; i < toRemove; i++) {
        localStorage.removeItem(entries[i].key);
      }

      console.log(`💿 [Persistent] Emergency cleanup: removed ${toRemove} oldest entries`);
    }
  }
}

// 캐시 전략별 인스턴스
export const memoryCache = new APICache({
  ttl: 5 * 60 * 1000, // 5분
  maxSize: 50
});

export const sessionCache = new APICache({
  ttl: 30 * 60 * 1000, // 30분
  maxSize: 20
});

export const persistentCache = new PersistentCache('wedding_', 24 * 60 * 60 * 1000);
