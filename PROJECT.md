# 📱 누구나 (Wedding App) - 프로젝트 개요

> 📚 **문서 역할**: 프로젝트 헌법 - 변하지 않는 핵심 정보 보관소
>
> **3-Document System**:
> - **PROJECT.md** (이 문서): "이 프로젝트는 무엇인가?" - 전체 맥락 이해
> - **MASTER.md**: "지금 무엇을 하고 있는가?" - 현재 작업 진행 상황 + 핵심 내용
> - **CLAUDE.md**: "무엇을 완료했는가?" - 작업 히스토리만 추적

**최종 업데이트**: 2025-10-15
**버전**: v1.62.39 (Recommendation & Ranking System Enhancement)

---

## 🎯 프로젝트 목적

**"사진 기반 취향 퀴즈로 만나는 소셜 매칭 플랫폼"**

A&B 퀴즈 형식으로 다른 사람의 취향을 맞추면서 **호감도를 쌓고**, 단계적으로 **상대방의 사진이 점점 선명해지며**, 일정 점수 이상이면 **실제 만남**까지 이어지는 게임화된 소셜 네트워킹 서비스입니다.

### 핵심 차별화 포인트

1. **게임 메커니즘**: 퀴즈로 상대방을 "알아가는" 과정 자체가 재미
2. **점진적 노출 (Progressive Disclosure)**: 처음엔 블러 → 점점 선명해짐
3. **"알아갈수록 보인다"**: 심리적 보상과 호감도 쌓기 동기 부여
4. **프라이버시 & 안전**: 단계별 접근 제어로 안전한 만남

---

## 💡 핵심 컨셉

### 1. A&B 취향 퀴즈 시스템
- 다른 사람의 취향을 예측하는 퀴즈
- 정답: 호감도(Affinity) 상승 ⬆️ + 💍 Ring 보상
- 오답: Ring 패널티 💸
- **단일 화폐 시스템** (💍 Ring)으로 심플한 경제 구조

### 2. 단계별 정보 해금 시스템

#### 점수별 해금 단계

| 총점 | 해금 내용 | 비고 |
|------|-----------|------|
| **0점** | 파트너 카드 추천 | 일일 5명 소개 |
| **1점+** | 랭킹 진입 | 내 랭킹에 표시됨 |
| **일정 점수** | 실명 해금 | (기준 조정 가능) |
| **더 높은 점수** | 추가 정보 해금 | 직업, 학력, 취미 등 |
| **60점+** | **만남 가능 (T3)** | ☀️ 원본 사진 + 채팅 시작 |

#### 사진 해금 시스템 (기존)

| 호감도 | 상태 | 사진 상태 |
|--------|------|-----------|
| **< 20점** | LOCKED | 🌫️ 매우 흐릿함 (BLUR2) |
| **20~39점** | **T1 해금** | 🌥️ 조금 흐릿함 (BLUR1) |
| **40~59점** | **T2 해금** | 🌤️ 썸네일 품질 (THUMB) |
| **60점+** | **T3 해금** | ☀️ **원본 사진** (ORIG) + **만남 가능** |

### 3. 사용자 플로우

```
1. 회원가입/로그인
   ↓
2. 프로필 & 사진 업로드
   ↓
3. A&B 취향 응답 (Ring 획득을 위한 질문들)
   ↓
4. 메인 앱: 일일 추천 파트너 카드 (매일 5명 소개)
   - 파트너 카드 클릭 → 프로필 미리보기 (블러 처리)
   - 인증 정보 확인 (본인인증, 나이, 지역, 학력 등)
   - "매칭점수+" 버튼 → 퀴즈 시작
   ↓
5. 상대방 취향 퀴즈 풀기 💰 (Ring 사용)
   → 정답: 호감도 ⬆️ (정답 카운트 +1) + Ring 보상
   → 오답: Ring 패널티
   ↓
6. 랭킹 탭: 내가 퀴즈 푼 유저들 관리
   - 점수 = 매치 카운트 + 정답 카운트
   - 매치 카운트: 자동 호환성 (같은 A&B 퀴즈에 같은 답)
   - 정답 카운트: 직접 퀴즈 점수 (affinity.score)
   - 점수가 높을수록 상위 랭킹
   ↓
7. 점수별 정보 해금
   - 일정 점수: 실명 공개
   - 더 높은 점수: 추가 정보 해금
   - 최종 점수: 만남 신청 가능 (T3 해금)
   ↓
8. 🎉 만남 가능 + 원본 사진 해금
   ↓
9. 💬 실시간 채팅 & 오프라인 만남
```

