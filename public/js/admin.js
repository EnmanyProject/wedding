// Admin Management for A&B Meeting App
class AdminManager {
  constructor() {
    this.currentTab = 'dashboard';
    this.currentPairId = null;
    this.currentPage = 1;
    this.currentFilters = {};
    this.init();
  }

  init() {
    this.setupTabs();
    this.setupEventListeners();
    this.loadDashboard();
  }

  setupTabs() {
    const tabs = document.querySelectorAll('.nav-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const tabName = tab.dataset.tab;
        this.switchTab(tabName);
      });
    });
  }

  setupEventListeners() {
    // Category filter
    const categoryFilter = document.getElementById('category-filter');
    if (categoryFilter) {
      categoryFilter.addEventListener('change', () => {
        this.currentFilters.category = categoryFilter.value;
        this.loadTraitPairs();
      });
    }

    // Status filter
    const statusFilter = document.getElementById('status-filter');
    if (statusFilter) {
      statusFilter.addEventListener('change', () => {
        this.currentFilters.active = statusFilter.value;
        this.loadTraitPairs();
      });
    }

    // Quiz category filter
    const quizCategoryFilter = document.getElementById('quiz-category-filter');
    if (quizCategoryFilter) {
      quizCategoryFilter.addEventListener('change', () => {
        this.currentFilters.quizCategory = quizCategoryFilter.value;
        this.loadQuizList();
      });
    }

    // Quiz status filter
    const quizStatusFilter = document.getElementById('quiz-status-filter');
    if (quizStatusFilter) {
      quizStatusFilter.addEventListener('change', () => {
        this.currentFilters.quizActive = quizStatusFilter.value;
        this.loadQuizList();
      });
    }

    // Trait pair form
    const form = document.getElementById('trait-pair-form');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.saveTraitPair();
      });
    }

    // Quiz creation form
    const quizForm = document.getElementById('quiz-creation-form');
    if (quizForm) {
      quizForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.saveQuiz();
      });
    }

    // Button event listeners
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        logout();
      });
    }

    const addTraitPairBtn = document.getElementById('add-trait-pair-btn');
    if (addTraitPairBtn) {
      addTraitPairBtn.addEventListener('click', () => {
        openTraitPairModal();
      });
    }

    const addQuizBtn = document.getElementById('add-quiz-btn');
    if (addQuizBtn) {
      addQuizBtn.addEventListener('click', () => {
        openQuizCreationModal();
      });
    }

    const closeTraitModalBtn = document.getElementById('close-trait-modal-btn');
    if (closeTraitModalBtn) {
      closeTraitModalBtn.addEventListener('click', () => {
        closeTraitPairModal();
      });
    }

    const cancelTraitModalBtn = document.getElementById('cancel-trait-modal-btn');
    if (cancelTraitModalBtn) {
      cancelTraitModalBtn.addEventListener('click', () => {
        closeTraitPairModal();
      });
    }

    const closeQuizModalBtn = document.getElementById('close-quiz-modal-btn');
    if (closeQuizModalBtn) {
      closeQuizModalBtn.addEventListener('click', () => {
        closeQuizCreationModal();
      });
    }

    const cancelQuizModalBtn = document.getElementById('cancel-quiz-modal-btn');
    if (cancelQuizModalBtn) {
      cancelQuizModalBtn.addEventListener('click', () => {
        closeQuizCreationModal();
      });
    }

    // Image preview event listeners
    const optionAImage = document.getElementById('option-a-image');
    if (optionAImage) {
      optionAImage.addEventListener('change', () => {
        previewImage('option-a-image', 'option-a-preview');
      });
    }

    const optionBImage = document.getElementById('option-b-image');
    if (optionBImage) {
      optionBImage.addEventListener('change', () => {
        previewImage('option-b-image', 'option-b-preview');
      });
    }

    // Event delegation for dynamic buttons and modal handling
    document.addEventListener('click', (e) => {
      // Handle modal background clicks
      if (e.target.classList.contains('modal')) {
        if (e.target.id === 'trait-pair-modal') {
          closeTraitPairModal();
        } else if (e.target.id === 'quiz-creation-modal') {
          closeQuizCreationModal();
        }
        return;
      }

      // Handle dynamic button clicks
      const action = e.target.dataset.action;
      if (!action) return;

      switch (action) {
        case 'add-trait':
          openTraitPairModal();
          break;
        case 'edit-trait':
          editTraitPair(e.target.dataset.id);
          break;
        case 'delete-trait':
          deleteTraitPair(e.target.dataset.id);
          break;
        case 'add-quiz':
          openQuizCreationModal();
          break;
        case 'edit-quiz':
          editQuiz(e.target.dataset.id);
          break;
        case 'delete-quiz':
          deleteQuiz(e.target.dataset.id);
          break;
      }
    });
  }

  switchTab(tabName) {
    // Update nav tabs
    document.querySelectorAll('.nav-tab').forEach(tab => {
      tab.classList.remove('active');
      if (tab.dataset.tab === tabName) {
        tab.classList.add('active');
      }
    });

    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
      content.classList.remove('active');
    });
    document.getElementById(`${tabName}-tab`).classList.add('active');

    this.currentTab = tabName;

    // Load tab-specific data
    switch (tabName) {
      case 'dashboard':
        this.loadDashboard();
        break;
      case 'trait-pairs':
        this.loadTraitPairs();
        this.loadCategories();
        break;
      case 'quiz-creation':
        this.loadQuizList();
        this.loadQuizCategories();
        break;
      case 'visuals':
        this.loadVisuals();
        break;
    }
  }

  async loadDashboard() {
    try {
      const statsData = await api.request('/admin/stats');
      const categoriesData = await api.request('/admin/categories');

      const stats = statsData.data;

      // Update stats cards
      document.getElementById('stat-trait-pairs').textContent = stats.active_trait_pairs || 0;
      document.getElementById('stat-visuals').textContent = stats.trait_visuals || 0;
      document.getElementById('stat-users').textContent = stats.active_users || 0;
      document.getElementById('stat-sessions').textContent = stats.quiz_sessions || 0;
      document.getElementById('stat-responses').textContent = stats.trait_responses || 0;

      // Update categories list
      this.renderCategories(categoriesData.data.categories);

    } catch (error) {
      console.error('대시보드 로딩 실패:', error);
      this.showAlert('대시보드 데이터 로딩에 실패했습니다', 'error');
    }
  }

  renderCategories(categories) {
    const container = document.getElementById('categories-list');

    if (!categories || categories.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="icon">📊</div>
          <p>카테고리 데이터가 없습니다</p>
        </div>
      `;
      return;
    }

    container.innerHTML = categories.map(cat => `
      <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.75rem; border-bottom: 1px solid #eee;">
        <span style="font-weight: 500;">${cat.category}</span>
        <span class="status-badge status-active">${cat.pair_count}개 질문</span>
      </div>
    `).join('');
  }

  async loadTraitPairs() {
    try {
      const params = new URLSearchParams({
        page: this.currentPage.toString(),
        per_page: '20'
      });

      if (this.currentFilters.category) {
        params.append('category', this.currentFilters.category);
      }
      if (this.currentFilters.active !== undefined && this.currentFilters.active !== '') {
        params.append('active', this.currentFilters.active);
      }

      const data = await api.request(`/admin/trait-pairs?${params}`);
      this.renderTraitPairs(data.data.pairs);

    } catch (error) {
      console.error('성향 질문 로딩 실패:', error);
      this.showAlert('성향 질문 데이터 로딩에 실패했습니다', 'error');
    }
  }

  renderTraitPairs(pairs) {
    const container = document.getElementById('trait-pairs-list');

    if (!pairs || pairs.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="icon">❓</div>
          <p>성향 질문이 없습니다</p>
          <button class="btn btn-primary" data-action="add-trait">첫 번째 질문 추가하기</button>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <table class="trait-pairs-table">
        <thead>
          <tr>
            <th>키</th>
            <th>왼쪽 선택지</th>
            <th>오른쪽 선택지</th>
            <th>카테고리</th>
            <th>상태</th>
            <th>응답 수</th>
            <th>시각 자료</th>
            <th>작업</th>
          </tr>
        </thead>
        <tbody>
          ${pairs.map(pair => `
            <tr>
              <td><code>${pair.key}</code></td>
              <td>${pair.left_label}</td>
              <td>${pair.right_label}</td>
              <td><span class="status-badge status-active">${pair.category}</span></td>
              <td>
                <span class="status-badge ${pair.is_active ? 'status-active' : 'status-inactive'}">
                  ${pair.is_active ? '활성' : '비활성'}
                </span>
              </td>
              <td>${pair.response_count || 0}</td>
              <td>${pair.visual_count || 0}</td>
              <td>
                <div class="actions">
                  <button class="btn btn-secondary" data-action="edit-trait" data-id="${pair.id}">수정</button>
                  <button class="btn btn-danger" data-action="delete-trait" data-id="${pair.id}">삭제</button>
                </div>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }

  async loadCategories() {
    try {
      const data = await api.request('/admin/categories');
      const categoryFilter = document.getElementById('category-filter');

      if (categoryFilter) {
        const currentValue = categoryFilter.value;
        categoryFilter.innerHTML = '<option value="">전체 카테고리</option>';

        data.data.categories.forEach(cat => {
          const option = document.createElement('option');
          option.value = cat.category;
          option.textContent = `${cat.category} (${cat.pair_count})`;
          if (cat.category === currentValue) {
            option.selected = true;
          }
          categoryFilter.appendChild(option);
        });
      }
    } catch (error) {
      console.error('카테고리 로딩 실패:', error);
    }
  }

  async loadQuizCategories() {
    try {
      // Get unique categories from ab_quizzes table
      const data = await api.request('/admin/quizzes');
      const quizzes = data.data.quizzes || [];

      // Extract unique categories
      const categories = [...new Set(quizzes.map(quiz => quiz.category).filter(Boolean))];

      const quizCategoryFilter = document.getElementById('quiz-category-filter');

      if (quizCategoryFilter) {
        const currentValue = quizCategoryFilter.value;
        // Keep the default option and clear the rest
        quizCategoryFilter.innerHTML = '<option value="">전체 카테고리</option>';

        // Add categories from actual data
        categories.sort().forEach(category => {
          const option = document.createElement('option');
          option.value = category;
          option.textContent = category;
          if (category === currentValue) {
            option.selected = true;
          }
          quizCategoryFilter.appendChild(option);
        });
      }
    } catch (error) {
      console.error('퀴즈 카테고리 로딩 실패:', error);
    }
  }

  async loadVisuals() {
    const container = document.getElementById('visuals-list');
    container.innerHTML = `
      <div class="empty-state">
        <div class="icon">🎨</div>
        <p>시각 자료 관리 기능은 준비 중입니다</p>
        <p style="margin-top: 0.5rem; color: #666; font-size: 0.9rem;">
          성향 질문별 이미지와 설명을 관리할 수 있습니다
        </p>
      </div>
    `;
  }

  async loadQuizList() {
    try {
      // Build query parameters from current filters
      const params = new URLSearchParams();
      if (this.currentFilters.quizCategory) {
        params.append('category', this.currentFilters.quizCategory);
      }
      if (this.currentFilters.quizActive) {
        params.append('active', this.currentFilters.quizActive);
      }

      const queryString = params.toString();
      const url = queryString ? `/admin/quizzes?${queryString}` : '/admin/quizzes';

      const data = await api.request(url);
      this.renderQuizList(data.data.quizzes);
    } catch (error) {
      console.error('퀴즈 목록 로딩 실패:', error);
      this.showAlert('퀴즈 목록 데이터 로딩에 실패했습니다', 'error');
    }
  }

  renderQuizList(quizzes) {
    const container = document.getElementById('quiz-list');

    if (!quizzes || quizzes.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="icon">🎯</div>
          <p>생성된 A&B 퀴즈가 없습니다</p>
          <button class="btn btn-primary" data-action="add-quiz">첫 번째 퀴즈 만들기</button>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <table class="quiz-table">
        <thead>
          <tr>
            <th>카테고리</th>
            <th>제목</th>
            <th>설명</th>
            <th>옵션 A</th>
            <th>옵션 B</th>
            <th>상태</th>
            <th>생성일</th>
            <th>작업</th>
          </tr>
        </thead>
        <tbody>
          ${quizzes.map(quiz => `
            <tr>
              <td><span class="status-badge status-active">${quiz.category}</span></td>
              <td>${quiz.title}</td>
              <td>${quiz.description || '설명 없음'}</td>
              <td>
                <div class="quiz-option">
                  <strong>${quiz.option_a_title}</strong>
                  ${quiz.option_a_image ? '<span class="has-image">🖼️</span>' : ''}
                </div>
              </td>
              <td>
                <div class="quiz-option">
                  <strong>${quiz.option_b_title}</strong>
                  ${quiz.option_b_image ? '<span class="has-image">🖼️</span>' : ''}
                </div>
              </td>
              <td>
                <span class="status-badge ${quiz.is_active ? 'status-active' : 'status-inactive'}">
                  ${quiz.is_active ? '활성' : '비활성'}
                </span>
              </td>
              <td>${new Date(quiz.created_at).toLocaleDateString('ko-KR')}</td>
              <td>
                <div class="actions">
                  <button class="btn btn-secondary" data-action="edit-quiz" data-id="${quiz.id}">수정</button>
                  <button class="btn btn-danger" data-action="delete-quiz" data-id="${quiz.id}">삭제</button>
                </div>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }

  async saveQuiz() {
    try {
      const formData = new FormData();
      formData.append('category', document.getElementById('quiz-category').value);
      formData.append('title', document.getElementById('quiz-title').value);
      formData.append('description', document.getElementById('quiz-description').value || '');
      formData.append('option_a_title', document.getElementById('option-a-title').value);
      formData.append('option_a_description', document.getElementById('option-a-description').value || '');
      formData.append('option_b_title', document.getElementById('option-b-title').value);
      formData.append('option_b_description', document.getElementById('option-b-description').value || '');
      formData.append('is_active', document.getElementById('quiz-active').checked);

      // Add image files if selected
      const optionAImage = document.getElementById('option-a-image').files[0];
      if (optionAImage) {
        formData.append('option_a_image', optionAImage);
      }

      const optionBImage = document.getElementById('option-b-image').files[0];
      if (optionBImage) {
        formData.append('option_b_image', optionBImage);
      }

      let result;
      if (this.currentQuizId) {
        // Update existing
        result = await api.requestWithFile(`/admin/quizzes/${this.currentQuizId}`, {
          method: 'PUT',
          body: formData
        });
      } else {
        // Create new
        result = await api.requestWithFile('/admin/quizzes', {
          method: 'POST',
          body: formData
        });
      }

      this.showAlert('A&B 퀴즈가 성공적으로 저장되었습니다', 'success');
      closeQuizCreationModal();
      this.loadQuizList();

    } catch (error) {
      console.error('퀴즈 저장 실패:', error);
      this.showAlert(error.message || 'A&B 퀴즈 저장에 실패했습니다', 'error');
    }
  }

  async saveTraitPair() {
    try {
      const formData = {
        key: document.getElementById('pair-key').value,
        left_label: document.getElementById('pair-left').value,
        right_label: document.getElementById('pair-right').value,
        category: document.getElementById('pair-category').value,
        description: document.getElementById('pair-description').value || null,
        is_active: document.getElementById('pair-active').checked
      };

      let result;
      if (this.currentPairId) {
        // Update existing
        result = await api.request(`/admin/trait-pairs/${this.currentPairId}`, {
          method: 'PUT',
          body: JSON.stringify(formData)
        });
      } else {
        // Create new
        result = await api.request('/admin/trait-pairs', {
          method: 'POST',
          body: JSON.stringify(formData)
        });
      }

      this.showAlert('성향 질문이 성공적으로 저장되었습니다', 'success');
      this.closeTraitPairModal();
      this.loadTraitPairs();
      this.loadCategories();

    } catch (error) {
      console.error('성향 질문 저장 실패:', error);
      this.showAlert(error.message || '성향 질문 저장에 실패했습니다', 'error');
    }
  }

  showAlert(message, type = 'info') {
    // Remove existing alerts
    const existingAlerts = document.querySelectorAll('.alert');
    existingAlerts.forEach(alert => alert.remove());

    // Create new alert
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.textContent = message;

    // Insert at top of admin container
    const container = document.querySelector('.admin-container');
    container.insertBefore(alert, container.firstChild);

    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (alert.parentNode) {
        alert.remove();
      }
    }, 5000);
  }
}

// Modal functions
function openTraitPairModal(pairId = null) {
  admin.currentPairId = pairId;

  const modal = document.getElementById('trait-pair-modal');
  const title = document.getElementById('modal-title');
  const form = document.getElementById('trait-pair-form');

  if (pairId) {
    title.textContent = '성향 질문 수정';
    // Load existing data here if needed
  } else {
    title.textContent = '새 성향 질문 추가';
    form.reset();
    document.getElementById('pair-active').checked = true;
  }

  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeTraitPairModal() {
  const modal = document.getElementById('trait-pair-modal');
  modal.classList.remove('active');
  document.body.style.overflow = '';
  admin.currentPairId = null;
}

function openQuizCreationModal(quizId = null) {
  admin.currentQuizId = quizId;

  const modal = document.getElementById('quiz-creation-modal');
  const title = document.getElementById('quiz-modal-title');
  const form = document.getElementById('quiz-creation-form');

  if (quizId) {
    title.textContent = 'A&B 퀴즈 수정';
  } else {
    title.textContent = '새 A&B 퀴즈 만들기';
  }

  // 항상 폼과 이미지를 초기화 (새 생성이든 수정이든)
  form.reset();
  document.getElementById('quiz-active').checked = true;

  // 이미지 미리보기 초기화
  document.getElementById('option-a-preview').style.display = 'none';
  document.getElementById('option-b-preview').style.display = 'none';
  document.getElementById('option-a-preview').innerHTML = '';
  document.getElementById('option-b-preview').innerHTML = '';

  // 파일 입력 필드 초기화
  const optionAFileInput = document.getElementById('option-a-image');
  const optionBFileInput = document.getElementById('option-b-image');
  if (optionAFileInput) {
    optionAFileInput.value = '';
  }
  if (optionBFileInput) {
    optionBFileInput.value = '';
  }

  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeQuizCreationModal() {
  const modal = document.getElementById('quiz-creation-modal');
  modal.classList.remove('active');
  document.body.style.overflow = '';
  admin.currentQuizId = null;

  // 모달이 닫힐 때 완전히 초기화
  const form = document.getElementById('quiz-creation-form');
  if (form) {
    form.reset();
  }

  // 이미지 미리보기 완전 초기화
  const optionAPreview = document.getElementById('option-a-preview');
  const optionBPreview = document.getElementById('option-b-preview');
  if (optionAPreview) {
    optionAPreview.style.display = 'none';
    optionAPreview.innerHTML = '';
  }
  if (optionBPreview) {
    optionBPreview.style.display = 'none';
    optionBPreview.innerHTML = '';
  }

  // 파일 입력 필드 완전 초기화
  const optionAFileInput = document.getElementById('option-a-image');
  const optionBFileInput = document.getElementById('option-b-image');
  if (optionAFileInput) {
    optionAFileInput.value = '';
  }
  if (optionBFileInput) {
    optionBFileInput.value = '';
  }

  // AI 이미지 생성 관련 상태 초기화
  currentGeneratedImage = null;
  currentOption = null;
}

function previewImage(inputId, previewId) {
  const input = document.getElementById(inputId);
  const preview = document.getElementById(previewId);
  const file = input.files[0];

  if (file) {
    const reader = new FileReader();
    reader.onload = function(e) {
      preview.innerHTML = `<img src="${e.target.result}" alt="미리보기" style="max-width: 200px; max-height: 150px; border-radius: 8px;">`;
      preview.style.display = 'block';
    };
    reader.readAsDataURL(file);
  } else {
    preview.style.display = 'none';
  }
}

async function editTraitPair(pairId) {
  try {
    const data = await api.request(`/admin/trait-pairs`);
    const pair = data.data.pairs.find(p => p.id === pairId);

    if (pair) {
      openTraitPairModal(pairId);

      // Fill form with existing data
      document.getElementById('pair-key').value = pair.key;
      document.getElementById('pair-left').value = pair.left_label;
      document.getElementById('pair-right').value = pair.right_label;
      document.getElementById('pair-category').value = pair.category;
      document.getElementById('pair-description').value = pair.description || '';
      document.getElementById('pair-active').checked = pair.is_active;
    }
  } catch (error) {
    console.error('성향 질문 로딩 실패:', error);
    admin.showAlert('성향 질문 데이터를 불러올 수 없습니다', 'error');
  }
}

async function deleteTraitPair(pairId) {
  if (!confirm('정말로 이 성향 질문을 삭제하시겠습니까?\n\n이미 응답이 있는 질문은 비활성화됩니다.')) {
    return;
  }

  try {
    await api.request(`/admin/trait-pairs/${pairId}`, {
      method: 'DELETE'
    });

    admin.showAlert('성향 질문이 삭제되었습니다', 'success');
    admin.loadTraitPairs();
    admin.loadDashboard();

  } catch (error) {
    console.error('성향 질문 삭제 실패:', error);
    admin.showAlert(error.message || '성향 질문 삭제에 실패했습니다', 'error');
  }
}

// Global error handler for debugging
window.addEventListener('error', (event) => {
  console.error('Global Error:', {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    error: event.error
  });

  // Send error to server for logging
  fetch('/api/admin/log-error', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'javascript_error',
      message: event.message,
      filename: event.filename,
      line: event.lineno,
      column: event.colno,
      stack: event.error?.stack,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString()
    })
  }).catch(() => {}); // Ignore fetch errors
});

// Console error interceptor
const originalError = console.error;
console.error = function(...args) {
  originalError.apply(console, args);

  // Send console errors to server
  fetch('/api/admin/log-error', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'console_error',
      message: args.join(' '),
      timestamp: new Date().toISOString()
    })
  }).catch(() => {});
};

// Initialize admin when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  // Check if admin is logged in
  const adminToken = localStorage.getItem('admin_token');
  const adminUser = JSON.parse(localStorage.getItem('admin_user') || '{}');

  if (!adminToken || !adminUser.id) {
    alert('관리자 로그인이 필요합니다');
    window.location.href = '/admin-login.html';
    return;
  }

  // Set admin token for API calls
  if (window.api) {
    window.api.setAdminToken = function(token) {
      this.adminToken = token;
    };

    // Override request method to use admin token
    const originalRequest = window.api.request;
    window.api.request = function(url, options = {}) {
      if (this.adminToken && url.startsWith('/admin')) {
        options.headers = options.headers || {};
        options.headers['Authorization'] = `Bearer ${this.adminToken}`;
      }
      return originalRequest.call(this, url, options);
    };

    window.api.setAdminToken(adminToken);
  }

  // Show admin name
  const adminNameElement = document.getElementById('admin-name');
  if (adminNameElement && adminUser.name) {
    adminNameElement.textContent = `${adminUser.name} (${adminUser.role})`;
  }

  window.admin = new AdminManager();
});

// Logout function
async function logout() {
  if (!confirm('로그아웃하시겠습니까?')) {
    return;
  }

  try {
    const adminToken = localStorage.getItem('admin_token');
    if (adminToken) {
      await fetch('/api/admin-auth/logout', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminToken}`
        }
      });
    }
  } catch (error) {
    console.error('Logout error:', error);
  } finally {
    // Clear local storage
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');

    // Redirect to login
    window.location.href = '/admin-login.html';
  }
}

