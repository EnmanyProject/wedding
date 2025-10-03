// API Service for A&B Meeting App
class APIService {
  constructor() {
    this.baseURL = '/api';
    this.token = localStorage.getItem('auth_token');

    // ⚡ 성능 최적화: 고급 캐싱 시스템
    this.initializeCache();
    this.pendingRequests = new Map(); // 중복 요청 방지
  }

  // 캐싱 시스템 초기화
  async initializeCache() {
    try {
      // 동적 import로 캐시 모듈 로드
      const cacheModule = await import('/js/utils/cache.js');
      this.memoryCache = cacheModule.memoryCache;
      this.sessionCache = cacheModule.sessionCache;
      this.persistentCache = cacheModule.persistentCache;
      console.log('✅ [API] 고급 캐싱 시스템 초기화 완료');
    } catch (error) {
      console.warn('⚠️ [API] 캐싱 시스템 로드 실패, 기본 캐싱 사용:', error);
      // 폴백: 기본 캐싱
      this.cache = new Map();
      this.cacheTimeout = 30000; // 30초
    }
  }

  // Authentication headers
  getHeaders(contentType = 'application/json') {
    const headers = {
      'Content-Type': contentType
    };

    // Use admin token for admin routes, regular token for other routes
    const token = this.adminToken || this.token;
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  }

  // 캐시 키 생성
  getCacheKey(url, options = {}) {
    return this.memoryCache?.generateKey?.(url, options) || `${url}_${JSON.stringify(options)}`;
  }

