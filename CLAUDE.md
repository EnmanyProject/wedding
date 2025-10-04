# 🤖 Claude Code - Wedding App 작업 이력

프로젝트: Wedding App (누구나)
마지막 업데이트: 2025-10-04 00:35 KST

---

## 📌 최근 작업 (2025-10-04)

### 1️⃣ 로딩 화면 문제 해결 ✅

**문제:**
- 분홍색 로딩 화면(elegant-loading) 후 검은색 글로벌 로딩 오버레이에서 멈춤
- 메인 화면(유저 카드)이 표시되지 않음

**해결:**
1. **app.js:hideLoadingScreen()** 수정
   - 글로벌 로딩 오버레이 강제 숨김 추가
   - `display: none` 명시적 설정

2. **ui.js:loadHomeData()** 수정
   - 데이터 로딩 성공/실패 시 모두 글로벌 오버레이 강제 숨김
   - 중복 로딩 화면 방지

3. **loading-manager.js** 개선
   - `createGlobalLoadingOverlay()`: 초기화 시 `display: none` 설정
   - `showGlobalLoading()`: 표시 시 `display: flex` 설정
   - `hideGlobalLoading()`: 숨길 때 `display: none` 설정

**결과:**
- ✅ 로딩 화면이 정상적으로 사라짐
- ✅ 메인 화면(유저 카드)이 정상 표시됨

---

### 2️⃣ 프리미엄 파트너 카드 UI 디자인 개선 🎨✨

**파일 생성:**
- `public/styles/premium-partner-cards.css` (약 600줄)

**주요 개선사항:**

#### 🎨 3D 프리미엄 카드 디자인
- 글래스모피즘 효과의 컨테이너
- 부드러운 그라데이션 배경 (흰색 → 연한 회색)
- 다층 그림자로 깊이감 표현
- 상단 컬러 액센트 라인 (핑크 → 퍼플 그라데이션)
- 카드 배경 패턴 (방사형 그라데이션)

#### 👤 프로필 아바타 강화
- 3D 글로우 효과 (펄스 애니메이션)
- 호버 시 확대(1.05x) + 회전(2deg) 효과
- 다층 보더와 그림자
- 180px × 180px 크기