async function editQuiz(quizId) {
  try {
    const data = await api.request('/admin/quizzes');
    const quiz = data.data.quizzes.find(q => q.id === quizId);

    if (quiz) {
      openQuizCreationModal(quizId);

      // Fill form with existing data
      document.getElementById('quiz-category').value = quiz.category;
      document.getElementById('quiz-title').value = quiz.title;
      document.getElementById('quiz-description').value = quiz.description || '';
      document.getElementById('option-a-title').value = quiz.option_a_title;
      document.getElementById('option-a-description').value = quiz.option_a_description || '';
      document.getElementById('option-b-title').value = quiz.option_b_title;
      document.getElementById('option-b-description').value = quiz.option_b_description || '';
      document.getElementById('quiz-active').checked = quiz.is_active;

      // Show existing image previews if available
      if (quiz.option_a_image) {
        document.getElementById('option-a-preview').innerHTML =
          `<img src="/uploads/${quiz.option_a_image}" alt="옵션 A" style="max-width: 200px; max-height: 150px; border-radius: 8px;">`;
        document.getElementById('option-a-preview').style.display = 'block';
      } else {
        // 이미지가 없는 경우 미리보기를 숨김
        document.getElementById('option-a-preview').style.display = 'none';
        document.getElementById('option-a-preview').innerHTML = '';
      }

      if (quiz.option_b_image) {
        document.getElementById('option-b-preview').innerHTML =
          `<img src="/uploads/${quiz.option_b_image}" alt="옵션 B" style="max-width: 200px; max-height: 150px; border-radius: 8px;">`;
        document.getElementById('option-b-preview').style.display = 'block';
      } else {
        // 이미지가 없는 경우 미리보기를 숨김
        document.getElementById('option-b-preview').style.display = 'none';
        document.getElementById('option-b-preview').innerHTML = '';
      }
    }
  } catch (error) {
    console.error('퀴즈 로딩 실패:', error);
    admin.showAlert('퀴즈 데이터를 불러올 수 없습니다', 'error');
  }
}

