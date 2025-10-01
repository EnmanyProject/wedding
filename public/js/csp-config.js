// Content Security Policy Configuration
// XSS 공격 방지를 위한 CSP 헤더 설정

class CSPConfig {
  static getPolicy() {
    return {
      'default-src': ["'self'"],
      'script-src': [
        "'self'",
        "'unsafe-inline'", // 개발용 - 프로덕션에서는 제거
        "cdn.socket.io",
        "apis.google.com"
      ],
      'style-src': [
        "'self'",
        "'unsafe-inline'", // CSS 인라인 스타일용
        "fonts.googleapis.com"
      ],
      'font-src': [
        "'self'",
        "fonts.gstatic.com"
      ],
      'img-src': [
        "'self'",
        "data:",
        "blob:",
        "localhost:*",
        "*.googleapis.com"
      ],
      'connect-src': [
        "'self'",
        "localhost:*",
        "ws://localhost:*",
        "wss://localhost:*",
        "*.googleapis.com"
      ],
      'frame-src': ["'none'"],
      'object-src': ["'none'"],
      'base-uri': ["'self'"],
      'form-action': ["'self'"]
    };
  }

  static getPolicyString() {
    const policy = this.getPolicy();
    return Object.entries(policy)
      .map(([directive, sources]) =>
        `${directive} ${sources.join(' ')}`
      )
      .join('; ');
  }

  static apply() {
    // 프로덕션에서만 엄격한 CSP 적용
    if (typeof window !== 'undefined' &&
        window.location.hostname !== 'localhost') {

      const meta = document.createElement('meta');
      meta.httpEquiv = 'Content-Security-Policy';
      meta.content = this.getPolicyString();
      document.head.appendChild(meta);
    }
  }

  // 개발용 완화된 정책
  static getDevPolicy() {
    return {
      'default-src': ["'self'"],
      'script-src': [
        "'self'",
        "'unsafe-inline'",
        "'unsafe-eval'", // 개발용
        "cdn.socket.io",
        "localhost:*"
      ],
      'style-src': [
        "'self'",
        "'unsafe-inline'"
      ],
      'img-src': [
        "'self'",
        "data:",
        "blob:",
        "localhost:*"
      ],
      'connect-src': [
        "'self'",
        "localhost:*",
        "ws://localhost:*"
      ]
    };
  }
}

// 자동 적용
if (typeof window !== 'undefined') {
  window.CSPConfig = CSPConfig;

  // 페이지 로드시 CSP 적용
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => CSPConfig.apply());
  } else {
    CSPConfig.apply();
  }
}