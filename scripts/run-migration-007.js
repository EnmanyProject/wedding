/**
 * Battle Royale Migration Script
 * 007_battle_royale_system.sql 실행
 */

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'wedding_app',
  user: 'postgres',
  password: 'postgres',
});

async function runMigration() {
  const client = await pool.connect();

  try {
    console.log('🔄 [Migration] 007_battle_royale_system.sql 실행 중...');

    const sqlPath = path.join(__dirname, '../sql/migrations/007_battle_royale_system.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    await client.query(sql);

    console.log('✅ [Migration] 완료!');

    // 생성된 테이블 확인
    const result = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name LIKE 'battle_royale%'
      ORDER BY table_name
    `);

    console.log('\n📋 [Tables] 생성된 테이블:');
    result.rows.forEach(row => {
      console.log(`   - ${row.table_name}`);
    });

    // 시드 데이터 확인
    const prefCount = await client.query('SELECT COUNT(*) FROM battle_royale_preferences');
    console.log(`\n✅ [Seed] 선호 질문 ${prefCount.rows[0].count}개 생성됨`);

  } catch (error) {
    console.error('❌ [Migration] 실패:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration().catch(console.error);
