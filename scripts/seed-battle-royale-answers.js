/**
 * Battle Royale Seed Script
 * 100명의 유저에게 각 선호 질문에 대한 임의 답변 할당
 */

const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'wedding_app',
  user: 'postgres',
  password: 'postgres',
});

async function seedBattleRoyaleAnswers() {
  const client = await pool.connect();

  try {
    console.log('🔄 [Seed] Battle Royale 답변 할당 시작...\n');

    // 1. 모든 선호 질문 가져오기
    const prefsResult = await client.query(
      'SELECT id, round_number, question FROM battle_royale_preferences ORDER BY round_number'
    );

    const preferences = prefsResult.rows;
    console.log(`✅ [Preferences] ${preferences.length}개 질문 로드됨:`);
    preferences.forEach(pref => {
      console.log(`   Round ${pref.round_number}: ${pref.question}`);
    });

    // 2. 활성 유저 100명 가져오기 (gender 무관, 랜덤 샘플링)
    const usersResult = await client.query(`
      SELECT id, display_name
      FROM users
      WHERE is_active = true
      ORDER BY RANDOM()
      LIMIT 100
    `);

    const users = usersResult.rows;
    console.log(`\n✅ [Users] ${users.length}명 유저 로드됨`);

    if (users.length < 100) {
      console.warn(`⚠️ [Warning] 활성 유저가 ${users.length}명만 있습니다. 최소 100명 필요!`);
    }

    // 3. 기존 답변 삭제 (재실행 시)
    await client.query('DELETE FROM user_preference_answers');
    console.log(`\n🗑️ [Cleanup] 기존 답변 삭제됨`);

    // 4. 각 유저마다 각 질문에 대해 임의 답변 생성
    let insertedCount = 0;
    const answerOptions = ['LEFT', 'RIGHT'];

    for (const user of users) {
      for (const pref of preferences) {
        // 랜덤 답변 (LEFT or RIGHT)
        const randomAnswer = answerOptions[Math.floor(Math.random() * answerOptions.length)];

        await client.query(
          `INSERT INTO user_preference_answers (user_id, preference_id, answer)
           VALUES ($1, $2, $3)`,
          [user.id, pref.id, randomAnswer]
        );

        insertedCount++;
      }
    }

    console.log(`\n✅ [Seed] ${insertedCount}개 답변 생성됨 (${users.length}명 x ${preferences.length}개 질문)`);

    // 5. 검증: 답변 분포 확인
    console.log(`\n📊 [Distribution] 답변 분포:`);
    for (const pref of preferences) {
      const distResult = await client.query(
        `SELECT answer, COUNT(*) as count
         FROM user_preference_answers
         WHERE preference_id = $1
         GROUP BY answer`,
        [pref.id]
      );

      console.log(`\n   Round ${pref.round_number}: ${pref.question}`);
      distResult.rows.forEach(row => {
        console.log(`      ${row.answer}: ${row.count}명 (${(row.count / users.length * 100).toFixed(1)}%)`);
      });
    }

    console.log(`\n✅ [Complete] Seed 완료!`);

  } catch (error) {
    console.error('❌ [Seed] 실패:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

seedBattleRoyaleAnswers().catch(console.error);
