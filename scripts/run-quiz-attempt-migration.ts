import { readFileSync } from 'fs';
import { join } from 'path';
import { pool } from '../src/utils/database';

async function runMigration() {
  console.log('🔧 퀴즈 시도 Ring Ledger Reason 마이그레이션 시작...');

  try {
    // Read migration file
    const migrationPath = join(__dirname, '..', 'sql', 'migrations', '009_add_quiz_attempt_reason.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');

    console.log('📄 마이그레이션 파일 로드 완료');

    // Execute migration
    await pool.query(migrationSQL);

    console.log('✅ 마이그레이션 완료!');
    console.log('');
    console.log('추가된 reason 값:');
    console.log('  - QUIZ_ATTEMPT (퀴즈 시도 비용)');

    process.exit(0);
  } catch (error) {
    console.error('❌ 마이그레이션 실패:', error);
    process.exit(1);
  }
}

runMigration();
