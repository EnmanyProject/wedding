# Vercel 마이그레이션 계획

## 현재 구조 → Vercel 구조

### 1. 디렉토리 구조 변경
```
현재:
wedding/
├── src/          # Express.js 백엔드
├── public/       # 정적 파일
└── package.json  # 단일 패키지

목표:
wedding/
├── app/          # Next.js App Router
├── api/          # Vercel Functions
├── components/   # React 컴포넌트
├── lib/          # 유틸리티 및 설정
├── public/       # 정적 자산
└── package.json  # Next.js 패키지
```

### 2. 기술 스택 변경
- **백엔드**: Express.js → Vercel Functions
- **프론트엔드**: Vanilla JS → Next.js + React
- **데이터베이스**: 로컬 PostgreSQL → Vercel Postgres
- **파일 저장소**: 로컬 → Vercel Blob Storage
- **배포**: 로컬 서버 → Vercel

### 3. 마이그레이션 순서
1. ✅ GitHub 리포지토리 생성 및 초기 커밋
2. ✅ 프론트엔드와 백엔드 분리 구조 설계
3. ⏳ Vercel 프로젝트 설정 및 배포
4. ⏳ 데이터베이스 Vercel Postgres로 이관
5. ⏳ API Routes를 Vercel Functions로 변환
6. ⏳ 환경변수 및 시크릿 설정

### 4. 완료된 구조 설계

#### ✅ Next.js 앱 구조 생성
```
wedding/
├── app/
│   ├── api/health/route.ts    # API Routes 시작점
│   ├── layout.tsx             # 루트 레이아웃
│   ├── page.tsx              # 메인 페이지
│   └── globals.css           # 글로벌 스타일
├── components/               # React 컴포넌트
├── lib/
│   └── database.ts          # Vercel Postgres 유틸리티
├── public/                  # 기존 정적 파일들
├── legacy_src/              # 기존 Express.js 코드 (백업)
├── next.config.js           # Next.js 설정
├── tailwind.config.js       # Tailwind CSS 설정
└── package.json             # 업데이트된 의존성
```

#### ✅ 주요 변경사항
- **패키지 시스템**: Express.js → Next.js 14 + React 18
- **스타일링**: CSS → Tailwind CSS + 기존 CSS 통합
- **API**: Express Routes → Next.js API Routes
- **데이터베이스**: pg → @vercel/postgres
- **파일 저장소**: MinIO/S3 → @vercel/blob
- **개발 서버**: tsx watch → next dev

## GitHub 설정 안내

현재 로컬에 Git 커밋이 완료되었습니다. GitHub에 푸시하려면:

1. GitHub에서 새 리포지토리 생성: `wedding-app`
2. 아래 명령어로 연결:
```bash
git remote add origin https://github.com/[USERNAME]/wedding-app.git
git branch -M main
git push -u origin main
```

## 다음 작업

프론트엔드와 백엔드 분리 구조를 설계하여 Vercel에 최적화된 형태로 변환하겠습니다.