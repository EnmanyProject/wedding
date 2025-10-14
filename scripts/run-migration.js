import pkg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const { Pool } = pkg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/wedding_app'
});

async function runMigration(filename) {
  const migrationPath = path.join(__dirname, '..', 'migrations', filename);

  if (!fs.existsSync(migrationPath)) {
    console.error(`❌ 마이그레이션 파일을 찾을 수 없습니다: ${filename}`);
    process.exit(1);
  }

  const sql = fs.readFileSync(migrationPath, 'utf8');

  console.log(`🔄 마이그레이션 실행 중: ${filename}`);

  try {
    await pool.query(sql);
    console.log(`✅ 마이그레이션 완료: ${filename}`);
  } catch (error) {
    console.error(`❌ 마이그레이션 실패: ${filename}`);
    console.error(error.message);
    throw error;
  }
}

async function main() {
  const migrationFile = process.argv[2];

  if (!migrationFile) {
    console.error('사용법: node scripts/run-migration.js <migration-file>');
    console.error('예시: node scripts/run-migration.js 013_unify_quiz_structure.sql');
    process.exit(1);
  }

  try {
    await runMigration(migrationFile);
    await pool.end();
    process.exit(0);
  } catch (error) {
    await pool.end();
    process.exit(1);
  }
}

main();
