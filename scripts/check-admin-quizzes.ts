import { db } from '../src/utils/database';

/**
 * 어드민에서 보이는 퀴즈가 실제 DB의 A&B 퀴즈인지 확인
 */
async function checkAdminQuizzes() {
  try {
    console.log('📋 실제 DB의 A&B 퀴즈 확인 중...\n');

    // 1. ab_quizzes 테이블에서 퀴즈 가져오기
    const abQuizzes = await db.query(
      `SELECT id, category, title, option_a_title, option_b_title, is_active, created_at
       FROM ab_quizzes
       ORDER BY created_at DESC
       LIMIT 10`
    );

    console.log('📊 ab_quizzes 테이블:');
    console.log(`   총 ${abQuizzes.length}개의 퀴즈 발견\n`);

    if (abQuizzes.length > 0) {
      abQuizzes.forEach((quiz, index) => {
        console.log(`${index + 1}. [${quiz.is_active ? '✅' : '❌'}] ${quiz.title}`);
        console.log(`   카테고리: ${quiz.category}`);
        console.log(`   A: ${quiz.option_a_title} | B: ${quiz.option_b_title}`);
        console.log(`   ID: ${quiz.id}`);
        console.log(`   생성일: ${quiz.created_at}\n`);
      });
    }

    // 2. 다른 퀴즈 테이블이 있는지 확인
    const tables = await db.query(
      `SELECT table_name
       FROM information_schema.tables
       WHERE table_schema = 'public'
       AND table_name LIKE '%quiz%'
       ORDER BY table_name`
    );

    console.log('\n📋 퀴즈 관련 테이블 목록:');
    tables.forEach(table => {
      console.log(`   - ${table.table_name}`);
    });

    // 3. 각 퀴즈 테이블의 레코드 수 확인
    console.log('\n📊 각 테이블의 데이터 수:');
    for (const table of tables) {
      const count = await db.query(`SELECT COUNT(*) as count FROM ${table.table_name}`);
      console.log(`   ${table.table_name}: ${count[0].count}개`);
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ 오류 발생:', error);
    process.exit(1);
  }
}

checkAdminQuizzes();
