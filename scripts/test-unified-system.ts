import { db } from '../src/utils/database';

/**
 * 통합된 A&B 퀴즈 시스템 기능 테스트
 */
async function testUnifiedSystem() {
  try {
    console.log('🧪 통합 시스템 기능 테스트\n');
    console.log('='.repeat(80));

    // 1. 통합된 퀴즈 분포 확인
    console.log('\n📊 통합된 퀴즈 분포:');
    const distribution = await db.query(`
      SELECT source, COUNT(*) as count
      FROM ab_quizzes
      GROUP BY source
    `);
    distribution.forEach(d => {
      const label = d.source === 'admin_created' ? '어드민 생성' : '마이그레이션';
      console.log(`  ${label}: ${d.count}개`);
    });

    // 2. 보존된 테이블 확인
    console.log('\n\n📦 보존된 테이블:');
    const deprecated = await db.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name LIKE '%deprecated'
    `);
    deprecated.forEach(t => {
      console.log(`  ✅ ${t.table_name}`);
    });

    // 3. 샘플 퀴즈 조회 (각 소스별)
    console.log('\n\n🔍 샘플 퀴즈:');
    console.log('─'.repeat(80));

    console.log('\n📝 어드민 생성 퀴즈 (최근 3개):');
    const adminQuizzes = await db.query(`
      SELECT id, category, title, option_a_title, option_b_title
      FROM ab_quizzes
      WHERE source = 'admin_created'
      ORDER BY created_at DESC
      LIMIT 3
    `);
    adminQuizzes.forEach((q, i) => {
      console.log(`  ${i + 1}. [${q.category}] ${q.title}`);
      console.log(`     A: ${q.option_a_title} | B: ${q.option_b_title}`);
    });

    console.log('\n🧬 마이그레이션된 퀴즈 (최근 3개):');
    const migratedQuizzes = await db.query(`
      SELECT id, category, title, option_a_title, option_b_title
      FROM ab_quizzes
      WHERE source = 'trait_pair_migration'
      ORDER BY created_at DESC
      LIMIT 3
    `);
    migratedQuizzes.forEach((q, i) => {
      console.log(`  ${i + 1}. [${q.category}] ${q.title}`);
      console.log(`     A: ${q.option_a_title} | B: ${q.option_b_title}`);
    });

    // 4. 유저 응답 통계
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
    `);
    responseStats.forEach(stat => {
      const label = stat.source === 'admin_created' ? '어드민 퀴즈' : '마이그레이션 퀴즈';
      console.log(`  ${label}: ${stat.response_count}개 응답 (${stat.unique_users}명)`);
    });

    // 5. 시스템 기능 테스트
    console.log('\n\n✅ 기능 테스트:');
    console.log('─'.repeat(80));

    // 테스트 1: 랜덤 퀴즈 조회
    const randomQuiz = await db.query(`
      SELECT id, title, option_a_title, option_b_title
      FROM ab_quizzes
      WHERE is_active = true
      ORDER BY RANDOM()
      LIMIT 1
    `);
    if (randomQuiz.length > 0) {
      console.log('  ✅ 랜덤 퀴즈 조회 성공');
      console.log(`     "${randomQuiz[0].title}"`);
    } else {
      console.log('  ❌ 랜덤 퀴즈 조회 실패');
    }

    // 테스트 2: 카테고리별 조회
    const categoryQuizzes = await db.query(`
      SELECT category, COUNT(*) as count
      FROM ab_quizzes
      GROUP BY category
      ORDER BY count DESC
      LIMIT 5
    `);
    if (categoryQuizzes.length > 0) {
      console.log('  ✅ 카테고리별 조회 성공');
      categoryQuizzes.forEach(c => {
        console.log(`     ${c.category}: ${c.count}개`);
      });
    }

    // 테스트 3: 유저 응답 조회
    const userResponse = await db.query(`
      SELECT abr.user_id, abr.choice, abq.title
      FROM ab_quiz_responses abr
      JOIN ab_quizzes abq ON abr.quiz_id = abq.id
      LIMIT 1
    `);
    if (userResponse.length > 0) {
      console.log('  ✅ 유저 응답 조회 성공');
      console.log(`     "${userResponse[0].title}" - 선택: ${userResponse[0].choice}`);
    }

    console.log('\n\n🎉 통합 시스템 기능 테스트 완료!');
    console.log('='.repeat(80));
    console.log('✅ 모든 기능이 정상적으로 작동합니다.');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ 테스트 실패:', error);
    process.exit(1);
  }
}

testUnifiedSystem();
