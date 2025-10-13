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
  reset_first: z.boolean().optional().default(false),
  gender: z.enum(['male', 'female']).optional()
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
    resetFirst: body.reset_first,
    gender: body.gender
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
    `SELECT id, name, email, profile_image_url, created_at, is_active
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

/**
 * POST /dev/update-profile-images
 * Update profile images for users to use local images
 */
router.post('/update-profile-images', checkDevMode, requireAdmin, asyncHandler(async (
  req: AuthenticatedRequest,
  res: Response
) => {
  console.log('📸 Updating profile images to local files...');

  // 로컬 프로필 이미지 경로 매핑 (데이터베이스 첫 10명 사용자)
  const profileImages = [
    { name: '김소영', image: '/images/profiles/user1.jpg' },
    { name: '이수진', image: '/images/profiles/user2.png' },
    { name: '박지현', image: '/images/profiles/user3.jpg' },
    { name: '최은영', image: '/images/profiles/user4.png' },
    { name: '정다영', image: '/images/profiles/user5.jpg' },
    { name: '김나연', image: '/images/profiles/user6.png' },
    { name: '윤서연', image: '/images/profiles/user7.jpg' },
    { name: '장태연', image: '/images/profiles/user8.jpg' },
    { name: '임소영', image: '/images/profiles/user9.jpg' },
    { name: '한지민', image: '/images/profiles/user10.jpg' },
  ];

  let updateCount = 0;

  // 각 사용자의 프로필 이미지 업데이트
  for (const user of profileImages) {
    try {
      console.log(`🔍 Searching for user: ${user.name}`);
      const result = await seedService.db.query(
        `UPDATE users
         SET profile_image_url = $1, updated_at = NOW()
         WHERE name = $2
         RETURNING id, name, profile_image_url`,
        [user.image, user.name]
      );

      console.log(`📊 Query result length: ${result.length}`);
      if (result.length > 0) {
        updateCount++;
        console.log(`✅ Updated ${user.name}: ${user.image}`);
        console.log(`   User ID: ${result[0].id}`);
      } else {
        console.log(`⚠️ User not found: ${user.name}`);
      }
    } catch (error) {
      console.error(`❌ Error updating ${user.name}:`, error);
    }
  }

  console.log(`📸 Profile images updated: ${updateCount}/${profileImages.length}`);

  const response: ApiResponse = {
    success: true,
    data: {
      updated: updateCount,
      total: profileImages.length,
      message: `Successfully updated ${updateCount} profile images`
    },
    timestamp: new Date().toISOString()
  };

  res.json(response);
}));

/**
 * POST /dev/run-migration
 * Run a specific migration file
 */
router.post('/run-migration', checkDevMode, requireAdmin, asyncHandler(async (
  req: AuthenticatedRequest,
  res: Response
) => {
  const { filename } = req.body;

  if (!filename || typeof filename !== 'string') {
    throw createError('Migration filename is required', 400, 'INVALID_FILENAME');
  }

  console.log(`🔄 Running migration: ${filename}`);

  try {
    // Read migration file
    const fs = await import('fs/promises');
    const path = await import('path');
    const migrationPath = path.join(process.cwd(), 'migrations', filename);

    const sql = await fs.readFile(migrationPath, 'utf-8');

    // Execute migration
    await seedService.db.query(sql);

    console.log(`✅ Migration completed: ${filename}`);

    const response: ApiResponse = {
      success: true,
      data: {
        filename,
        message: `Successfully executed migration: ${filename}`
      },
      timestamp: new Date().toISOString()
    };

    res.json(response);
  } catch (error) {
    console.error(`❌ Migration failed: ${filename}`, error);
    throw createError(`Migration failed: ${error.message}`, 500, 'MIGRATION_ERROR');
  }
}));

/**
 * POST /dev/update-all-profile-images
 * Update profile images for ALL users using rotation of 10 local images
 */
router.post('/update-all-profile-images', checkDevMode, requireAdmin, asyncHandler(async (
  req: AuthenticatedRequest,
  res: Response
) => {
  console.log('📸 Updating ALL user profile images with local files...');

  // 로컬 프로필 이미지 목록 (10개)
  const images = [
    '/images/profiles/user1.jpg',
    '/images/profiles/user2.png',
    '/images/profiles/user3.jpg',
    '/images/profiles/user4.png',
    '/images/profiles/user5.jpg',
    '/images/profiles/user6.png',
    '/images/profiles/user7.jpg',
    '/images/profiles/user8.jpg',
    '/images/profiles/user9.jpg',
    '/images/profiles/user10.jpg',
  ];

  try {
    // 모든 활성 사용자 조회
    const users = await seedService.db.query(
      `SELECT id, name, email
       FROM users
       WHERE is_active = true
       ORDER BY created_at`
    );

    console.log(`👥 Found ${users.length} active users`);

    let updateCount = 0;
    const updates = [];

    // 각 사용자에게 순환 방식으로 이미지 할당
    for (let i = 0; i < users.length; i++) {
      const user = users[i];
      const image = images[i % images.length]; // 순환

      try {
        const result = await seedService.db.query(
          `UPDATE users
           SET profile_image_url = $1, updated_at = NOW()
           WHERE id = $2
           RETURNING id, name, profile_image_url`,
          [image, user.id]
        );

        if (result.length > 0) {
          updateCount++;
          const imageName = image.split('/').pop();
          updates.push({
            index: i + 1,
            name: user.name,
            email: user.email,
            image: imageName
          });

          // 10명마다 진행 상황 로그
          if (updateCount % 10 === 0) {
            console.log(`✅ Updated ${updateCount}/${users.length} users...`);
          }
        }
      } catch (error) {
        console.error(`❌ Error updating user ${user.id}:`, error);
      }
    }

    console.log(`📸 Profile images updated: ${updateCount}/${users.length}`);

    // 이미지별 사용 횟수 계산
    const imageUsage = {};
    images.forEach(img => {
      const imgName = img.split('/').pop();
      imageUsage[imgName] = updates.filter(u => u.image === imgName).length;
    });

    const response: ApiResponse = {
      success: true,
      data: {
        updated: updateCount,
        total: users.length,
        imageUsage,
        message: `Successfully updated ${updateCount} profile images`,
        sampleUpdates: updates.slice(0, 20) // 처음 20명만 표시
      },
      timestamp: new Date().toISOString()
    };

    res.json(response);
  } catch (error) {
    console.error('❌ Failed to update profile images:', error);
    throw createError(`Failed to update profile images: ${error.message}`, 500, 'UPDATE_ERROR');
  }
}));

export default router;