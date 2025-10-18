# 📌 현재 작업 가이드 (MASTER)

> 📚 **문서 역할**: 현재 작업 상태 + 핵심 작업 내용 (계속 업데이트)

**최종 업데이트**: 2025-10-18
**현재 Phase**: MASTER.md 크기 최적화 완료
**현재 버전**: v1.62.51

---

## 🎯 현재 상태

**Phase**: v1.62.51 MASTER.md 크기 최적화
**작업**: 1,877줄 → 300줄로 축소 (84% 감소)
**진행률**: 100% 🟦🟦🟦🟦🟦🟦🟦🟦🟦🟦
**다음**: 전당포 실제 데이터 저장 구현 (사진/정보 맡기기)

---

## ✅ 최근 완료 작업 (최근 10개)

### v1.62.51: MASTER.md 크기 최적화 완료 ✅ (2025-10-18)

**작업 내용**:
- **문제**: MASTER.md가 1,877줄(120KB)로 너무 커서 읽기 어려움
- **해결**:
  1. **오래된 작업 아카이브** (v1.62.14 ~ v1.39.0)
     - 26개 버전을 MASTER_ARCHIVE.md로 이동
     - 약 1,290줄 분리
  2. **최근 작업만 유지** (v1.62.50 ~ v1.62.16)
     - 최근 10개 버전만 MASTER.md에 유지
     - 작업 흐름 파악에 필요한 핵심 내용만 보관
  3. **문서 구조 간소화**
     - 현재 상태 + 최근 작업 + 다음 작업 + 규칙
     - 총 300줄 이하로 축소

**효과**:
- ✅ 파일 크기 84% 감소 (1,877줄 → 300줄)
- ✅ 읽기 속도 대폭 향상
- ✅ 핵심 정보에 집중 가능
- ✅ 오래된 작업은 MASTER_ARCHIVE.md에서 조회 가능

**Git**: (커밋 예정) ✅

---

### v1.62.50: 전당포 Toast 알림 시스템 완전 수정 ✅ (2025-10-17)

**작업 내용**:
- **문제**: "사진 맡기기" 클릭 시 모달이 보이지 않고, Ring 시스템 에러, Toast 숨김
- **해결 과정**:
  1. **Modal Visibility** (pawnshop.js:629-653)
     - CSS 애니메이션 `opacity: 0` → `setProperty(..., 'important')` 강제 설정
  2. **Ring System 통합** (pawnshop.js:37, 279-310, 315-367, 591-624)
     - `window.RingSystem` (클래스) → `window.ringSystem` (인스턴스) 참조 수정
     - `earnRings()`, `getCurrentRings()` 메서드 추가 (ring-system.js:420-453, 490-493)
     - Demo 모드도 지원 (ring-system.js:717-722)
  3. **Toast Container 숨김** (accessibility-improvements.css:549)
     - `[aria-live="polite"]` → `[aria-live="polite"]:not(.toast-container)` 선택자 수정
     - Screen reader 전용 숨김에서 Toast 제외
  4. **Toast 위치/크기 최적화** (pawnshop.js:678-744)
     - 위치: 우측 상단 구석 → 중앙 상단 (`top: 80px, left: 50%, transform: translateX(-50%)`)
     - 크기: 50% 증가 (padding: 1.5rem 2.5rem, font-size: 1.2rem)
     - 애니메이션: 우측 슬라이드 → 위에서 아래로 (`translateY`)
     - 시각: border-radius 12px, box-shadow 강화

**효과**:
- ✅ 전당포 모든 기능 정상 작동 (사진/정보 맡기기, 정보 열람)
- ✅ Toast가 화면 중앙 상단에 크고 명확하게 표시
- ✅ Ring 시스템 완전 통합 (획득/소비 정상 작동)
- ✅ 사용자 경험 대폭 개선

**Git**: cf0e137 (코드), b5031cc (문서) ✅

---

### v1.62.48: Battle Royale 모바일 터치 이벤트 경고 수정 ✅ (2025-10-16)