async function deleteQuiz(quizId) {
  if (!confirm('정말로 이 A&B 퀴즈를 삭제하시겠습니까?\\n\\n사용자 응답 데이터도 함께 삭제됩니다.')) {
    return;
  }

  try {
    await api.request(`/admin/quizzes/${quizId}`, {
      method: 'DELETE'
    });

    admin.showAlert('A&B 퀴즈가 삭제되었습니다', 'success');
    admin.loadQuizList();

  } catch (error) {
    console.error('퀴즈 삭제 실패:', error);
    admin.showAlert(error.message || 'A&B 퀴즈 삭제에 실패했습니다', 'error');
  }
}

// AI Image Generation Functions with Preview
let currentGeneratedImage = null;
let currentOption = null;


async function generateImage(prompt, option) {
  const loadingElement = document.getElementById(`option-${option}-generating`);
  const previewElement = document.getElementById(`option-${option}-preview`);
  const generateBtn = document.getElementById(`generate-option-${option}-btn`);

  if (!prompt || prompt.trim() === '') {
    admin.showAlert(`${option.toUpperCase()} 옵션의 제목을 먼저 입력해주세요`, 'error');
    return;
  }

  try {
    // Disable button and show loading
    generateBtn.disabled = true;
    generateBtn.innerHTML = '⏳ 생성중...';
    loadingElement.style.display = 'block';
    previewElement.innerHTML = '';

    console.log(`🎨 Generating image for option ${option} with prompt:`, prompt);

    // Get quiz category for context
    const categorySelect = document.getElementById('quiz-category');
    const category = categorySelect ? categorySelect.value : '';

    // First, enhance the prompt using web search and knowledge base
    const enhanceResponse = await api.request('/admin/enhance-prompt', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        prompt: prompt,
        category: category
      })
    });

    let finalPrompt = prompt;
    if (enhanceResponse.success) {
      finalPrompt = enhanceResponse.data.enhanced_prompt;
      console.log(`🎯 Enhanced prompt:`, finalPrompt);
      console.log(`🔍 Search info:`, enhanceResponse.data.search_info);
    }

    // Generate image with enhanced prompt
    const response = await api.request('/admin/generate-image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        prompt: finalPrompt,
        title: prompt, // Original title for filename
        size: '512x512'
      })
    });

    if (response.success) {
      // Store generated image data
      currentGeneratedImage = response.data;
      currentOption = option;

      // Show preview modal
      showImagePreviewModal(response.data, prompt);

    } else {
      throw new Error(response.error || '이미지 생성에 실패했습니다');
    }

  } catch (error) {
    console.error('Image generation error:', error);
    admin.showAlert(error.message || '이미지 생성 중 오류가 발생했습니다', 'error');
  } finally {
    // Reset button and hide loading
    generateBtn.disabled = false;
    generateBtn.innerHTML = '🎨 AI 생성';
    loadingElement.style.display = 'none';
  }
}

