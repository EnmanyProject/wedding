# 🔄 Wedding App 컨셉 변경 및 기능 추가 작업 지시문

**문서 버전**: 1.0.0  
**작성일**: 2025-10-06  
**대상**: Claude Code  
**프로젝트**: 누구나 (Wedding App)

---

## 📋 변경 사항 요약

### 🎯 핵심 컨셉 변경
**기존**: 누구나에게 퀴즈를 풀 수 있는 오픈 매칭  
**변경**: **AI 매칭 기반 일일 추천** + 퀴즈로 호감도 증가

---

## 1️⃣ 주요 변경 사항 상세

### A. 매칭 시스템 개편

#### 기존 플로우
```
유저 → 모든 사람 목록 → 퀴즈 선택 → 호감도 증가
```

#### 새 플로우
```
1. 유저가 A&B 선택 (취향 데이터 수집)
   ↓
2. AI 매칭 엔진이 분석
   → 취향 일치도 계산
   → 매일 새로운 추천 대상 선정 (N명)
   ↓
3. 카드 형태로 추천 목록 제공
   ↓
4. 카드 클릭 → 상대 정보 + 퀴즈
   ↓
5. 퀴즈 성공 → 호감도 증가 → 더 많은 정보 해금
```

---

### B. 화폐 시스템: '링(Ring)'

#### 링 획득 방법
- ✅ A&B 취향 제공 (자신의 데이터 제공)
- ✅ 사진 업로드 및 인증
- ✅ 개인정보 인증 (신분증, 소셜 계정 등)
- ✅ 결제 (유료 구매)
- ✅ 출석 체크 (데일리 리워드)

#### 링 사용 처
- 💸 퀴즈 풀기 (1회당 N링)
- 💸 다인원 데이트 참가
- 💸 프리미엄 기능 (추후 확장)
- 💸 사진 추가 해금 가속화

#### 링 애니메이션
- **획득**: 코인이 날아들어오는 애니메이션
- **사용**: 코인이 사라지는 애니메이션
- **잔액 변화**: 숫자 카운트업 효과

---

### C. A&B 시스템 개편

#### 기존
- 텍스트 기반 선택지

#### 변경
- **AI 생성 이미지 기반**
- 유저는 **이미지만 보고** 선택
- 텍스트 설명 없음 (순수 비주얼 선택)

#### 데이터 보안
- **암호화 필수**: 취향 데이터는 민감 정보
- 저장: 암호화된 형태
- 전송: HTTPS + 추가 암호화 레이어
- 매칭 시에만 복호화

---

### D. 사진 AI 검증 시스템

#### 검증 항목
1. **본인 확인**
   - 기존 사진과 얼굴 유사도 비교
   - 소셜 계정 프로필 사진과 비교

2. **콘텐츠 검증**
   - 외설성 감지
   - 폭력성 감지
   - 부적절한 콘텐츠 필터링

3. **소셜 연동** (마일스톤 최후)
   - Facebook, Instagram, Kakao 등
   - 프로필 정보 가져오기
   - 사진 자동 동기화

#### 관리자 기능
- AI 검증 결과 확인
- 수동 승인/거부
- 사용자 제재 관리
- 검증 로그 확인

---

## 2️⃣ 데이터베이스 스키마 설계

### 새로운 테이블

