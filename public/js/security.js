// Security utilities for A&B Meeting App
class SecurityUtils {
  // HTML 이스케이프 함수 - XSS 방어
  static escapeHtml(unsafe) {
    if (unsafe === null || unsafe === undefined) return '';
    return String(unsafe)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // 안전한 텍스트 설정 - innerHTML 대신 사용
  static setTextContent(element, content) {
    if (!element) return;
    element.textContent = content || '';
  }

  // 안전한 HTML 설정 - 신뢰할 수 있는 HTML만 사용
  static setTrustedHTML(element, htmlString) {
    if (!element) return;
    // 기본적인 태그만 허용하는 화이트리스트
    const allowedTags = ['p', 'br', 'strong', 'em', 'span', 'div', 'img', 'a'];
    const cleanHTML = this.sanitizeHTML(htmlString, allowedTags);
    element.innerHTML = cleanHTML;
  }

  // HTML 새니타이징 - 허용된 태그만 유지
  static sanitizeHTML(html, allowedTags = []) {
    if (!html) return '';

    // 임시 DOM 요소 생성
    const temp = document.createElement('div');
    temp.innerHTML = html;

    // 모든 요소 검사
    const walker = document.createTreeWalker(
      temp,
      NodeFilter.SHOW_ELEMENT,
      null,
      false
    );

    const elementsToRemove = [];

    while (walker.nextNode()) {
      const node = walker.currentNode;
      if (!allowedTags.includes(node.tagName.toLowerCase())) {
        elementsToRemove.push(node);
      } else {
        // 허용된 태그도 속성 검사
        this.sanitizeAttributes(node);
      }
    }

    // 허용되지 않은 요소 제거
    elementsToRemove.forEach(element => {
      if (element.parentNode) {
        element.parentNode.removeChild(element);
      }
    });

    return temp.innerHTML;
  }

  // 속성 새니타이징
  static sanitizeAttributes(element) {
    const allowedAttributes = ['src', 'alt', 'href', 'class', 'id'];
    const attributesToRemove = [];

    for (let i = 0; i < element.attributes.length; i++) {
      const attr = element.attributes[i];
      if (!allowedAttributes.includes(attr.name.toLowerCase())) {
        attributesToRemove.push(attr.name);
      } else if (attr.name.toLowerCase() === 'href' || attr.name.toLowerCase() === 'src') {
        // URL 검증
        if (!this.isValidURL(attr.value)) {
          attributesToRemove.push(attr.name);
        }
      }
    }

    attributesToRemove.forEach(attrName => {
      element.removeAttribute(attrName);
    });
  }

  // URL 검증
  static isValidURL(url) {
    if (!url) return false;

    // javascript:, data:, vbscript: 등 위험한 프로토콜 차단
    const dangerousProtocols = ['javascript:', 'data:', 'vbscript:', 'file:'];
    const lowerUrl = url.toLowerCase().trim();

    for (const protocol of dangerousProtocols) {
      if (lowerUrl.startsWith(protocol)) {
        return false;
      }
    }

    // 허용된 프로토콜만 통과
    const allowedProtocols = ['http:', 'https:', 'mailto:', '#'];
    const hasValidProtocol = allowedProtocols.some(protocol =>
      lowerUrl.startsWith(protocol) || lowerUrl.startsWith('/') || lowerUrl.startsWith('./')
    );

    return hasValidProtocol;
  }

  // 안전한 요소 생성
  static createElement(tagName, options = {}) {
    const element = document.createElement(tagName);

    if (options.className) {
      element.className = options.className;
    }

    if (options.textContent) {
      element.textContent = options.textContent;
    }

    if (options.attributes) {
      Object.entries(options.attributes).forEach(([key, value]) => {
        if (key === 'href' || key === 'src') {
          if (this.isValidURL(value)) {
            element.setAttribute(key, value);
          }
        } else {
          element.setAttribute(key, this.escapeHtml(value));
        }
      });
    }

    return element;
  }

  // 토큰 마스킹 - 로깅시 민감정보 보호
  static maskToken(token) {
    if (!token || token.length < 8) return '[MASKED]';
    return token.substring(0, 8) + '...[MASKED]';
  }

  // 민감정보 검사
  static containsSensitiveInfo(text) {
    if (!text) return false;

    const sensitivePatterns = [
      /password/i,
      /token/i,
      /key/i,
      /secret/i,
      /credential/i,
      /bearer\s+[a-zA-Z0-9\-_]+/i
    ];

    return sensitivePatterns.some(pattern => pattern.test(text));
  }

  // 안전한 로깅
  static safeLog(message, data = null) {
    if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
      // 개발 환경에서만 로깅
      if (data && this.containsSensitiveInfo(JSON.stringify(data))) {
        console.log(message, '[SENSITIVE_DATA_MASKED]');
      } else {
        console.log(message, data);
      }
    }
  }

  // CSRF 토큰 생성 (클라이언트 사이드 기본 구현)
  static generateCSRFToken() {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  // 입력 검증
  static validateInput(input, type = 'text', maxLength = 1000) {
    if (!input || typeof input !== 'string') return false;

    if (input.length > maxLength) return false;

    switch (type) {
      case 'email':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(input);

      case 'username':
        const usernameRegex = /^[a-zA-Z0-9_-]{3,30}$/;
        return usernameRegex.test(input);

      case 'text':
        // 기본 텍스트 검증 - 위험한 문자 제거
        const dangerousChars = /<script|<iframe|javascript:|data:|vbscript:/i;
        return !dangerousChars.test(input);

      default:
        return true;
    }
  }
}

// 전역 사용을 위한 export
if (typeof window !== 'undefined') {
  window.SecurityUtils = SecurityUtils;
}