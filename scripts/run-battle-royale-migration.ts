#!/usr/bin/env tsx

import { readFileSync } from 'fs';
import { join } from 'path';
import { Database } from '../src/utils/database';

async function runMigration() {
  console.log('🔧 [Migration] Starting Battle Royale schema fix...');

  const db = Database.getInstance();

  try {
    // Read migration SQL file
    const sqlPath = join(__dirname, '..', 'sql', 'migrations', '007_battle_royale_fix.sql');
    const sql = readFileSync(sqlPath, 'utf-8');

    console.log('📄 [Migration] Executing SQL...');
    console.log('SQL Preview:', sql.substring(0, 200) + '...');

    // Execute migration
    await db.query(sql);

    console.log('✅ [Migration] Battle Royale schema fix completed successfully!');
  } catch (error: any) {
    console.error('❌ [Migration] Failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  } finally {
    await db.close();
  }
}

runMigration();