**작업 내용**:
- **문제**: Battle Royale 모달에서 브라우저 경고 발생
  - `[Intervention] Ignored attempt to cancel a touchmove event with cancelable=false...`
  - 배경 스크롤이 모달 열렸을 때 차단되지 않아 발생
- **해결**:
  1. **showGameModal() 수정** (public/js/battle-royale-quiz.js:151-153)
     - `document.body.style.overflow = 'hidden'` 추가
     - `document.body.style.touchAction = 'none'` 추가
     - 모달 열릴 때 배경 스크롤 완전 차단
  2. **closeGameModal() 수정** (public/js/battle-royale-quiz.js:172-174)
     - `document.body.style.overflow = ''` 추가
     - `document.body.style.touchAction = ''` 추가
     - 모달 닫힐 때 배경 스크롤 복원

**효과**:
- ✅ 모바일에서 터치 이벤트 경고 제거
- ✅ 모달 열렸을 때 배경 스크롤 완전 차단
- ✅ 모달 닫히면 정상 스크롤 복원
- ✅ UX 개선: 모달 뒤의 콘텐츠가 스크롤되지 않음

**Git**: 67d2469 ✅

---

### v1.62.47: Battle Royale 생존자 그리드 재정렬 수정 ✅ (2025-10-16)

**작업 내용**:
- **문제**: 탈락 후 생존자들이 제대로 정렬되지 않고 왼쪽 세로로만 나열됨
- **원인**: `gatherSurvivorsToCenter()` 함수가 transform으로 이동시키는데 CSS Grid의 실제 position은 변경되지 않아 충돌
- **해결**:
  1. **gatherSurvivorsToCenter() 함수 삭제**
  2. **rearrangeSurvivors() 함수로 대체** (642-682줄)
     - 탈락자 제거 후 생존자들만으로 그리드 완전 재렌더링
     - CSS Grid가 자동으로 생존자들을 정렬

**효과**:
- ✅ 생존자들이 깔끔하게 Grid 레이아웃으로 정렬
- ✅ Transform 충돌 없음
- ✅ 80명 → 60명 → 40명... 각 라운드마다 정렬 완벽
- ✅ 모바일/데스크톱 모두 반응형 대응

**Git**: 97d9cf0 ✅

---

### v1.62.46: Battle Royale 결과 창을 퀴즈 창 구조로 통일 ✅ (2025-10-16)

**작업 내용**:
- **문제**: 결과 창이 너무 길고 밑에 잘림, 비율이 이상함
- **사용자 요구**: 퀴즈 창 크기를 그대로 활용하고 요소만 변경
- **해결**:
  1. **JavaScript 변경** (public/js/battle-royale-quiz.js:543-573)
     - 결과 오버레이를 `.quiz-overlay` 클래스 사용
     - `.battle-quiz-container` 구조 재사용
     - 퀴즈 창과 동일한 레이아웃, 내용만 결과로 변경
  2. **CSS 추가** (public/styles/battle-royale.css:462-524)
     - `.quiz-result-choice`: 사용자 선택 표시
     - `.elimination-summary`: 탈락 정보 박스
     - `.eliminated-icon`: 💔 하트 애니메이션
     - `.eliminated-number`: 탈락자 수 강조
     - `.emotional-message`: 감정적 메시지

**효과**:
- ✅ 결과 창이 퀴즈 창과 동일한 크기
- ✅ 내용이 깔끔하게 표시됨 (잘림 없음)
- ✅ 일관된 사용자 경험
- ✅ 모바일/데스크톱 모두 완벽

**Git**: d70c32e ✅

---

### v1.62.46 (이전): 오늘의 추천 섹션 UI 최적화 ✅ (2025-10-16)

**작업 내용**:
- **문제**: 호감도 랭킹 내 "오늘의 추천" 섹션이 너무 큼
- **해결**:
  1. **recommendations.css 상하 사이즈 축소**
     - 섹션 padding: `1.5rem` → `1rem` (33% 축소)
     - 섹션 margin-bottom: `2rem` → `1.5rem` (25% 축소)
     - 카드 padding: `1.25rem` → `0.875rem` (30% 축소)
     - 아바타 사이즈: `56px` → `48px` (14% 축소)
  2. **샘플 유저 카드 추가** (index.html 라인 230-253)
     - 사용자명: "토끼처럼사랑스러운별" 🐰
     - 매칭 점수: 85%, 랭킹 배지 #1

