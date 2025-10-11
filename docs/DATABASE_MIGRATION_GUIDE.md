# 🌐 온라인 DB 전환 가이드

> **목적**: 로컬 DB에서 온라인 DB로 쉽게 전환하기

---

## 📋 온라인 DB 서비스 추천

### 1️⃣ Supabase (추천 ⭐⭐⭐⭐⭐)
**장점**:
- 무료 플랜: 500MB DB, 1GB 파일 스토리지
- PostgreSQL + Storage + Auth 통합
- 실시간 기능 내장
- 한국어 지원

**가격**:
- Free: $0/월 (개발용)
- Pro: $25/월 (프로덕션)

**설정 방법**:
```bash
# 1. https://supabase.com 가입
# 2. New Project 생성
# 3. Settings > Database에서 Connection String 복사
# 4. .env 파일 수정:

DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
```

---

### 2️⃣ Neon (추천 ⭐⭐⭐⭐)
**장점**:
- 서버리스 PostgreSQL
- 브랜치 기능 (Git처럼 DB 브랜치 생성)
- 무료 플랜: 0.5GB 스토리지
- 빠른 속도

**가격**:
- Free: $0/월
- Launch: $19/월

**설정 방법**:
```bash
# 1. https://neon.tech 가입
# 2. Create Project
# 3. Connection String 복사
# 4. .env 파일 수정:

DATABASE_URL=postgresql://[user]:[password]@[host].neon.tech/[dbname]?sslmode=require
```

---

### 3️⃣ Railway (추천 ⭐⭐⭐⭐)
**장점**:
- 간단한 배포
- PostgreSQL + Redis 함께 제공
- GitHub 연동 자동 배포
- 무료 플랜: $5 크레딧/월

**가격**:
- Trial: $5 크레딧/월
- Hobby: $10/월

**설정 방법**:
```bash
# 1. https://railway.app 가입
# 2. New Project > Deploy PostgreSQL
# 3. Variables 탭에서 DATABASE_URL 복사
# 4. .env 파일 수정:

DATABASE_URL=postgresql://postgres:[password]@[host].railway.app:5432/railway
```

---

## 🚀 전환 단계

### Step 1: 온라인 DB 서비스 선택 및 생성
1. 위 추천 서비스 중 하나 선택
2. 계정 생성 및 프로젝트 생성
3. PostgreSQL 인스턴스 생성

### Step 2: 데이터베이스 스키마 마이그레이션
```bash
# 1. 온라인 DB URL 복사
# 2. .env.online 파일 수정
DATABASE_URL=postgresql://[온라인-DB-URL]

# 3. 마이그레이션 스크립트 실행 (향후 제공 예정)
# npm run migrate:online
```

### Step 3: .env 파일 전환
```bash
# Windows
copy .env.online .env

# macOS/Linux
cp .env.online .env
```

### Step 4: 서버 재시작
```bash
npm run dev
```

### Step 5: 데이터 이동 (선택사항)
로컬 DB 데이터를 온라인으로 이동하려면:

```bash
# 1. 로컬 DB 덤프
docker compose exec postgres pg_dump -U postgres wedding_app > local_backup.sql

# 2. 온라인 DB로 복원
psql [온라인-DB-URL] < local_backup.sql
```

---

## 📝 체크리스트

### 온라인 전환 전 확인사항
- [ ] 온라인 DB 서비스 가입 완료
- [ ] DATABASE_URL 복사 완료
- [ ] .env.online 파일 수정 완료
- [ ] JWT_SECRET을 프로덕션용으로 변경 (중요!)
- [ ] API 키들을 환경 변수로 관리 준비

### 온라인 전환 후 확인사항
- [ ] 서버 정상 실행 확인
- [ ] 회원가입 테스트
- [ ] 데이터 저장 확인
- [ ] 다른 컴퓨터에서 접속 테스트

---

## 🔐 보안 주의사항

### ⚠️ 절대 하지 말 것
1. `.env` 파일을 Git에 커밋하지 마세요
2. API 키를 코드에 직접 작성하지 마세요
3. 프로덕션에서 `DEV_MODE_SEED_ENABLED=true` 사용 금지

### ✅ 해야 할 것
1. `.env` 파일은 `.gitignore`에 추가
2. `.env.example` 템플릿만 Git에 커밋
3. 팀원들과 DB URL은 안전한 채널로 공유 (Slack DM, 1Password 등)

---

## 🌐 Storage 전환 (MinIO → S3)

온라인 배포 시 MinIO도 S3로 전환 필요:

### AWS S3 설정
```env
# .env.online
STORAGE_ENDPOINT=  # 비워두기 (AWS S3 기본값 사용)
STORAGE_ACCESS_KEY=[AWS-ACCESS-KEY]
STORAGE_SECRET_KEY=[AWS-SECRET-KEY]
STORAGE_BUCKET=wedding-photos-prod
STORAGE_REGION=ap-northeast-2  # 서울 리전
STORAGE_FORCE_PATH_STYLE=false
```

### Supabase Storage 설정
```env
# .env.online
STORAGE_ENDPOINT=https://[project-ref].supabase.co/storage/v1
STORAGE_ACCESS_KEY=[supabase-service-role-key]
STORAGE_SECRET_KEY=  # 필요 없음
STORAGE_BUCKET=wedding-photos
STORAGE_REGION=  # 필요 없음
```

---

## 💰 비용 예상

### 개발 환경 (무료)
- Supabase Free: $0/월
- Neon Free: $0/월
- Railway Trial: $5 크레딧/월

### 프로덕션 (유료)
- Supabase Pro: ~$25/월
- Neon Launch: ~$19/월
- Railway Hobby: ~$10/월

**총 예상 비용**: $10-25/월

---

## 🆘 문제 해결

### 연결 오류
```bash
# SSL 오류 시
DATABASE_URL=postgresql://...?sslmode=require

# 타임아웃 시
DATABASE_URL=postgresql://...?connect_timeout=30
```

### 성능 이슈
```bash
# Connection Pool 설정
DATABASE_URL=postgresql://...?pool_timeout=30&pool_max=10
```

---

## 📞 도움이 필요하면

1. Supabase 문서: https://supabase.com/docs
2. Neon 문서: https://neon.tech/docs
3. Railway 문서: https://docs.railway.app

---

**마지막 업데이트**: 2025-10-09
**작성자**: Claude Code
