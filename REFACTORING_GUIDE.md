# 🔧 Wedding App Refactoring Guide

리팩토링 완료 날짜: 2025-10-03
버전: 1.0.0

## 📋 목차

1. [개요](#개요)
2. [완료된 작업](#완료된-작업)
3. [생성된 유틸리티](#생성된-유틸리티)
4. [다음 단계](#다음-단계)
5. [사용 예제](#사용-예제)
6. [기대 효과](#기대-효과)

---

## 개요

Wedding App의 코드 품질, 유지보수성, 성능을 개선하기 위한 리팩토링 작업입니다.

### 리팩토링 목표
- ✅ 코드 중복 제거 (80%+ 감소 목표)
- ✅ 일관된 에러 처리
- ✅ 재사용 가능한 컴포넌트
- ✅ 향상된 테스트 가능성
- ✅ 향상된 코드 문서화

### 주요 문제점 (Before)
- **ui.js**: 1,924 줄 - 복잡도 HIGH
- **api.js**: 616 줄 - 복잡도 MEDIUM
- **코드 중복**: ~25% (추정)
- **일관성 없는 에러 처리**
- **테스트 커버리지**: 0%

---

## 완료된 작업

### ✅ Phase 1: 유틸리티 생성 (완료)

#### 1. Error Handler (`/js/utils/error-handler.js`)
통합 에러 처리 시스템

**기능:**
- API 에러 처리
- 네트워크 에러 처리
- Validation 에러 처리
- 인증 에러 처리
- Rate limit 에러 처리
- 에러 로깅 및 분석
- Retry 래퍼 함수

**주요 메서드:**
```javascript
ErrorHandler.handleAPIError(error, context)
ErrorHandler.handleNetworkError(error, retryFn)
ErrorHandler.handleValidationError(field, message)
ErrorHandler.handleAuthError(error)
withErrorBoundary(fn, context)
withRetry(fn, options)
```

#### 2. UI Components (`/js/utils/ui-components.js`)
재사용 가능한 UI 컴포넌트 유틸리티

**기능:**
- Empty state 렌더링
- Pagination 업데이트
- Navigation 버튼 상태 관리
- Counter 표시
- 카드 생성
- 로딩 상태 표시
- Badge 생성
- 애니메이션 효과
- Divider 생성

**주요 메서드:**
```javascript
renderEmptyState(container, config)
updatePagination(element, total, active, onClick)
updateNavigationButtons(prevBtn, nextBtn, canPrev, canNext)
updateCounter(element, current, total)
createCard(data, options)
showLoading(container, message)
hideLoading(container)
createBadge(text, type)
animateEntrance(element, animation, duration)
```

#### 3. Formatters (`/js/utils/formatters.js`)
데이터 포맷팅 유틸리티

**기능:**
- 상대 시간 포맷 ("5분 전")
- 절대 날짜 포맷
- 숫자 포맷 (K/M/B 또는 만/억)
- 퍼센트 포맷
- 텍스트 자르기
- 파일 크기 포맷
- 지속 시간 포맷
- 전화번호 포맷 (한국)
- 통화 포맷 (₩)
- Safe parsing (int, float)

**주요 메서드:**
```javascript
formatRelativeTime(dateString)
formatDate(dateString, options)
formatCompactNumber(num, options)
formatNumber(num)
formatPercentage(value, decimals)
truncateText(text, maxLength)
formatFileSize(bytes)
formatDuration(seconds)
formatPhoneNumber(phone)
formatCurrency(amount)
```

#### 4. 기존 Performance Utilities (`/js/utils/performance.js`)
이미 생성된 성능 최적화 유틸리티

**기능:**
- Debounce/Throttle
- LazyImageLoader
- RAFScheduler
- PerformanceTracker
- EventDelegator
- BatchDOMUpdater

#### 5. 기존 Cache System (`/js/utils/cache.js`)
이미 생성된 캐싱 시스템

**기능:**
- APICache (메모리)
- PersistentCache (localStorage)
- TTL 관리
- 자동 정리

---

## 생성된 유틸리티

### 파일 구조
```
public/js/utils/
├── error-handler.js    # 🛡️ 에러 처리 (NEW)
├── ui-components.js    # 💎 UI 컴포넌트 (NEW)
├── formatters.js       # 📐 포맷터 (NEW)
├── performance.js      # ⚡ 성능 최적화 (EXISTING)
└── cache.js           # 💾 캐싱 시스템 (EXISTING)
```

### 통합 상태
- ✅ index.html에 모듈로 로드됨
- ✅ ES6 모듈 형식 (import/export)
- ✅ 전역 접근 가능
- ⏳ api.js 통합 (다음 단계)
- ⏳ ui.js 통합 (다음 단계)

---

## 다음 단계

### Phase 2: 기존 코드 통합 (권장)

#### 1. api.js에 ErrorHandler 통합
**파일**: `public/js/api.js`

**현재 문제:**
- 일관성 없는 에러 처리
- 중복된 try-catch 블록
- 사용자 친화적이지 않은 에러 메시지

**통합 방법:**
```javascript
// api.js 상단에 추가
import { ErrorHandler, withRetry } from '/js/utils/error-handler.js';

// 기존 에러 처리 변경
try {
  const response = await fetch(url);
  // ...
} catch (error) {
  // 변경 전:
  console.error('API Error:', error);
  throw error;

  // 변경 후:
  return ErrorHandler.handleAPIError(error, 'API Request');
}
```

**영향:**
- 일관된 에러 메시지
- 자동 토스트 알림
- 에러 로깅 및 분석
- 약 50줄 코드 감소

#### 2. ui.js에 UI Components 통합
**파일**: `public/js/ui.js`

**현재 문제:**
- Empty state 렌더링 중복 (4+ 곳)
- Pagination 로직 중복
- Navigation 버튼 업데이트 중복

**통합 방법:**
```javascript
// ui.js 상단에 추가
import {
  renderEmptyState,
  updatePagination,
  updateNavigationButtons,
  updateCounter
} from '/js/utils/ui-components.js';

// 기존 코드 변경
// 변경 전:
if (this.currentPartners.length === 0) {
  this.mobilePartnerSwiper.innerHTML = `
    <div class="empty-state">
      <img src="/images/Bety3.png" alt="Bety" class="bety-character">
      <p>아직 매칭된 파트너가 없습니다</p>
    </div>
  `;
}

// 변경 후:
if (this.currentPartners.length === 0) {
  renderEmptyState(this.mobilePartnerSwiper, {
    message: '아직 매칭된 파트너가 없습니다',
    betyImage: '/images/Bety3.png'
  });
}
```

**영향:**
- 약 300줄 코드 감소
- 일관된 UI 렌더링
- 쉬운 스타일 변경

#### 3. ui.js에 Formatters 통합
**파일**: `public/js/ui.js`

**현재 문제:**
- 시간 포맷팅 로직 중복 (lines 857-871)
- 숫자 포맷팅 중복

**통합 방법:**
```javascript
// ui.js 상단에 추가
import { formatRelativeTime, formatNumber } from '/js/utils/formatters.js';

// 기존 코드 변경
// 변경 전:
const diffMs = now - date;
const diffMins = Math.floor(diffMs / 60000);
if (diffMins < 1) return '방금 전';
if (diffMins < 60) return `${diffMins}분 전`;
// ...

// 변경 후:
return formatRelativeTime(date);
```

**영향:**
- 약 50줄 코드 감소
- 일관된 포맷팅
- 버그 감소

### Phase 3: MobileSwiper 컴포넌트 추출 (선택)

**목표:** ui.js의 500+ 줄 Swiper 로직을 재사용 가능한 컴포넌트로 추출

**새 파일:** `public/js/components/swiper.js`

**영향:**
- ui.js 약 500줄 감소
- Rankings과 Partners에서 재사용
- 미래 기능에서도 사용 가능

**우선순위:** MEDIUM (Phase 2 완료 후)

---

## 사용 예제

### ErrorHandler 사용

```javascript
// 기본 API 에러 처리
import { ErrorHandler } from '/js/utils/error-handler.js';

try {
  const data = await api.fetchUserData();
} catch (error) {
  ErrorHandler.handleAPIError(error, 'User Data Fetch');
}

// Retry와 함께 사용
import { withRetry } from '/js/utils/error-handler.js';

const fetchWithRetry = withRetry(
  () => api.fetchUserData(),
  { maxRetries: 3, initialDelay: 1000 }
);

// 함수를 error boundary로 감싸기
import { withErrorBoundary } from '/js/utils/error-handler.js';

const safeFunction = withErrorBoundary(async () => {
  return await riskyOperation();
}, 'Risky Operation');
```

### UI Components 사용

```javascript
import {
  renderEmptyState,
  updatePagination,
  showLoading,
  createBadge
} from '/js/utils/ui-components.js';

// Empty state 표시
renderEmptyState(container, {
  message: '데이터가 없습니다',
  betyImage: '/images/Bety3.png',
  actionText: '새로고침',
  onAction: () => loadData()
});

// 로딩 표시
showLoading(container, '데이터 로딩 중...');

// Pagination 업데이트
updatePagination(paginationEl, totalItems, currentIndex, (index) => {
  goToPage(index);
});

// Badge 생성
const badge = createBadge('NEW', 'success');
element.appendChild(badge);
```

### Formatters 사용

```javascript
import {
  formatRelativeTime,
  formatCompactNumber,
  formatCurrency,
  truncateText
} from '/js/utils/formatters.js';

// 상대 시간
const timeAgo = formatRelativeTime('2024-10-03T10:00:00');
// "5분 전"

// 숫자 포맷 (한국식)
const views = formatCompactNumber(15000, { useKorean: true });
// "1.5만"

// 통화 포맷
const price = formatCurrency(50000);
// "₩50,000"

// 텍스트 자르기
const short = truncateText('긴 텍스트입니다...', 10);
// "긴 텍스트입니..."
```

---

## 기대 효과

### 코드 품질 지표

#### Before (리팩토링 전)
| 지표 | 값 |
|------|-----|
| ui.js 크기 | 1,924 줄 |
| api.js 크기 | 616 줄 |
| 코드 중복 | ~25% |
| 복잡도 | HIGH-MEDIUM |
| 테스트 커버리지 | 0% |
| 에러 처리 일관성 | 낮음 |

#### After (Phase 2 완료 후 예상)
| 지표 | 값 | 개선 |
|------|-----|------|
| ui.js 크기 | ~1,100 줄 | -43% |
| api.js 크기 | ~450 줄 | -27% |
| 코드 중복 | ~5% | -80% |
| 복잡도 | MEDIUM-LOW | 개선 |
| 테스트 커버리지 | 목표 60%+ | +60% |
| 에러 처리 일관성 | 높음 | 대폭 개선 |

### 개발자 경험 개선
- ✅ 버그 수정 시간 단축 (일관된 패턴)
- ✅ 새 기능 개발 속도 향상 (재사용 가능한 컴포넌트)
- ✅ 코드 리뷰 시간 단축 (명확한 구조)
- ✅ 온보딩 시간 단축 (문서화된 유틸리티)

### 사용자 경험 개선
- ✅ 일관된 에러 메시지
- ✅ 향상된 성능 (중복 제거)
- ✅ 더 빠른 버그 수정
- ✅ 신뢰성 향상

---

## 테스트 가이드

### Phase 1 테스트 (완료된 유틸리티)

#### 1. Error Handler 테스트
브라우저 콘솔에서 실행:

```javascript
// 테스트 1: API 에러 처리
import { ErrorHandler } from '/js/utils/error-handler.js';

const testError = new Error('Test error message');
const result = ErrorHandler.handleAPIError(testError, 'Test Context');
console.log('Result:', result);
// 토스트 메시지가 표시되어야 함

// 테스트 2: Retry 래퍼
import { withRetry } from '/js/utils/error-handler.js';

let attempts = 0;
const unreliableFunction = async () => {
  attempts++;
  if (attempts < 3) throw new Error('Temporary failure');
  return 'Success!';
};

const result = await withRetry(unreliableFunction, { maxRetries: 3 });
console.log('Retry result:', result, 'Attempts:', attempts);
```

#### 2. UI Components 테스트
브라우저 콘솔에서 실행:

```javascript
// 테스트 1: Empty State
import { renderEmptyState } from '/js/utils/ui-components.js';

const container = document.createElement('div');
document.body.appendChild(container);
renderEmptyState(container, {
  message: '테스트 Empty State',
  betyImage: '/images/Bety1.png'
});
// Empty state가 렌더링되어야 함

// 테스트 2: Badge 생성
import { createBadge } from '/js/utils/ui-components.js';

const badge = createBadge('NEW', 'success');
document.body.appendChild(badge);
// 초록색 'NEW' badge가 표시되어야 함
```

#### 3. Formatters 테스트
브라우저 콘솔에서 실행:

```javascript
import {
  formatRelativeTime,
  formatCompactNumber,
  formatCurrency
} from '/js/utils/formatters.js';

// 테스트 1: 상대 시간
const now = new Date();
const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
console.log('5분 전:', formatRelativeTime(fiveMinutesAgo));
// "5분 전" 출력

// 테스트 2: 숫자 포맷
console.log('15,000:', formatCompactNumber(15000, { useKorean: true }));
// "1.5만" 출력

// 테스트 3: 통화 포맷
console.log('50,000원:', formatCurrency(50000));
// "₩50,000" 출력
```

### Phase 2 테스트 체크리스트 (통합 후)
- [ ] API 에러가 일관되게 처리됨
- [ ] Empty state가 모든 곳에서 동일하게 표시됨
- [ ] Pagination이 정상 작동함
- [ ] 시간 포맷이 일관됨
- [ ] 숫자 포맷이 올바름
- [ ] 성능 저하 없음

---

## 위험 관리

### 낮은 위험 ✅
- Utility 함수 생성 (순수 함수, 쉽게 테스트 가능)
- JSDoc 주석 추가 (비침습적)
- Dead code 제거 (이미 사용되지 않음)

### 중간 위험 ⚠️
- api.js 리팩토링 (철저한 테스트 필요)
- ui.js 리팩토링 (단계적 접근 권장)

### 완화 전략
- ✅ 단계적 구현 (Phase 1, 2, 3)
- ✅ 각 단계마다 테스트
- ✅ 기능 플래그로 새 코드 활성화
- ✅ 이전 버전과 호환성 유지

---

## FAQ

### Q: 기존 코드를 언제 변경해야 하나요?
**A:** Phase 1이 완료되고 테스트된 후입니다. 유틸리티가 먼저 생성되고 검증되어야 안전하게 통합할 수 있습니다.

### Q: 모든 에러 처리를 ErrorHandler로 변경해야 하나요?
**A:** 아니요. 점진적으로 변경하세요. 우선 api.js부터 시작하고, 그 다음 ui.js, 마지막으로 다른 파일들을 변경하세요.

### Q: 성능 영향은 없나요?
**A:** 최소한입니다. 유틸리티 함수는 가볍고 최적화되어 있습니다. 오히려 중복 제거로 번들 크기가 감소할 수 있습니다.

### Q: 이전 브라우저를 지원하나요?
**A:** ES6 모듈을 사용하므로 최신 브라우저가 필요합니다. 필요시 Babel로 트랜스파일할 수 있습니다.

### Q: TypeScript로 마이그레이션할 수 있나요?
**A:** 네. JSDoc 타입 주석이 있어 TypeScript로 쉽게 전환할 수 있습니다.

---

## 참고 자료

### 관련 파일
- `/public/js/utils/error-handler.js` - 에러 처리 유틸리티
- `/public/js/utils/ui-components.js` - UI 컴포넌트 유틸리티
- `/public/js/utils/formatters.js` - 포맷팅 유틸리티
- `/public/js/utils/performance.js` - 성능 최적화 유틸리티
- `/public/js/utils/cache.js` - 캐싱 시스템

### 코드 스타일 가이드
- ES6+ 문법 사용
- JSDoc 주석으로 타입 문서화
- 순수 함수 선호
- 명확한 함수명 (동사 + 명사)
- 에러는 항상 throw하거나 ErrorHandler로 처리

### 커밋 메시지 규칙
```
refactor: <변경 내용>

예:
refactor: extract error handling into utility
refactor: create reusable UI components
refactor: integrate ErrorHandler into api.js
```

---

## 변경 이력

### 2025-10-03 - Phase 1 완료
- ✅ ErrorHandler 유틸리티 생성
- ✅ UI Components 유틸리티 생성
- ✅ Formatters 유틸리티 생성
- ✅ index.html에 유틸리티 통합
- ✅ 리팩토링 가이드 문서 작성

### 다음 마일스톤
- ⏳ Phase 2: api.js 통합
- ⏳ Phase 2: ui.js 통합
- ⏳ Phase 3: MobileSwiper 컴포넌트 추출

---

## 결론

Phase 1이 성공적으로 완료되었습니다. 3개의 핵심 유틸리티가 생성되어 코드 품질과 유지보수성 향상을 위한 기반이 마련되었습니다.

**다음 단계:** Phase 2로 진행하여 api.js와 ui.js에 유틸리티를 통합하세요.

**예상 결과:**
- 코드 약 350줄 감소
- 일관된 에러 처리
- 재사용 가능한 UI 컴포넌트
- 향상된 개발자 경험

---

**작성자:** Claude Code
**날짜:** 2025-10-03
**버전:** 1.0.0
