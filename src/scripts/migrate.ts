#!/usr/bin/env tsx

import { runMigrations } from '../utils/database';
import { config } from '../utils/config';

async function main() {
  console.log('🔄 Running database migrations...');
  console.log(`📍 Database: ${config.DATABASE_URL.split('@')[1]}`);

  try {
    await runMigrations();
    console.log('✅ Migrations completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

main();