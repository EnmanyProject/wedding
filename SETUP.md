# 🚀 다른 컴퓨터에서 작업 시작하기

> **목적**: 이 프로젝트를 다른 컴퓨터에서 클론하고 실행하는 방법

---

## 📋 사전 요구사항

### 필수 설치
- **Node.js** 18+ (npm 포함)
- **Docker Desktop** (WSL 2.6.1.0 이상)
- **Git**

### 선택 설치
- **VSCode** + Claude Code Extension

---

## 🔧 설치 및 실행

### 1️⃣ Git 클론
```bash
git clone https://github.com/EnmanyProject/wedding.git
cd wedding
```

### 2️⃣ 의존성 설치
```bash
npm install
```

### 3️⃣ .env 파일 생성
**`.env` 파일을 프로젝트 루트에 생성**하고 아래 내용을 복사:

```env
# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/wedding_app

# JWT Secret
JWT_SECRET=wedding-app-dev-jwt-secret-key-12345

# Environment
NODE_ENV=development
PORT=3002

# Development mode settings
DEV_MODE_SEED_ENABLED=true
USE_MOCK_RING_SERVICE=false

# Storage settings for local development
STORAGE_MODE=local
LOCAL_STORAGE_PATH=public/uploads

# Redis
REDIS_URL=redis://localhost:6379

# Admin token for development
ADMIN_API_TOKEN=dev-admin-token

# Photo configuration
PHOTO_THUMB_SIZE=256
PHOTO_BLUR1_SIGMA=4
PHOTO_BLUR2_SIGMA=8
PRESIGN_URL_EXPIRES=300

# MinIO settings (when using minio storage)
STORAGE_ENDPOINT=http://localhost:9000
STORAGE_ACCESS_KEY=minioadmin
STORAGE_SECRET_KEY=minioadmin123
STORAGE_BUCKET=wedding-photos
STORAGE_REGION=us-east-1
STORAGE_FORCE_PATH_STYLE=true

# Affinity thresholds
AFFINITY_ALPHA=3
AFFINITY_BETA=1
AFFINITY_T1_THRESHOLD=10
AFFINITY_T2_THRESHOLD=50
AFFINITY_T3_THRESHOLD=100

# Quiz configuration
QUIZ_ENTER_COST=1
QUIZ_WRONG_PENALTY=1
TRAIT_ADD_REWARD=1

# Ranking configuration
RANKING_TOP_COUNT=5
RANKING_CACHE_TTL=3600
```

### 4️⃣ Docker 컨테이너 시작
```bash
# Docker Desktop이 실행 중인지 확인 후
docker compose up -d

# 컨테이너 상태 확인
docker compose ps
```

**실행되어야 할 컨테이너**:
- `wedding_db` (PostgreSQL 15) - 포트 5432
- `wedding_redis` (Redis 7) - 포트 6379
- `wedding_minio` (MinIO) - 포트 9000-9001

### 5️⃣ 개발 서버 실행
```bash
npm run dev
```

**서버가 정상 실행되면 다음 메시지가 표시됩니다**:
```
🚀 Server running on port 3002
📝 Environment: development
✅ Recommendation scheduler started successfully
```

### 6️⃣ 브라우저에서 확인
- **메인 앱**: http://localhost:3002/
- **회원가입**: http://localhost:3002/signup-v3.html
- **관리자**: http://localhost:3002/admin.html

---

## 🐛 트러블슈팅

### Docker 컨테이너가 시작되지 않음
```bash
# Docker Desktop 재시작
# WSL 업데이트
wsl --update

# 컨테이너 재시작
docker compose down
docker compose up -d
```

### 포트 충돌 (3002 already in use)
```bash
# 실행 중인 프로세스 확인 (Windows)
netstat -ano | findstr :3002

# 프로세스 종료 후 재실행
npm run dev
```

### PostgreSQL 연결 오류
```bash
# 컨테이너 로그 확인
docker compose logs postgres

# 데이터베이스 연결 테스트
docker compose exec postgres psql -U postgres -d wedding_app -c "SELECT COUNT(*) FROM users;"
```

---

## 📚 다음 단계

### 작업 시작 전 확인
1. **문서 읽기**:
   - `project-management/PROJECT.md` - 프로젝트 이해
   - `project-management/MASTER.md` - 현재 작업 상태
   - `CLAUDE.md` - 작업 히스토리

2. **최신 코드 가져오기**:
   ```bash
   git pull origin main
   ```

3. **테스트 유저 생성**:
   - http://localhost:3002/signup-v3.html 접속
   - 회원가입 진행
   - 데이터 저장 확인

---

## 🔗 중요 링크

- **GitHub**: https://github.com/EnmanyProject/wedding.git
- **로컬 서버**: http://localhost:3002
- **Health Check**: http://localhost:3002/health

---

## 📝 현재 작업 상태 (v1.45.0)

**완료**:
- ✅ WSL 업데이트 및 Docker 환경 구축
- ✅ PostgreSQL, Redis, MinIO 컨테이너 실행
- ✅ 회원가입 API 백엔드/프론트엔드 연결
- ✅ Mock → Real DB 전환

**다음 작업**:
- 테스트 유저 생성 및 데이터 플로우 검증
- Ring 시스템 데이터 저장 확인
- 추천 시스템 데이터 저장 확인

---

**마지막 업데이트**: 2025-10-09