```sql
-- 링(Ring) 잔액 관리
CREATE TABLE user_ring_balance (
    user_id UUID PRIMARY KEY REFERENCES users(id),
    balance INTEGER NOT NULL DEFAULT 0,
    lifetime_earned INTEGER NOT NULL DEFAULT 0,
    lifetime_spent INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 링 거래 로그 (상세 추적)
CREATE TABLE ring_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    transaction_type VARCHAR(50) NOT NULL, -- 'EARN', 'SPEND', 'REFUND', 'PURCHASE'
    category VARCHAR(50) NOT NULL, -- 'QUIZ', 'PHOTO', 'VERIFICATION', 'AB_SUBMIT', 'PAYMENT', 'GROUP_DATE'
    amount INTEGER NOT NULL, -- 양수: 획득, 음수: 사용
    balance_after INTEGER NOT NULL,
    reference_id UUID, -- 관련 엔티티 ID (quiz_id, photo_id 등)
    metadata JSONB, -- 추가 정보
    created_at TIMESTAMPTZ DEFAULT NOW(),
    INDEX idx_user_transactions (user_id, created_at DESC),
    INDEX idx_transaction_type (transaction_type),
    INDEX idx_category (category)
);

-- A&B 질문 (AI 생성, 이미지 기반)
CREATE TABLE ab_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_text TEXT NOT NULL, -- AI 프롬프트용
    category VARCHAR(50), -- 'FOOD', 'TRAVEL', 'HOBBY', 'LIFESTYLE' 등
    option_a_image_url TEXT NOT NULL, -- A 옵션 이미지
    option_b_image_url TEXT NOT NULL, -- B 옵션 이미지
    option_a_label VARCHAR(100), -- 내부 레이블 (유저에게 미노출)
    option_b_label VARCHAR(100),
    weight INTEGER DEFAULT 1, -- 매칭 알고리즘 가중치
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    INDEX idx_category (category),
    INDEX idx_active (is_active)
);

-- 유저 A&B 응답 (암호화 저장)
CREATE TABLE user_ab_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    question_id UUID NOT NULL REFERENCES ab_questions(id),
    selected_option VARCHAR(1) NOT NULL CHECK (selected_option IN ('A', 'B')),
    response_encrypted TEXT NOT NULL, -- 암호화된 응답 데이터
    ring_reward INTEGER DEFAULT 0, -- 이 응답으로 획득한 링
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, question_id),
    INDEX idx_user_responses (user_id)
);

-- 일일 추천 매칭
CREATE TABLE daily_recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    recommended_user_id UUID NOT NULL REFERENCES users(id),
    match_score DECIMAL(5,2) NOT NULL, -- 0~100 점수
    matching_traits JSONB, -- 일치하는 취향 정보
    recommendation_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'PENDING', -- 'PENDING', 'VIEWED', 'QUIZ_STARTED', 'EXPIRED'
    viewed_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ, -- 24시간 후 만료
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, recommended_user_id, recommendation_date),
    INDEX idx_user_daily (user_id, recommendation_date),
    INDEX idx_status (status)
);

-- 사진 AI 검증 로그
CREATE TABLE photo_ai_verification (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    photo_id UUID NOT NULL REFERENCES user_photos(id),
    user_id UUID NOT NULL REFERENCES users(id),
    
    -- 본인 확인
    face_similarity_score DECIMAL(5,2), -- 기존 사진과 유사도 (0~100)
    is_same_person BOOLEAN,
    
    -- 콘텐츠 검증
    is_explicit BOOLEAN DEFAULT FALSE,
    is_violent BOOLEAN DEFAULT FALSE,
    content_flags JSONB, -- AI가 감지한 플래그들
    
    -- 소셜 연동 (향후)
    social_profile_match BOOLEAN,
    social_provider VARCHAR(50), -- 'FACEBOOK', 'INSTAGRAM', 'KAKAO'
    social_profile_url TEXT,
    
    -- AI 모델 정보
    ai_model_version VARCHAR(50),
    confidence_score DECIMAL(5,2),
    
    -- 최종 판정
    verification_status VARCHAR(20) DEFAULT 'PENDING', -- 'PENDING', 'APPROVED', 'REJECTED', 'MANUAL_REVIEW'
    admin_reviewed_by UUID REFERENCES users(id),
    admin_review_note TEXT,
    reviewed_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    INDEX idx_photo (photo_id),
    INDEX idx_status (verification_status)
);

-- 소셜 계정 연동 (마일스톤 최후)
CREATE TABLE user_social_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    provider VARCHAR(50) NOT NULL, -- 'FACEBOOK', 'INSTAGRAM', 'KAKAO'
    social_id VARCHAR(255) NOT NULL, -- 소셜 계정 고유 ID
    profile_data JSONB, -- 프로필 정보 (이름, 사진 등)
    access_token_encrypted TEXT, -- 암호화된 액세스 토큰
    is_verified BOOLEAN DEFAULT FALSE,
    ring_reward_given BOOLEAN DEFAULT FALSE, -- 연동 보상 지급 여부
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, provider),
    INDEX idx_user_social (user_id)
);
```

### 기존 테이블 수정

```sql
-- users 테이블에 추가 컬럼
ALTER TABLE users ADD COLUMN IF NOT EXISTS
    ab_completion_rate INTEGER DEFAULT 0, -- A&B 완성도 (0~100%)
    matching_enabled BOOLEAN DEFAULT FALSE, -- 매칭 활성화 (A&B 일정 개수 이상 답변 시)
    daily_recommendation_count INTEGER DEFAULT 5; -- 일일 추천 받을 인원 수

-- user_photos 테이블에 AI 검증 상태 추가
ALTER TABLE user_photos ADD COLUMN IF NOT EXISTS
    ai_verification_status VARCHAR(20) DEFAULT 'PENDING', -- 'PENDING', 'VERIFIED', 'REJECTED'
    ai_verified_at TIMESTAMPTZ;
```

---

## 3️⃣ API 엔드포인트 설계

### A&B 관련 API

```javascript
// A&B 질문 목록 가져오기
GET /api/ab/questions
Response: {
    questions: [
        {
            id: "uuid",
            category: "FOOD",
            optionA: { imageUrl: "...", },
            optionB: { imageUrl: "...", },
            weight: 1
        }
    ],
    userProgress: {
        answered: 12,
        total: 50,
        completionRate: 24
    }
}

// A&B 응답 제출 (링 획득)
POST /api/ab/responses
Body: {
    questionId: "uuid",
    selectedOption: "A" // or "B"
}
Response: {
    success: true,
    ringEarned: 5,
    newBalance: 105,
    completionRate: 26,
    matchingEnabled: false // 일정 개수 이상 시 true
}
```

### 매칭 API