function showImagePreviewModal(imageData, prompt) {
  const modal = document.getElementById('image-preview-modal');
  const previewImage = document.getElementById('preview-image');
  const previewPrompt = document.getElementById('preview-prompt');
  const previewSize = document.getElementById('preview-size');

  // Set modal content
  previewImage.src = imageData.url;
  previewPrompt.textContent = prompt;
  previewSize.textContent = imageData.size;

  // Show modal
  modal.style.display = 'flex';
}

function closeImagePreviewModal() {
  const modal = document.getElementById('image-preview-modal');
  modal.style.display = 'none';
  currentGeneratedImage = null;
  currentOption = null;
}

async function acceptGeneratedImage() {
  if (!currentGeneratedImage || !currentOption) return;

  try {
    const previewElement = document.getElementById(`option-${currentOption}-preview`);

    // Show preview in original location
    previewElement.innerHTML = `
      <img src="${currentGeneratedImage.url}" alt="생성된 이미지"
           style="max-width: 200px; max-height: 150px; border-radius: 8px; border: 2px solid #3498db;">
      <p style="margin-top: 0.5rem; font-size: 0.85rem; color: #666;">
        ✅ AI로 생성된 이미지 (${currentGeneratedImage.filename})
      </p>
    `;

    // Create a File object to simulate file upload
    const imageBlob = await fetch(currentGeneratedImage.url).then(r => r.blob());
    const file = new File([imageBlob], currentGeneratedImage.filename, { type: 'image/png' });

    // Create a DataTransfer object and set the file
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);

    // Update the file input
    const fileInput = document.getElementById(`option-${currentOption}-image`);
    fileInput.files = dataTransfer.files;

    admin.showAlert(`${currentOption.toUpperCase()} 옵션 이미지가 적용되었습니다!`, 'success');
    closeImagePreviewModal();

  } catch (error) {
    console.error('Image acceptance error:', error);
    admin.showAlert('이미지 적용 중 오류가 발생했습니다', 'error');
  }
}

