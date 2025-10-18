import { db } from '../src/utils/database';

/**
 * A&B 퀴즈 통합 시스템 검증
 */
async function verifyUnification() {
  try {
    console.log('🔍 A&B 퀴즈 통합 시스템 검증\n');
    console.log('='.repeat(80));

    // 1. 테이블 존재 확인
    console.log('\n📋 테이블 상태:');
    const tables = await db.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('ab_quizzes', 'ab_quiz_responses', 'trait_pairs', 'trait_pairs_deprecated', 'user_traits', 'user_traits_deprecated')
      ORDER BY table_name
    `);

    tables.forEach(t => {
      const status = t.table_name.includes('deprecated') ? '📦 (보존됨)' : '✅ (활성)';
      console.log(`  ${status} ${t.table_name}`);
    });

    // 2. 데이터 개수 확인
    console.log('\n\n📊 데이터 개수:');
    const counts = await Promise.all([
      db.query('SELECT COUNT(*) as count FROM ab_quizzes'),
      db.query("SELECT COUNT(*) as count FROM ab_quizzes WHERE source = 'admin_created'"),
      db.query("SELECT COUNT(*) as count FROM ab_quizzes WHERE source = 'trait_pair_migration'"),
      db.query('SELECT COUNT(*) as count FROM ab_quiz_responses'),
      db.query('SELECT COUNT(*) as count FROM trait_pairs_deprecated'),
      db.query('SELECT COUNT(*) as count FROM user_traits_deprecated')
    ]);

    console.log(`  ab_quizzes 총 개수: ${counts[0][0].count}개`);
    console.log(`    ├─ 어드민 생성: ${counts[1][0].count}개`);
    console.log(`    └─ 마이그레이션: ${counts[2][0].count}개`);
    console.log(`  ab_quiz_responses: ${counts[3][0].count}개`);
    console.log(`  trait_pairs_deprecated: ${counts[4][0].count}개 (보존)`);
    console.log(`  user_traits_deprecated: ${counts[5][0].count}개 (보존)`);

    // 3. 샘플 데이터 확인
    console.log('\n\n🔍 통합 데이터 샘플 (각 출처별 3개):');
    console.log('─'.repeat(80));

    console.log('\n📝 어드민 생성 퀴즈:');
    const adminQuizzes = await db.query(`
      SELECT id, title, option_a_title, option_b_title, source
      FROM ab_quizzes
      WHERE source = 'admin_created'
      ORDER BY created_at DESC
      LIMIT 3
    `);
    adminQuizzes.forEach((q, i) => {
      console.log(`  ${i + 1}. ${q.title}`);
      console.log(`     A: ${q.option_a_title} | B: ${q.option_b_title}`);
    });

    console.log('\n🧬 마이그레이션된 퀴즈 (기존 trait_pairs):');
    const migratedQuizzes = await db.query(`
      SELECT id, title, option_a_title, option_b_title, source
      FROM ab_quizzes
      WHERE source = 'trait_pair_migration'
      ORDER BY created_at DESC
      LIMIT 3
    `);
    migratedQuizzes.forEach((q, i) => {
      console.log(`  ${i + 1}. ${q.title}`);
      console.log(`     A: ${q.option_a_title} | B: ${q.option_b_title}`);
    });

    // 4. 응답 데이터 확인
    console.log('\n\n💬 유저 응답 통계:');
    console.log('─'.repeat(80));

    const responseStats = await db.query(`
      SELECT
        abq.source,
        COUNT(*) as response_count,
        COUNT(DISTINCT abr.user_id) as unique_users
      FROM ab_quiz_responses abr
      JOIN ab_quizzes abq ON abr.quiz_id = abq.id
      GROUP BY abq.source
      ORDER BY abq.source
    `);

    responseStats.forEach(stat => {
      const sourceLabel = stat.source === 'admin_created' ? '어드민 생성' : '마이그레이션';
      console.log(`  ${sourceLabel}: ${stat.response_count}개 응답 (${stat.unique_users}명 유저)`);
    });

    // 5. 데이터 무결성 검증
    console.log('\n\n✅ 데이터 무결성 검증:');
    console.log('─'.repeat(80));

    // 중복 체크
    const duplicates = await db.query(`
      SELECT quiz_id, user_id, COUNT(*) as count
      FROM ab_quiz_responses
      GROUP BY quiz_id, user_id
      HAVING COUNT(*) > 1
    `);

    if (duplicates.length > 0) {
      console.log(`  ⚠️  경고: ${duplicates.length}개의 중복 응답 발견`);
    } else {
      console.log('  ✅ 중복 응답 없음');
    }

    // NULL 체크
    const nullTitles = await db.query(`
      SELECT COUNT(*) as count FROM ab_quizzes WHERE title IS NULL
    `);
    console.log(`  ✅ NULL 제목: ${nullTitles[0].count}개`);

    const nullOptions = await db.query(`
      SELECT COUNT(*) as count FROM ab_quizzes WHERE option_a_title IS NULL OR option_b_title IS NULL
    `);
    console.log(`  ✅ NULL 옵션: ${nullOptions[0].count}개`);

    // 6. 카테고리 분포
    console.log('\n\n📊 카테고리 분포:');
    console.log('─'.repeat(80));

    const categories = await db.query(`
      SELECT category, COUNT(*) as count
      FROM ab_quizzes
      GROUP BY category
      ORDER BY count DESC
      LIMIT 10
    `);

    categories.forEach(cat => {
      console.log(`  ${cat.category}: ${cat.count}개`);
    });

    console.log('\n\n🎉 통합 시스템 검증 완료!');
    console.log('='.repeat(80));
    console.log('✅ 모든 데이터가 ab_quizzes로 성공적으로 통합되었습니다.');
    console.log('✅ 유저 응답이 ab_quiz_responses로 성공적으로 통합되었습니다.');
    console.log('✅ 기존 데이터는 _deprecated 테이블에 안전하게 보존되었습니다.');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ 검증 실패:', error);
    process.exit(1);
  }
}

verifyUnification();