```javascript
// 일일 추천 목록 가져오기
GET /api/matching/daily-recommendations
Response: {
    recommendations: [
        {
            id: "uuid",
            user: {
                id: "uuid",
                nickname: "홍길동",
                age: 28,
                profilePhotoUrl: "...", // 블러 처리된 사진
                blurLevel: "BLUR2"
            },
            matchScore: 87.5,
            matchingTraits: ["음식취향", "여행스타일", "취미"],
            affinityScore: 0, // 아직 퀴즈 안 풀었으면 0
            expiresAt: "2025-10-07T00:00:00Z"
        }
    ],
    nextRefreshAt: "2025-10-07T00:00:00Z"
}

// 추천된 상대 상세 정보 + 퀴즈
GET /api/matching/recommendations/:recommendationId
Response: {
    user: {
        id: "uuid",
        nickname: "홍길동",
        age: 28,
        bio: "안녕하세요...", // 일부만 노출 (호감도에 따라)
        photos: [...], // 블러 처리
        visibleInfo: ["age", "location"] // 현재 볼 수 있는 정보 목록
    },
    matchInfo: {
        matchScore: 87.5,
        matchingTraits: [...]
    },
    affinity: {
        score: 15,
        tier: "LOCKED",
        nextTierThreshold: 20
    },
    quiz: {
        available: true,
        cost: 10, // 링
        questions: [...] // 퀴즈 문제들
    }
}
```

### 링 관련 API

```javascript
// 링 잔액 조회
GET /api/rings/balance
Response: {
    balance: 150,
    lifetimeEarned: 500,
    lifetimeSpent: 350
}

// 링 거래 내역
GET /api/rings/transactions?page=1&limit=20
Response: {
    transactions: [
        {
            id: "uuid",
            type: "EARN",
            category: "AB_SUBMIT",
            amount: 5,
            balanceAfter: 150,
            metadata: { questionId: "..." },
            createdAt: "2025-10-06T10:00:00Z"
        }
    ],
    pagination: { total: 50, page: 1, limit: 20 }
}

// 링 구매 (결제)
POST /api/rings/purchase
Body: {
    packageId: "RING_100", // 100링 패키지
    paymentMethod: "CARD"
}
Response: {
    success: true,
    ringsPurchased: 100,
    newBalance: 250,
    transactionId: "uuid"
}
```

### 사진 AI 검증 API

```javascript
// 사진 업로드 + AI 검증 트리거
POST /api/photos/upload
Body: {
    photoData: "base64...",
    photoType: "PROFILE" // or "ADDITIONAL"
}
Response: {
    photoId: "uuid",
    verificationStatus: "PENDING",
    estimatedTime: "30s",
    ringRewardPending: 20 // 검증 통과 시 지급 예정
}

// 사진 검증 상태 확인
GET /api/photos/:photoId/verification
Response: {
    status: "VERIFIED", // or "PENDING", "REJECTED", "MANUAL_REVIEW"
    verificationDetails: {
        faceSimilarity: 92.5,
        isSamePerson: true,
        isExplicit: false,
        confidenceScore: 95.3
    },
    ringRewarded: 20,
    adminNote: null
}
```

### 관리자 API

```javascript
// AI 검증 대기 목록
GET /api/admin/photo-verifications?status=MANUAL_REVIEW
Response: {
    items: [
        {
            photoId: "uuid",
            userId: "uuid",
            userName: "홍길동",
            photoUrl: "...",
            aiResults: {
                faceSimilarity: 65.0, // 낮아서 수동 검토 필요
                flags: ["LOW_SIMILARITY"]
            },
            uploadedAt: "2025-10-06T10:00:00Z"
        }
    ]
}

// 사진 수동 승인/거부
POST /api/admin/photo-verifications/:id/review
Body: {
    decision: "APPROVED", // or "REJECTED"
    note: "수동 확인 완료"
}
Response: {
    success: true,
    ringRewarded: true,
    userNotified: true
}

// A&B 질문 관리
GET /api/admin/ab-questions
POST /api/admin/ab-questions
PUT /api/admin/ab-questions/:id
DELETE /api/admin/ab-questions/:id

// 링 거래 통계
GET /api/admin/ring-statistics
Response: {
    totalRingsInCirculation: 50000,
    totalEarnedToday: 5000,
    totalSpentToday: 3000,
    topEarners: [...],
    topSpenders: [...]
}
```

---

## 4️⃣ 프론트엔드 변경 사항

### A. 새로운 화면

#### 1. A&B 취향 선택 화면
```html
<!-- /ab-questions.html -->
<div class="ab-question-container">
    <div class="progress-bar">
        <span>12 / 50 완료 (24%)</span>
    </div>
    
    <div class="question-card">
        <h2 class="question-category">음식 취향</h2>
        
        <div class="options">
            <div class="option-card" data-option="A">
                <img src="option-a-image.jpg" alt="옵션 A">
                <div class="option-overlay">
                    <span class="option-label">A</span>
                </div>
            </div>
            
            <div class="vs-divider">VS</div>
            
            <div class="option-card" data-option="B">
                <img src="option-b-image.jpg" alt="옵션 B">
                <div class="option-overlay">
                    <span class="option-label">B</span>
                </div>
            </div>
        </div>
        
        <div class="reward-info">
            <span>+5 링</span> 획득 가능
        </div>
    </div>
</div>
```

