import { db } from '../src/utils/database';

/**
 * 오늘 제출한 A&B 퀴즈 답변 삭제 (테스트용)
 */
async function resetTodayQuiz() {
  const userId = '0049dc08-1b9a-4d2f-88ee-b47024ea4f78';

  try {
    const result = await db.query(
      `DELETE FROM ab_quiz_responses
       WHERE user_id = $1
       AND DATE(created_at) = CURRENT_DATE
       RETURNING id`,
      [userId]
    );

    console.log(`✅ 삭제 완료: ${result.length}개의 답변이 삭제되었습니다.`);
    process.exit(0);
  } catch (error) {
    console.error('❌ 삭제 실패:', error);
    process.exit(1);
  }
}

resetTodayQuiz();
