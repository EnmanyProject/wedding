# ARIA Implementation Guide

## Required ARIA Attributes by Component

### 1. Main Navigation
```html
<nav class="bottom-nav" aria-label="주요 내비게이션">
  <button class="nav-item active" data-view="home"
          aria-current="page" aria-pressed="true">
    <span class="nav-icon" aria-hidden="true">🏠</span>
    <span class="nav-label">홈</span>
  </button>
</nav>
```

### 2. Quiz Component
```html
<div class="quiz-content" role="form" aria-labelledby="quiz-question">
  <div class="quiz-options" role="radiogroup" aria-labelledby="quiz-question">
    <button class="quiz-option" role="radio" aria-checked="false"
            aria-describedby="quiz-left-label">
      <img src="..." alt="" role="presentation">
      <span id="quiz-left-label">선택 A</span>
    </button>
  </div>
</div>
```

### 3. Photo Grid
```html
<section class="photos-section" aria-labelledby="photos-heading">
  <h2 id="photos-heading">내 사진 관리 📸</h2>
  <div class="photos-grid" role="grid" aria-label="사진 갤러리">
    <div class="photo-item" role="gridcell" tabindex="0"
         aria-label="프로필 사진 1, 클릭하여 확대">
      <img src="..." alt="사용자 프로필 사진">
    </div>
  </div>
</section>
```

### 4. Modal Dialogs
```html
<div class="modal" role="dialog" aria-modal="true"
     aria-labelledby="modal-title" aria-describedby="modal-description">
  <div class="modal-content">
    <div class="modal-header">
      <h3 id="modal-title">사진 업로드</h3>
      <button class="modal-close" aria-label="모달 닫기">&times;</button>
    </div>
    <div class="modal-body" id="modal-description">
      <!-- Modal content -->
    </div>
  </div>
</div>
```

### 5. Dynamic Content Updates
```html
<!-- Live region for status updates -->
<div id="live-region" aria-live="polite" aria-atomic="true"
     class="visually-hidden"></div>

<!-- JavaScript to announce updates -->
<script>
function announceToScreenReader(message) {
  const liveRegion = document.getElementById('live-region');
  liveRegion.textContent = message;
}

// Usage examples:
announceToScreenReader('퀴즈 결과: 정답입니다!');
announceToScreenReader('새로운 사진이 업로드되었습니다');
</script>
```

### 6. Form Validation
```html
<div class="form-group">
  <label for="quiz-title" class="form-label">퀴즈 제목</label>
  <input type="text" id="quiz-title" class="form-control"
         aria-describedby="title-help title-error"
         aria-invalid="false" required>
  <div id="title-help" class="form-help">
    퀴즈의 제목을 입력하세요
  </div>
  <div id="title-error" class="error-message" aria-live="polite">
    <!-- Error message appears here -->
  </div>
</div>
```

### 7. Progress Indicators
```html
<div class="upload-progress" role="progressbar"
     aria-valuenow="50" aria-valuemin="0" aria-valuemax="100"
     aria-label="파일 업로드 진행률">
  <div class="progress-bar">
    <div class="progress-fill" style="width: 50%"></div>
  </div>
  <span class="visually-hidden">50% 완료</span>
</div>
```

## JavaScript ARIA Management

### Dynamic ARIA Updates
```javascript
class ARIAManager {
  static updateProgressBar(element, value, max = 100, label = '') {
    element.setAttribute('aria-valuenow', value);
    element.setAttribute('aria-valuemax', max);
    element.setAttribute('aria-label', `${label} ${Math.round((value/max)*100)}% 완료`);
  }

  static announceMessage(message) {
    const liveRegion = document.getElementById('live-region');
    // Clear first to ensure announcement
    liveRegion.textContent = '';
    setTimeout(() => {
      liveRegion.textContent = message;
    }, 100);
  }

  static setExpanded(button, expanded) {
    button.setAttribute('aria-expanded', expanded.toString());
  }

  static setSelected(item, selected) {
    item.setAttribute('aria-selected', selected.toString());
  }

  static updateFormValidity(input, isValid, errorMessage = '') {
    input.setAttribute('aria-invalid', (!isValid).toString());

    const errorElement = document.getElementById(input.getAttribute('aria-describedby'));
    if (errorElement) {
      errorElement.textContent = isValid ? '' : errorMessage;
    }
  }
}

// Usage examples:
ARIAManager.updateProgressBar(progressElement, 75, 100, '업로드');
ARIAManager.announceMessage('퀴즈가 성공적으로 제출되었습니다');
ARIAManager.updateFormValidity(inputElement, false, '필수 항목입니다');
```

## Testing Checklist

### Screen Reader Testing
- [ ] All interactive elements announce their purpose
- [ ] Form fields have clear labels and descriptions
- [ ] Error messages are announced when they appear
- [ ] Page structure is navigable by headings
- [ ] Live regions announce dynamic content changes

### Keyboard Testing
- [ ] All functionality accessible via keyboard
- [ ] Focus indicators are clearly visible
- [ ] Tab order is logical
- [ ] Modal focus is trapped
- [ ] Escape key closes modals

### Color/Contrast Testing
- [ ] All text meets 4.5:1 contrast ratio (AA)
- [ ] Large text meets 3:1 contrast ratio
- [ ] Focus indicators meet 3:1 contrast ratio
- [ ] Non-text elements meet 3:1 contrast ratio