#### 2. 일일 추천 화면
```html
<!-- 메인 화면에 통합 또는 별도 페이지 -->
<div class="daily-recommendations">
    <h2>오늘의 추천 💝</h2>
    <p class="refresh-timer">새로운 추천까지 <span>4시간 32분</span></p>
    
    <div class="recommendation-cards">
        <!-- 카드 스와이프 가능 -->
        <div class="rec-card" data-user-id="uuid">
            <div class="card-image">
                <img src="blurred-photo.jpg" alt="프로필">
                <div class="match-badge">87% 매치</div>
            </div>
            
            <div class="card-info">
                <h3>홍길동, 28</h3>
                <p class="matching-tags">
                    <span class="tag">🍕 음식취향</span>
                    <span class="tag">✈️ 여행스타일</span>
                    <span class="tag">🎨 취미</span>
                </p>
                <p class="affinity-status">
                    호감도: 0점 → 퀴즈를 풀어보세요!
                </p>
            </div>
            
            <button class="view-details-btn">자세히 보기</button>
        </div>
    </div>
</div>
```

#### 3. 상대 상세 + 퀴즈 통합 화면
```html
<div class="user-detail-quiz-view">
    <!-- 상단: 사진 + 기본 정보 -->
    <div class="user-profile-section">
        <div class="photo-gallery">
            <!-- 호감도에 따라 블러 해제 -->
            <img src="photo-blur2.jpg" class="main-photo">
        </div>
        
        <div class="basic-info">
            <h2>홍길동, 28</h2>
            <p class="location">🌏 서울, 강남구</p>
            <p class="bio locked">
                🔒 호감도 20점 이상 필요
            </p>
        </div>
        
        <div class="affinity-progress">
            <div class="progress-bar">
                <div class="fill" style="width: 15%"></div>
            </div>
            <p>호감도 15점 / 20점 (다음 단계까지)</p>
        </div>
    </div>
    
    <!-- 하단: 퀴즈 섹션 -->
    <div class="quiz-section">
        <div class="quiz-info">
            <h3>퀴즈로 호감도 높이기</h3>
            <p class="cost">💍 10 링 소모</p>
        </div>
        
        <button class="start-quiz-btn">퀴즈 시작하기</button>
    </div>
</div>
```

### B. 링 애니메이션 시스템

```javascript
// public/js/ring-animation.js
class RingAnimationManager {
    /**
     * 링 획득 애니메이션
     */
    showEarnAnimation(amount, targetElement) {
        // 화면 여러 곳에서 코인이 날아와 합쳐지는 효과
        // Lottie 또는 CSS 애니메이션 사용
    }
    
    /**
     * 링 사용 애니메이션
     */
    showSpendAnimation(amount, sourceElement) {
        // 코인이 흩어지며 사라지는 효과
    }
    
    /**
     * 잔액 숫자 카운트업 효과
     */
    animateBalanceChange(from, to, duration = 1000) {
        // 숫자가 부드럽게 증가/감소
    }
}
```

### C. UI 컴포넌트 수정

```javascript
// public/js/ui.js 수정 필요 부분

// 1. 메인 화면에 일일 추천 섹션 추가
function renderDailyRecommendations(recommendations) {
    // 카드 형태로 렌더링
    // 스와이프 가능하게 MobileSwiper 활용
}

// 2. 링 잔액 표시 (헤더에 항상 표시)
function updateRingBalance(balance) {
    const ringDisplay = document.querySelector('.ring-balance');
    ringDisplay.textContent = balance;
    // 애니메이션 효과
}

// 3. A&B 질문 렌더링
function renderABQuestion(question) {
    // 이미지 기반 옵션 표시
    // 선택 시 즉시 제출 및 링 획득 애니메이션
}

// 4. 상대 상세 + 퀴즈 통합 뷰
function renderUserDetailWithQuiz(userData, quizData) {
    // 호감도에 따른 정보 노출 제어
    // 퀴즈 시작 버튼
}
```

---

## 5️⃣ 백엔드 로직 구현

### A. 매칭 엔진 (매일 새로운 추천 생성)