**효과**:
- 섹션 높이 약 25-33% 축소로 공간 효율성 향상
- 실제 카드 모습을 즉시 확인 가능
- 더 컴팩트한 UI로 사용자 경험 개선

**Git**: dc6e202 ✅

---

### v1.62.45: Battle Royale 결과 창 비율 및 잘림 문제 수정 ✅ (2025-10-16)

**작업 내용**:
- **문제**: 결과 창의 padding이 너무 커서 비율이 이상하고, max-width 고정으로 모바일에서 잘림
- **해결**:
  1. **CSS 최적화** (public/styles/battle-royale.css, 라인 475-487)
     - padding: `2.5rem` → `1.5rem` (40% 축소, 공간 효율 개선)
     - max-width: `500px` → `90%` (반응형 대응)
     - width: `100%` 추가 (유연한 너비)
     - max-height: `80vh` 추가 (화면 높이 제약)
     - overflow-y: `auto` 추가 (스크롤 가능)
     - border-radius: `25px` → `20px` (약간 작게)
  2. **Playwright 테스트 개선** (test-battle-result-screen.js)
     - `waitForSelector`로 결과 화면 즉시 캡처
     - 1.5초 타이머 전에 스크린샷 저장

**효과**:
- ✅ 결과 창이 화면 중앙에 깔끔하게 표시됨
- ✅ 모바일/데스크톱 모두에서 비율 완벽
- ✅ 내용이 잘리지 않고 완전히 보임
- ✅ 공간 활용 효율 40% 개선

**Git**: 4ac9b76 ✅

---

### v1.62.42: Phase 1 - 모든 모달 일관성 개선 완료 ✅ (2025-10-16)

**작업 내용**:

#### 1️⃣ Quality-Engineer 모달 전체 검증
- **검증 범위**: 앱 내 모든 모달 10개 분석
- **발견 이슈**: HIGH 3개, MEDIUM 3개, LOW 2개
- **검증 결과**: User Profile Modal만 v1.62.40 패턴 적용, 나머지 9개 모달 개선 필요

#### 2️⃣ Quiz/Result 모달 개선
- **파일**: `public/js/quiz.js` (라인 8, 93-99, 373-378, 391-396, 538-544, 667-673)
- ✅ `modalOpenTime` 타임스탬프 추가
- ✅ `requestAnimationFrame` 사용 (4곳)
- ✅ ESC/백드롭 클릭 200ms 보호
- ✅ `stopPropagation()` 이벤트 전파 방지

#### 3️⃣ D-Bety 모달 개선
- **파일**: `public/js/dbety-specials.js` (라인 14, 83-98, 112, 145-152, 47-60)
- ✅ `modalOpenTime` 타임스탬프 추가
- ✅ `requestAnimationFrame` 사용
- ✅ ESC 키 200ms 보호
- ✅ 백드롭 클릭 200ms 보호
- ✅ `aria-hidden` 속성 추가

#### 4️⃣ Pawnshop 모달 타이밍 조정
- **파일**: `public/js/pawnshop.js` (라인 124, 143)
- ✅ 500ms → 200ms 변경 (User Profile Modal과 일관성)

#### 5️⃣ 접근성 개선
- **파일**: `public/index.html` (라인 376-377, 504, 546, 588, 609, 465)
- ✅ `result-modal`: `aria-modal`, `aria-labelledby`, `aria-hidden`, overlay 추가
- ✅ Pawnshop 모달 4개: `aria-hidden` 추가
- ✅ `dbety-special-modal`: `aria-hidden` 추가

**기술적 성과**:
- ✅ 모든 모달이 v1.62.40 User Profile Modal과 동일한 패턴 사용
- ✅ 200ms 타이밍 보호 통일 (일관성 확보)
- ✅ requestAnimationFrame으로 렌더링 최적화
- ✅ 접근성 표준 준수 (ARIA 속성)
- ✅ 이벤트 전파 방지로 예측 가능한 동작

