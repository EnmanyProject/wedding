import { db } from '../src/utils/database';

/**
 * 퀴즈 답변 및 Ring 잔액 확인
 */
async function checkQuizAndRings() {
  const userId = '0049dc08-1b9a-4d2f-88ee-b47024ea4f78';

  try {
    // 1. 오늘 답변한 퀴즈 수
    const quizResult = await db.query(
      `SELECT COUNT(*) as count,
              MIN(created_at) as first_answer,
              MAX(created_at) as last_answer
       FROM ab_quiz_responses
       WHERE user_id = $1
       AND DATE(created_at) = CURRENT_DATE`,
      [userId]
    );

    console.log('\n📊 오늘 퀴즈 답변 현황:');
    console.log(`   답변 수: ${quizResult[0].count}개`);
    console.log(`   첫 답변: ${quizResult[0].first_answer}`);
    console.log(`   마지막 답변: ${quizResult[0].last_answer}`);

    // 2. 현재 Ring 잔액
    const ringResult = await db.query(
      `SELECT balance FROM user_ring_balance WHERE user_id = $1`,
      [userId]
    );

    console.log('\n💍 Ring 잔액:');
    console.log(`   현재 잔액: ${ringResult[0]?.balance || 0} Rings`);

    // 3. 최근 Ring 거래 내역 (퀴즈 관련만)
    const transactionResult = await db.query(
      `SELECT amount, transaction_type, description, created_at
       FROM ring_transactions
       WHERE user_id = $1
       AND transaction_type = 'PAWN_AB_QUIZ'
       ORDER BY created_at DESC
       LIMIT 10`,
      [userId]
    );

    console.log('\n📝 최근 Ring 거래 내역 (Pawnshop 퀴즈):');
    if (transactionResult.length === 0) {
      console.log('   거래 내역 없음');
    } else {
      transactionResult.forEach((tx, index) => {
        console.log(`   ${index + 1}. +${tx.amount} Rings - ${tx.description} (${tx.created_at})`);
      });
    }

    // 4. 전체 Ring 통계
    const statsResult = await db.query(
      `SELECT
         COUNT(*) as total_transactions,
         SUM(amount) as total_earned
       FROM ring_transactions
       WHERE user_id = $1
       AND transaction_type = 'PAWN_AB_QUIZ'`,
      [userId]
    );

    console.log('\n📈 Pawnshop 퀴즈 누적 통계:');
    console.log(`   총 거래 수: ${statsResult[0].total_transactions}회`);
    console.log(`   총 획득: ${statsResult[0].total_earned || 0} Rings\n`);

    process.exit(0);
  } catch (error) {
    console.error('❌ 조회 실패:', error);
    process.exit(1);
  }
}

checkQuizAndRings();
