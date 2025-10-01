import { beforeAll, afterAll } from 'vitest';
import dotenv from 'dotenv';
import { Database } from '../utils/database';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Override config for testing
process.env.NODE_ENV = 'test';
process.env.DEV_MODE_SEED_ENABLED = 'true';
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/wedding_app_test';

let db: Database;

beforeAll(async () => {
  console.log('Setting up test environment...');

  // Initialize database connection
  db = Database.getInstance();

  // Ensure test database exists and is accessible
  try {
    await db.query('SELECT 1');
    console.log('✅ Test database connected');
  } catch (error) {
    console.error('❌ Test database connection failed:', error);
    throw error;
  }
});

afterAll(async () => {
  console.log('Cleaning up test environment...');

  if (db) {
    try {
      await db.close();
      console.log('✅ Test database connection closed');
    } catch (error) {
      console.error('❌ Error closing test database:', error);
    }
  }
});