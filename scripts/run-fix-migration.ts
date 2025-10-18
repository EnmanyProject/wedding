import { db } from '../src/utils/database';
import fs from 'fs';
import path from 'path';

async function runFixMigration() {
  try {
    console.log('🚀 누락된 컬럼 수정 마이그레이션 시작\n');
    console.log('='.repeat(80));

    // 마이그레이션 파일 읽기
    const migrationPath = path.join(__dirname, '../migrations/016_fix_missing_columns.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📄 마이그레이션 파일:', migrationPath);
    console.log('📝 SQL 크기:', migrationSQL.length, 'bytes\n');

    // 실행 전 확인
    console.log('⚠️  실행 내용:');
    console.log('  - daily_recommendations 테이블에 컬럼 추가:');
    console.log('    • expires_at (timestamp)');
    console.log('    • reason (text)');
    console.log('    • metadata (jsonb)');
    console.log('    • updated_at (timestamp)\n');

    // 실행
    console.log('🔄 마이그레이션 실행 중...\n');
    const startTime = Date.now();
    await db.query(migrationSQL);
    const endTime = Date.now();

    console.log(`✅ 마이그레이션 완료! (소요 시간: ${(endTime - startTime) / 1000}초)\n`);

    // 결과 확인
    console.log('📊 결과 확인:\n');
    const cols = await db.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'daily_recommendations'
      AND column_name IN ('expires_at', 'reason', 'metadata', 'updated_at')
      ORDER BY ordinal_position
    `);

    if (cols.length === 4) {
      console.log('✅ 4개 컬럼 모두 추가 완료:');
      cols.forEach(c => {
        console.log(`  - ${c.column_name}: ${c.data_type} (nullable: ${c.is_nullable})`);
      });
    } else {
      console.log(`⚠️  ${cols.length}/4 개 컬럼만 추가됨`);
    }

    console.log('\n🎉 수정 완료!');
    console.log('='.repeat(80));

    process.exit(0);
  } catch (error) {
    console.error('\n❌ 마이그레이션 실패:', error);
    process.exit(1);
  }
}

runFixMigration();