### 4. 이중 점수 시스템 (자동 + 직접)

#### 매치 카운트 (자동 호환성)
- **개념**: 서로 같은 A&B 퀴즈에 같은 답을 한 개수
- **계산**: 자동으로 실시간 계산
- **효과**: 취향이 비슷한 사람끼리 자연스럽게 높은 점수
- **특징**: 상대방 퀴즈를 풀지 않아도 자동 증가

#### 정답 카운트 (직접 퀴즈)
- **개념**: 상대방에 대한 퀴즈를 풀어서 맞춘 개수
- **계산**: affinity.score (DB 저장)
- **효과**: 상대방을 알아가는 노력의 결과
- **특징**: 퀴즈를 풀어야 증가

#### 총점 계산
```
총점 = 매치 카운트 + 정답 카운트
```

#### 예시
```
사용자 A와 B:
- 매치 카운트: 35 (같은 A&B 퀴즈에 같은 답 35개)
- 정답 카운트: 50 (A가 B의 퀴즈를 풀어서 50개 맞춤)
- 총점: 85점
- 결과: 상위 랭킹, 만남 가능 조건 충족
```

### 5. 단계별 본인인증 시스템

**글로벌 결혼 전제 데이팅앱으로서 신뢰와 안전을 위한 점진적 인증 전략**

#### 설계 원칙
- **낮은 진입장벽**: 초기 회원가입은 최대한 간편하게
- **점진적 강화**: 활동량과 진정성에 따라 자연스럽게 인증 레벨 상승
- **비용 최적화**: 실제 활성 사용자에게만 고비용 인증 적용
- **인센티브 기반**: 강제가 아닌 혜택으로 자발적 참여 유도

#### Level 0: 회원가입 (무료)
```
✓ 이메일 인증 OR 소셜 로그인 (Google/Apple/Kakao)
✓ 목적: 최대한 많은 사용자 유입
✓ 비용: $0
```

#### Level 1: 기본 활동 (무료)
```
조건: 첫 메시지 보내기 전 OR 프로필 완성 시
✓ 전화번호 인증 (SMS/음성 OTP)
✓ 목적: 기본적인 봇/스팸 방지
✓ 비용: ~$0.01-0.05/건 (Twilio)
```

#### Level 2: 활성 사용자 (무료)
```
조건: 다음 중 하나 달성
- 10명 이상 매칭
- 7일 연속 접속  
- 프리미엄 기능 사용 시도

✓ 프로필 사진 셀카 인증
  - 앱 내 실시간 셀카 촬영
  - 간단한 Liveness 체크
  - 프로필 사진과 AI 비교 (AWS Rekognition)
  
✓ 혜택:
  - "사진 인증됨" 실버 배지
  - 검색 순위 +30%
  - 슈퍼라이크 5개 증정
  
✓ 비용: ~$0.002/건
```

#### Level 3: 프리미엄/진지한 사용자 (선택적)
```
조건: 다음 중 하나
- 30일 이상 활동
- 프리미엄 구독 전환 시
- 사용자 자발적 인증
- "인증된 회원만 보기" 필터 사용 원할 때

✓ 신분증 인증 (Onfido)
  - 신분증 (여권/운전면허증/주민등록증) 촬영
  - 실시간 얼굴 인증 + Liveness Detection
  - AI 위조 문서 탐지
  - 신분증 사진과 얼굴 매칭
  
✓ 혜택:
  - "신원 인증됨" 골드 배지
  - 프리미엄 1개월 무료
  - 검색 최상단 배치
  - 인증 회원 전용 필터 접근
  - 매칭 알고리즘 우선순위
  - 인증 회원 전용 이벤트
  
✓ 비용: ~$2-3/건 (Onfido)
```

#### 인증 레벨별 권한

| 기능 | Level 0 | Level 1 | Level 2 | Level 3 |
|------|---------|---------|---------|----------|
| 프로필 보기 | ✅ | ✅ | ✅ | ✅ |
| 퀴즈 풀기 | ❌ | ✅ | ✅ | ✅ |
| 메시지 보내기 | ❌ | ✅ | ✅ | ✅ |
| 검색 노출 | 낮음 | 보통 | 높음 | 최고 |
| 인증 배지 | ❌ | ❌ | 🥈 실버 | 🥇 골드 |
| 인증 필터 접근 | ❌ | ❌ | ❌ | ✅ |
| 프리미엄 혜택 | ❌ | ❌ | ❌ | ✅ |

