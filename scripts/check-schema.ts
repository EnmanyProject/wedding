import { db } from '../src/utils/database';

async function checkSchema() {
  try {
    console.log('🔍 ab_quiz_responses 스키마 확인\n');

    const cols = await db.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'ab_quiz_responses'
      ORDER BY ordinal_position
    `);

    console.log('현재 컬럼:');
    cols.forEach(c => {
      console.log(`  - ${c.column_name}: ${c.data_type} (nullable: ${c.is_nullable})`);
    });

    process.exit(0);
  } catch (error) {
    console.error('에러:', error);
    process.exit(1);
  }
}

checkSchema();
