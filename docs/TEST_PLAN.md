# 추천 시스템 테스트 계획서

## 🎯 테스트 목표
Phase 1B, 1C, 1D 추천 시스템 통합 테스트

---

## ✅ 테스트 체크리스트

### 1️⃣ 데이터베이스 마이그레이션 테스트

**목적**: 추천 시스템 테이블 생성 확인

**테스트 단계**:
```bash
# Docker PostgreSQL 실행 확인
docker ps | grep postgres

# 마이그레이션 실행 (필요 시)
# 마이그레이션 파일: migrations/011_create_daily_recommendations.sql
```

**확인 사항**:
- [ ] `daily_recommendations` 테이블 생성됨
- [ ] `recommendation_history` 테이블 생성됨
- [ ] `recommendation_settings` 테이블 생성됨
- [ ] 트리거 함수 3개 생성됨

**SQL 확인**:
```sql
-- 테이블 확인
SELECT table_name FROM information_schema.tables
WHERE table_name LIKE '%recommendation%';

-- 트리거 확인
SELECT trigger_name FROM information_schema.triggers
WHERE trigger_name LIKE '%recommendation%';
```

---

### 2️⃣ 서버 시작 & 스케줄러 실행 테스트

**목적**: 크론잡 자동 시작 확인

**테스트 단계**:
```bash
# 서버 실행
npm run dev

# 콘솔 로그 확인
# 예상 출력:
# 🚀 Server running on port 3000
# 📅 [Scheduler] Schedule: Every 3 minutes (DEV)
# ✅ [Scheduler] Recommendation scheduler started successfully
```

**확인 사항**:
- [ ] 서버 정상 실행
- [ ] 스케줄러 자동 시작 메시지 출력
- [ ] "Every 3 minutes (DEV)" 메시지 확인
- [ ] 에러 없이 실행

---

### 3️⃣ 자동 추천 생성 테스트 (3분 대기)

**목적**: 크론잡 자동 실행 확인

**테스트 단계**:
1. 서버 실행 후 3분 대기
2. 콘솔 로그 확인

**예상 출력**:
```
🚀 [Scheduler] Starting daily recommendation generation...
Generating recommendations for X users...
Generated N recommendations for user [UUID]
Daily recommendations generation completed
✅ [Scheduler] Daily recommendations generated successfully (XXXms)
```

**확인 사항**:
- [ ] 3분 후 자동 실행됨
- [ ] 모든 활성 사용자 추천 생성됨
- [ ] 에러 없이 완료
- [ ] 실행 시간(ms) 출력됨

---

### 4️⃣ 추천 API 테스트

**목적**: 사용자 추천 조회 API 확인

**테스트 단계**:
```bash
# 1. 로그인 (토큰 획득)
# 브라우저: http://localhost:3000
# 또는 dev-login 사용

# 2. 추천 조회 API
curl -X GET http://localhost:3000/api/recommendations/today \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**예상 응답**:
```json
{
  "success": true,
  "recommendations": [
    {
      "id": "uuid",
      "recommendedUserId": "uuid",
      "score": 75,
      "rank": 1,
      "userName": "user1",
      "userDisplayName": "사용자1",
      "userAge": 25,
      "userRegion": "서울"
    },
    // ... 최대 5개
  ],
  "count": 5
}
```

**확인 사항**:
- [ ] 200 OK 응답
- [ ] 추천 목록 반환됨 (최대 5개)
- [ ] rank 순서대로 정렬됨
- [ ] score 값이 0-100 범위

---

### 5️⃣ 프론트엔드 추천 UI 테스트

**목적**: 추천 카드 렌더링 확인

**테스트 단계**:
1. 브라우저: http://localhost:3000
2. 로그인
3. "호감도 랭킹 🏆" 탭 클릭

**확인 사항**:
- [ ] "✨ 오늘의 추천" 섹션 표시됨
- [ ] 추천 카드 5개 렌더링됨
- [ ] 랭킹 배지(1-5) 표시
- [ ] 매칭 점수 프로그레스 바 표시
- [ ] 사용자 정보 표시 (이름, 나이, 지역)

**인터랙션 테스트**:
- [ ] 추천 카드 클릭 → 퀴즈 시작
- [ ] 새로고침 버튼 → 추천 재로드
- [ ] 호버 시 카드 애니메이션

---

### 6️⃣ 관리자 대시보드 테스트

**목적**: 관리자 모니터링 기능 확인

**테스트 단계**:
1. 브라우저: http://localhost:3000/admin-login.html
2. 관리자 로그인 (기본: admin / password)
3. "✨ 추천 시스템" 탭 클릭

**확인 사항**:
- [ ] 스케줄러 상태: "✅ 실행중" 표시
- [ ] 다음 실행 시간: 3분 단위 시간 표시
- [ ] 오늘 추천 수: 숫자 표시
- [ ] 전환율: 퍼센트 표시
- [ ] 오늘의 추천 통계 테이블 렌더링
- [ ] 성과 상위 사용자 테이블 렌더링

**제어 버튼 테스트**:
- [ ] "🔄 전체 추천 생성" 클릭 → 성공 메시지
- [ ] "📊 통계 새로고침" 클릭 → 데이터 재로드
- [ ] "🗑️ 오래된 추천 정리" 클릭 → 삭제 메시지

---

### 7️⃣ 추천 클릭 추적 테스트

**목적**: 사용자 반응 추적 확인

**테스트 단계**:
1. 사용자 페이지에서 추천 카드 클릭
2. 데이터베이스 확인

**SQL 확인**:
```sql
-- 추천 반응 확인
SELECT
  id,
  viewed_at,
  clicked_at,
  quiz_started_at
