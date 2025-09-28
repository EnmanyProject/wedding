import dotenv from 'dotenv';

dotenv.config();

export const config = {
  // Database
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/wedding_app',

  // Storage (MinIO/S3)
  STORAGE_ENDPOINT: process.env.STORAGE_ENDPOINT || 'http://localhost:9000',
  STORAGE_ACCESS_KEY: process.env.STORAGE_ACCESS_KEY || 'minioadmin',
  STORAGE_SECRET_KEY: process.env.STORAGE_SECRET_KEY || 'minioadmin123',
  STORAGE_BUCKET: process.env.STORAGE_BUCKET || 'wedding-photos',
  STORAGE_REGION: process.env.STORAGE_REGION || 'us-east-1',
  STORAGE_FORCE_PATH_STYLE: process.env.STORAGE_FORCE_PATH_STYLE === 'true',

  // Redis
  REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',

  // JWT
  JWT_SECRET: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',

  // Server
  PORT: parseInt(process.env.PORT || '3000'),
  NODE_ENV: process.env.NODE_ENV || 'development',

  // Development/Seeding
  DEV_MODE_SEED_ENABLED: process.env.DEV_MODE_SEED_ENABLED === 'true',

  // Quiz Configuration
  QUIZ_ENTER_COST: parseInt(process.env.QUIZ_ENTER_COST || '1'),
  QUIZ_WRONG_PENALTY: parseInt(process.env.QUIZ_WRONG_PENALTY || '1'),
  TRAIT_ADD_REWARD: parseInt(process.env.TRAIT_ADD_REWARD || '1'),

  // Affinity Thresholds
  AFFINITY_ALPHA: parseInt(process.env.AFFINITY_ALPHA || '3'),
  AFFINITY_BETA: parseInt(process.env.AFFINITY_BETA || '1'),
  AFFINITY_T1_THRESHOLD: parseInt(process.env.AFFINITY_T1_THRESHOLD || '20'),
  AFFINITY_T2_THRESHOLD: parseInt(process.env.AFFINITY_T2_THRESHOLD || '40'),
  AFFINITY_T3_THRESHOLD: parseInt(process.env.AFFINITY_T3_THRESHOLD || '60'),

  // Photo Configuration
  PHOTO_THUMB_SIZE: parseInt(process.env.PHOTO_THUMB_SIZE || '256'),
  PHOTO_BLUR1_SIGMA: parseInt(process.env.PHOTO_BLUR1_SIGMA || '4'),
  PHOTO_BLUR2_SIGMA: parseInt(process.env.PHOTO_BLUR2_SIGMA || '8'),
  PRESIGN_URL_EXPIRES: parseInt(process.env.PRESIGN_URL_EXPIRES || '300'),

  // Ranking
  RANKING_TOP_COUNT: parseInt(process.env.RANKING_TOP_COUNT || '5'),
  RANKING_CACHE_TTL: parseInt(process.env.RANKING_CACHE_TTL || '3600'),
};

export const isProduction = config.NODE_ENV === 'production';
export const isDevelopment = config.NODE_ENV === 'development';
export const isTest = config.NODE_ENV === 'test';

// Validation
function validateConfig() {
  const required = [
    'DATABASE_URL',
    'JWT_SECRET',
    'STORAGE_ACCESS_KEY',
    'STORAGE_SECRET_KEY'
  ];

  for (const key of required) {
    if (!process.env[key] && !config[key as keyof typeof config]) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
  }

  if (isProduction && config.JWT_SECRET === 'your-super-secret-jwt-key-change-in-production') {
    throw new Error('JWT_SECRET must be changed in production');
  }
}

validateConfig();