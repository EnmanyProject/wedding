#!/usr/bin/env tsx
/**
 * 프로젝트 일관성 검증 스크립트
 * - 타입 불일치 검사
 * - DB 함수 존재 확인
 * - API 일치성 검사
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

// 색상 코드
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

let hasErrors = false;
let hasWarnings = false;

// 로그 함수
function log(message: string, color: string = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function error(message: string) {
  hasErrors = true;
  log(`❌ ${message}`, colors.red);
}

function warning(message: string) {
  hasWarnings = true;
  log(`⚠️  ${message}`, colors.yellow);
}

function success(message: string) {
  log(`✅ ${message}`, colors.green);
}

function info(message: string) {
  log(`ℹ️  ${message}`, colors.cyan);
}

// 1. TypeScript 컴파일 체크
function checkTypeScript() {
  info('TypeScript 컴파일 검사 중...');
  try {
    execSync('tsc --noEmit', { stdio: 'ignore' });
    success('TypeScript 타입 검사 통과');
  } catch (err) {
    error('TypeScript 타입 에러 발견. "npm run type-check" 실행 권장');
  }
}

// 2. userId 타입 일관성 검사
function checkUserIdTypes() {
  info('userId 타입 일관성 검사 중...');

  const routesPath = path.join(process.cwd(), 'src', 'routes');
  if (!fs.existsSync(routesPath)) {
    warning('src/routes 디렉토리 없음');
    return;
  }

  const files = fs.readdirSync(routesPath).filter(f => f.endsWith('.ts'));
  let foundParseInt = false;

  for (const file of files) {
    const filePath = path.join(routesPath, file);
    const content = fs.readFileSync(filePath, 'utf-8');

    // parseInt(userId) 패턴 검사
    if (content.includes('parseInt(userId)') || content.includes('parseInt(req.user?.id)')) {
      error(`${file}: UUID를 parseInt()로 변환 시도 발견`);
      foundParseInt = true;
    }
  }

  if (!foundParseInt) {
    success('userId 타입 일관성 검사 통과');
  }
}

// 3. 필수 PostgreSQL 함수 존재 확인
function checkDatabaseFunctions() {
  info('데이터베이스 함수 존재 확인 중...');

  try {
    // Docker가 실행 중인지 확인
    execSync('docker ps | grep wedding_db', { stdio: 'ignore' });

    // 필수 함수 목록
    const requiredFunctions = [
      'update_ring_balance',
      'get_ring_balance',
    ];

    for (const funcName of requiredFunctions) {
      try {
        const result = execSync(
          `docker exec -i wedding_db psql -U postgres -d wedding_app -c "\\df ${funcName}"`,
          { encoding: 'utf-8' }
        );

        if (result.includes('(0 rows)')) {
          error(`PostgreSQL 함수 '${funcName}' 없음. 마이그레이션 실행 필요`);
        }
      } catch (err) {
        error(`PostgreSQL 함수 '${funcName}' 확인 실패`);
      }
    }

    success('데이터베이스 함수 검사 통과');
  } catch (err) {
    warning('Docker 컨테이너 wedding_db 미실행. DB 검사 스킵');
  }
}

// 4. 트랜잭션 타입 일관성 검사
function checkTransactionTypes() {
  info('트랜잭션 타입 일관성 검사 중...');

  // 서비스에서 사용하는 트랜잭션 타입
  const servicesPath = path.join(process.cwd(), 'src', 'services');
  const usedTypes = new Set<string>();

  if (fs.existsSync(servicesPath)) {
    const files = fs.readdirSync(servicesPath).filter(f => f.endsWith('.ts'));

    for (const file of files) {
      const content = fs.readFileSync(path.join(servicesPath, file), 'utf-8');

      // 'PAWN_PHOTO', 'PAWN_INFO' 등의 패턴 찾기
      const matches = content.match(/'([A-Z_]+)'/g);
      if (matches) {
        matches.forEach(match => {
          const type = match.replace(/'/g, '');
          if (type.includes('PAWN') || type.includes('RING')) {
            usedTypes.add(type);
          }
        });
      }
    }
  }

  // 마이그레이션 파일에서 허용된 타입 확인
  const migrationPath = path.join(process.cwd(), 'migrations', '010_create_ring_currency_system.sql');
  if (fs.existsSync(migrationPath)) {
    const content = fs.readFileSync(migrationPath, 'utf-8');

    usedTypes.forEach(type => {
      if (!content.includes(`'${type}'`)) {
        error(`트랜잭션 타입 '${type}'이 마이그레이션에 정의되지 않음`);
      }
    });
  }

  success('트랜잭션 타입 일관성 검사 통과');
}

// 5. API 엔드포인트 일치성 검사 (간단 버전)
function checkAPIConsistency() {
  info('API 일치성 검사 중...');

  // 백엔드 라우트 파일 확인
  const pawnshopRoutePath = path.join(process.cwd(), 'src', 'routes', 'pawnshop.ts');
  if (!fs.existsSync(pawnshopRoutePath)) {
    warning('pawnshop.ts 라우트 파일 없음');
    return;
  }

  const routeContent = fs.readFileSync(pawnshopRoutePath, 'utf-8');

  // 프론트엔드 API 파일 확인
  const apiPath = path.join(process.cwd(), 'public', 'js', 'api.js');
  if (!fs.existsSync(apiPath)) {
    warning('public/js/api.js 파일 없음');
    return;
  }

  const apiContent = fs.readFileSync(apiPath, 'utf-8');

  // 백엔드에 정의된 엔드포인트
  const backendEndpoints = [
    '/pawn-photo',
    '/pawn-info',
    '/my-photos',
    '/my-info',
  ];

  // 프론트엔드 API 메서드
  const frontendMethods = [
    'pawnPhoto',
    'pawnInfo',
    'getMyPawnedPhotos',
    'getMyPawnedInfo',
  ];

  let allMatch = true;

  backendEndpoints.forEach(endpoint => {
    if (!apiContent.includes(endpoint)) {
      warning(`프론트엔드에 '${endpoint}' 엔드포인트 호출 없음`);
      allMatch = false;
    }
  });

  frontendMethods.forEach(method => {
    if (!apiContent.includes(`async ${method}(`) && !apiContent.includes(`${method}(`)) {
      warning(`프론트엔드에 '${method}' 메서드 없음`);
      allMatch = false;
    }
  });

  if (allMatch) {
    success('API 일치성 검사 통과');
  }
}

// 6. 프론트엔드 메서드명 일치성 검사
function checkFrontendMethodNames() {
  info('프론트엔드 메서드명 일치성 검사 중...');

  const pawnshopPath = path.join(process.cwd(), 'public', 'js', 'pawnshop.js');
  const ringSystemPath = path.join(process.cwd(), 'public', 'js', 'utils', 'ring-system.js');

  if (!fs.existsSync(pawnshopPath) || !fs.existsSync(ringSystemPath)) {
    warning('프론트엔드 파일 없음. 검사 스킵');
    return;
  }

  const pawnshopContent = fs.readFileSync(pawnshopPath, 'utf-8');
  const ringSystemContent = fs.readFileSync(ringSystemPath, 'utf-8');

  // loadRingBalance 대신 loadBalance 사용해야 함
  if (pawnshopContent.includes('loadRingBalance')) {
    error('pawnshop.js에서 loadRingBalance() 사용 중. loadBalance()로 수정 필요');
  }

  // ring-system.js에 loadBalance 메서드가 있는지 확인
  if (!ringSystemContent.includes('async loadBalance()')) {
    error('ring-system.js에 loadBalance() 메서드 없음');
  }

  success('프론트엔드 메서드명 검사 통과');
}

// 메인 실행
async function main() {
  log('\n🔍 프로젝트 일관성 검증 시작...\n', colors.blue);

  // 빠른 모드 (서버 시작 시)
  const isQuickMode = process.argv.includes('--quick');

  if (isQuickMode) {
    info('빠른 검사 모드 실행 중...\n');
    checkUserIdTypes();
    checkFrontendMethodNames();
  } else {
    // 전체 검사 (커밋 전)
    info('전체 검사 모드 실행 중...\n');
    checkTypeScript();
    checkUserIdTypes();
    checkDatabaseFunctions();
    checkTransactionTypes();
    checkAPIConsistency();
    checkFrontendMethodNames();
  }

  log('');
  if (hasErrors) {
    log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', colors.red);
    log('❌ 검증 실패! 위의 에러를 수정하세요.', colors.red);
    log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n', colors.red);
    process.exit(1);
  } else if (hasWarnings) {
    log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', colors.yellow);
    log('⚠️  경고가 있지만 계속 진행합니다.', colors.yellow);
    log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n', colors.yellow);
    process.exit(0);
  } else {
    log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', colors.green);
    log('✅ 모든 검증 통과!', colors.green);
    log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n', colors.green);
    process.exit(0);
  }
}

main().catch(err => {
  error(`검증 중 에러 발생: ${err.message}`);
  process.exit(1);
});
