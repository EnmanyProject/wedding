# A&B 미팅 앱 - Photo-based Quiz System

A&B 취향 퀴즈와 사진 기반 예측을 통한 완벽한 인연 매칭 플랫폼

## 🌟 핵심 기능

### 📸 사진 기반 시스템
- **멀티 변형 생성**: ORIG/THUMB/BLUR1/BLUR2 자동 생성
- **단계별 노출**: 호감도에 따른 점진적 사진 해금 (T1/T2/T3)
- **모더레이션**: 자동 검토 및 승인/거부 시스템
- **Presign 업로드**: 보안이 강화된 직접 업로드

### 🎯 퀴즈 시스템
- **사진 기반 퀴즈**: 취향 예측을 통한 호감도 증가
- **포인트 경제**: 퀴즈 비용 및 실패 패널티 시스템
- **로깅**: 선택된 사진 및 응답 기록
- **실력 추적**: 정확도 및 편향성 통계

### 💝 호감도 & 만남
- **임계치 시스템**: T1=20, T2=40, T3=60
- **단계별 해금**: 사진 품질 및 만남 기능 개방
- **랭킹**: 개인별 호감도 순위
- **실시간 채팅**: WebSocket 기반 메시징

## 🚀 빠른 시작

### 1. 환경 설정

```bash
# 저장소 클론
git clone <repository-url>
cd wedding

# 환경 변수 설정
cp .env.example .env
# .env 파일을 수정하여 데이터베이스 및 스토리지 설정

# 의존성 설치
pnpm install
```

### 2. 인프라 시작

```bash
# Docker 서비스 시작 (PostgreSQL, MinIO, Redis)
docker compose up -d

# 데이터베이스 마이그레이션
pnpm migrate

# 개발 데이터 시딩
pnpm seed:dev
```

### 3. 개발 서버 실행

```bash
# 백엔드 API 서버
pnpm dev

# 프론트엔드는 public/ 폴더의 정적 파일 제공
# http://localhost:3000 에서 앱 접근 가능
```

## 📊 시드 데이터

### 기본 시드 실행
```bash
pnpm seed:dev
```

### 커스텀 시드
```bash
# 사용자 수, 사진 수 등 조정
pnpm seed:dev -- --users=50 --photos=5 --quizzes=100

# 전체 리셋 후 시드
pnpm seed:dev -- --reset
```

### API 시드 (개발 환경)
```bash
# 시드 실행
curl -X POST http://localhost:3000/api/dev/seed \
  -H "Content-Type: application/json" \
  -d '{"user_count": 30, "reset_first": true}'

# 데이터 리셋
curl -X DELETE http://localhost:3000/api/dev/reset

# 시드 현황 확인
curl http://localhost:3000/api/dev/seed/summary
```

## 🧪 테스트

### 전체 테스트 실행
```bash
pnpm test
```

### 시나리오별 테스트
```bash
# 사진 시스템 테스트 (PH1-PH3)
pnpm test photos

# 퀴즈 시스템 테스트 (QZ1-QZ3)
pnpm test quiz

# 시딩 시스템 테스트 (SD1-SD2)
pnpm test seeding
```

### 테스트 시나리오 상세

#### PH1-PH3: 사진 시스템
- **PH1**: presign→commit→asset 생성 플로우
- **PH2**: REJECTED 사진 비노출 검증
- **PH3**: stage별 variant 노출 규칙

#### QZ1-QZ3: 퀴즈 시스템
- **QZ1**: 세션 생성 시 포인트 차감
- **QZ2**: 정답/오답 기록 및 Affinity 업데이트
- **QZ3**: 임계치 언락 반영 검증

#### SD1-SD2: 시딩 시스템
- **SD1**: /dev/seed 실행 후 summary 검증
- **SD2**: /dev/reset 후 재시드 검증

## 📐 아키텍처

### 데이터베이스 스키마
```
users (기본 사용자 정보)
├── user_photos (사진 메타데이터)
│   └── photo_assets (ORIG/THUMB/BLUR1/BLUR2)
├── user_traits (취향 응답)
├── user_point_balances (포인트 잔액)
└── user_point_ledger (포인트 거래 기록)

trait_pairs (취향 질문)
└── trait_visuals (시각 자산)

quiz_sessions (퀴즈 세션)
└── quiz_items (개별 질문 응답)

affinity (호감도 점수)
└── photo_mask_states (사진 노출 상태)

meeting_states (만남 상태)
└── chat_messages (채팅 메시지)
```

### API 엔드포인트

#### 사진 관리
- `POST /api/me/photos/presign` - 업로드 URL 생성
- `POST /api/me/photos/commit` - 업로드 완료
- `GET /api/me/photos` - 내 사진 목록
- `GET /api/profile/{targetId}/photos` - 타겟 사진 (권한별)

#### 퀴즈 시스템
- `POST /api/quiz/session` - 퀴즈 세션 시작
- `POST /api/quiz/{sessionId}/answer` - 답변 제출
- `GET /api/quiz/template` - 퀴즈 템플릿

#### 포인트 & 호감도
- `GET /api/points/me/points` - 내 포인트 확인
- `POST /api/points/earn` - 포인트 획득
- `GET /api/affinity/{targetId}` - 호감도 조회
- `GET /api/affinity/me/ranking` - 내 랭킹

