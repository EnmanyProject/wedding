# A&B 미팅 앱 - Wedding 프로젝트

A&B 취향 퀴즈와 사진 기반 예측을 통한 완벽한 인연 매칭 플랫폼

---

## 📚 문서 구조

**처음 시작하시나요? 이 순서대로 읽으세요:**

### 1. README.md (이 파일) - 시작점
프로젝트 개요, 빠른 시작, 기술 스택

### 2. CLAUDE.md - 작업 규칙 ⭐ 필수
- 토큰 절약 시스템 (80% 절약)
- 키워드 기반 자동 파일 매핑
- 작업 프로세스 가이드
- **크기**: 5KB (가벼움, 자주 로드)

### 3. MASTER.md - 현재 작업 상태
- 지금 진행중인 작업
- 최근 완료 작업 (5개)
- 발견된 문제
- **크기**: 7KB (자주 업데이트)

### 4. PROJECT.md - 전체 계획서
- 아키텍처 설계
- Phase 로드맵
- 시스템 상세 설명
- **크기**: 가변 (필요시만 참조)

### 5. CHANGELOG.md - 작업 이력
- v1.0 ~ 현재까지 모든 변경사항
- 버전별 상세 기록
- **크기**: 80KB+ (거의 안 로드)

---

## 🚀 빠른 시작

### 새 작업 시작 시
```
1. CLAUDE.md 확인 → 작업 규칙 파악
2. MASTER.md 확인 → 현재 Phase 파악
3. 사용자 요청 분석 → 필요한 파일만 로드
4. 작업 수행
```

### 사용자로 작업하기
```
그냥 편하게 말하면 됩니다:
"회원가입 폼이 이상해"
"데이터베이스 연결 안 돼"
"API 에러 나"
```

---

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

---

## 💻 개발 환경 설정

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

### 4. 자동 검증 시스템 ✨

프로젝트 일관성을 자동으로 검증하여 버그를 사전에 방지합니다.

#### 🔍 검증 항목
- TypeScript 컴파일 검사
- userId 타입 일관성 (UUID vs parseInt)
- PostgreSQL 함수 존재 확인
- 트랜잭션 타입 일치성
- API 엔드포인트 일치성
- 프론트엔드 메서드명 일치성

#### 🚀 사용 방법

```bash
# 빠른 검증 (3-5초, 서버 시작 시 자동 실행)
npm run validate:quick

# 전체 검증 (10-15초, Git 커밋 시 자동 실행)
npm run validate
```

#### ⚙️ 자동 실행

1. **서버 시작 시**: `npm run dev` 실행 시 빠른 검증 자동 실행
2. **Git 커밋 시**: 커밋 전 전체 검증 자동 실행 (실패 시 커밋 차단)

검증을 건너뛰려면: `git commit --no-verify`

---

## 📁 프로젝트 구조

```
wedding/
├── 📄 README.md              # 이 파일
├── 📄 CLAUDE.md              # 작업 규칙
├── 📄 MASTER.md              # 현재 작업
├── 📄 PROJECT.md             # 전체 계획
├── 📄 CHANGELOG.md           # 작업 이력
│
├── 📂 src/                   # Next.js App Router
│   ├── app/                  # 페이지 및 API 라우트
│   └── ...
│
├── 📂 components/            # React 컴포넌트
│   ├── signup/
│   └── ...
│
├── 📂 lib/                   # 유틸리티 및 헬퍼
│   ├── db.ts                 # 데이터베이스 연결
│   └── ...
│
├── 📂 public/                # 정적 파일
│   ├── styles/
│   └── js/
│
├── 📂 migrations/            # 데이터베이스 마이그레이션
├── 📂 sql/                   # SQL 스키마 및 쿼리
└── 📂 docs/                  # 추가 문서
```

---

## 🛠️ 기술 스택

**Frontend:**
- Next.js 14+ (App Router)
- TypeScript
- React
- CSS Modules
- Responsive Design

**Backend:**
- Next.js API Routes
- PostgreSQL
- Node.js
- WebSocket (계획)

**Infrastructure:**
- Docker & Docker Compose
- MinIO (S3-compatible storage)
- Redis (캐싱)

---

## 🧪 테스트

### 전체 테스트 실행
```bash
pnpm test
```

### 시나리오별 테스트
```bash
# 사진 시스템 테스트
pnpm test photos

# 퀴즈 시스템 테스트
pnpm test quiz

# 시딩 시스템 테스트
pnpm test seeding
```

---

## 📊 현재 진행 상황

- ✅ **Phase 1**: 하이브리드 디자인 시스템 완료
- 🔄 **Phase 2**: 진행 중

**현재 버전**: v1.60.0  
**최신 업데이트**: Admin Users Endpoint SQL Fix

---

## 🔗 유용한 링크

- **API 문서**: `/docs/API.md`
- **데이터베이스 스키마**: `/sql/schema.sql`
- **개발 가이드**: `MASTER.md`
- **작업 이력**: `CHANGELOG.md`

---

## 💡 작업 팁

### 토큰 절약 (중요!)
- Claude가 자동으로 필요한 파일만 로드 (80% 절약)
- 키워드 기반 자동 판단
- 자세한 내용: `CLAUDE.md` 참조

### 버전 관리
- 작업 완료 시 `CHANGELOG.md`에 기록
- Git 커밋 형식: `vX.Y.Z: [변경 내용]`
- 버전 규칙: Major.Minor.Patch

---

## 📞 문의

문제가 있거나 질문이 있으신가요?
- `MASTER.md` - 현재 작업 상태 확인
- `CHANGELOG.md` - 과거 문제 해결 방법 검색
- `PROJECT.md` - 시스템 아키텍처 상세 확인

---

**최종 업데이트**: 2025-10-13  
**작성자**: Development Team  
**Made with ❤️ for perfect connections**
