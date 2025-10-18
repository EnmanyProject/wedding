import { db } from '../src/utils/database';
import fs from 'fs';
import path from 'path';

/**
 * A&B 퀴즈 시스템 통합 마이그레이션 실행
 */
async function runMigration() {
  try {
    console.log('🚀 A&B 퀴즈 시스템 통합 마이그레이션 시작\n');
    console.log('='.repeat(80));

    // 1. 마이그레이션 SQL 파일 읽기
    const migrationPath = path.join(__dirname, '../migrations/015_unify_ab_quiz_system.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📄 마이그레이션 파일:', migrationPath);
    console.log('📝 SQL 크기:', migrationSQL.length, 'bytes\n');

    // 2. 실행 전 확인
    console.log('⚠️  실행 전 확인:');
    console.log('  - trait_pairs → ab_quizzes 통합');
    console.log('  - user_traits → ab_quiz_responses 통합');
    console.log('  - 기존 테이블은 _deprecated로 보존');
    console.log('  - 롤백 가능\n');

    // 3. 실행
    console.log('🔄 마이그레이션 실행 중...\n');

    const startTime = Date.now();
    await db.query(migrationSQL);
    const endTime = Date.now();

    console.log(`\n✅ 마이그레이션 완료! (소요 시간: ${(endTime - startTime) / 1000}초)\n`);

    // 4. 결과 확인
    console.log('📊 마이그레이션 결과 확인:\n');

    const results = await Promise.all([
      db.query('SELECT COUNT(*) as count FROM ab_quizzes'),
      db.query('SELECT COUNT(*) as count FROM ab_quizzes WHERE source = \'trait_pair_migration\''),
      db.query('SELECT COUNT(*) as count FROM ab_quiz_responses'),
      db.query('SELECT COUNT(*) as count FROM trait_pairs_deprecated'),
      db.query('SELECT COUNT(*) as count FROM user_traits_deprecated')
    ]);

    console.log('✅ 통합 완료:');
    console.log(`  ab_quizzes 총 개수: ${results[0][0].count}개`);
    console.log(`  └─ trait_pairs에서 마이그레이션: ${results[1][0].count}개`);
    console.log(`  ab_quiz_responses 총 개수: ${results[2][0].count}개`);
    console.log('');
    console.log('📦 보존된 데이터 (deprecated):');
    console.log(`  trait_pairs_deprecated: ${results[3][0].count}개`);
    console.log(`  user_traits_deprecated: ${results[4][0].count}개`);

    // 5. 샘플 데이터 확인
    console.log('\n\n🔍 통합된 데이터 샘플:');
    console.log('─'.repeat(80));

    const sampleQuizzes = await db.query(`
      SELECT id, title, option_a_title, option_b_title, source
      FROM ab_quizzes
      WHERE source = 'trait_pair_migration'
      LIMIT 3
    `);

    sampleQuizzes.forEach((q, i) => {
      console.log(`${i + 1}. ${q.title}`);
      console.log(`   A: ${q.option_a_title} / B: ${q.option_b_title}`);
      console.log(`   출처: ${q.source}\n`);
    });

    console.log('\n🎉 마이그레이션 성공!\n');
    console.log('다음 단계:');
    console.log('  1. 코드에서 trait_pairs 참조를 ab_quizzes로 변경');
    console.log('  2. 전체 시스템 테스트');
    console.log('  3. deprecated 테이블 삭제 (충분히 테스트 후)');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ 마이그레이션 실패:', error);
    console.error('\n🔄 롤백 방법:');
    console.error('  1. trait_pairs_deprecated를 trait_pairs로 복구');
    console.error('  2. user_traits_deprecated를 user_traits로 복구');
    console.error('  3. ab_quizzes에서 source=\'trait_pair_migration\' 삭제');
    process.exit(1);
  }
}

runMigration();