async function rejectGeneratedImage() {
  if (!currentGeneratedImage) return;

  try {
    // Delete the generated image file
    await api.request(`/admin/delete-image`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        filename: currentGeneratedImage.filename
      })
    });
  } catch (error) {
    console.warn('Failed to delete rejected image:', error);
  }

  closeImagePreviewModal();

  // Automatically trigger regeneration
  if (currentOption) {
    const titleInput = document.getElementById(`option-${currentOption}-title`);
    const descInput = document.getElementById(`option-${currentOption}-description`);
    const prompt = titleInput.value + (descInput.value ? `, ${descInput.value}` : '');
    generateImage(prompt, currentOption);
  }
}

// Setup AI image generation event listeners
document.addEventListener('DOMContentLoaded', () => {
  // Option A generate button
  const generateABtn = document.getElementById('generate-option-a-btn');
  if (generateABtn) {
    generateABtn.addEventListener('click', () => {
      const titleInput = document.getElementById('option-a-title');
      const descInput = document.getElementById('option-a-description');
      const prompt = titleInput.value + (descInput.value ? `, ${descInput.value}` : '');
      generateImage(prompt, 'a');
    });
  }

  // Option B generate button
  const generateBBtn = document.getElementById('generate-option-b-btn');
  if (generateBBtn) {
    generateBBtn.addEventListener('click', () => {
      const titleInput = document.getElementById('option-b-title');
      const descInput = document.getElementById('option-b-description');
      const prompt = titleInput.value + (descInput.value ? `, ${descInput.value}` : '');
      generateImage(prompt, 'b');
    });
  }

  // Image preview modal event listeners
  const previewAcceptBtn = document.getElementById('preview-accept-btn');
  if (previewAcceptBtn) {
    previewAcceptBtn.addEventListener('click', acceptGeneratedImage);
  }

  const previewRejectBtn = document.getElementById('preview-reject-btn');
  if (previewRejectBtn) {
    previewRejectBtn.addEventListener('click', rejectGeneratedImage);
  }

  // Close modal when clicking outside
  const imagePreviewModal = document.getElementById('image-preview-modal');
  if (imagePreviewModal) {
    imagePreviewModal.addEventListener('click', (e) => {
      if (e.target === imagePreviewModal) {
        closeImagePreviewModal();
      }
    });
  }
});