```javascript
// server/services/matching-engine.js

class MatchingEngine {
    /**
     * 매일 자정에 실행되는 배치 작업
     * 모든 활성 유저에게 추천 생성
     */
    async generateDailyRecommendations() {
        const activeUsers = await this.getActiveUsers();
        
        for (const user of activeUsers) {
            const recommendations = await this.findMatches(user);
            await this.saveRecommendations(user.id, recommendations);
        }
    }
    
    /**
     * 개별 유저에게 매칭 대상 찾기
     */
    async findMatches(user) {
        // 1. 유저의 A&B 응답 가져오기
        const userResponses = await this.getUserABResponses(user.id);
        
        // 2. 다른 유저들과 매칭 스코어 계산
        const candidates = await this.getAllCandidates(user.id);
        const scored = candidates.map(candidate => ({
            ...candidate,
            matchScore: this.calculateMatchScore(userResponses, candidate.responses)
        }));
        
        // 3. 상위 N명 선정 (기본 5명)
        const topMatches = scored
            .sort((a, b) => b.matchScore - a.matchScore)
            .slice(0, user.dailyRecommendationCount || 5);
        
        return topMatches;
    }
    
    /**
     * 매칭 스코어 계산 알고리즘
     */
    calculateMatchScore(userA, userB) {
        let matchCount = 0;
        let totalWeight = 0;
        
        for (const [questionId, responseA] of Object.entries(userA)) {
            const responseB = userB[questionId];
            if (!responseB) continue;
            
            const question = this.questions[questionId];
            totalWeight += question.weight;
            
            if (responseA === responseB) {
                matchCount += question.weight;
            }
        }
        
        return totalWeight > 0 ? (matchCount / totalWeight) * 100 : 0;
    }
}

// Cron job 설정
const cron = require('node-cron');

// 매일 자정에 실행
cron.schedule('0 0 * * *', async () => {
    console.log('Generating daily recommendations...');
    await matchingEngine.generateDailyRecommendations();
});
```

### B. 링 거래 서비스

```javascript
// server/services/ring-service.js

class RingService {
    /**
     * 링 획득 처리
     */
    async earnRings(userId, amount, category, metadata = {}) {
        const tx = await db.transaction();
        
        try {
            // 1. 잔액 업데이트
            const balance = await tx('user_ring_balance')
                .where({ user_id: userId })
                .increment('balance', amount)
                .increment('lifetime_earned', amount)
                .returning('balance');
            
            // 2. 거래 로그 기록
            await tx('ring_transactions').insert({
                user_id: userId,
                transaction_type: 'EARN',
                category,
                amount,
                balance_after: balance[0].balance,
                metadata
            });
            
            await tx.commit();
            
            return {
                success: true,
                newBalance: balance[0].balance,
                amountEarned: amount
            };
        } catch (error) {
            await tx.rollback();
            throw error;
        }
    }
    
    /**
     * 링 사용 처리 (잔액 부족 시 실패)
     */
    async spendRings(userId, amount, category, metadata = {}) {
        const tx = await db.transaction();
        
        try {
            // 1. 잔액 확인
            const currentBalance = await tx('user_ring_balance')
                .where({ user_id: userId })
                .first();
            
            if (currentBalance.balance < amount) {
                throw new Error('INSUFFICIENT_RINGS');
            }
            
            // 2. 잔액 차감
            const balance = await tx('user_ring_balance')
                .where({ user_id: userId })
                .decrement('balance', amount)
                .increment('lifetime_spent', amount)
                .returning('balance');
            
            // 3. 거래 로그 기록
            await tx('ring_transactions').insert({
                user_id: userId,
                transaction_type: 'SPEND',
                category,
                amount: -amount, // 음수로 저장
                balance_after: balance[0].balance,
                metadata
            });
            
            await tx.commit();
            
            return {
                success: true,
                newBalance: balance[0].balance,
                amountSpent: amount
            };
        } catch (error) {
            await tx.rollback();
            throw error;
        }
    }
}
```

### C. A&B 응답 암호화

```javascript
// server/services/encryption-service.js
const crypto = require('crypto');

class EncryptionService {
    constructor() {
        this.algorithm = 'aes-256-gcm';
        this.key = Buffer.from(process.env.ENCRYPTION_KEY, 'hex'); // 32 bytes
    }
    
    /**
     * A&B 응답 암호화
     */
    encryptResponse(data) {
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);
        
        let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
        encrypted += cipher.final('hex');
        
        const authTag = cipher.getAuthTag();
        
        return {
            encrypted,
            iv: iv.toString('hex'),
            authTag: authTag.toString('hex')
        };
    }
    
    /**
     * A&B 응답 복호화
     */
    decryptResponse(encryptedData) {
        const decipher = crypto.createDecipheriv(
            this.algorithm,
            this.key,
            Buffer.from(encryptedData.iv, 'hex')
        );
        
        decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));
        
        let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        
        return JSON.parse(decrypted);
    }
}
```

### D. 사진 AI 검증 서비스 (스켈레톤)

