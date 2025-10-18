import { db } from '../src/utils/database';

/**
 * 마이그레이션 미리보기 - 실제 변경 없이 어떻게 될지 확인
 */
async function previewMigration() {
  try {
    console.log('🔍 마이그레이션 미리보기\n');
    console.log('='.repeat(80));

    // 1. 현재 데이터 현황
    const currentStats = await Promise.all([
      db.query('SELECT COUNT(*) as count FROM trait_pairs'),
      db.query('SELECT COUNT(*) as count FROM ab_quizzes'),
      db.query('SELECT COUNT(*) as count FROM user_traits'),
      db.query('SELECT COUNT(*) as count FROM ab_quiz_responses')
    ]);

    console.log('\n📊 현재 데이터:');
    console.log(`  trait_pairs: ${currentStats[0][0].count}개`);
    console.log(`  ab_quizzes: ${currentStats[1][0].count}개`);
    console.log(`  user_traits: ${currentStats[2][0].count}개 (유저 응답)`);
    console.log(`  ab_quiz_responses: ${currentStats[3][0].count}개 (유저 응답)`);

    // 2. 마이그레이션 후 예상 결과
    const traitPairsCount = parseInt(currentStats[0][0].count);
    const abQuizzesCount = parseInt(currentStats[1][0].count);
    const userTraitsCount = parseInt(currentStats[2][0].count);
    const abResponsesCount = parseInt(currentStats[3][0].count);

    console.log('\n\n📈 마이그레이션 후 예상:');
    console.log(`  ab_quizzes: ${abQuizzesCount} + ${traitPairsCount} = ${abQuizzesCount + traitPairsCount}개`);
    console.log(`  ab_quiz_responses: ${abResponsesCount} + ${userTraitsCount} = ${abResponsesCount + userTraitsCount}개`);

    // 3. 샘플 데이터 변환 미리보기
    console.log('\n\n🔄 변환 예시 (처음 3개):');
    console.log('─'.repeat(80));

    const sampleTraitPairs = await db.query(`
      SELECT id, key, category, left_label, right_label
      FROM trait_pairs
      ORDER BY created_at DESC
      LIMIT 3
    `);

    sampleTraitPairs.forEach((tp, i) => {
      console.log(`\n${i + 1}. trait_pairs → ab_quizzes`);
      console.log(`   원본 (trait_pairs):`);
      console.log(`     - key: ${tp.key}`);
      console.log(`     - left: ${tp.left_label} / right: ${tp.right_label}`);
      console.log(`   변환 후 (ab_quizzes):`);
      console.log(`     - title: ${tp.key}`);
      console.log(`     - option_a: ${tp.left_label} / option_b: ${tp.right_label}`);
      console.log(`     - source: trait_pair_migration`);
    });

    // 4. user_traits 변환 예시
    console.log('\n\n🔄 유저 응답 변환 예시:');
    console.log('─'.repeat(80));

    const sampleUserTraits = await db.query(`
      SELECT ut.user_id, ut.pair_id, ut.choice, tp.left_label, tp.right_label
      FROM user_traits ut
      JOIN trait_pairs tp ON ut.pair_id = tp.id
      LIMIT 5
    `);

    sampleUserTraits.forEach((ut, i) => {
      const newChoice = ut.choice === 'left' ? 'A' : 'B';
      const selected = ut.choice === 'left' ? ut.left_label : ut.right_label;
      console.log(`${i + 1}. choice: '${ut.choice}' → '${newChoice}' (${selected})`);
    });

    // 5. 안전성 검사
    console.log('\n\n✅ 안전성 검사:');
    console.log('─'.repeat(80));

    // 중복 체크
    const duplicateCheck = await db.query(`
      SELECT quiz_id, user_id, COUNT(*) as count
      FROM ab_quiz_responses
      GROUP BY quiz_id, user_id
      HAVING COUNT(*) > 1
    `);

    if (duplicateCheck.length > 0) {
      console.log(`⚠️  경고: ab_quiz_responses에 ${duplicateCheck.length}개의 중복이 있습니다.`);
    } else {
      console.log('✅ ab_quiz_responses에 중복 없음');
    }

    // created_by NULL 체크
    const nullCreatedBy = await db.query(`
      SELECT COUNT(*) as count FROM ab_quizzes WHERE created_by IS NULL
    `);
    console.log(`✅ 현재 created_by가 NULL인 퀴즈: ${nullCreatedBy[0].count}개`);

    console.log('\n\n📝 마이그레이션 요약:');
    console.log('='.repeat(80));
    console.log(`✅ ${traitPairsCount}개의 trait_pairs가 ab_quizzes로 통합됩니다`);
    console.log(`✅ ${userTraitsCount}개의 user_traits가 ab_quiz_responses로 통합됩니다`);
    console.log(`✅ 기존 테이블은 _deprecated로 이름이 변경되어 보존됩니다`);
    console.log(`✅ 언제든지 롤백 가능합니다`);

    console.log('\n\n🚀 실행 준비 완료!');
    console.log('실행 명령: npx tsx scripts/run-migration.ts');

    process.exit(0);
  } catch (error) {
    console.error('❌ 오류:', error);
    process.exit(1);
  }
}

previewMigration();