#### 기술 스택

**전화번호 인증 (Level 1)**
- **Twilio Verify**: 230개국 지원, SMS/음성 OTP
- 대안: Vonage (Nexmo), AWS SNS, Firebase Auth

**얼굴 인증 (Level 2)**  
- **AWS Rekognition**: CompareFaces + DetectFaces API
- Liveness 체크: 실시간 셀카 촬영 + 기본 검증
- 프로필 사진 비교: 80% 이상 유사도

**신분증 인증 (Level 3)**
- **Onfido**: 195개국, 2,500종 이상 신분증 지원
  - Document Verification: AI 위조 탐지
  - Facial Similarity: 신분증 사진과 실시간 셀카 비교
  - Liveness Detection: 3D 마스크, 딥페이크 방지
- SDK 지원: Web, iOS, Android, React Native
- 대안: Veriff, Jumio, Sumsub

#### 월간 비용 예상 (10,000명 신규 가입 기준)

```
Level 0 (10,000명): $0
Level 1 (7,000명): $350 (전화번호 인증)
Level 2 (1,000명): $2 (얼굴 인증)
Level 3 (100명): $250 (신분증 인증)
─────────────────────────────
총 인증 비용: ~$602/월
사용자당 평균: $0.06

ROI (Level 3 기준):
- 100명 × 30% 전환 = 30명 프리미엄
- 30명 × $9.99/월 = $299.7
- Onfido 비용: $250
- 순이익: $49.7 (첫 달부터 흑자)
```

#### 구현 세부사항

자세한 기술 구현 방법은 다음 문서 참조:
- `docs/VERIFICATION_SYSTEM.md`: 인증 시스템 상세 구현 가이드
- `docs/VERIFICATION_API.md`: API 엔드포인트 및 통합 방법

### 💍 Ring 화폐 시스템 (Phase 1A)

**새로운 이중 경제 시스템**: 기존 포인트와 별개의 Ring 화폐 도입

#### Ring 획득 방법
- **회원가입 보너스**: 100 Ring
- **일일 로그인**: 10 Ring + 연속 보너스 (최대 7일 × 5 Ring)
- **퀴즈 정답**: 5 Ring per 정답
- **사진 업로드**: 20 Ring (일일 최대 3장)
- **프로필 완성**: 50 Ring (일회성)
- **친구 초대**: 100 Ring per 성공

#### Ring 사용처
- 퀴즈 플레이 비용
- 프리미엄 사진 해금
- 특별 기능 이용
- Ring 선물하기

#### 기술 구현
- **Frontend**: 실시간 balance 표시, 애니메이션 효과, 거래 내역
- **Backend**: Ring Service API, 안전한 트랜잭션 처리
- **Database**: Ring 전용 테이블 + 트랜잭션 로그

---

## 🏗️ 시스템 아키텍처

### 데이터베이스 스키마

```
users (기본 사용자 정보)
├── user_photos (사진 메타데이터)
│   └── photo_assets (ORIG/THUMB/BLUR1/BLUR2)
├── user_traits (취향 응답)
├── user_ring_balance (💍 Ring 화폐 잔액)
├── ring_transactions (💍 Ring 거래 기록)
├── user_login_streaks (로그인 연속 기록)
├── ring_earning_rules (Ring 획득 규칙)
├── user_verifications (인증 정보: 레벨, 상태, 날짜)
├── verification_logs (인증 로그: 제공자, 비용, 결과)
└── verification_attempts (인증 시도 기록: 실패 추적)

trait_pairs (취향 질문)
└── trait_visuals (시각 자산)

quiz_sessions (퀴즈 세션)
└── quiz_items (개별 질문 응답)

affinity (호감도 점수)
└── photo_mask_states (사진 노출 상태)

daily_recommendations (일일 추천 시스템)
├── recommendation_history (추천 통계)
└── recommendation_settings (추천 설정)

※ 추천 시스템:
  - 매일 5명씩 새로운 파트너 추천
  - 추천 기준: 개발 중 0 (모든 활성 사용자 추천 가능)
  - 추후 유저 수 증가 시 기준 상향 조정

※ 랭킹 시스템:
  - 점수 = 매치 카운트 + 정답 카운트
  - 매치 카운트: quiz_responses 테이블 실시간 JOIN 계산
  - 정답 카운트: affinity.score (DB 저장)
  - 양방향 관계: 상대도 내 퀴즈를 풀면 서로 점수 증가

meeting_states (만남 상태)
└── chat_messages (채팅 메시지)
```