FROM daily_recommendations
WHERE recommendation_date = CURRENT_DATE
LIMIT 5;

-- 통계 확인
SELECT * FROM recommendation_history
WHERE date = CURRENT_DATE;
```

**확인 사항**:
- [ ] `viewed_at` 타임스탬프 기록됨
- [ ] `clicked_at` 타임스탬프 기록됨
- [ ] `quiz_started_at` 타임스탬프 기록됨
- [ ] `recommendation_history` 자동 업데이트됨

---

### 8️⃣ 수동 추천 생성 테스트

**목적**: 관리자 수동 트리거 확인

**테스트 단계**:
1. 관리자 대시보드 → 추천 시스템 탭
2. "🔄 전체 추천 생성" 버튼 클릭
3. 콘솔 로그 확인

**확인 사항**:
- [ ] "추천 생성이 시작되었습니다!" 알림
- [ ] 콘솔: 추천 생성 로그 출력
- [ ] 2초 후 통계 자동 새로고침
- [ ] 추천 수 증가 확인

---

### 9️⃣ 알고리즘 점수 검증

**목적**: 추천 점수 계산 로직 확인

**SQL 검증**:
```sql
-- 점수 분포 확인
SELECT
  score,
  similarity_score,
  activity_score,
  novelty_score,
  COUNT(*) as count
FROM daily_recommendations
WHERE recommendation_date = CURRENT_DATE
GROUP BY score, similarity_score, activity_score, novelty_score
ORDER BY score DESC;
```

**확인 사항**:
- [ ] similarity_score: 0-50 범위
- [ ] activity_score: 0-30 범위
- [ ] novelty_score: 0-20 범위
- [ ] 총점 = similarity + activity + novelty
- [ ] rank 순서 = score 내림차순

---

### 🔟 스케줄러 재시작 테스트

**목적**: Graceful shutdown 확인

**테스트 단계**:
```bash
# 1. 서버 실행 중
npm run dev

# 2. Ctrl+C로 종료
# 예상 출력: "🛑 [Scheduler] Recommendation scheduler stopped"

# 3. 다시 시작
npm run dev

# 예상 출력: "✅ [Scheduler] Recommendation scheduler started successfully"
```

**확인 사항**:
- [ ] SIGINT 시그널로 스케줄러 중지
- [ ] 에러 없이 종료
- [ ] 재시작 시 스케줄러 자동 시작
- [ ] 다음 실행 시간 정상 계산

---

## 🐛 예상 문제 & 해결책

### 문제 1: 추천이 생성되지 않음
**원인**:
- 활성 사용자가 없음
- trait_pairs 응답이 없음

**해결**:
```bash
# 개발 데이터 시딩
curl -X POST http://localhost:3000/api/dev/seed \
  -H "Content-Type: application/json" \
  -d '{"user_count": 10, "reset_first": true}'
```

### 문제 2: 스케줄러가 시작되지 않음
**원인**:
- node-cron 패키지 미설치

**해결**:
```bash
npm install node-cron
npm install --save-dev @types/node-cron
```

### 문제 3: 관리자 API 401 에러
**원인**:
- 관리자 토큰 만료/없음

**해결**:
1. http://localhost:3000/admin-login.html
2. 재로그인
3. localStorage에 admin_token 확인

### 문제 4: 데이터베이스 테이블 없음
**원인**:
- 마이그레이션 미실행

**해결**:
```sql
-- 수동 실행
\i migrations/011_create_daily_recommendations.sql
```

---

## 📝 테스트 결과 기록

### 환경 정보
- [ ] OS: Windows 11
- [ ] Node.js 버전: ____
- [ ] PostgreSQL 버전: ____
- [ ] 테스트 일시: ____

### 전체 결과
- [ ] ✅ 모든 테스트 통과
- [ ] ⚠️ 일부 실패 (아래 기록)
- [ ] ❌ 주요 기능 실패

### 실패 항목
```
[여기에 실패한 테스트 항목 기록]
```

### 성능 지표
- 추천 생성 시간: ____ ms
- 사용자 수: ____
- 생성된 추천 수: ____

---

## 🚀 다음 단계

### 테스트 통과 시
1. 프로덕션 배포 준비
2. 프로덕션 스케줄 변경 (3분 → 자정)
3. 모니터링 설정

### 테스트 실패 시
1. 에러 로그 수집
2. 디버깅
3. 수정 후 재테스트

---

**작성일**: 2025-10-06
**작성자**: Claude Code
**버전**: 1.0.0
