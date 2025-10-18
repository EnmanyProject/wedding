import { pool } from '../src/utils/database';

async function checkBalance() {
  try {
    const result = await pool.query(
      'SELECT balance FROM user_ring_balances WHERE user_id = $1',
      ['0049dc08-1b9a-4d2f-88ee-b47024ea4f78']
    );

    console.log('💰 현재 실제 잔액:', result.rows[0]?.balance || 'Not found');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkBalance();