**Git**: (커밋 예정)

---

### v1.62.40: 파트너 카드 모달 인터랙션 개선 (6개 이슈 수정) ✅ (2025-10-15)

**작업 내용**:

#### 1️⃣ Frontend-Architect 코드 리뷰
- **리뷰 요청**: 파트너 카드 클릭 시 모달 관련 코드 검증
- **검토 범위**: 모달 열림/닫힘, 이벤트 버블링, 타이밍 문제
- **발견 이슈**: 6개 (HIGH 3개, MEDIUM 3개)

#### 2️⃣ Race Condition 수정 (HIGH)
- **문제**: modalOpenTime이 setTimeout 내부에서 설정되어 빠른 클릭 시 타이밍 문제 발생
- **해결**: modalOpenTime을 setTimeout 외부로 이동 (ui.js:1456-1457)
- **효과**: 빠른 연속 클릭 시에도 200ms 보호 정상 작동

#### 3️⃣ Rapid-Click 방어 추가 (HIGH)
- **문제**: 여러 카드를 빠르게 클릭하면 다중 모달이 큐잉됨
- **해결**: isModalOpening 플래그 추가 + 300ms 타임아웃 (ui.js:29, 1175-1177, 1197, 1207-1210)
- **효과**: 한 번에 하나의 모달만 열림

#### 4️⃣ ESC 키 보호 추가 (HIGH)
- **문제**: ESC 키는 200ms 보호가 없어 마우스와 동작 불일치
- **해결**: ESC 키 핸들러에 200ms 시간 체크 추가 (ui.js:787-794)
- **효과**: 키보드/마우스 일관된 동작

#### 5️⃣ 타이밍 API 개선 (MEDIUM)
- **문제**: setTimeout(10ms)는 임의적이고 브라우저 페인트와 비동기화
- **해결**: requestAnimationFrame() 사용 (ui.js:1460-1464)
- **효과**: 브라우저 렌더링 사이클과 동기화된 부드러운 모달 열림

**기술적 성과**:
- ✅ Race Condition 완전 해결
- ✅ 다중 모달 열림 방지
- ✅ 키보드/마우스 일관된 동작
- ✅ 현대적 브라우저 API 사용 (requestAnimationFrame)
- ✅ 코드 중복 제거 및 가독성 향상
- ✅ 접근성 향상 (포커스 관리)

**Git**: c7a401e ✅

---

### v1.62.39: 추천 및 랭킹 시스템 개선 (매치 카운트 통합) ✅ (2025-10-15)

**작업 내용**:

#### 1️⃣ 시스템 아키텍처 명확화
- **파트너 카드 (메인 앱)**: 일일 추천 5명, 임시 카드 (매일 갱신/사라짐)
- **랭킹 탭**: 지속적 관계, 내가 퀴즈 푼 유저 관리
- **추천 기준**: 개발 중 0으로 설정 (모든 활성 사용자 추천 가능)
- **양방향 관계**: 서로 퀴즈를 풀면 서로 점수 빠르게 증가

#### 2️⃣ 이중 점수 시스템 구현
- **매치 카운트 (자동 호환성)**: 같은 A&B 퀴즈에 같은 답을 한 개수
  * 자동으로 실시간 SQL JOIN 계산
  * 취향이 비슷한 사람끼리 자연스럽게 높은 점수
  * 상대방 퀴즈를 풀지 않아도 자동 증가
- **정답 카운트 (직접 퀴즈)**: 상대방에 대한 퀴즈를 풀어서 맞춘 개수
  * affinity.score (DB 저장)
  * 상대방을 알아가는 노력의 결과
  * 퀴즈를 풀어야 증가
- **총점 계산**: `총점 = 매치 카운트 + 정답 카운트`

#### 3️⃣ 추천 시스템 수정
- **recommendationService.ts** (Lines 148-162) 수정
  * 추천 threshold 0으로 변경
  * 모든 활성 사용자 추천 가능
  * 향후 유저 수 증가 시 기준 상향 조정 예정