  // 캐시에서 데이터 조회 (고급 캐싱 우선, 폴백)
  getCachedData(cacheKey, cacheType = 'memory') {
    // 고급 캐싱 시스템 사용
    if (this.memoryCache) {
      const cache = cacheType === 'session' ? this.sessionCache :
                    cacheType === 'persistent' ? this.persistentCache :
                    this.memoryCache;
      return cache.get(cacheKey);
    }

    // 폴백: 기본 캐싱
    if (this.cache) {
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }
    }
    return null;
  }

  // 캐시에 데이터 저장 (고급 캐싱 우선, 폴백)
  setCachedData(cacheKey, data, cacheType = 'memory', customTTL = null) {
    // 고급 캐싱 시스템 사용
    if (this.memoryCache) {
      const cache = cacheType === 'session' ? this.sessionCache :
                    cacheType === 'persistent' ? this.persistentCache :
                    this.memoryCache;
      cache.set(cacheKey, data, customTTL);
      return;
    }

    // 폴백: 기본 캐싱
    if (this.cache) {
      this.cache.set(cacheKey, {
        data,
        timestamp: Date.now()
      });

      // 캐시 크기 제한 (100개 항목)
      if (this.cache.size > 100) {
        const oldestKey = this.cache.keys().next().value;
        this.cache.delete(oldestKey);
      }
    }
  }

  // 캐시 무효화 (고급 캐싱 우선, 폴백)
  invalidateCache(pattern = null) {
    // 고급 캐싱 시스템 사용
    if (this.memoryCache) {
      if (pattern) {
        this.memoryCache.invalidate(pattern);
        this.sessionCache?.invalidate(pattern);
      } else {
        this.memoryCache.clear();
        this.sessionCache?.clear();
      }
      console.log('💾 [API] 캐시 무효화:', pattern || 'all');
      return;
    }

    // 폴백: 기본 캐싱
    if (this.cache) {
      if (pattern) {
        for (const key of this.cache.keys()) {
          if (key.includes(pattern)) {
            this.cache.delete(key);
          }
        }
      } else {
        this.cache.clear();
      }
    }
  }

  // Generic request method with caching and enhanced error handling
  async request(url, options = {}) {
    let retryCount = 0;
    const maxRetries = 3;
    const baseDelay = 1000; // 1초 기본 지연

    while (retryCount <= maxRetries) {
      try {
        // 🛡️ 토큰 인증 검사 강화
        if (!this.token && !url.includes('/auth/') && !url.includes('/health')) {
          console.warn('No auth token available for API call:', url);

          // 인증 오류에 대한 fallback 메커니즘
          if (url.includes('/affinity/me/ranking')) {
            console.log('🔄 [API] 인증 오류 - 빈 랭킹 데이터로 대체');
            return {
              success: true,
              data: {
                rankings: [],
                userPosition: undefined
              }
            };
          }

          throw new Error('인증 토큰이 없습니다');
        }

        // 🛡️ 성능 최적화: GET 요청에 대해 캐싱 적용
        const isGetRequest = !options.method || options.method === 'GET';
        const cacheKey = this.getCacheKey(url, options);

        if (isGetRequest && !options.bypassCache) {
          // 캐시된 데이터 확인
          try {
            const cachedData = this.getCachedData(cacheKey);
            if (cachedData) {
              console.log(`📋 [Cache] Hit for ${url}`);
              return cachedData;
            }
          } catch (cacheError) {
            console.warn('🚨 [Cache] 캐시 읽기 오류:', cacheError);
            // 캐시 오류 시 캐시 우회하여 계속 진행
          }

          // 동일한 요청이 진행 중인지 확인 (중복 방지)
          if (this.pendingRequests.has(cacheKey)) {
            console.log(`⏳ [Cache] Waiting for pending request: ${url}`);
            try {
              return await this.pendingRequests.get(cacheKey);
            } catch (pendingError) {
              console.warn('🚨 [Cache] 대기 중인 요청 오류:', pendingError);
              // pending 요청에서 오류가 발생하면 새로운 요청 시작
            }
          }
        }

        // 🛡️ 요청 시작 (중복 방지를 위해 Promise 저장)
        const requestPromise = fetch(`${this.baseURL}${url}`, {
          ...options,
          headers: {
            ...this.getHeaders(options.contentType),
            ...options.headers
          },
          timeout: 10000 // 10초 타임아웃 설정
        }).then(async response => {
          try {
            const data = await response.json();

            if (!response.ok) {
              // HTTP 오류에 대한 세부 처리
              if (response.status === 429) {
                throw new Error('TOO_MANY_REQUESTS');
              } else if (response.status >= 500) {
                throw new Error('SERVER_ERROR');
              }
              throw new Error(data.error || `HTTP 오류 ${response.status}`);
            }

            // 🛡️ 성공한 GET 요청 결과를 캐시에 안전하게 저장
            if (isGetRequest && !options.bypassCache) {
              try {
                this.setCachedData(cacheKey, data);
                console.log(`💾 [Cache] Stored result for ${url}`);
              } catch (cacheStoreError) {
                console.warn('🚨 [Cache] 캐시 저장 오류:', cacheStoreError);
                // 캐시 저장 실패해도 결과는 반환
              }
            }

            return data;
          } catch (parseError) {
            console.error('🚨 [API] JSON 파싱 오류:', parseError);
            throw new Error('서버 응답 파싱 실패');
          }
        }).finally(() => {
          // 요청 완료 후 pending 목록에서 제거
          if (isGetRequest) {
            try {
              this.pendingRequests.delete(cacheKey);
            } catch (cleanupError) {
              console.warn('🚨 [Cache] pending 정리 오류:', cleanupError);
            }
          }
        });

        // GET 요청인 경우 pending 목록에 추가
        if (isGetRequest && !options.bypassCache) {
          try {
            this.pendingRequests.set(cacheKey, requestPromise);
          } catch (setPendingError) {
            console.warn('🚨 [Cache] pending 설정 오류:', setPendingError);
          }
        }

        const result = await requestPromise;

        // 성공 시 재시도 횟수 리셋
        retryCount = maxRetries + 1;
        return result;

      } catch (error) {
        console.error(`🚨 [API] Request error (attempt ${retryCount + 1}/${maxRetries + 1}):`, error);

        // 🛡️ 특정 오류에 대한 fallback 처리
        if (url.includes('/affinity/me/ranking') && retryCount === maxRetries) {
          console.log('🔄 [API] 랭킹 API 최종 실패 - 빈 데이터로 대체');
          return {
            success: true,
            data: {
              rankings: [],
              userPosition: undefined
            }
          };
        }

        // 🔄 재시도 로직
        if (retryCount < maxRetries && this.shouldRetry(error)) {
          retryCount++;
          const delay = baseDelay * Math.pow(2, retryCount - 1); // 지수 백오프
          console.log(`⏳ [API] ${delay}ms 후 재시도 중... (${retryCount}/${maxRetries})`);

          await new Promise(resolve => setTimeout(resolve, delay));
          continue; // 재시도
        }

        // 최종 실패
        throw error;
      }
    }
  }

  // 🛡️ 재시도 가능한 오류인지 판단
  shouldRetry(error) {
    const retryableErrors = [
      'TOO_MANY_REQUESTS',
      'SERVER_ERROR',
      'Network request failed',
      'fetch timeout',
      'TypeError: Failed to fetch'
    ];

    return retryableErrors.some(retryableError =>
      error.message.includes(retryableError)
    );
  }

  // Set authentication token
  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem('auth_token', token);
    } else {
      localStorage.removeItem('auth_token');
    }
  }

  // File upload request method
  async requestWithFile(url, options = {}) {
    try {
      if (!this.token && !url.includes('/auth/') && !url.includes('/health')) {
        console.warn('No auth token available for API call:', url);
        throw new Error('인증 토큰이 없습니다');
      }

      const headers = {};
      if (this.token || this.adminToken) {
        headers['Authorization'] = `Bearer ${this.adminToken || this.token}`;
      }

      const response = await fetch(`${this.baseURL}${url}`, {
        ...options,
        headers: {
          ...headers,
          ...options.headers
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP 오류 ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }

  // Photos API
  async getMyPhotos() {
    return this.request('/me/photos');
  }

  async getProfilePhotos(targetId) {
    return this.request(`/profile/${targetId}/photos`);
  }

  async generatePresignUrl(filename, contentType, role = 'PROFILE') {
    return this.request('/me/photos/presign', {
      method: 'POST',
      body: JSON.stringify({
        filename,
        content_type: contentType,
        role
      })
    });
  }

  async commitPhoto(photoId, exifMeta = null) {
    return this.request('/me/photos/commit', {
      method: 'POST',
      body: JSON.stringify({
        photo_id: photoId,
        exif_meta: exifMeta
      })
    });
  }

  async deletePhoto(photoId) {
    return this.request(`/me/photos/${photoId}`, {
      method: 'DELETE'
    });
  }

  // Upload photo to storage
  async uploadPhotoToStorage(uploadUrl, file) {
    const response = await fetch(uploadUrl, {
      method: 'PUT',
      body: file,
      headers: {
        'Content-Type': file.type
      }
    });

    if (!response.ok) {
      throw new Error(`업로드 실패: ${response.status}`);
    }

    return response;
  }

  // Quiz API
  async startQuizSession(targetId, mode = 'TRAIT_PHOTO') {
    return this.request('/quiz/session', {
      method: 'POST',
      body: JSON.stringify({
        target_id: targetId,
        mode
      })
    });
  }

  async submitQuizAnswer(sessionId, quizId, guess, selectedPhotoId = null) {
    const result = await this.request(`/quiz/${sessionId}/answer`, {
      method: 'POST',
      body: JSON.stringify({
        quiz_id: quizId, // Changed from pair_id to quiz_id for ab_quizzes
        guess,
        selected_photo_id: selectedPhotoId
      })
    });

    // 퀴즈 답변 후 관련 캐시 무효화
    this.invalidateCache('ranking');
    this.invalidateCache('affinity');
    console.log('🗑️ [Cache] Invalidated ranking/affinity cache after quiz answer');

    return result;
  }

  async getQuizTemplate(quizId = null, targetId = null) {
    const params = new URLSearchParams();
    if (quizId) params.append('quiz_id', quizId); // Changed from pair_id to quiz_id
    if (targetId) params.append('target_id', targetId);

    const query = params.toString() ? `?${params}` : '';
    return this.request(`/quiz/template${query}`);
  }

  async endQuizSession(sessionId) {
    return this.request(`/quiz/${sessionId}/end`, {
      method: 'POST'
    });
  }

  async getQuizSessions(page = 1, perPage = 10) {
    return this.request(`/quiz/sessions/me?page=${page}&per_page=${perPage}`);
  }

  async getAvailableQuizTargets() {
    return this.request('/quiz/targets');
  }

  async getAvailableQuizzesForTarget(targetId) {
    return this.request(`/quiz/targets/${targetId}/quizzes`);
  }

  // Points API
  async getMyPoints() {
    return this.request('/points/me/points');
  }

  async earnPoints(reason, refId = null) {
    return this.request('/points/earn', {
      method: 'POST',
      body: JSON.stringify({
        reason,
        ref_id: refId
      })
    });
  }

  // Affinity API
  async getAffinity(targetId) {
    return this.request(`/affinity/${targetId}`);
  }

  async getMyRanking() {
    return this.request('/affinity/me/ranking');
  }

  async refreshRanking() {
    // 강제 새로고침이므로 캐시 무효화
    this.invalidateCache('ranking');
    this.invalidateCache('affinity');
    console.log('🔄 [Cache] Manual refresh - invalidated ranking cache');

    return this.request('/affinity/me/ranking/refresh', {
      method: 'POST',
      bypassCache: true // 캐시 우회
    });
  }

  // Meeting API
  async getMeetingState() {
    return this.request('/meeting/me/meeting-state');
  }

  async enterMeeting(targetId) {
    return this.request('/meeting/enter', {
      method: 'POST',
      body: JSON.stringify({
        target_id: targetId
      })
    });
  }

  async getMeetingMessages(meetingId, page = 1, perPage = 20) {
    return this.request(`/meeting/${meetingId}/messages?page=${page}&per_page=${perPage}`);
  }

  async sendMessage(meetingId, message, messageType = 'TEXT') {
    return this.request(`/meeting/${meetingId}/message`, {
      method: 'POST',
      body: JSON.stringify({
        message,
        message_type: messageType
      })
    });
  }

  // Dev API (only in development)
  async seedData(options = {}) {
    return this.request('/dev/seed', {
      method: 'POST',
      body: JSON.stringify(options)
    });
  }

  async resetData() {
    return this.request('/dev/reset', {
      method: 'DELETE'
    });
  }

  async getSeedSummary() {
    return this.request('/dev/seed/summary');
  }

  async getDevConfig() {
    return this.request('/dev/config');
  }

  async setDevFlag(key, value) {
    return this.request('/dev/config/flag', {
      method: 'POST',
      body: JSON.stringify({ key, value })
    });
  }

  async getDevHealth() {
    return this.request('/dev/health');
  }

  // Profile Images API
  async getUserProfileImage(userId) {
    return this.request(`/profile/${userId}/image`);
  }

  async getAllUserProfileImages() {
    return this.request('/profile/images/all');
  }

  // Admin Quiz API (public endpoint)
  async getAdminQuizzes() {
    return this.request('/quiz/admin-quizzes');
  }

  async getRandomAdminQuiz() {
    const response = await this.getAdminQuizzes();
    if (response.success && response.data && response.data.length > 0) {
      const randomIndex = Math.floor(Math.random() * response.data.length);
      return {
        success: true,
        data: response.data[randomIndex]
      };
    }
    return { success: false, error: 'No admin quizzes available' };
  }

  // Get user statistics (public endpoint)
  async getUserStats() {
    return this.request('/profile/stats');
  }

  // Generic HTTP methods for admin use
  async get(url) {
    return this.request(url, {
      method: 'GET'
    });
  }

  async post(url, data) {
    return this.request(url, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async patch(url, data) {
    return this.request(url, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  }

  async put(url, data) {
    return this.request(url, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async delete(url) {
    return this.request(url, {
      method: 'DELETE'
    });
  }

  // Admin token management
  setAdminToken(token) {
    this.adminToken = token;
  }

  clearAdminToken() {
    this.adminToken = null;
  }
}

// Create global API instance
window.api = new APIService();