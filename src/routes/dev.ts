import { Router, Response } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest, authenticateToken, requireAdmin } from '../middleware/auth';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { seedService } from '../services/seedService';
import { config } from '../utils/config';
import {
  SeedRequest,
  SeedResponse,
  SeedSummaryResponse,
  ApiResponse
} from '../types/api';

const router = Router();

// Validation schemas
const seedSchema = z.object({
  user_count: z.number().min(1).max(100).optional().default(30),
  trait_pairs: z.number().min(10).max(100).optional().default(50),
  photos_per_user: z.number().min(1).max(10).optional().default(4),
  quiz_sessions: z.number().min(10).max(200).optional().default(50),
  reset_first: z.boolean().optional().default(false)
});

// Middleware to check if dev mode is enabled
const checkDevMode = (req: AuthenticatedRequest, res: Response, next: any) => {
  if (config.NODE_ENV === 'production') {
    throw createError('Development endpoints not available in production', 403, 'PRODUCTION_FORBIDDEN');
  }

  if (!config.DEV_MODE_SEED_ENABLED) {
    throw createError('Development mode seeding is not enabled', 403, 'DEV_MODE_DISABLED');
  }

  next();
};

/**
 * POST /dev/seed
 * Run development data seeding
 */
router.post('/seed', checkDevMode, requireAdmin, asyncHandler(async (
  req: AuthenticatedRequest,
  res: Response
) => {
  const body = seedSchema.parse(req.body) as SeedRequest;

  console.log('Starting development data seeding...', body);

  const result = await seedService.runSeed({
    userCount: body.user_count,
    traitPairs: body.trait_pairs,
    photosPerUser: body.photos_per_user,
    quizSessions: body.quiz_sessions,
    resetFirst: body.reset_first
  });

  console.log('Seeding completed:', result.stats);

  const response: ApiResponse<SeedResponse> = {
    success: true,
    data: {
      success: true,
      stats: result.stats,
      seed_run_id: result.seedRunId
    },
    timestamp: new Date().toISOString()
  };

  res.json(response);
}));

/**
 * DELETE /dev/reset
 * Reset all development data
 */
router.delete('/reset', checkDevMode, requireAdmin, asyncHandler(async (
  req: AuthenticatedRequest,
  res: Response
) => {
  console.log('Resetting development data...');

  await seedService.resetData();

  console.log('Development data reset completed');

  const response: ApiResponse = {
    success: true,
    timestamp: new Date().toISOString()
  };

  res.json(response);
}));

/**
 * GET /dev/seed/summary
 * Get seeding summary and current data counts
 */
router.get('/seed/summary', checkDevMode, asyncHandler(async (
  req: AuthenticatedRequest,
  res: Response
) => {
  // Mock 모드에서는 Mock 데이터 반환
  const useMock = process.env.USE_MOCK_RING_SERVICE === 'true';

  let summary;
  if (useMock) {
    summary = {
      users: 10,
      traits: 40,
      quizzes: 30,
      rings: 1500,
      recommendations: 50,
      mode: 'mock'
    };
  } else {
    summary = await seedService.getSeedSummary();
  }

  const response: ApiResponse<SeedSummaryResponse> = {
    success: true,
    data: summary,
    timestamp: new Date().toISOString()
  };

  res.json(response);
}));

/**
 * GET /dev/config
 * Get development configuration
 */
router.get('/config', checkDevMode, asyncHandler(async (
  req: AuthenticatedRequest,
  res: Response
) => {
  const devConfig = {
    node_env: config.NODE_ENV,
    dev_mode_seed_enabled: config.DEV_MODE_SEED_ENABLED,
    affinity_thresholds: {
      t1: config.AFFINITY_T1_THRESHOLD,
      t2: config.AFFINITY_T2_THRESHOLD,
      t3: config.AFFINITY_T3_THRESHOLD
    },
    quiz_config: {
      enter_cost: config.QUIZ_ENTER_COST,
      wrong_penalty: config.QUIZ_WRONG_PENALTY,
      trait_add_reward: config.TRAIT_ADD_REWARD
    },
    photo_config: {
      thumb_size: config.PHOTO_THUMB_SIZE,
      blur1_sigma: config.PHOTO_BLUR1_SIGMA,
      blur2_sigma: config.PHOTO_BLUR2_SIGMA,
      presign_expires: config.PRESIGN_URL_EXPIRES
    }
  };

  const response: ApiResponse = {
    success: true,
    data: devConfig,
    timestamp: new Date().toISOString()
  };

  res.json(response);
}));

/**
 * POST /dev/config/flag
 * Set development flag
 */
router.post('/config/flag', checkDevMode, requireAdmin, asyncHandler(async (
  req: AuthenticatedRequest,
  res: Response
) => {
  const { key, value } = req.body;

  if (!key || typeof key !== 'string') {
    throw createError('Flag key is required', 400, 'INVALID_FLAG_KEY');
  }

  // Set dev flag in database
  await seedService.db.query(
    `INSERT INTO dev_flags (key, value, updated_at)
     VALUES ($1, $2, NOW())
     ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()`,
    [key, value || null]
  );

  const response: ApiResponse = {
    success: true,
    data: { key, value },
    timestamp: new Date().toISOString()
  };

  res.json(response);
}));

/**
 * GET /dev/health
 * Development health check
 */
router.get('/health', checkDevMode, asyncHandler(async (
  req: AuthenticatedRequest,
  res: Response
) => {
  // Check database connection
  let dbStatus = 'ok';
  try {
    await seedService.db.query('SELECT 1');
  } catch (error) {
    dbStatus = 'error';
  }

  // Check basic data integrity
  const counts = await Promise.all([
    seedService.db.queryOne('SELECT COUNT(*) as count FROM users'),
    seedService.db.queryOne('SELECT COUNT(*) as count FROM trait_pairs'),
    seedService.db.queryOne('SELECT COUNT(*) as count FROM user_photos'),
  ]);

  const health = {
    status: dbStatus === 'ok' ? 'healthy' : 'unhealthy',
    database: dbStatus,
    data_counts: {
      users: counts[0]?.count || 0,
      trait_pairs: counts[1]?.count || 0,
      photos: counts[2]?.count || 0
    },
    config: {
      node_env: config.NODE_ENV,
      dev_mode_enabled: config.DEV_MODE_SEED_ENABLED
    },
    timestamp: new Date().toISOString()
  };

  const response: ApiResponse = {
    success: true,
    data: health,
    timestamp: new Date().toISOString()
  };

  res.json(response);
}));

/**
 * GET /dev/users
 * Get list of users for development/testing
 */
router.get('/users', checkDevMode, asyncHandler(async (
  req: AuthenticatedRequest,
  res: Response
) => {
  const users = await seedService.db.query(
    `SELECT id, name, email, created_at, is_active
     FROM users
     WHERE is_active = true
     ORDER BY created_at
     LIMIT 50`
  );

  const response: ApiResponse = {
    success: true,
    data: {
      users: users,
      count: users.length
    },
    timestamp: new Date().toISOString()
  };

  res.json(response);
}));

export default router;