### 사진 처리 파이프라인

```
1. Presign URL 발급
   ↓
2. 브라우저에서 직접 업로드 (서버 부담 ↓)
   ↓
3. 업로드 완료 → 자동 변형 생성
   - ORIG (원본)
   - THUMB (256px 썸네일)
   - BLUR1 (약한 블러, σ=4)
   - BLUR2 (강한 블러, σ=8)
   ↓
4. 모더레이션 (승인/거부)
   ↓
5. 호감도별 노출 제어
```

---

## 🔧 기술 스택

### Frontend
- **Core**: Vanilla JavaScript (ES6+), HTML5, CSS3
- **실시간**: Socket.IO (채팅)
- **PWA**: Service Worker, Manifest
- **UI/UX**:
  - 베티 캐릭터 시스템 (7가지 표정)
  - 모바일 스와이프 컴포넌트
  - 프리미엄 카드 디자인
  - 다크모드 지원

### Backend
- **Runtime**: Node.js
- **Framework**: Express
- **Database**: PostgreSQL
- **Cache**: Redis
- **Storage**: MinIO (S3 호환)
- **실시간**: Socket.IO

### DevOps
- **컨테이너**: Docker Compose
- **버전 관리**: Git
- **배포**: (추후 설정)

---

## 📂 프로젝트 구조

```
wedding/
├── public/                      # 프론트엔드
│   ├── js/
│   │   ├── utils/              # 유틸리티 모듈 (6개)
│   │   │   ├── error-handler.js
│   │   │   ├── ui-components.js
│   │   │   ├── formatters.js
│   │   │   ├── performance.js
│   │   │   ├── cache.js
│   │   │   └── mobile-swiper.js
│   │   ├── app.js              # 메인 앱 초기화
│   │   ├── ui.js               # UI 관리 (1,384줄)
│   │   ├── api.js              # API 통신 (570줄)
│   │   ├── quiz.js             # 퀴즈 시스템
│   │   ├── photos.js           # 사진 관리
│   │   ├── admin.js            # 관리자 기능
│   │   ├── bety-manager.js     # 베티 캐릭터 관리
│   │   └── loading-manager.js  # 로딩 화면 관리
│   ├── styles/                 # CSS (10+ 파일)
│   │   ├── main.css
│   │   ├── premium-partner-cards.css
│   │   ├── bety-unified.css
│   │   └── ...
│   ├── images/                 # 이미지 자산
│   │   └── Bety*.png          # 베티 캐릭터 (7개)
│   └── index.html              # 메인 HTML
├── server/
│   └── index.js                # Express 서버
├── project-management/          # 프로젝트 관리 📁
│   ├── PROJECT.md              # 이 파일
│   ├── MASTER.md               # 현재 작업 상태
│   └── archive/                # 완료된 Phase 문서
├── CLAUDE.md                   # 버전 히스토리
├── README.md                   # 개발자 문서
├── docker-compose.yml          # 인프라 설정
└── package.json                # 의존성 관리
```

---

## 🌐 배포 환경

### 개발 환경
- **URL**: http://localhost:3000
- **API**: http://localhost:3000/api
- **관리자**: http://localhost:3000/admin-login.html

### 인프라 포트
- **Frontend/Backend**: 3000
- **PostgreSQL**: 5432
- **Redis**: 6379
- **MinIO**: 9000 (API), 9001 (Console)

### 배포 환경
- **개발**: Docker Compose (로컬 PostgreSQL, Redis, MinIO)
- **온라인 DB 지원**: Supabase, Neon, Railway (DATABASE_MIGRATION_GUIDE.md 참조)
- **프로덕션**: (예정)
- **스테이징**: (예정)

---

## 📊 주요 메트릭

### 코드 현황
- **총 라인 수**: ~3,500줄 (유틸리티 포함)
- **프론트엔드**: ~2,800줄
- **백엔드**: ~700줄
- **리팩토링 완료**: Phase 1, 2 완료
- **코드 중복**: 5% (리팩토링 전 25%)