```javascript
// server/services/photo-ai-service.js

class PhotoAIService {
    /**
     * 사진 검증 파이프라인
     */
    async verifyPhoto(photoId, userId) {
        const photo = await this.getPhoto(photoId);
        
        // 1. 얼굴 유사도 검증
        const similarityResult = await this.checkFaceSimilarity(userId, photo);
        
        // 2. 콘텐츠 검증 (외설성, 폭력성)
        const contentResult = await this.checkContent(photo);
        
        // 3. 소셜 프로필 매칭 (옵션)
        let socialResult = null;
        if (await this.hasSocialAccount(userId)) {
            socialResult = await this.verifySocialProfile(userId, photo);
        }
        
        // 4. 종합 판정
        const verification = this.makeDecision({
            similarity: similarityResult,
            content: contentResult,
            social: socialResult
        });
        
        // 5. DB에 저장
        await this.saveVerificationResult(photoId, verification);
        
        // 6. 자동 승인 가능 여부 판단
        if (verification.autoApprove) {
            await this.approvePhoto(photoId);
            await ringService.earnRings(userId, 20, 'PHOTO', { photoId });
        } else {
            await this.requestManualReview(photoId);
        }
        
        return verification;
    }
    
    /**
     * 얼굴 유사도 체크 (기존 사진과 비교)
     * TODO: AWS Rekognition 또는 Azure Face API 연동
     */
    async checkFaceSimilarity(userId, newPhoto) {
        // 스켈레톤 구현
        return {
            score: 85.0,
            isSamePerson: true,
            confidence: 90.0
        };
    }
    
    /**
     * 콘텐츠 검증 (외설성, 폭력성)
     * TODO: Google Cloud Vision API 또는 AWS Rekognition
     */
    async checkContent(photo) {
        // 스켈레톤 구현
        return {
            isExplicit: false,
            isViolent: false,
            flags: [],
            confidence: 95.0
        };
    }
    
    /**
     * 종합 판정
     */
    makeDecision(results) {
        const { similarity, content, social } = results;
        
        // 자동 승인 조건
        const autoApprove = 
            similarity.isSamePerson &&
            similarity.score >= 80 &&
            !content.isExplicit &&
            !content.isViolent &&
            content.confidence >= 90;
        
        return {
            autoApprove,
            status: autoApprove ? 'VERIFIED' : 'MANUAL_REVIEW',
            details: results
        };
    }
}
```

---

## 6️⃣ 관리자 페이지 확장

### 새로운 관리자 기능

```javascript
// public/admin.html 확장

// 1. A&B 질문 관리
<section id="ab-management">
    <h2>A&B 질문 관리</h2>
    
    <button id="generate-ai-questions">AI로 새 질문 생성</button>
    
    <table class="ab-questions-table">
        <thead>
            <tr>
                <th>ID</th>
                <th>카테고리</th>
                <th>옵션 A</th>
                <th>옵션 B</th>
                <th>가중치</th>
                <th>활성화</th>
                <th>작업</th>
            </tr>
        </thead>
        <tbody>
            <!-- 동적 렌더링 -->
        </tbody>
    </table>
</section>

// 2. 사진 AI 검증 관리
<section id="photo-verification-queue">
    <h2>사진 검증 대기열</h2>
    
    <div class="filters">
        <button data-status="MANUAL_REVIEW">수동 검토 필요</button>
        <button data-status="PENDING">검증 중</button>
        <button data-status="REJECTED">거부됨</button>
    </div>
    
    <div class="verification-items">
        <!-- 각 사진별 카드 -->
        <div class="verification-card">
            <img src="photo.jpg">
            <div class="ai-results">
                <p>얼굴 유사도: <strong>92.5%</strong></p>
                <p>외설성: <strong class="safe">안전</strong></p>
                <p>신뢰도: <strong>95.3%</strong></p>
            </div>
            <div class="actions">
                <button class="approve-btn">승인</button>
                <button class="reject-btn">거부</button>
            </div>
        </div>
    </div>
</section>

// 3. 링 통계 대시보드
<section id="ring-statistics">
    <h2>링 경제 통계</h2>
    
    <div class="stat-cards">
        <div class="stat-card">
            <h3>총 유통량</h3>
            <p class="big-number">50,000 링</p>
        </div>
        <div class="stat-card">
            <h3>오늘 획득</h3>
            <p class="big-number">5,000 링</p>
        </div>
        <div class="stat-card">
            <h3>오늘 사용</h3>
            <p class="big-number">3,000 링</p>
        </div>
    </div>
    
    <canvas id="ring-chart"></canvas> <!-- Chart.js 그래프 -->
</section>

// 4. 매칭 알고리즘 모니터링
<section id="matching-monitoring">
    <h2>매칭 알고리즘 현황</h2>
    
    <div class="matching-stats">
        <p>오늘 생성된 추천: <strong>1,234개</strong></p>
        <p>평균 매칭 스코어: <strong>76.5%</strong></p>
        <p>퀴즈 시작률: <strong>45%</strong></p>
    </div>
    
    <button id="run-matching-manually">수동 매칭 실행</button>
</section>
```

---

## 7️⃣ 환경 변수 추가

```bash
# .env 파일에 추가

# 암호화 키 (32 bytes hex)
ENCRYPTION_KEY=your-32-byte-hex-key-here

# 링 관련 설정
RING_AB_REWARD=5          # A&B 응답 시 획득
RING_PHOTO_REWARD=20      # 사진 인증 시 획득
RING_VERIFICATION_REWARD=30  # 신분 인증 시 획득
RING_QUIZ_COST=10         # 퀴즈 1회 비용
RING_GROUP_DATE_COST=50   # 다인원 데이트 참가 비용

# AI 서비스 (추후 설정)
AWS_REKOGNITION_KEY=...
GOOGLE_VISION_API_KEY=...
AZURE_FACE_API_KEY=...

# 매칭 알고리즘
DAILY_RECOMMENDATION_COUNT=5  # 기본 일일 추천 인원
MATCHING_CRON_SCHEDULE="0 0 * * *"  # 매일 자정
```

