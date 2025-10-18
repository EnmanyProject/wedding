import { pool } from '../src/utils/database';

async function checkTransactions() {
  console.log('🔍 최근 Ring 거래 내역 확인...\n');

  try {
    const result = await pool.query(`
      SELECT
        id,
        user_id,
        delta,
        reason,
        ref_id,
        created_at
      FROM user_ring_ledger
      WHERE user_id = '0049dc08-1b9a-4d2f-88ee-b47024ea4f78'
      ORDER BY created_at DESC
      LIMIT 10
    `);

    console.log(`📊 최근 10개 거래 내역 (User: 0049dc08-1b9a-4d2f-88ee-b47024ea4f78):\n`);

    if (result.rows.length === 0) {
      console.log('   거래 내역이 없습니다.');
    } else {
      result.rows.forEach((row, index) => {
        console.log(`${index + 1}. ${row.reason}: ${row.delta > 0 ? '+' : ''}${row.delta} Ring`);
        console.log(`   시간: ${row.created_at}`);
        console.log(`   ID: ${row.id}`);
        console.log('');
      });
    }

    // Check balance
    const balanceResult = await pool.query(`
      SELECT balance, total_earned, total_spent
      FROM user_ring_balances
      WHERE user_id = '0049dc08-1b9a-4d2f-88ee-b47024ea4f78'
    `);

    if (balanceResult.rows.length > 0) {
      const balance = balanceResult.rows[0];
      console.log('💰 현재 잔액:');
      console.log(`   Balance: ${balance.balance}`);
      console.log(`   Total Earned: ${balance.total_earned}`);
      console.log(`   Total Spent: ${balance.total_spent}`);
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ 거래 내역 조회 실패:', error);
    process.exit(1);
  }
}

checkTransactions();
