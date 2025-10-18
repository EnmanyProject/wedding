import { db } from '../src/utils/database';

/**
 * A&B 퀴즈 vs Trait 퀴즈 비교
 */
async function compareQuizTypes() {
  try {
    console.log('🔍 A&B 퀴즈 vs Trait 퀴즈 비교\n');
    console.log('='.repeat(80));

    // 1. A&B 퀴즈 샘플
    console.log('\n📱 A&B 퀴즈 (ab_quizzes 테이블)');
    console.log('─'.repeat(80));
    const abQuizzes = await db.query(
      `SELECT id, category, title, option_a_title, option_b_title,
              option_a_image, option_b_image, created_by, created_at
       FROM ab_quizzes
       ORDER BY created_at DESC
       LIMIT 5`
    );

    console.log(`총 개수: ${(await db.query('SELECT COUNT(*) as count FROM ab_quizzes'))[0].count}개\n`);
    abQuizzes.forEach((q, i) => {
      console.log(`${i + 1}. 제목: ${q.title}`);
      console.log(`   카테고리: ${q.category}`);
      console.log(`   옵션 A: ${q.option_a_title}${q.option_a_image ? ' (이미지 있음)' : ''}`);
      console.log(`   옵션 B: ${q.option_b_title}${q.option_b_image ? ' (이미지 있음)' : ''}`);
      console.log(`   생성자: ${q.created_by || '없음'}`);
      console.log(`   생성일: ${q.created_at}\n`);
    });

    // 2. Trait 퀴즈 샘플
    console.log('\n🧬 Trait 퀴즈 (trait_pairs 테이블)');
    console.log('─'.repeat(80));
    const traitPairs = await db.query(
      `SELECT id, key, category, left_label, right_label,
              description, created_at
       FROM trait_pairs
       ORDER BY created_at DESC
       LIMIT 5`
    );

    console.log(`총 개수: ${(await db.query('SELECT COUNT(*) as count FROM trait_pairs'))[0].count}개\n`);
    traitPairs.forEach((t, i) => {
      console.log(`${i + 1}. Key: ${t.key}`);
      console.log(`   카테고리: ${t.category}`);
      console.log(`   왼쪽: ${t.left_label}`);
      console.log(`   오른쪽: ${t.right_label}`);
      console.log(`   설명: ${t.description || '없음'}`);
      console.log(`   생성일: ${t.created_at}\n`);
    });

    // 3. 테이블 구조 비교
    console.log('\n📊 테이블 구조 비교');
    console.log('='.repeat(80));

    const abColumns = await db.query(
      `SELECT column_name, data_type
       FROM information_schema.columns
       WHERE table_name = 'ab_quizzes'
       ORDER BY ordinal_position`
    );

    const traitColumns = await db.query(
      `SELECT column_name, data_type
       FROM information_schema.columns
       WHERE table_name = 'trait_pairs'
       ORDER BY ordinal_position`
    );

    console.log('\nab_quizzes 컬럼:');
    abColumns.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type}`);
    });

    console.log('\ntrait_pairs 컬럼:');
    traitColumns.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type}`);
    });

    // 4. 답변 데이터 비교
    console.log('\n\n📝 답변 데이터');
    console.log('='.repeat(80));

    const abResponses = await db.query(
      `SELECT COUNT(*) as count FROM ab_quiz_responses`
    );

    const traitResponses = await db.query(
      `SELECT COUNT(*) as count FROM user_traits`
    );

    console.log(`A&B 퀴즈 답변 (ab_quiz_responses): ${abResponses[0].count}개`);
    console.log(`Trait 답변 (user_traits): ${traitResponses[0].count}개`);

    process.exit(0);
  } catch (error) {
    console.error('❌ 오류:', error);
    process.exit(1);
  }
}

compareQuizTypes();