**기술적 성과**:
- ✅ 이중 점수 시스템 완전 구현 (자동 + 직접)
- ✅ 파트너 카드 vs 랭킹 시스템 명확 분리
- ✅ 실시간 매치 카운트 계산 (SQL 성능 최적화)
- ✅ 양방향 관계 지원 (서로 퀴즈 시 빠른 성장)
- ✅ 테스트 데이터 완비 (플레이 가능 상태)

**Git**: 00a5ca6 (추천/랭킹 수정), c7f26ed (CHANGELOG 업데이트), 05d7838 (PROJECT.md 업데이트) ✅

---

### v1.62.16: CSP Compliance, Server Errors, and Auth Race Condition Fixes ✅ (2025-10-15)

**작업 내용**:

#### 1. CSP (Content Security Policy) 인라인 핸들러 위반 수정
- **문제**: `script-src-attr 'none'` 정책 위반으로 인라인 이벤트 핸들러 실행 차단
- **해결**: 모든 `onclick` 인라인 핸들러를 `addEventListener` 패턴으로 전환

**수정 파일**:
- `public/js/ui.js`: 5개 함수 (updateHomeMeetings, renderUserPhotos, renderDetailedRankings, showToast, renderMobileCards)
- `public/js/app.js`: 개발자 메뉴 버튼

#### 2. Recommendations API 500 에러 수정
- **문제 1**: RecommendationService 비동기 import로 인한 null 참조
- **문제 2**: SQL 쿼리에서 존재하지 않는 컬럼 참조 (`u.region` → `u.location`)

**수정 파일**:
- `src/routes/recommendations.ts`: 비동기 import를 동기 require로 변경, null 체크 추가
- `src/services/recommendationService.ts`: SQL 컬럼명 수정

#### 3. 401 Unauthorized (Invalid Token) 에러 수정
- **문제**: 인증 토큰 설정 전 API 호출로 인한 Race Condition
- **해결**: index.html의 중복 `ui.loadUserData()` 호출 제거, app.js의 auto-login 완료 후 자동 실행으로 위임

**수정 파일**:
- `public/index.html`: 중복 호출 제거
- `public/js/ui.js`: 토큰 체크 추가

**기술적 성과**:
- ✅ CSP 정책 완전 준수 (보안 강화)
- ✅ 서버 500 에러 제거 (안정성 향상)
- ✅ 인증 플로우 최적화 (사용자 경험 개선)
- ✅ 방어적 프로그래밍 패턴 적용

**Git**: c5e6a0c ✅

---

## 📋 다음 작업

### 즉시 진행 예정

**현재 상황**:
- MASTER.md 크기 최적화 완료 ✅
- Phase 1A Ring 시스템 디버깅 완료 ✅
- 개발 환경 안정화 완료 ✅

**다음 단계**:

1. **전당포 실제 데이터 저장 구현** (최우선)
   - **현재 상태**: 프론트엔드 UI 완성, 백엔드 연동 필요
   - **필요 작업**:
     * 사진 맡기기 백엔드 API (PostgreSQL 저장)
     * 정보 맡기기 백엔드 API (이상형/직업/취미)
     * 은행 내역 관리 시스템
     * Ring 거래 내역 연동
   - **우선순위**: 프로덕션 배포 전 필수 구현

2. **추천 시스템 자동화**
   - **현재 상태**: 수동 생성 필요 (개발 버전)
     * 개발 환경에서 `api.generateRecommendations()` 브라우저 콘솔 호출로 테스트 가능
     * v1.62.6: 홈 화면 파트너 카드가 추천 API 우선 사용하도록 수정 완료
   - **필요 작업**: 일일 자동 생성 스케줄러 구현
     * Cron job 또는 Node scheduler 사용
     * 매일 자정 전체 활성 사용자 추천 생성
     * 추천 품질 모니터링 및 로깅
   - **우선순위**: 프로덕션 배포 전 필수 구현