### 기능 현황
- ✅ 사용자 시스템 (프로필, 사진, 취향)
- ✅ 퀴즈 시스템 (세션, 답변, 호감도)
- ✅ 사진 단계별 해금 (T1, T2, T3)
- ✅ **랭킹 시스템** (이중 점수: 매치 카운트 + 정답 카운트)
- ✅ **일일 추천 시스템** (파트너 카드, 매일 5명 소개)
- ✅ **자동 호환성 점수** (매치 카운트, 실시간 계산)
- ✅ 실시간 채팅 (Socket.IO)
- ✅ **Ring 화폐 시스템** (단일 경제, 획득/사용/거래)
- ✅ **전당포 시스템** (사진/정보 맡기고 Ring 획득, 은행 내역)
- ✅ 관리자 시스템 (사진 모더레이션, 추천 관리)
- ✅ PWA 지원 (오프라인, 설치)
- ✅ **온라인 DB 지원** (Supabase/Neon/Railway)
- 🚧 **단계별 본인인증 시스템** (Level 0-3, 계획 완료)

---

## 🔗 중요 링크

### 개발 문서
- **프로젝트 관리**: `project-management/MASTER.md`
- **버전 히스토리**: `CLAUDE.md`
- **개발자 가이드**: `README.md`
- **리팩토링 가이드**: `project-management/archive/REFACTORING_GUIDE.md`

### Git 저장소
- **GitHub**: (미설정 - `.git` 폴더 없음)

### API 문서
- **엔드포인트**: README.md 참조
- **스키마**: README.md 참조

---

## 🎨 UI/UX 시스템

### 베티 캐릭터 시스템
- **7가지 표정**: default, happy, excited, surprised, cheerful, wink, lovely
- **자동 표정 변화**: 5초 간격
- **컨텍스트 기반**: 퀴즈, 매치, 에러 등 상황별 표정
- **부드러운 전환**: 애니메이션 효과
- **통합 스타일**: `bety-unified.css`

### 프리미엄 카드 디자인
- 3D 글래스모피즘 효과
- 그라데이션 & 애니메이션
- 반응형 & 다크모드 지원
- 접근성 (ARIA, 키보드 네비게이션)

### 모바일 최적화
- Touch 제스처 지원
- Swiper 컴포넌트 (MobileSwiper)
- 반응형 레이아웃
- PWA 지원

---

## 🔐 보안 & 프라이버시

### 사진 보안
- Presigned URL로 직접 업로드 (서버 미경유)
- 단계별 접근 제어 (LOCKED/T1/T2/T3)
- 자동 모더레이션 및 수동 검토

### API 보안
- JWT 토큰 기반 인증
- 사용자별 데이터 격리
- Rate limiting 적용
- CSP (Content Security Policy)

### 데이터 보호
- Input validation
- XSS 방지
- 개발 환경 보호 (시딩/리셋 API 분리)

---

## 📝 개발 환경 설정

### 빠른 시작

```bash
# Docker 서비스 시작
docker-compose up -d

# 개발 서버 실행
npm run dev

# 브라우저에서 접속
http://localhost:3000
```

### 환경 변수

```bash
# 데이터베이스
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/wedding_app

# 스토리지 (MinIO)
STORAGE_ENDPOINT=http://localhost:9000
STORAGE_BUCKET=wedding-photos

# 퀴즈 설정
QUIZ_ENTER_COST=1
QUIZ_WRONG_PENALTY=1
TRAIT_ADD_REWARD=1

# 호감도 임계치
AFFINITY_T1_THRESHOLD=20
AFFINITY_T2_THRESHOLD=40
AFFINITY_T3_THRESHOLD=60

# 사진 처리
PHOTO_THUMB_SIZE=256
PHOTO_BLUR1_SIGMA=4
PHOTO_BLUR2_SIGMA=8
```

---

## 🎯 향후 계획

### 기술 부채
- [ ] Git 저장소 초기화
- [ ] 테스트 코드 작성 (현재 0%)
- [ ] TypeScript 마이그레이션 (장기)
- [ ] CI/CD 파이프라인 구축

### 기능 확장
- [ ] 푸시 알림 시스템
- [ ] 고급 매칭 알고리즘
- [ ] 소셜 공유 기능
- [ ] 프리미엄 구독 모델

---

**작성일**: 2025-10-05
**최종 수정**: 2025-10-15
**작성자**: Claude Code
**문서 버전**: 1.1.0
