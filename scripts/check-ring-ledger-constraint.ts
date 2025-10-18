import { pool } from '../src/utils/database';

async function checkConstraint() {
  console.log('🔍 user_ring_ledger 테이블 제약조건 확인...\n');

  try {
    // Get check constraints
    const constraintResult = await pool.query(`
      SELECT
        conname AS constraint_name,
        pg_get_constraintdef(oid) AS constraint_definition
      FROM pg_constraint
      WHERE conrelid = 'user_ring_ledger'::regclass
        AND contype = 'c'
        AND conname = 'user_point_ledger_reason_check'
    `);

    if (constraintResult.rows.length === 0) {
      console.log('❌ user_point_ledger_reason_check 제약조건을 찾을 수 없습니다!');
      process.exit(1);
    }

    console.log('🔒 현재 CHECK 제약조건:');
    console.log(constraintResult.rows[0].constraint_definition);
    console.log('');

    // Test if QUIZ_ATTEMPT is allowed
    const def = constraintResult.rows[0].constraint_definition;
    const hasQuizAttempt = def.includes('QUIZ_ATTEMPT');

    console.log('✅ QUIZ_ATTEMPT 허용 여부:', hasQuizAttempt ? 'YES' : 'NO');

    if (!hasQuizAttempt) {
      console.log('');
      console.log('⚠️  QUIZ_ATTEMPT이 제약조건에 없습니다!');
      console.log('⚠️  마이그레이션을 다시 실행해주세요:');
      console.log('   npx tsx scripts/run-quiz-attempt-migration.ts');
    }

    process.exit(hasQuizAttempt ? 0 : 1);
  } catch (error) {
    console.error('❌ 제약조건 확인 실패:', error);
    process.exit(1);
  }
}

checkConstraint();