#### 📊 통계 카드 모던화
- 개별 미니 카드 스타일
- 그라데이션 숫자 (핑크 #ff6b9d → 퍼플 #8b5cf6)
- 호버 시 상승(-2px) 효과
- 아이콘 드롭 섀도우
- 최소 너비 100px

#### 🎯 프리미엄 CTA 버튼
- 그라데이션 배경 (#667eea → #764ba2)
- 바운스 애니메이션 (2초 주기)
- 손가락 포인팅 애니메이션
- 글로우 섀도우 효과
- 호버 시 확대(1.05x)

#### 🎮 세련된 네비게이션
- 원형 글래스 버튼 (48px)
- 호버 시 확대(1.1x) 효과
- 부드러운 트랜지션
- 반투명 배경 블러
- Disabled 상태 처리

#### 📍 스마트 페이지네이션
- 비활성: 8px 원형
- 활성: 24px 캡슐형 + 그라데이션
- 부드러운 트랜지션
- 호버 효과

#### 📱 반응형 디자인
- **모바일 (< 768px)**:
  - 컨테이너 높이: 550px
  - 아바타: 150px
  - 통계 아이템: 85px 최소 너비

- **소형 모바일 (< 480px)**:
  - 컨테이너 높이: 520px
  - 아바타: 130px
  - 통계 아이템: 75px 최소 너비

#### 🌙 다크 모드 완벽 지원
- 어두운 배경 (#2a2a2f → #202025)
- 밝은 텍스트 그라데이션
- 조정된 섀도우와 투명도
- 자동 색상 전환

#### ♿ 접근성
- 모션 감소 옵션 지원 (`prefers-reduced-motion`)
- 충분한 대비비
- 터치 영역 최적화 (최소 44px)

**적용:**
- `index.html`에 CSS 링크 추가
- 버전: `v=20251004`

---

### 3️⃣ 베티 캐릭터 이미지 잘림 문제 해결 ✅

**문제:**
- Welcome 섹션 상단 베티의 뺨 부위가 잘림

**원인:**
- `beautiful-simple-ui.css:181`에서 `object-fit: cover` 사용

**해결:**
- `object-fit: cover` → `object-fit: contain` 변경
- 베티 이미지 전체가 표시되도록 수정

**결과:**
- ✅ 베티 얼굴 전체가 잘리지 않고 표시됨

---

### 4️⃣ 베티 캐릭터 통합 스타일 시스템 구축 🎭

**파일 생성:**
- `public/styles/bety-unified.css` (약 550줄)

**목표:**
- 모든 베티를 컨테이너 없이 깔끔하게 표시
- 앱 전체에서 통일된 베티 스타일 적용

**주요 기능:**

#### 🎭 베티 기본 스타일
- 모든 베티 이미지에 적용되는 통합 선택자:
  - `.bety-character`
  - `.bety-expressions`
  - `#welcome-bety`
  - `img[src*="Bety"]`
  - 기타 베티 관련 클래스

- **배경/테두리 완전 제거:**
  - `background: transparent !important`
  - `border: none !important`
  - `box-shadow: none !important`
  - `padding: 0 !important`

- **이미지 렌더링 최적화:**
  - `object-fit: contain`
  - `object-position: center`
  - 부드러운 렌더링 설정

#### ✨ 베티 효과
1. **떠다니는 효과 (Float)**
   - 3초 주기로 상하 움직임 (-8px)
   - 자연스러운 ease-in-out

2. **호버 효과**
   - 확대: 1.1x
   - 회전: 5deg
   - 드롭 섀도우 강화

3. **특수 애니메이션:**
   - 윙크 (bety-wink)
   - 흔들기 (bety-shake)
   - 점프 (bety-jump)
   - 펄스 로딩 (bety-pulse)

#### 📐 위치별 베티 크기
- Welcome 섹션: 80px × 80px
- 로딩 화면: 120px × 120px
- Empty State: 100px × 100px
- 퀴즈 화면: 60px × 60px

#### 📱 반응형 크기
- **모바일 (< 768px)**:
  - Welcome: 70px
  - 로딩: 100px
  - Empty: 80px

- **소형 모바일 (< 480px)**:
  - Welcome: 60px
  - 로딩: 80px
  - Empty: 70px

#### 🌙 다크 모드 지원
- 배경 투명 유지
- 드롭 섀도우 조정 (더 진하게)
- 호버 효과 강화

#### ♿ 접근성
- 스크린 리더 지원
- 모션 감소 옵션 지원
- 고대비 모드 지원

**적용된 파일 수정:**

1. **main.css:379-386**
   - `.welcome-bety` 배경 투명화
   - 패딩, 테두리 제거

2. **elegant-loading.css:35-51**
   - `.loading-character .bety-character` 배경 제거
   - 원형 컨테이너 제거
   - 자연스러운 드롭 섀도우만 유지

3. **index.html**
   - `bety-unified.css` 링크 추가 (최우선 순위)
   - 버전: `v=20251004`

**결과:**
- ✅ 모든 베티가 프레임 없이 깔끔하게 표시
- ✅ 통일된 스타일로 일관성 확보
- ✅ 자연스러운 드롭 섀도우 효과
- ✅ 부드러운 애니메이션

---

## 📁 생성/수정된 파일

### 생성된 파일
```
public/styles/
├── premium-partner-cards.css  (600줄) - 프리미엄 카드 디자인
└── bety-unified.css          (550줄) - 베티 통합 스타일
```

### 수정된 파일
```
public/js/
├── app.js                     - hideLoadingScreen() 개선
├── ui.js                      - loadHomeData() 글로벌 오버레이 숨김 추가
└── loading-manager.js         - 오버레이 display 제어 개선

public/styles/
├── beautiful-simple-ui.css    - bety-expressions object-fit 수정
├── main.css                   - welcome-bety 배경 투명화
└── elegant-loading.css        - loading-character 배경 제거

public/
└── index.html                 - 새 CSS 파일 링크 추가
```

---

## 📊 이전 작업 요약 (2025-10-03)

### 1️⃣ 코드 리팩토링 Phase 1 완료 ✅

**목표:** 코드 품질, 유지보수성, 재사용성 향상

#### 생성된 유틸리티 파일
```
public/js/utils/
├── error-handler.js    (270줄) - 통합 에러 처리 시스템
├── ui-components.js    (332줄) - 재사용 가능한 UI 컴포넌트
├── formatters.js       (294줄) - 데이터 포맷팅 유틸리티
├── performance.js      (266줄) - 성능 최적화 [기존]
└── cache.js           (248줄) - 캐싱 시스템 [기존]
```

**총 유틸리티 코드:** ~1,410 줄

#### 주요 기능

**error-handler.js:**
- API 에러 처리 (사용자 친화적 메시지)
- 네트워크 에러 처리
- Validation 에러
- 인증/인가 에러
- Rate limit 에러
- 자동 재시도 (withRetry)
- 에러 바운더리 (withErrorBoundary)

**ui-components.js:**
- Empty state 렌더링
- Pagination 컴포넌트
- Navigation 버튼 관리
- 로딩 스피너
- Badge 생성
- 애니메이션 효과
- 카드 생성

**formatters.js:**
- 상대 시간 포맷 ("5분 전")
- 날짜 포맷 (다양한 형식)
- 숫자 포맷 (만/억, K/M)
- 통화 포맷 (₩)
- 파일 크기 포맷
- 전화번호 포맷 (한국)
- 텍스트 자르기

### 2️⃣ 로딩 최적화 완료 ✅

**문제:** 콘솔에 무한 로딩 로그 (이미지 로드 30+ 줄)

**해결:**
1. **loading-manager.js:409**
   - 이미지 리소스 로딩 로그 비활성화
   - PNG, JPG, JPEG 파일 제외
   - API 요청 등 중요 로그만 유지

2. **bety-manager.js:86**
   - 개별 Bety 이미지 로드 로그 제거
   - 7개 이미지 → 1줄 요약으로 변경
   - "All 7 images preloaded" 한 줄로 정리

**결과:**
- ✅ 콘솔 로그 약 30+ 줄 감소
- ✅ 콘솔 가독성 대폭 향상
- ✅ 디버깅 경험 개선

### 3️⃣ Bety 애니메이션 최적화

**문제:** 로딩 중 Bety 이미지가 계속 로드되어 메인 화면 전환 지연

**해결:**
- 앱 로딩 완료 후에만 자동 표정 변화 시작
- 3초 추가 대기로 초기 로딩 부담 감소
- `waitForAppReady()` 메서드로 로딩 상태 모니터링

---

## 📊 프로젝트 현황

### 기술 스택
- **Frontend:** Vanilla JS (ES6+), HTML5, CSS3
- **Backend:** Node.js, Express
- **Database:** PostgreSQL
- **Cache:** Redis
- **Storage:** MinIO
- **Tools:** Docker, Socket.IO

### 코드 메트릭

**현재 상태:**
- ui.js: 1,924 줄
- api.js: 616 줄
- 유틸리티: 1,410 줄 (새로 생성)
- CSS (프리미엄 추가): +1,150 줄
- 코드 중복: ~25%
- 테스트: 0%

**Phase 2 완료 후 예상:**
- ui.js: ~1,100 줄 (-43%)
- api.js: ~450 줄 (-27%)
- 코드 중복: ~5% (-80%)
- 테스트 가능성: 높음

---

## 🗂️ 프로젝트 구조

```
wedding/
├── public/
│   ├── js/
│   │   ├── utils/              # 유틸리티 모듈
│   │   │   ├── error-handler.js
│   │   │   ├── ui-components.js
│   │   │   ├── formatters.js
│   │   │   ├── performance.js
│   │   │   └── cache.js
│   │   ├── app.js              # 메인 앱
│   │   ├── ui.js               # UI 관리 (1,924줄)
│   │   ├── api.js              # API 통신 (616줄)
│   │   ├── quiz.js             # 퀴즈 기능
│   │   ├── photos.js           # 사진 관리
│   │   ├── admin.js            # 관리자
│   │   ├── bety-manager.js     # 캐릭터 애니메이션
│   │   └── loading-manager.js  # 로딩 관리
│   ├── styles/                 # CSS 파일들
│   │   ├── main.css
│   │   ├── premium-partner-cards.css  # 🆕 프리미엄 카드
│   │   ├── bety-unified.css           # 🆕 베티 통합 스타일
│   │   ├── beautiful-simple-ui.css
│   │   ├── elegant-loading.css
│   │   ├── mobile-optimized.css
│   │   └── ... (기타 CSS)
│   └── index.html
├── server/
│   └── index.js                # Express 서버
├── docker-compose.yml          # Docker 설정
├── REFACTORING_GUIDE.md        # 리팩토링 가이드
└── CLAUDE.md                   # 이 파일
```

---

## 🎯 다음 단계 (Phase 2)

### 우선순위 작업

#### 1. api.js에 ErrorHandler 통합
**목표:** 일관된 에러 처리

**작업:**
```javascript
// import 추가
import { ErrorHandler, withRetry } from '/js/utils/error-handler.js';

// 모든 catch 블록 변경
catch (error) {
  // Before:
  console.error('API Error:', error);
  throw error;

  // After:
  return ErrorHandler.handleAPIError(error, 'API Request');
}
```

**예상 효과:**
- 약 50줄 코드 감소
- 사용자 친화적 에러 메시지
- 에러 로깅 자동화

#### 2. ui.js에 UI Components 통합
**목표:** 코드 중복 제거

**작업:**
```javascript
// import 추가
import {
  renderEmptyState,
  updatePagination,
  updateNavigationButtons
} from '/js/utils/ui-components.js';

// Empty state 렌더링 변경 (4+ 곳)
// 중복 pagination 로직 제거 (2+ 곳)
// 중복 navigation 로직 제거 (2+ 곳)
```

**예상 효과:**
- 약 300줄 코드 감소
- 일관된 UI 렌더링
- 유지보수 용이

#### 3. ui.js에 Formatters 통합
**목표:** 포맷팅 로직 통합

**작업:**
```javascript
// import 추가
import { formatRelativeTime, formatNumber } from '/js/utils/formatters.js';

// 시간 포맷팅 로직 교체 (lines 857-871)
// 숫자 포맷팅 통합
```

**예상 효과:**
- 약 50줄 코드 감소
- 일관된 포맷팅
- 버그 감소

---

## 📚 참고 문서

### 주요 문서
- **REFACTORING_GUIDE.md** - 전체 리팩토링 가이드 (600+ 줄)
  - 상세한 분석 리포트
  - 사용 예제
  - 테스트 가이드
  - FAQ

### 파일별 문서

#### error-handler.js
- `ErrorHandler.handleAPIError(error, context)` - API 에러 처리
- `ErrorHandler.handleNetworkError(error, retryFn)` - 네트워크 에러
- `withErrorBoundary(fn, context)` - 에러 바운더리
- `withRetry(fn, options)` - 자동 재시도

#### ui-components.js
- `renderEmptyState(container, config)` - Empty state 렌더링
- `updatePagination(element, total, active, onClick)` - Pagination
- `createBadge(text, type)` - Badge 생성
- `showLoading(container, message)` - 로딩 표시

#### formatters.js
- `formatRelativeTime(dateString)` - 상대 시간
- `formatDate(dateString, options)` - 날짜 포맷
- `formatCompactNumber(num, options)` - 숫자 포맷
- `formatCurrency(amount)` - 통화 포맷

---

## 🔧 개발 환경

### 서버 실행
```bash
# Docker 컨테이너 시작
docker-compose up -d

# 개발 서버 실행 (포트 3000)
npm run dev
```

### 주요 포트
- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:3000/api
- **PostgreSQL:** localhost:5432
- **Redis:** localhost:6379
- **MinIO:** localhost:9000

### Docker 컨테이너
```bash
# 상태 확인
docker-compose ps

# 로그 확인
docker-compose logs -f

# 정지
docker-compose down
```

---

## 🐛 알려진 이슈 및 해결

### ✅ 해결됨

1. **무한 로딩 로그** (2025-10-03)
   - 증상: 콘솔에 이미지 로드 로그 30+ 줄 반복
   - 해결: loading-manager.js, bety-manager.js 로그 최적화

2. **Bety 애니메이션 타이밍** (2025-10-03)
   - 증상: 로딩 중 Bety 이미지 계속 로드, 메인 화면 전환 지연
   - 해결: 앱 로딩 완료 후 애니메이션 시작

3. **서버 포트 불일치** (2025-10-03)
   - 증상: 브라우저는 3001 요청, 서버는 3000 실행
   - 해결: PORT=3000로 통일

4. **PostgreSQL 연결 실패** (2025-10-04)
   - 증상: ECONNREFUSED ::1:5432
   - 해결: Docker Desktop 시작 후 컨테이너 실행

5. **로딩 화면 멈춤** (2025-10-04)
   - 증상: 글로벌 로딩 오버레이에서 멈춤
   - 해결: app.js, ui.js, loading-manager.js 수정

6. **베티 이미지 잘림** (2025-10-04)
   - 증상: 베티의 뺨 부위가 잘림
   - 해결: object-fit: cover → contain 변경

7. **베티 컨테이너 배경** (2025-10-04)
   - 증상: 베티 주변에 프레임/배경 표시
   - 해결: bety-unified.css로 통합 스타일 적용

### ⏳ 진행 중

- 없음

---

## 💡 개발 팁

### 유틸리티 사용 패턴

```javascript
// 에러 처리
try {
  const data = await api.fetchData();
} catch (error) {
  ErrorHandler.handleAPIError(error, 'Fetch Data');
}

// Empty state 렌더링
renderEmptyState(container, {
  message: '데이터가 없습니다',
  betyImage: '/images/Bety3.png',
  actionText: '새로고침',
  onAction: () => loadData()
});

// 시간 포맷
const timeAgo = formatRelativeTime('2024-10-03T10:00:00');
// "5분 전"

// 숫자 포맷
const views = formatCompactNumber(15000, { useKorean: true });
// "1.5만"
```

### 베티 스타일 사용

```javascript
// 베티에 효과 추가
betyImage.classList.add('bety-wink');  // 윙크
betyImage.classList.add('bety-shake'); // 흔들기
betyImage.classList.add('bety-jump');  // 점프

// 자동으로 애니메이션 재생됨
```

### 디버깅

```javascript
// 캐시 상태 확인
console.log(memoryCache.getStats());

// 에러 핸들러 테스트
const result = ErrorHandler.handleAPIError(new Error('Test'), 'Test');

// Performance 측정
perfTracker.start('operation');
// ... operation ...
perfTracker.end('operation'); // 자동으로 로그 출력
```

---

## 📈 성능 개선 이력

### 캐싱 시스템 (완료)
- API 응답 캐싱 (5분 TTL)
- 세션 캐싱 (30분 TTL)
- 영구 캐싱 (24시간 TTL)
- 자동 캐시 정리

### 로딩 최적화 (완료)
- Lazy image loading
- Debounce/throttle 적용
- Batch DOM updates
- Event delegation
- 로그 최적화 (콘솔 정리)

### 네트워크 최적화 (완료)
- 병렬 API 호출 (Promise.allSettled)
- Rate limiting
- 자동 재시도
- 요청 중복 제거

### UI 최적화 (완료)
- 프리미엄 카드 디자인
- 베티 통합 스타일
- 부드러운 애니메이션
- 반응형 디자인

---

## 🎨 UI/UX 개선 이력

### Bety 캐릭터 시스템 (완료)
- 7가지 표정 (default, happy, excited, surprised, cheerful, wink, lovely)
- 자동 표정 변화 (5초 간격)
- 컨텍스트 기반 표정 (퀴즈, 매치, 에러 등)
- 부드러운 전환 애니메이션
- 이미지 프리로딩
- 통합 스타일 시스템 (bety-unified.css)

### 프리미엄 카드 디자인 (완료)
- 3D 글래스모피즘 효과
- 그라데이션 배경
- 프로필 아바타 강화 (글로우, 펄스)
- 모던 통계 카드
- 프리미엄 CTA 버튼
- 세련된 네비게이션
- 스마트 페이지네이션

### 모바일 최적화 (완료)
- Touch 제스처 지원
- Swiper 컴포넌트 (Rankings, Partners)
- 반응형 레이아웃
- 접근성 개선 (ARIA labels, keyboard navigation)

---

## 🔐 보안

### 구현된 보안 기능
- CSP (Content Security Policy)
- Token 기반 인증
- Rate limiting
- Input validation
- XSS 방지

---

## 📞 연락처 및 참고

### 문서
- 리팩토링 가이드: `REFACTORING_GUIDE.md`
- 이 파일: `CLAUDE.md`

### Git
- 저장소: (Git 저장소 미설정 - `.git` 없음)
- 버전: v1.34.02

### 개발자 도구
- Chrome DevTools
- React DevTools (해당 없음)
- Redux DevTools (해당 없음)

---

## 📝 메모

### 중요 사항
- **Git 저장소 없음:** 현재 `.git` 폴더가 없어 버전 관리가 안 됨
- **테스트 없음:** 테스트 코드가 아직 없어 Phase 2 후 작성 권장
- **타입 체크 없음:** JSDoc 주석은 있으나 TypeScript 없음

### 작업 우선순위
1. ✅ 로딩 화면 문제 해결
2. ✅ 프리미엄 카드 UI 디자인
3. ✅ 베티 통합 스타일 시스템
4. Phase 2 - api.js, ui.js 통합 (예정)
5. Git 저장소 초기화 (선택)
6. 테스트 코드 작성 (선택)
7. Phase 3 - MobileSwiper 컴포넌트 추출 (선택)

---

**마지막 작업:** 2025-10-04 00:35 KST
**작업자:** Claude Code
**상태:** ✅ 로딩 문제 해결, 프리미엄 UI 디자인, 베티 통합 스타일 완료
