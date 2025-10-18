import { db } from '../src/utils/database';

async function checkAllSchemas() {
  try {
    console.log('🔍 문제 테이블 스키마 확인\n');
    console.log('='.repeat(80));

    // 1. ab_quiz_responses
    console.log('\n📋 ab_quiz_responses:');
    const abQuizCols = await db.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'ab_quiz_responses'
      ORDER BY ordinal_position
    `);
    abQuizCols.forEach(c => {
      console.log(`  - ${c.column_name}: ${c.data_type} (nullable: ${c.is_nullable})`);
    });

    // 2. daily_recommendations
    console.log('\n📋 daily_recommendations:');
    const dailyCols = await db.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'daily_recommendations'
      ORDER BY ordinal_position
    `);

    if (dailyCols.length === 0) {
      console.log('  ⚠️  테이블이 존재하지 않습니다!');
    } else {
      dailyCols.forEach(c => {
        console.log(`  - ${c.column_name}: ${c.data_type} (nullable: ${c.is_nullable})`);
      });
    }

    // 3. pawnshop_transactions (metadata 사용 확인)
    console.log('\n📋 pawnshop_transactions:');
    const pawnCols = await db.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'pawnshop_transactions'
      ORDER BY ordinal_position
    `);

    if (pawnCols.length === 0) {
      console.log('  ⚠️  테이블이 존재하지 않습니다!');
    } else {
      pawnCols.forEach(c => {
        console.log(`  - ${c.column_name}: ${c.data_type} (nullable: ${c.is_nullable})`);
      });
    }

    console.log('\n' + '='.repeat(80));
    process.exit(0);
  } catch (error) {
    console.error('❌ 에러:', error);
    process.exit(1);
  }
}

checkAllSchemas();
