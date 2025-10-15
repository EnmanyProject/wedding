/**
 * 테스트 데이터 생성 스크립트
 * 사용자가 실제로 플레이할 수 있도록 충분한 데이터 생성
 */

import { pool } from '../src/utils/database';

async function setupTestData() {
  console.log('🎮 테스트 데이터 생성 시작...\n');

  try {
    // 1. 현재 데이터 확인
    console.log('📊 현재 데이터 확인:');

    const quizCount = await pool.query('SELECT COUNT(*) FROM ab_quizzes WHERE is_active = true');
    const userCount = await pool.query('SELECT COUNT(*) FROM users WHERE is_active = true');
    const responseCount = await pool.query('SELECT COUNT(*) FROM quiz_responses');

    console.log(`- 활성 퀴즈: ${quizCount.rows[0].count}개`);
    console.log(`- 활성 사용자: ${userCount.rows[0].count}명`);
    console.log(`- 퀴즈 응답: ${responseCount.rows[0].count}개\n`);

    // 2. A&B 퀴즈가 충분한지 확인
    const quizTotal = parseInt(quizCount.rows[0].count);
    if (quizTotal < 20) {
      console.log('⚠️ 퀴즈가 부족합니다. 최소 20개 필요');
      console.log('→ 관리자 페이지에서 퀴즈를 추가해주세요\n');
    }

    // 3. 더미 여성 사용자 생성 (이미 존재하면 스킵)
    console.log('👥 더미 사용자 생성 중...');

    const femaleNames = [
      '지은', '수지', '민지', '하영', '서연',
      '예은', '채원', '유나', '소연', '지우'
    ];

    const createdUsers: string[] = [];

    for (const name of femaleNames) {
      // 이미 존재하는지 확인
      const existing = await pool.query(
        'SELECT id FROM users WHERE name = $1',
        [name]
      );

      let userId: string;

      if (existing.rows.length > 0) {
        userId = existing.rows[0].id;
        console.log(`✓ ${name} (기존 사용자)`);
      } else {
        const result = await pool.query(
          `INSERT INTO users (name, display_name, email, gender, age, location, is_active)
           VALUES ($1, $2, $3, 'female', $4, $5, true)
           RETURNING id`,
          [
            name,
            `${name}님`,
            `${name}@test.com`,
            20 + Math.floor(Math.random() * 10), // 20-29세
            ['서울', '경기', '부산', '대구'][Math.floor(Math.random() * 4)]
          ]
        );
        userId = result.rows[0].id;
        console.log(`✓ ${name} (신규 생성)`);
      }

      createdUsers.push(userId);
    }

    console.log(`\n✅ 총 ${createdUsers.length}명의 여성 사용자 준비 완료\n`);

    // 4. 각 사용자가 A&B 퀴즈에 응답하도록 설정
    console.log('🎯 퀴즈 응답 생성 중...');

    // 모든 활성 퀴즈 가져오기
    const quizzes = await pool.query(
      'SELECT id FROM ab_quizzes WHERE is_active = true ORDER BY created_at'
    );

    if (quizzes.rows.length === 0) {
      console.log('❌ 퀴즈가 없습니다. 먼저 관리자 페이지에서 퀴즈를 추가해주세요.');
      return;
    }

    let totalResponses = 0;

    for (const userId of createdUsers) {
      // 각 사용자가 80-100% 퀴즈에 랜덤으로 답하기
      const responseRate = 0.8 + Math.random() * 0.2; // 80-100%
      const numToAnswer = Math.floor(quizzes.rows.length * responseRate);

      // 랜덤하게 퀴즈 선택
      const shuffled = [...quizzes.rows].sort(() => Math.random() - 0.5);
      const selectedQuizzes = shuffled.slice(0, numToAnswer);

      let userResponses = 0;

      for (const quiz of selectedQuizzes) {
        // 이미 응답했는지 확인
        const existing = await pool.query(
          'SELECT id FROM quiz_responses WHERE user_id = $1 AND quiz_id = $2',
          [userId, quiz.id]
        );

        if (existing.rows.length === 0) {
          // 랜덤하게 A 또는 B 선택
          const choice = Math.random() > 0.5 ? 'A' : 'B';

          await pool.query(
            'INSERT INTO quiz_responses (user_id, quiz_id, selected_option) VALUES ($1, $2, $3)',
            [userId, quiz.id, choice]
          );

          userResponses++;
        }
      }

      if (userResponses > 0) {
        console.log(`✓ 사용자 ${userId.substring(0, 8)}: ${userResponses}개 응답 생성`);
        totalResponses += userResponses;
      }
    }

    console.log(`\n✅ 총 ${totalResponses}개의 퀴즈 응답 생성 완료\n`);

    // 5. 최종 결과 확인
    console.log('📊 최종 데이터 현황:');

    const finalUsers = await pool.query(
      `SELECT u.name, u.gender, COUNT(qr.id) as quiz_responses
       FROM users u
       LEFT JOIN quiz_responses qr ON u.id = qr.user_id
       WHERE u.is_active = true
       GROUP BY u.id, u.name, u.gender
       ORDER BY quiz_responses DESC
       LIMIT 15`
    );

    console.log('\n사용자별 퀴즈 응답 수:');
    finalUsers.rows.forEach(row => {
      console.log(`  ${row.name} (${row.gender}): ${row.quiz_responses}개`);
    });

    console.log('\n🎉 테스트 데이터 생성 완료!');
    console.log('\n📱 이제 앱에 로그인해서 플레이할 수 있습니다:');
    console.log('1. http://localhost:3000 접속');
    console.log('2. 남성 사용자로 회원가입');
    console.log('3. A&B 취향 퀴즈에 답하기 (Ring 획득)');
    console.log('4. 메인 앱에서 파트너 카드 확인');
    console.log('5. 파트너 카드 클릭 → 퀴즈 시작!\n');

  } catch (error) {
    console.error('❌ 오류 발생:', error);
  } finally {
    await pool.end();
  }
}

// 실행
setupTestData();