#### 만남 & 채팅
- `GET /api/meeting/me/meeting-state` - 만남 현황
- `POST /api/meeting/enter` - 만남 시작
- `GET /api/meeting/{meetingId}/messages` - 채팅 기록

#### 개발 도구 (개발 환경만)
- `POST /api/dev/seed` - 데이터 시딩
- `DELETE /api/dev/reset` - 데이터 리셋
- `GET /api/dev/seed/summary` - 시드 현황

## ⚙️ 설정

### 환경 변수
```bash
# 데이터베이스
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/wedding_app

# 스토리지 (MinIO/S3)
STORAGE_ENDPOINT=http://localhost:9000
STORAGE_ACCESS_KEY=minioadmin
STORAGE_SECRET_KEY=minioadmin123
STORAGE_BUCKET=wedding-photos

# 퀴즈 설정
QUIZ_ENTER_COST=1          # 퀴즈 시작 비용
QUIZ_WRONG_PENALTY=1       # 오답 패널티
TRAIT_ADD_REWARD=1         # 취향 추가 보상

# 호감도 임계치
AFFINITY_T1_THRESHOLD=20   # 1단계 해금
AFFINITY_T2_THRESHOLD=40   # 2단계 해금
AFFINITY_T3_THRESHOLD=60   # 3단계 해금 (만남 가능)

# 사진 처리
PHOTO_THUMB_SIZE=256       # 썸네일 크기
PHOTO_BLUR1_SIGMA=4        # 첫 번째 블러 강도
PHOTO_BLUR2_SIGMA=8        # 두 번째 블러 강도
```

### 개발 모드 기능
- **자동 시딩**: 첫 실행 시 테스트 데이터 자동 생성
- **개발 도구**: Ctrl+Shift+D로 개발 메뉴 토글
- **실시간 업데이트**: 코드 변경 시 자동 재시작
- **상세 로깅**: 개발 환경에서 상세 로그 출력

## 🛠️ 개발 도구

### 키보드 단축키 (개발 환경)
- `Ctrl+Shift+D`: 개발 메뉴 토글
- `Ctrl+Shift+S`: 빠른 시딩
- `Ctrl+Shift+R`: 데이터 리셋

### 브라우저 개발자 도구
```javascript
// 전역 객체 접근
api.getMyPoints()          // API 호출
ui.switchView('photos')    // 뷰 전환
quiz.startRandomQuiz()     // 퀴즈 시작
photos.openPhotoUpload()   // 사진 업로드

// 앱 상태 확인
app.getStatus()           // 앱 상태
app.getVersion()          // 버전 정보
```

## 🔒 보안 고려사항

### 사진 보안
- presigned URL로 직접 업로드 (서버 미경유)
- 단계별 접근 제어 (LOCKED/T1/T2/T3)
- 자동 모더레이션 및 수동 검토

### API 보안
- JWT 토큰 기반 인증
- 사용자별 데이터 격리
- Rate limiting 적용

### 개발 환경 보호
- 프로덕션에서 시딩/리셋 API 비활성화
- 개발 전용 플래그로 민감한 기능 제한

## 📱 PWA 지원

### 기능
- 오프라인 캐싱
- 푸시 알림 (계획)
- 앱 설치 프롬프트
- 반응형 디자인

### 설치
브라우저에서 "앱 설치" 버튼 클릭 또는 브라우저 메뉴에서 "홈 화면에 추가"

## 🐛 문제 해결

### 일반적인 문제

#### 1. 데이터베이스 연결 실패
```bash
# PostgreSQL 상태 확인
docker compose ps

# 로그 확인
docker compose logs postgres

# 재시작
docker compose restart postgres
```

#### 2. 사진 업로드 실패
```bash
# MinIO 상태 확인
curl http://localhost:9001

# 버킷 확인
docker compose exec minio mc ls local/wedding-photos
```

#### 3. 시딩 실패
```bash
# 개발 모드 플래그 확인
echo $DEV_MODE_SEED_ENABLED

# 수동 리셋 후 재시도
curl -X DELETE http://localhost:3000/api/dev/reset
pnpm seed:dev
```

### 로그 확인
```bash
# 앱 로그
docker compose logs app

# 데이터베이스 로그
docker compose logs postgres

# 전체 서비스 로그
docker compose logs
```

## 🤝 기여하기

1. 이슈 생성 또는 기존 이슈 확인
2. 피처 브랜치 생성 (`git checkout -b feature/amazing-feature`)
3. 변경사항 커밋 (`git commit -m 'Add amazing feature'`)
4. 브랜치 푸시 (`git push origin feature/amazing-feature`)
5. Pull Request 생성

### 개발 가이드라인
- TypeScript 엄격 모드 사용
- ESLint 규칙 준수
- 테스트 작성 (커버리지 80% 이상)
- API 변경 시 문서 업데이트

## 📄 라이선스

MIT License - 자세한 내용은 [LICENSE](LICENSE) 파일 참고

## 📞 지원

- 🐛 버그 리포트: [Issues](https://github.com/your-repo/issues)
- 💡 기능 요청: [Discussions](https://github.com/your-repo/discussions)
- 📧 이메일: support@example.com

---

**Made with ❤️ for perfect connections**