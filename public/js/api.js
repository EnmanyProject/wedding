// API Service for A&B Meeting App
class APIService {
  constructor() {
    this.baseURL = '/api';
    this.token = localStorage.getItem('auth_token');
  }

  // Authentication headers
  getHeaders(contentType = 'application/json') {
    const headers = {
      'Content-Type': contentType
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    return headers;
  }

  // Generic request method
  async request(url, options = {}) {
    try {
      const response = await fetch(`${this.baseURL}${url}`, {
        ...options,
        headers: {
          ...this.getHeaders(options.contentType),
          ...options.headers
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
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
      throw new Error(`Upload failed: ${response.status}`);
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

  async submitQuizAnswer(sessionId, pairId, guess, selectedPhotoId = null) {
    return this.request(`/quiz/${sessionId}/answer`, {
      method: 'POST',
      body: JSON.stringify({
        pair_id: pairId,
        guess,
        selected_photo_id: selectedPhotoId
      })
    });
  }

  async getQuizTemplate(pairId = null, targetId = null) {
    const params = new URLSearchParams();
    if (pairId) params.append('pair_id', pairId);
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
    return this.request('/affinity/me/ranking/refresh', {
      method: 'POST'
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
}

// Create global API instance
window.api = new APIService();