---

## 8️⃣ 마일스톤 및 우선순위

### Phase 1: 핵심 시스템 구축 (우선순위 높음)

#### Week 1-2
- [ ] DB 스키마 생성 및 마이그레이션
  - `user_ring_balance`, `ring_transactions`
  - `ab_questions`, `user_ab_responses`
  - `daily_recommendations`
- [ ] 링 시스템 구현
  - 획득/사용 로직
  - 거래 로그 기록
  - 프론트엔드 애니메이션
- [ ] A&B 질문 시스템
  - 이미지 기반 UI
  - 응답 암호화 저장
  - 완성도 계산

#### Week 3-4
- [ ] 매칭 엔진 구현
  - 매칭 스코어 알고리즘
  - 일일 추천 생성 배치
  - 추천 목록 API
- [ ] 프론트엔드 UI
  - A&B 질문 화면
  - 일일 추천 카드
  - 상대 상세 + 퀴즈 통합 뷰
- [ ] 기존 퀴즈 시스템과 통합
  - 추천된 상대만 퀴즈 가능하도록 변경
  - 호감도 시스템 연동

### Phase 2: AI 검증 및 관리자 (중간 우선순위)

#### Week 5-6
- [ ] 사진 AI 검증 스켈레톤
  - DB 스키마 (`photo_ai_verification`)
  - 기본 파이프라인 구축
  - 수동 검토 시스템
- [ ] 관리자 페이지 확장
  - A&B 질문 관리
  - 사진 검증 큐
  - 링 통계 대시보드
  - 매칭 모니터링

### Phase 3: AI 엔진 연동 (마일스톤 최후)

#### Week 7-8
- [ ] AI 서비스 연동
  - AWS Rekognition (얼굴 인식)
  - Google Vision API (콘텐츠 검증)
- [ ] A&B 질문 AI 생성
  - OpenAI DALL-E 또는 Midjourney API
  - 카테고리별 자동 생성
- [ ] 소셜 계정 연동
  - OAuth 인증 (Facebook, Instagram, Kakao)
  - 프로필 정보 동기화
  - 사진 자동 검증

### Phase 4: 최적화 및 테스트

#### Week 9-10
- [ ] 성능 최적화
  - 매칭 알고리즘 튜닝
  - DB 인덱스 최적화
  - 캐싱 전략
- [ ] 테스트 코드 작성
  - 유닛 테스트 (Jest)
  - API 통합 테스트
  - E2E 테스트 (Playwright)
- [ ] 보안 강화
  - 취약점 스캔
  - 암호화 검증
  - Rate limiting

---

## 9️⃣ 기존 코드 수정 가이드

### 변경이 필요한 주요 파일

#### 1. `server/index.js` (백엔드)
```javascript
// 추가할 라우터
const abRouter = require('./routes/ab');
const matchingRouter = require('./routes/matching');
const ringRouter = require('./routes/rings');
const photoAIRouter = require('./routes/photo-ai');

app.use('/api/ab', abRouter);
app.use('/api/matching', matchingRouter);
app.use('/api/rings', ringRouter);
app.use('/api/photos', photoAIRouter);

// Cron job 초기화
require('./jobs/daily-matching-job');
```

#### 2. `public/js/ui.js` (프론트엔드)
```javascript
// 메인 화면 수정
async function renderMainScreen() {
    // 기존: 모든 파트너 목록
    // 변경: 일일 추천 목록
    
    const recommendations = await API.getDailyRecommendations();
    renderDailyRecommendations(recommendations);
}

// 링 잔액 헤더에 표시
async function initializeApp() {
    const ringBalance = await API.getRingBalance();
    updateRingBalanceDisplay(ringBalance);
}
```

#### 3. `public/js/api.js` (API 클라이언트)
```javascript
// 새로운 API 메서드 추가
class API {
    // A&B
    static async getABQuestions() { ... }
    static async submitABResponse(questionId, option) { ... }
    
    // 매칭
    static async getDailyRecommendations() { ... }
    static async getRecommendationDetail(recId) { ... }
    
    // 링
    static async getRingBalance() { ... }
    static async getRingTransactions(page) { ... }
    static async purchaseRings(packageId) { ... }
    
    // 사진 AI
    static async getPhotoVerificationStatus(photoId) { ... }
}
```

#### 4. `public/js/quiz.js` (퀴즈 시스템)
```javascript
// 수정: 퀴즈 시작 전 링 차감
async function startQuiz(targetUserId) {
    // 1. 링 잔액 확인
    const balance = await API.getRingBalance();
    if (balance < RING_QUIZ_COST) {
        showInsufficientRingsModal();
        return;
    }
    
    // 2. 링 차감
    await API.spendRings(RING_QUIZ_COST, 'QUIZ', { targetUserId });
    
    // 3. 기존 퀴즈 로직
    ...
}
```

