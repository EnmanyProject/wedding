# HTML Accessibility Fixes

## 1. Quiz Options - Convert to Buttons

**Current (Problematic):**
```html
<div class="quiz-option" id="quiz-option-left">
  <div class="option-image">
    <img id="quiz-left-image" alt="왼쪽 선택지">
  </div>
  <div class="option-label" id="quiz-left-label">선택 A</div>
</div>
```

**Fixed (Accessible):**
```html
<button class="quiz-option" id="quiz-option-left" type="button"
        aria-describedby="quiz-left-label">
  <div class="option-image">
    <img id="quiz-left-image" alt="" role="presentation">
  </div>
  <div class="option-label" id="quiz-left-label">선택 A</div>
</button>
```

## 2. Navigation - Convert to Proper Nav

**Current (Problematic):**
```html
<nav class="bottom-nav">
  <button class="nav-item active" data-view="home">
    <span class="nav-icon">🏠</span>
    <span class="nav-label">홈</span>
  </button>
</nav>
```

**Fixed (Accessible):**
```html
<nav class="bottom-nav" aria-label="주요 내비게이션">
  <button class="nav-item active" data-view="home"
          aria-current="page" aria-label="홈 페이지로 이동">
    <span class="nav-icon" aria-hidden="true">🏠</span>
    <span class="nav-label">홈</span>
  </button>
</nav>
```

## 3. Form Labels - Add Proper Labels

**Current (Problematic):**
```html
<input type="file" id="photo-file-input" accept="image/*" style="display: none;">
```

**Fixed (Accessible):**
```html
<label for="photo-file-input" class="visually-hidden">
  프로필 사진 선택
</label>
<input type="file" id="photo-file-input" accept="image/*"
       aria-describedby="photo-help">
<div id="photo-help" class="form-help">
  JPG, PNG 형식의 이미지 파일을 선택하세요
</div>
```

## 4. Modal Focus Management

**Add to JavaScript:**
```javascript
// Modal focus trap implementation
class ModalFocusTrap {
  constructor(modalElement) {
    this.modal = modalElement;
    this.focusableElements = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
    this.firstFocusableElement = null;
    this.lastFocusableElement = null;
    this.previousActiveElement = null;
  }

  open() {
    this.previousActiveElement = document.activeElement;
    const focusableContent = this.modal.querySelectorAll(this.focusableElements);
    this.firstFocusableElement = focusableContent[0];
    this.lastFocusableElement = focusableContent[focusableContent.length - 1];

    this.modal.addEventListener('keydown', this.handleKeyDown.bind(this));
    this.firstFocusableElement.focus();
  }

  close() {
    this.modal.removeEventListener('keydown', this.handleKeyDown.bind(this));
    this.previousActiveElement.focus();
  }

  handleKeyDown(e) {
    if (e.key === 'Tab') {
      if (e.shiftKey) {
        if (document.activeElement === this.firstFocusableElement) {
          this.lastFocusableElement.focus();
          e.preventDefault();
        }
      } else {
        if (document.activeElement === this.lastFocusableElement) {
          this.firstFocusableElement.focus();
          e.preventDefault();
        }
      }
    }
    if (e.key === 'Escape') {
      this.close();
    }
  }
}
```

## 5. ARIA Landmarks and Live Regions

**Add to HTML:**
```html
<!-- Main content area -->
<main class="main-content" role="main" aria-label="주요 콘텐츠">

<!-- Rankings section -->
<section class="rankings-section" aria-labelledby="rankings-heading">
  <h3 id="rankings-heading">내 호감도 랭킹 🏆</h3>
  <div id="rankings-list" class="rankings-list" role="list">
    <!-- Add role="listitem" to each ranking -->
  </div>
</section>

<!-- Live region for dynamic updates -->
<div id="status-announcements" aria-live="polite" aria-atomic="true"
     class="visually-hidden"></div>

<!-- Quiz progress -->
<div class="quiz-progress" role="progressbar"
     aria-valuenow="1" aria-valuemin="1" aria-valuemax="10"
     aria-label="퀴즈 진행 상황: 10개 중 1번째 문제">
</div>
```

## 6. Screen Reader Only Content

**Add CSS class:**
```css
.visually-hidden {
  position: absolute !important;
  width: 1px !important;
  height: 1px !important;
  padding: 0 !important;
  margin: -1px !important;
  overflow: hidden !important;
  clip: rect(0, 0, 0, 0) !important;
  white-space: nowrap !important;
  border: 0 !important;
}
```

## 7. Touch Target Size Fixes

**CSS improvements:**
```css
/* Ensure minimum 44px touch targets */
.modal-close {
  min-width: 44px;
  min-height: 44px;
  padding: 12px;
}

.nav-item {
  min-height: 44px;
  min-width: 44px;
  padding: 8px 12px;
}

/* Quiz options */
.quiz-option {
  min-height: 44px;
  padding: 15px;
  margin: 8px 0; /* Ensure spacing between targets */
}
```