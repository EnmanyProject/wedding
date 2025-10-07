// 🔐 Authentication System

class AuthManager {
  constructor() {
    this.setupLoginHandlers();
  }

  // 로그인 상태 체크
  checkAuth() {
    const token = localStorage.getItem('token');
    return !!token;
  }

  // 로그인 화면 표시
  showLoginScreen() {
    const loadingScreen = document.getElementById('loading-screen');
    const loginScreen = document.getElementById('login-screen');
    const app = document.getElementById('app');

    if (loadingScreen) loadingScreen.style.display = 'none';
    if (loginScreen) loginScreen.style.display = 'flex';
    if (app) app.style.display = 'none';
  }

  // 앱 화면 표시
  showApp() {
    const loadingScreen = document.getElementById('loading-screen');
    const loginScreen = document.getElementById('login-screen');
    const app = document.getElementById('app');

    if (loadingScreen) loadingScreen.style.display = 'none';
    if (loginScreen) loginScreen.style.display = 'none';
    if (app) app.style.display = 'block';
  }

  // 로그인 핸들러 설정
  setupLoginHandlers() {
    // 로그인 버튼
    const loginBtn = document.getElementById('login-btn');
    if (loginBtn) {
      loginBtn.addEventListener('click', () => this.handleLogin());
    }

    // Guest 로그인 버튼
    const guestBtn = document.getElementById('guest-login-btn');
    if (guestBtn) {
      guestBtn.addEventListener('click', () => this.handleGuestLogin());
    }

    // Enter 키로 로그인
    const usernameInput = document.getElementById('login-username');
    const passwordInput = document.getElementById('login-password');

    if (usernameInput && passwordInput) {
      [usernameInput, passwordInput].forEach(input => {
        input.addEventListener('keypress', (e) => {
          if (e.key === 'Enter') {
            this.handleLogin();
          }
        });
      });
    }
  }

  // 로그인 처리
  async handleLogin() {
    const usernameInput = document.getElementById('login-username');
    const passwordInput = document.getElementById('login-password');
    const loginBtn = document.getElementById('login-btn');
    const errorDiv = document.getElementById('login-error');

    const username = usernameInput?.value.trim();
    const password = passwordInput?.value.trim();

    // Validation
    if (!username || !password) {
      this.showError('아이디와 비밀번호를 입력하세요');
      return;
    }

    // Disable button
    if (loginBtn) {
      loginBtn.disabled = true;
      loginBtn.textContent = '로그인 중...';
    }

    try {
      // Dev-login endpoint 사용
      const response = await fetch('/api/dev-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();

      if (response.ok && data.token) {
        // 로그인 성공
        localStorage.setItem('token', data.token);
        localStorage.setItem('userId', data.userId);
        localStorage.setItem('username', username);

        // API에 토큰 설정
        if (window.api) {
          window.api.setToken(data.token);
        }

        // 앱 화면 표시
        this.showApp();

        // UI 초기화
        if (window.ui) {
          await window.ui.loadUserData();
        }
      } else {
        // 로그인 실패
        this.showError(data.message || '로그인에 실패했습니다');
      }
    } catch (error) {
      console.error('Login error:', error);
      this.showError('로그인 중 오류가 발생했습니다');
    } finally {
      // Enable button
      if (loginBtn) {
        loginBtn.disabled = false;
        loginBtn.textContent = '로그인';
      }
    }
  }

  // Guest 로그인 (Mock 모드)
  async handleGuestLogin() {
    const guestBtn = document.getElementById('guest-login-btn');

    // Disable button
    if (guestBtn) {
      guestBtn.disabled = true;
      guestBtn.textContent = '체험 시작 중...';
    }

    try {
      // Mock 사용자 중 하나 선택 (user1)
      const response = await fetch('/api/dev-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username: 'user1',
          password: 'password'
        })
      });

      const data = await response.json();

      if (response.ok && data.token) {
        // 게스트 로그인 성공
        localStorage.setItem('token', data.token);
        localStorage.setItem('userId', data.userId);
        localStorage.setItem('username', 'user1 (게스트)');
        localStorage.setItem('isGuest', 'true');

        // API에 토큰 설정
        if (window.api) {
          window.api.setToken(data.token);
        }

        // 앱 화면 표시
        this.showApp();

        // UI 초기화
        if (window.ui) {
          await window.ui.loadUserData();
        }
      } else {
        this.showError('체험 모드를 시작할 수 없습니다');
      }
    } catch (error) {
      console.error('Guest login error:', error);
      this.showError('체험 모드 시작 중 오류가 발생했습니다');
    } finally {
      // Enable button
      if (guestBtn) {
        guestBtn.disabled = false;
        guestBtn.textContent = '🎭 체험하기 (Mock 모드)';
      }
    }
  }

  // 에러 메시지 표시
  showError(message) {
    const errorDiv = document.getElementById('login-error');
    if (errorDiv) {
      errorDiv.textContent = message;
      errorDiv.style.display = 'block';

      // 3초 후 자동 숨김
      setTimeout(() => {
        errorDiv.style.display = 'none';
      }, 3000);
    }
  }

  // 로그아웃
  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    localStorage.removeItem('username');
    localStorage.removeItem('isGuest');

    // 페이지 새로고침
    window.location.reload();
  }
}

// Global instance
window.authManager = new AuthManager();