// ===========================
// 유저 관리 기능
// ===========================

// AdminManager 클래스에 유저 관리 메서드 추가
AdminManager.prototype.setupUsersEventListeners = function() {
  // 유저 검색
  const userSearch = document.getElementById('user-search');
  if (userSearch) {
    let searchTimeout;
    userSearch.addEventListener('input', () => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        this.currentFilters.search = userSearch.value;
        this.currentPage = 1;
        this.loadUsers();
      }, 500);
    });
  }

  // 상태 필터
  const statusFilter = document.getElementById('user-status-filter');
  if (statusFilter) {
    statusFilter.addEventListener('change', () => {
      this.currentFilters.status = statusFilter.value;
      this.currentPage = 1;
      this.loadUsers();
    });
  }

  // 새로고침 버튼
  const refreshBtn = document.getElementById('refresh-users-btn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      this.loadUsers();
    });
  }

  // 페이지네이션
  const prevBtn = document.getElementById('users-prev-btn');
  const nextBtn = document.getElementById('users-next-btn');

  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      if (this.currentPage > 1) {
        this.currentPage--;
        this.loadUsers();
      }
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      this.currentPage++;
      this.loadUsers();
    });
  }

  // 유저 상세 모달 닫기
  const userModal = document.getElementById('user-detail-modal');
  if (userModal) {
    const closeBtn = userModal.querySelector('.modal-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        userModal.style.display = 'none';
      });
    }

    userModal.addEventListener('click', (e) => {
      if (e.target === userModal) {
        userModal.style.display = 'none';
      }
    });
  }
};