---

## 🔟 테스트 시나리오

### 유저 플로우 테스트

```
1. 신규 가입
   → A&B 질문 20개 이상 답변 (100링 획득)
   → 매칭 활성화
   
2. 다음날
   → 일일 추천 5명 확인
   → 카드 클릭하여 상세 보기
   
3. 퀴즈 풀기
   → 링 10개 차감
   → 정답 시 호감도 증가
   → 오답 시 추가 링 패널티
   
4. 호감도 20점 도달
   → 사진 BLUR2 → BLUR1 해금
   → 추가 정보 노출
   
5. 호감도 60점 도달
   → 원본 사진 해금
   → 만남 신청 가능
   
6. 사진 업로드
   → AI 검증 대기 (30초)
   → 승인 시 20링 획득
   
7. 관리자
   → 수동 검토 필요 사진 처리
   → 링 통계 확인
   → 매칭 알고리즘 모니터링
```

---

## 📝 Claude Code 작업 지시문 요약

### 즉시 시작 가능한 작업 (Phase 1)

```markdown
# Task 1: DB 스키마 생성
- `user_ring_balance`, `ring_transactions` 테이블 생성
- `ab_questions`, `user_ab_responses` 테이블 생성 (암호화 컬럼 포함)
- `daily_recommendations` 테이블 생성
- 기존 테이블에 컬럼 추가 (users, user_photos)
- 마이그레이션 스크립트 작성

# Task 2: 링 시스템 백엔드
- `server/services/ring-service.js` 생성
  - earnRings(), spendRings() 메서드
  - 트랜잭션 처리
- `server/routes/rings.js` API 엔드포인트
  - GET /balance
  - GET /transactions
  - POST /purchase
- 환경 변수 설정 (.env)

# Task 3: 링 시스템 프론트엔드
- `public/js/ring-animation.js` 생성
  - 획득/사용 애니메이션
  - 잔액 카운트업 효과
- 헤더에 링 잔액 표시 UI
- `public/styles/ring-ui.css` 스타일

# Task 4: A&B 시스템 백엔드
- `server/services/encryption-service.js` 암호화 서비스
- `server/routes/ab.js` API 엔드포인트
  - GET /questions
  - POST /responses
- 응답 저장 시 암호화 로직

# Task 5: A&B 시스템 프론트엔드
- `public/ab-questions.html` 페이지 생성
- `public/js/ab-ui.js` 로직
  - 이미지 기반 선택 UI
  - 진행도 표시
  - 링 획득 애니메이션 연동
- `public/styles/ab-questions.css` 스타일

# Task 6: 매칭 엔진
- `server/services/matching-engine.js` 생성
  - calculateMatchScore() 알고리즘
  - findMatches() 로직
  - generateDailyRecommendations() 배치
- `server/jobs/daily-matching-job.js` Cron job
- `server/routes/matching.js` API

# Task 7: 일일 추천 UI
- 메인 화면에 추천 섹션 추가
- 카드 형태 디자인 (스와이프 가능)
- 매칭 스코어 표시
- `public/js/ui.js` 수정

# Task 8: 퀴즈 시스템 통합
- 기존 quiz.js 수정
  - 링 차감 로직 추가
  - 추천된 상대만 접근 가능하도록 변경
- UI 수정 (상대 상세 + 퀴즈 통합 뷰)
```

---

## ✅ 체크리스트

### 시작 전 준비
- [ ] 환경 변수 설정 (.env)
- [ ] 암호화 키 생성 (`openssl rand -hex 32`)
- [ ] Git 브랜치 생성 (`feature/ring-matching-system`)

### 구현 중
- [ ] 각 Task별 단위 테스트 작성
- [ ] API 엔드포인트 Postman 테스트
- [ ] UI 컴포넌트 브라우저 테스트
- [ ] 문서 업데이트 (README.md, PROJECT.md)

### 완료 후
- [ ] 전체 플로우 E2E 테스트
- [ ] 성능 테스트 (매칭 알고리즘)
- [ ] 보안 검토 (암호화, 인증)
- [ ] 코드 리뷰

---

## 📚 참고 자료

### 기존 프로젝트 문서
- `PROJECT.md` - 프로젝트 헌법 (핵심 정보)
- `MASTER.md` - 현재 작업 상태
- `README.md` - 개발자 가이드
- `CLAUDE.md` - 버전 히스토리

### 외부 API 문서
- AWS Rekognition: https://docs.aws.amazon.com/rekognition/
- Google Cloud Vision: https://cloud.google.com/vision/docs
- OpenAI DALL-E: https://platform.openai.com/docs/guides/images

### 라이브러리
- node-cron: https://www.npmjs.com/package/node-cron
- crypto (Node.js): https://nodejs.org/api/crypto.html
- Lottie: https://airbnb.io/lottie/ (애니메이션)

---

**작성 완료!** 이 문서를 Claude Code에게 전달하여 단계별로 구현을 진행하세요.

**최종 업데이트**: 2025-10-06  
**문서 버전**: 1.0.0