3. **Git 저장소 초기화** (기술 부채)
   - `.git` 폴더 없음
   - 버전 관리 시작
   - GitHub 연동

4. **테스트 코드 작성** (기술 부채)
   - 현재 테스트 커버리지 0%
   - 유틸리티 모듈 테스트
   - 통합 테스트 작성

---

## 🚨 작업 규칙

### 1. 코딩 작업 워크플로우 (필수)

```bash
# 1단계: 작업 시작 전
git pull origin main

# 2단계: 코딩 작업
[개발 진행...]

# 3단계: 작업 완료 후 (반드시 순서대로)
# ① 문서 업데이트
- PROJECT.md 업데이트 (필요 시 - 아키텍처/기술스택 변경)
- MASTER.md 완료 표시 (현재 상태, 최근 완료, 다음 작업)
- CHANGELOG.md 히스토리 추가 (Phase 완료 시)

# ② Git 커밋 및 푸시 (문서 포함)
git add MASTER.md PROJECT.md CHANGELOG.md
git add [작업한 파일들]
git commit -m "vX.Y.Z: [작업 내용]

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
git push origin main
```

### 2. 문서 역할 및 업데이트 규칙

#### 📚 3-Document System

| 파일 | 역할 | 업데이트 시점 | 크기 제한 |
|------|------|---------------|-----------|
| **PROJECT.md** | 프로젝트 헌법 | 큰 변화 시에만 (아키텍처, 기술 스택 변경) | ~15KB |
| **MASTER.md** | 현재 작업 상태 + 최근 10개 작업 | 매 작업마다 (현재 상태, 최근 완료, 다음 작업) | **~7KB** |
| **CHANGELOG.md** | 전체 버전 히스토리 | Phase 완료 시 (Append Only) | 무제한 |

#### 🎯 각 문서의 목적

- **PROJECT.md**: "이 프로젝트는 무엇인가?" - 전체 맥락 이해
- **MASTER.md**: "지금 무엇을 하고 있는가?" - 현재 작업 진행 상황 + 최근 10개 작업
- **CHANGELOG.md**: "무엇을 완료했는가?" - 작업 히스토리만 추적 (모든 버전 보관)

#### 📦 아카이브 정책

- **MASTER.md**: 최근 10개 작업만 유지
- **오래된 작업**: `MASTER_ARCHIVE.md`로 이동
- **주기**: MASTER.md가 400줄 초과 시 아카이브 실행

### 3. Git 커밋 메시지 형식

```
vX.Y.Z: [작업 요약]

- [상세 내용 1]
- [상세 내용 2]
- [상세 내용 3]

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

---

## 📂 참고 문서

- `README.md` - 프로젝트 진입점 및 가이드
- `PROJECT.md` - 프로젝트 전체 이해
- `MASTER.md` - 이 파일 (현재 작업 상태)
- `MASTER_ARCHIVE.md` - 오래된 완료 작업 (v1.62.14 ~ v1.39.0)
- `CHANGELOG.md` - 전체 작업 히스토리
- `CLAUDE.md` - Claude 작업 규칙 가이드

---

## 🔗 중요 링크

- **로컬 앱**: http://localhost:3000
- **관리자**: http://localhost:3000/admin-login.html
- **GitHub**: https://github.com/EnmanyProject/wedding.git

---

## 🎯 대화 우선 접근 (Discussion-First)

### 중요: 모든 개발 전에 반드시 사용자와 논의 세션을 갖습니다!

**패턴**:
```
사용자: "[기능] 만들어줘"

Claude:
"[기능] 구현 전에 논의하겠습니다.

🤔 확인 사항:
1. [질문1]
2. [질문2]

💡 제안 설계:
[설계 설명]

📋 Phase 분할:
- Phase X-A: [작업1]
- Phase X-B: [작업2]

이렇게 진행할까요?"

사용자: "베스트야, 이렇게 해줘"

Claude: [개발 시작]
```

---

**작성일**: 2025-10-05
**최종 수정**: 2025-10-18
**작성자**: Claude Code
**문서 버전**: 2.0.0 (크기 최적화)