AdminManager.prototype.loadUsers = async function() {
  try {
    const params = new URLSearchParams({
      page: this.currentPage,
      limit: 20,
      search: this.currentFilters.search || '',
      status: this.currentFilters.status || 'all'
    });

    const response = await api.get(`/admin/users?${params}`);

    if (response.success) {
      this.renderUsers(response.data.users);
      this.renderUsersPagination(response.data.pagination);
      this.updateUsersStats(response.data.users);
    }
  } catch (error) {
    console.error('유저 목록 로드 실패:', error);
    this.showError('유저 목록을 불러오는데 실패했습니다');
  }
};

AdminManager.prototype.renderUsers = function(users) {
  const tbody = document.getElementById('users-list');
  if (!tbody) return;

  if (users.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="loading">
          <img src="/images/Bety3.png" alt="Bety" class="bety-character character-float" style="width: 40px; height: 40px; margin-right: 0.5rem;">
          검색된 유저가 없습니다
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = users.map(user => `
    <tr>
      <td>
        <div class="user-info">
          <div class="user-name">${user.name}</div>
          <div class="user-display-name">${user.display_name || '닉네임 없음'}</div>
          ${user.email ? `<div class="user-display-name">${user.email}</div>` : ''}
        </div>
      </td>
      <td>
        <div class="user-stats">
          <div>📸 사진: ${user.stats.approved_photos}/${user.stats.photo_count}</div>
          <div>🎯 퀴즈: ${user.stats.quiz_responses}</div>
          <div>💭 성향: ${user.stats.trait_responses}</div>
        </div>
      </td>
      <td>
        <div style="font-weight: 600; color: #e74c3c;">
          ${user.stats.max_affinity_score > 0 ? user.stats.max_affinity_score : '-'}
        </div>
      </td>
      <td>
        <span class="status-badge ${user.is_active ? 'status-active' : 'status-inactive'}">
          ${user.is_active ? '활성' : '비활성'}
        </span>
      </td>
      <td>
        <div style="font-size: 0.85rem; color: #666;">
          ${new Date(user.created_at).toLocaleDateString()}
        </div>
      </td>
      <td>
        <div class="user-actions">
          <button class="btn btn-secondary btn-sm" onclick="adminManager.viewUserDetail('${user.id}')">
            상세
          </button>
          <button class="btn ${user.is_active ? 'btn-danger' : 'btn-success'} btn-sm"
                  onclick="adminManager.toggleUserStatus('${user.id}', ${!user.is_active})">
            ${user.is_active ? '비활성화' : '활성화'}
          </button>
        </div>
      </td>
    </tr>
  `).join('');
};

AdminManager.prototype.renderUsersPagination = function(pagination) {
  const paginationDiv = document.getElementById('users-pagination');
  const prevBtn = document.getElementById('users-prev-btn');
  const nextBtn = document.getElementById('users-next-btn');
  const pageInfo = document.getElementById('users-page-info');

  if (paginationDiv && pagination.total_pages > 1) {
    paginationDiv.style.display = 'flex';

    if (prevBtn) {
      prevBtn.disabled = !pagination.has_prev;
    }

    if (nextBtn) {
      nextBtn.disabled = !pagination.has_next;
    }

    if (pageInfo) {
      pageInfo.textContent = `페이지 ${pagination.page} / ${pagination.total_pages}`;
    }
  } else {
    paginationDiv.style.display = 'none';
  }
};

AdminManager.prototype.updateUsersStats = function(users) {
  const totalUsers = document.getElementById('total-users');
  const activeUsers = document.getElementById('active-users');
  const usersWithPhotos = document.getElementById('users-with-photos');
  const quizParticipants = document.getElementById('quiz-participants');

  if (totalUsers) totalUsers.textContent = users.length;
  if (activeUsers) activeUsers.textContent = users.filter(u => u.is_active).length;
  if (usersWithPhotos) usersWithPhotos.textContent = users.filter(u => u.stats.photo_count > 0).length;
  if (quizParticipants) quizParticipants.textContent = users.filter(u => u.stats.quiz_responses > 0).length;
};

AdminManager.prototype.viewUserDetail = async function(userId) {
  try {
    const response = await api.get(`/admin/users/${userId}`);

    if (response.success) {
      this.renderUserDetailModal(response.data);
    }
  } catch (error) {
    console.error('유저 상세 정보 로드 실패:', error);
    this.showError('유저 상세 정보를 불러오는데 실패했습니다');
  }
};

AdminManager.prototype.renderUserDetailModal = function(data) {
  const modal = document.getElementById('user-detail-modal');
  const title = document.getElementById('user-detail-title');
  const content = document.getElementById('user-detail-content');

  if (title) {
    title.textContent = `${data.user.name} (${data.user.display_name}) 상세 정보`;
  }

  if (content) {
    content.innerHTML = `
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem;">
        <div>
          <h4>👤 기본 정보</h4>
          <div style="background: #f8f9fa; padding: 1rem; border-radius: 8px; margin-bottom: 1rem;">
            <div><strong>이름:</strong> ${data.user.name}</div>
            <div><strong>닉네임:</strong> ${data.user.display_name || '없음'}</div>
            <div><strong>이메일:</strong> ${data.user.email || '없음'}</div>
            <div><strong>상태:</strong> <span class="status-badge ${data.user.is_active ? 'status-active' : 'status-inactive'}">${data.user.is_active ? '활성' : '비활성'}</span></div>
            <div><strong>가입일:</strong> ${new Date(data.user.created_at).toLocaleDateString()}</div>
            <div><strong>최근 로그인:</strong> ${data.user.last_login_at ? new Date(data.user.last_login_at).toLocaleDateString() : '없음'}</div>
          </div>

          <h4>📊 활동 통계</h4>
          <div style="background: #f8f9fa; padding: 1rem; border-radius: 8px;">
            <div><strong>총 사진:</strong> ${data.user.stats.total_photos}</div>
            <div><strong>승인된 사진:</strong> ${data.user.stats.approved_photos}</div>
            <div><strong>대기 중인 사진:</strong> ${data.user.stats.pending_photos}</div>
            <div><strong>거절된 사진:</strong> ${data.user.stats.rejected_photos}</div>
          </div>
        </div>

        <div>
          <h4>💝 호감도 현황</h4>
          <div style="background: #f8f9fa; padding: 1rem; border-radius: 8px; margin-bottom: 1rem;">
            <h5>이 유저를 향한 호감도 (Top 5)</h5>
            ${data.affinity.towards_user.length > 0 ?
              data.affinity.towards_user.slice(0, 5).map(a => `
                <div style="display: flex; justify-content: space-between; padding: 0.25rem 0;">
                  <span>${a.viewer_display_name || a.viewer_name}</span>
                  <span style="color: #e74c3c; font-weight: 600;">${a.score}점</span>
                </div>
              `).join('') : '<div>아직 호감도 데이터가 없습니다</div>'
            }
          </div>

          <div style="background: #f8f9fa; padding: 1rem; border-radius: 8px;">
            <h5>이 유저의 타인에 대한 호감도 (Top 5)</h5>
            ${data.affinity.from_user.length > 0 ?
              data.affinity.from_user.slice(0, 5).map(a => `
                <div style="display: flex; justify-content: space-between; padding: 0.25rem 0;">
                  <span>${a.target_display_name || a.target_name}</span>
                  <span style="color: #e74c3c; font-weight: 600;">${a.score}점</span>
                </div>
              `).join('') : '<div>아직 호감도 데이터가 없습니다</div>'
            }
          </div>
        </div>
      </div>

      <div style="margin-top: 2rem;">
        <h4>🎭 성향 응답</h4>
        <div style="background: #f8f9fa; padding: 1rem; border-radius: 8px; max-height: 200px; overflow-y: auto;">
          ${data.traits.length > 0 ?
            data.traits.map(trait => `
              <div style="padding: 0.5rem 0; border-bottom: 1px solid #eee;">
                <strong>${trait.left_label} vs ${trait.right_label}:</strong>
                <span style="color: #2c3e50;">${trait.choice === 'LEFT' ? trait.left_label : trait.right_label}</span>
                <small style="color: #666; margin-left: 1rem;">${new Date(trait.created_at).toLocaleDateString()}</small>
              </div>
            `).join('') : '<div>아직 성향 응답이 없습니다</div>'
          }
        </div>
      </div>
    `;
  }

  if (modal) {
    modal.style.display = 'block';
  }
};

AdminManager.prototype.toggleUserStatus = async function(userId, newStatus) {
  if (!confirm(`정말로 이 유저를 ${newStatus ? '활성화' : '비활성화'}하시겠습니까?`)) {
    return;
  }

  try {
    const response = await api.patch(`/admin/users/${userId}/status`, {
      is_active: newStatus
    });

    if (response.success) {
      this.showSuccess(response.message);
      this.loadUsers(); // 목록 새로고침
    }
  } catch (error) {
    console.error('유저 상태 변경 실패:', error);
    this.showError('유저 상태 변경에 실패했습니다');
  }
};

// switchTab 메서드에 users 탭 추가
const originalSwitchTab = AdminManager.prototype.switchTab;
AdminManager.prototype.switchTab = function(tabName) {
  if (tabName === 'users') {
    // 기존 탭 숨기기
    document.querySelectorAll('.tab-content').forEach(tab => {
      tab.classList.remove('active');
    });
    document.querySelectorAll('.nav-tab').forEach(tab => {
      tab.classList.remove('active');
    });

    // 유저 탭 활성화
    const usersTab = document.getElementById('users-tab');
    const usersNavTab = document.querySelector('[data-tab="users"]');

    if (usersTab) usersTab.classList.add('active');
    if (usersNavTab) usersNavTab.classList.add('active');

    this.currentTab = 'users';

    // 유저 관리 이벤트 리스너 설정 (한 번만)
    if (!this.usersListenersSetup) {
      this.setupUsersEventListeners();
      this.usersListenersSetup = true;
    }

    // 유저 목록 로드
    this.loadUsers();
  } else {
    // 기존 탭 처리
    originalSwitchTab.call(this, tabName);
  }
};