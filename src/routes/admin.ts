import { Router, Response } from 'express';
import { z } from 'zod';
import { AdminAuthenticatedRequest, authenticateAdmin, logAdminActivity } from '../middleware/adminAuth';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { Database } from '../utils/database';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { GoogleGenerativeAI } from '@google/generative-ai';
import {
  TraitPair,
  TraitVisual,
  ApiResponse
} from '../types/database';

const router = Router();
const db = Database.getInstance();

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// Validation schemas
const traitPairSchema = z.object({
  key: z.string().min(1).max(50),
  left_label: z.string().min(1).max(100),
  right_label: z.string().min(1).max(100),
  category: z.string().min(1).max(50),
  description: z.string().optional(),
  is_active: z.boolean().optional().default(true)
});

const traitVisualSchema = z.object({
  pair_id: z.string().uuid(),
  left_asset_id: z.string().optional().nullable(),
  right_asset_id: z.string().optional().nullable(),
  left_description: z.string().optional().nullable(),
  right_description: z.string().optional().nullable(),
  is_default: z.boolean().optional().default(true)
});

const abQuizSchema = z.object({
  category: z.string().min(1).max(50),
  title: z.string().min(1).max(200),
  description: z.string().optional().nullable(),
  option_a_title: z.string().min(1).max(100),
  option_a_description: z.string().optional().nullable(),
  option_b_title: z.string().min(1).max(100),
  option_b_description: z.string().optional().nullable(),
  is_active: z.union([z.boolean(), z.string()]).transform(val => {
    if (typeof val === 'boolean') return val;
    if (typeof val === 'string') return val === 'true' || val === '1' || val === 'on';
    return true;
  }).optional().default(true)
});

const generateImageSchema = z.object({
  prompt: z.string().min(1).max(1500),
  title: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  category: z.string().optional(),
  template_id: z.string().uuid().optional(), // Reference to ai_prompt_templates
  size: z.enum(['512x512', '768x768', '1024x1024']).optional().default('512x512')
});

const aiPromptTemplateSchema = z.object({
  title: z.string().min(1).max(100),
  description: z.string().optional().nullable(),
  korean_prompt: z.string().min(1).max(1000),
  english_prompt: z.string().min(1).max(1000),
  category: z.string().min(1).max(50),
  is_active: z.boolean().optional().default(true),
  is_default: z.boolean().optional().default(false)
});

// Configure multer for quiz image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'public/uploads';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `quiz-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('이미지 파일만 업로드 가능합니다'));
    }
  }
});

/**
 * GET /admin/trait-pairs
 * Get all trait pairs with pagination
 */
router.get('/trait-pairs', authenticateAdmin, asyncHandler(async (
  req: AdminAuthenticatedRequest,
  res: Response
) => {
  const page = parseInt(req.query.page as string) || 1;
  const perPage = Math.min(parseInt(req.query.per_page as string) || 20, 100);
  const offset = (page - 1) * perPage;

  const category = req.query.category as string;
  const active = req.query.active as string;

  let whereClause = '1=1';
  const params: any[] = [];
  let paramIndex = 1;

  if (category) {
    whereClause += ` AND category = $${paramIndex}`;
    params.push(category);
    paramIndex++;
  }

  if (active !== undefined) {
    whereClause += ` AND is_active = $${paramIndex}`;
    params.push(active === 'true');
    paramIndex++;
  }

  params.push(perPage, offset);

  const pairs = await db.query(
    `SELECT tp.*,
            COUNT(tv.id) as visual_count,
            COUNT(ut.id) as response_count
     FROM trait_pairs tp
     LEFT JOIN trait_visuals tv ON tp.id = tv.pair_id
     LEFT JOIN user_traits ut ON tp.id = ut.pair_id
     WHERE ${whereClause}
     GROUP BY tp.id
     ORDER BY tp.created_at DESC
     LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    params
  );

  const [total] = await db.query(
    `SELECT COUNT(*) as count FROM trait_pairs WHERE ${whereClause}`,
    params.slice(0, -2)
  );

  const response: ApiResponse = {
    success: true,
    data: {
      pairs,
      pagination: {
        page,
        per_page: perPage,
        total: total?.count || 0,
        has_next: offset + perPage < (total?.count || 0),
        has_prev: page > 1
      }
    },
    timestamp: new Date().toISOString()
  };

  res.json(response);
}));

/**
 * POST /admin/trait-pairs
 * Create new trait pair
 */
router.post('/trait-pairs', authenticateAdmin, logAdminActivity('CREATE_TRAIT_PAIR', 'trait_pair'), asyncHandler(async (
  req: AdminAuthenticatedRequest,
  res: Response
) => {
  const body = traitPairSchema.parse(req.body);

  // Check if key already exists
  const existing = await db.queryOne(
    'SELECT id FROM trait_pairs WHERE key = $1',
    [body.key]
  );

  if (existing) {
    throw createError('이미 존재하는 키입니다', 400, 'DUPLICATE_KEY');
  }

  const pairId = uuidv4();
  const [pair] = await db.query<TraitPair>(
    `INSERT INTO trait_pairs (id, key, left_label, right_label, category, description, is_active, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
     RETURNING *`,
    [pairId, body.key, body.left_label, body.right_label, body.category, body.description, body.is_active]
  );

  const response: ApiResponse = {
    success: true,
    data: { pair },
    timestamp: new Date().toISOString()
  };

  res.json(response);
}));

/**
 * PUT /admin/trait-pairs/:id
 * Update trait pair
 */
router.put('/trait-pairs/:id', authenticateAdmin, asyncHandler(async (
  req: AdminAuthenticatedRequest,
  res: Response
) => {
  const pairId = req.params.id;
  const body = traitPairSchema.partial().parse(req.body);

  // Check if pair exists
  const existing = await db.queryOne(
    'SELECT id FROM trait_pairs WHERE id = $1',
    [pairId]
  );

  if (!existing) {
    throw createError('성향 질문을 찾을 수 없습니다', 404, 'TRAIT_PAIR_NOT_FOUND');
  }

  // Check if key is being changed and if it already exists
  if (body.key) {
    const keyExists = await db.queryOne(
      'SELECT id FROM trait_pairs WHERE key = $1 AND id != $2',
      [body.key, pairId]
    );

    if (keyExists) {
      throw createError('이미 존재하는 키입니다', 400, 'DUPLICATE_KEY');
    }
  }

  const updateFields = [];
  const params: any[] = [];
  let paramIndex = 1;

  for (const [key, value] of Object.entries(body)) {
    updateFields.push(`${key} = $${paramIndex}`);
    params.push(value);
    paramIndex++;
  }

  updateFields.push(`updated_at = NOW()`);
  params.push(pairId);

  const [pair] = await db.query<TraitPair>(
    `UPDATE trait_pairs
     SET ${updateFields.join(', ')}
     WHERE id = $${paramIndex}
     RETURNING *`,
    params
  );

  const response: ApiResponse = {
    success: true,
    data: { pair },
    timestamp: new Date().toISOString()
  };

  res.json(response);
}));

/**
 * DELETE /admin/trait-pairs/:id
 * Delete trait pair (soft delete by setting inactive)
 */
router.delete('/trait-pairs/:id', authenticateAdmin, asyncHandler(async (
  req: AdminAuthenticatedRequest,
  res: Response
) => {
  const pairId = req.params.id;

  // Check if pair exists
  const existing = await db.queryOne(
    'SELECT id FROM trait_pairs WHERE id = $1',
    [pairId]
  );

  if (!existing) {
    throw createError('성향 질문을 찾을 수 없습니다', 404, 'TRAIT_PAIR_NOT_FOUND');
  }

  // Check if pair has responses
  const hasResponses = await db.queryOne(
    'SELECT COUNT(*) as count FROM user_traits WHERE pair_id = $1',
    [pairId]
  );

  if (hasResponses && hasResponses.count > 0) {
    // Soft delete - just deactivate
    await db.query(
      'UPDATE trait_pairs SET is_active = false, updated_at = NOW() WHERE id = $1',
      [pairId]
    );
  } else {
    // Hard delete if no responses
    await db.query('DELETE FROM trait_pairs WHERE id = $1', [pairId]);
  }

  const response: ApiResponse = {
    success: true,
    timestamp: new Date().toISOString()
  };

  res.json(response);
}));

/**
 * GET /admin/trait-visuals/:pairId
 * Get visuals for a trait pair
 */
router.get('/trait-visuals/:pairId', authenticateAdmin, asyncHandler(async (
  req: AdminAuthenticatedRequest,
  res: Response
) => {
  const pairId = req.params.pairId;

  const visuals = await db.query(
    'SELECT * FROM trait_visuals WHERE pair_id = $1 ORDER BY created_at DESC',
    [pairId]
  );

  const response: ApiResponse = {
    success: true,
    data: { visuals },
    timestamp: new Date().toISOString()
  };

  res.json(response);
}));

/**
 * POST /admin/trait-visuals
 * Create visual for trait pair
 */
router.post('/trait-visuals', authenticateAdmin, asyncHandler(async (
  req: AdminAuthenticatedRequest,
  res: Response
) => {
  const body = traitVisualSchema.parse(req.body);

  // Check if pair exists
  const pairExists = await db.queryOne(
    'SELECT id FROM trait_pairs WHERE id = $1',
    [body.pair_id]
  );

  if (!pairExists) {
    throw createError('성향 질문을 찾을 수 없습니다', 404, 'TRAIT_PAIR_NOT_FOUND');
  }

  const visualId = uuidv4();
  const [visual] = await db.query<TraitVisual>(
    `INSERT INTO trait_visuals (id, pair_id, left_asset_id, right_asset_id, left_description, right_description, is_default, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
     RETURNING *`,
    [visualId, body.pair_id, body.left_asset_id, body.right_asset_id, body.left_description, body.right_description, body.is_default]
  );

  const response: ApiResponse = {
    success: true,
    data: { visual },
    timestamp: new Date().toISOString()
  };

  res.json(response);
}));

/**
 * PUT /admin/trait-visuals/:id
 * Update trait visual
 */
router.put('/trait-visuals/:id', authenticateAdmin, asyncHandler(async (
  req: AdminAuthenticatedRequest,
  res: Response
) => {
  const visualId = req.params.id;
  const body = traitVisualSchema.partial().parse(req.body);

  // Check if visual exists
  const existing = await db.queryOne(
    'SELECT id FROM trait_visuals WHERE id = $1',
    [visualId]
  );

  if (!existing) {
    throw createError('시각적 자료를 찾을 수 없습니다', 404, 'VISUAL_NOT_FOUND');
  }

  const updateFields = [];
  const params: any[] = [];
  let paramIndex = 1;

  for (const [key, value] of Object.entries(body)) {
    if (key !== 'pair_id') { // Don't allow changing pair_id
      updateFields.push(`${key} = $${paramIndex}`);
      params.push(value);
      paramIndex++;
    }
  }

  updateFields.push(`updated_at = NOW()`);
  params.push(visualId);

  const [visual] = await db.query<TraitVisual>(
    `UPDATE trait_visuals
     SET ${updateFields.join(', ')}
     WHERE id = $${paramIndex}
     RETURNING *`,
    params
  );

  const response: ApiResponse = {
    success: true,
    data: { visual },
    timestamp: new Date().toISOString()
  };

  res.json(response);
}));

/**
 * DELETE /admin/trait-visuals/:id
 * Delete trait visual
 */
router.delete('/trait-visuals/:id', authenticateAdmin, asyncHandler(async (
  req: AdminAuthenticatedRequest,
  res: Response
) => {
  const visualId = req.params.id;

  // Check if visual exists
  const existing = await db.queryOne(
    'SELECT id FROM trait_visuals WHERE id = $1',
    [visualId]
  );

  if (!existing) {
    throw createError('시각적 자료를 찾을 수 없습니다', 404, 'VISUAL_NOT_FOUND');
  }

  await db.query('DELETE FROM trait_visuals WHERE id = $1', [visualId]);

  const response: ApiResponse = {
    success: true,
    timestamp: new Date().toISOString()
  };

  res.json(response);
}));

/**
 * GET /admin/categories
 * Get all available categories
 */
router.get('/categories', authenticateAdmin, asyncHandler(async (
  req: AdminAuthenticatedRequest,
  res: Response
) => {
  const useMock = process.env.USE_MOCK_RING_SERVICE === 'true';

  let categories;

  if (useMock) {
    // Mock 카테고리 데이터
    categories = [
      { category: 'food', pair_count: 10 },
      { category: 'hobby', pair_count: 8 },
      { category: 'lifestyle', pair_count: 7 },
      { category: 'nature', pair_count: 5 }
    ];
  } else {
    categories = await db.query(
      `SELECT category, COUNT(*) as pair_count
       FROM trait_pairs
       WHERE is_active = true
       GROUP BY category
       ORDER BY category`
    );
  }

  const response: ApiResponse = {
    success: true,
    data: { categories },
    timestamp: new Date().toISOString()
  };

  res.json(response);
}));

/**
 * GET /admin/stats
 * Get admin dashboard stats
 */
router.get('/stats', authenticateAdmin, asyncHandler(async (
  req: AdminAuthenticatedRequest,
  res: Response
) => {
  const useMock = process.env.USE_MOCK_RING_SERVICE === 'true';

  let responseData;

  if (useMock) {
    // Mock 데이터
    responseData = {
      active_trait_pairs: 30,
      trait_visuals: 60,
      active_users: 10,
      quiz_sessions: 45,
      trait_responses: 150,
      top_categories: [
        { category: 'food', count: 10 },
        { category: 'hobby', count: 8 },
        { category: 'lifestyle', count: 7 },
        { category: 'nature', count: 5 }
      ],
      user_stats: {
        avg_accuracy: 0.75,
        avg_attempts: 15
      }
    };
  } else {
    const stats = await Promise.all([
      db.queryOne('SELECT COUNT(*) as count FROM trait_pairs WHERE is_active = true'),
      db.queryOne('SELECT COUNT(*) as count FROM trait_visuals'),
      db.queryOne('SELECT COUNT(*) as count FROM users WHERE is_active = true'),
      db.queryOne('SELECT COUNT(*) as count FROM quiz_sessions'),
      db.queryOne('SELECT COUNT(*) as count FROM user_traits'),
      db.queryOne(`
        SELECT category, COUNT(*) as count
        FROM trait_pairs
        WHERE is_active = true
        GROUP BY category
        ORDER BY count DESC
        LIMIT 5
      `),
      db.queryOne(`
        SELECT AVG(accuracy) as avg_accuracy, AVG(total_attempts) as avg_attempts
        FROM user_skills
      `)
    ]);

    responseData = {
      active_trait_pairs: stats[0]?.count || 0,
      trait_visuals: stats[1]?.count || 0,
      active_users: stats[2]?.count || 0,
      quiz_sessions: stats[3]?.count || 0,
      trait_responses: stats[4]?.count || 0,
      top_categories: stats[5] || [],
      user_stats: stats[6] || {}
    };
  }

  const response: ApiResponse = {
    success: true,
    data: responseData,
    timestamp: new Date().toISOString()
  };

  res.json(response);
}));

/**
 * GET /admin/users
 * Get all users with pagination, search, and filters
 */
router.get('/users', authenticateAdmin, asyncHandler(async (
  req: AdminAuthenticatedRequest,
  res: Response
) => {
  try {
    console.log('=== 🔍 [AdminUsers] ENDPOINT HIT ===');
    console.log('📋 [AdminUsers] GET /admin/users request received');
    console.log('📋 [AdminUsers] Timestamp:', new Date().toISOString());
    console.log('📋 [AdminUsers] Query params:', req.query);
    console.log('📋 [AdminUsers] Request URL:', req.url);
    console.log('📋 [AdminUsers] Request path:', req.path);

  const page = parseInt(req.query.page as string) || 1;
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
  const offset = (page - 1) * limit;

  console.log('📋 [AdminUsers] Pagination:', { page, limit, offset });

  const search = req.query.search as string || '';
  const status = req.query.status as string || 'all';
  const gender = req.query.gender as string || 'all';

  console.log('📋 [AdminUsers] Filters:', { search, status, gender });

  let whereClause = '1=1';
  const params: any[] = [];
  let paramIndex = 1;

  // Status filter
  if (status === 'active') {
    whereClause += ` AND is_active = true`;
  } else if (status === 'inactive') {
    whereClause += ` AND is_active = false`;
  }

  // Gender filter
  if (gender !== 'all') {
    whereClause += ` AND gender = $${paramIndex}`;
    params.push(gender);
    paramIndex++;
  }

  // Search filter (name or email)
  if (search) {
    whereClause += ` AND (name ILIKE $${paramIndex} OR email ILIKE $${paramIndex})`;
    params.push(`%${search}%`);
    paramIndex++;
  }

  // Push limit and offset to params, then capture their indices
  params.push(limit, offset);
  const limitIndex = paramIndex;
  const offsetIndex = paramIndex + 1;

  console.log('📋 [AdminUsers] WHERE clause:', whereClause);
  console.log('📋 [AdminUsers] Params:', params);
  console.log('📋 [AdminUsers] Param indices - limit: $' + limitIndex + ', offset: $' + offsetIndex);
  console.log('📋 [AdminUsers] Executing main query...');

  const users = await db.query(
    `SELECT
      u.id,
      u.name,
      u.email,
      u.gender,
      u.age,
      u.location as region,
      u.bio,
      u.profile_image_url,
      u.profile_complete,
      u.is_active,
      u.created_at,
      u.updated_at,
      u.last_login_at,
      -- Photo statistics (Mock data - table doesn't exist yet)
      0 as photo_count,
      0 as approved_photos,
      0 as pending_photos,
      0 as rejected_photos,
      -- Quiz statistics
      COALESCE(quiz_stats.quiz_responses, 0) as quiz_responses,
      -- Trait statistics
      COALESCE(trait_stats.trait_responses, 0) as trait_responses,
      -- Max affinity score
      COALESCE(affinity_stats.max_affinity_score, 0) as max_affinity_score
     FROM users u
     LEFT JOIN (
       SELECT asker_id as user_id,
              COUNT(DISTINCT session_id) as quiz_responses
       FROM quiz_sessions
       GROUP BY asker_id
     ) quiz_stats ON u.id = quiz_stats.user_id
     LEFT JOIN (
       SELECT user_id,
              COUNT(*) as trait_responses
       FROM user_traits
       GROUP BY user_id
     ) trait_stats ON u.id = trait_stats.user_id
     LEFT JOIN (
       SELECT target_id,
              MAX(score) as max_affinity_score
       FROM affinity_scores
       GROUP BY target_id
     ) affinity_stats ON u.id = affinity_stats.target_id
     WHERE ${whereClause}
     ORDER BY u.created_at DESC
     LIMIT $${limitIndex} OFFSET $${offsetIndex}`,
    params
  );

  console.log('📋 [AdminUsers] Main query completed. Users found:', users.length);

  const [total] = await db.query(
    `SELECT COUNT(*) as count FROM users WHERE ${whereClause}`,
    params.slice(0, -2)
  );

  console.log('📋 [AdminUsers] Count query completed. Total:', total?.count || 0);

  // Transform users to match frontend expectations (nest statistics under 'stats')
  console.log('📋 [AdminUsers] Transforming users data...');
  const usersWithStats = users.map(user => ({
    id: user.id,
    name: user.name,
    email: user.email,
    gender: user.gender,
    age: user.age,
    region: user.region,
    bio: user.bio,
    profile_image_url: user.profile_image_url,
    profile_complete: user.profile_complete,
    is_active: user.is_active,
    created_at: user.created_at,
    updated_at: user.updated_at,
    last_login_at: user.last_login_at,
    stats: {
      photo_count: user.photo_count,
      approved_photos: user.approved_photos,
      pending_photos: user.pending_photos,
      rejected_photos: user.rejected_photos,
      quiz_responses: user.quiz_responses,
      trait_responses: user.trait_responses,
      max_affinity_score: user.max_affinity_score
    }
  }));

  const response: ApiResponse = {
    success: true,
    data: {
      users: usersWithStats,
      pagination: {
        page,
        per_page: limit,
        total: total?.count || 0,
        has_next: offset + limit < (total?.count || 0),
        has_prev: page > 1
      }
    },
    timestamp: new Date().toISOString()
  };

  console.log('📋 [AdminUsers] Sending response...');
  res.json(response);
  console.log('✅ [AdminUsers] Response sent successfully');

  } catch (error: any) {
    console.error('❌ [AdminUsers] FATAL ERROR IN ENDPOINT:', {
      name: error.name,
      message: error.message,
      code: error.code,
      detail: error.detail,
      hint: error.hint,
      position: error.position,
      internalQuery: error.internalQuery,
      stack: error.stack?.substring(0, 500)
    });

    throw error;
  }
}));

/**
 * GET /admin/quizzes
 * Get all A&B quizzes with pagination
 */
router.get('/quizzes', authenticateAdmin, asyncHandler(async (
  req: AdminAuthenticatedRequest,
  res: Response
) => {
  const page = parseInt(req.query.page as string) || 1;
  const perPage = Math.min(parseInt(req.query.per_page as string) || 20, 100);
  const offset = (page - 1) * perPage;

  const category = req.query.category as string;
  const active = req.query.active as string;

  let whereClause = '1=1';
  const params: any[] = [];
  let paramIndex = 1;

  if (category) {
    whereClause += ` AND category = $${paramIndex}`;
    params.push(category);
    paramIndex++;
  }

  if (active !== undefined) {
    whereClause += ` AND is_active = $${paramIndex}`;
    params.push(active === 'true');
    paramIndex++;
  }

  params.push(perPage, offset);

  const quizzes = await db.query(
    `SELECT id, category, title, description,
            option_a_title, option_a_description, option_a_image,
            option_b_title, option_b_description, option_b_image,
            is_active, created_at, updated_at
     FROM ab_quizzes
     WHERE ${whereClause}
     ORDER BY created_at DESC
     LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    params
  );

  const [total] = await db.query(
    `SELECT COUNT(*) as count FROM ab_quizzes WHERE ${whereClause}`,
    params.slice(0, -2)
  );

  const response: ApiResponse = {
    success: true,
    data: {
      quizzes,
      pagination: {
        page,
        per_page: perPage,
        total: total?.count || 0,
        has_next: offset + perPage < (total?.count || 0),
        has_prev: page > 1
      }
    },
    timestamp: new Date().toISOString()
  };

  res.json(response);
}));

/**
 * POST /admin/quizzes
 * Create new A&B quiz
 */
router.post('/quizzes', authenticateAdmin, upload.fields([
  { name: 'option_a_image', maxCount: 1 },
  { name: 'option_b_image', maxCount: 1 }
]), asyncHandler(async (
  req: AdminAuthenticatedRequest,
  res: Response
) => {
  try {
    const body = abQuizSchema.parse(req.body);

    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    const optionAImage = files['option_a_image']?.[0]?.filename || null;
    const optionBImage = files['option_b_image']?.[0]?.filename || null;

    const quizId = uuidv4();
    const [quiz] = await db.query(
      `INSERT INTO ab_quizzes (
        id, category, title, description,
        option_a_title, option_a_description, option_a_image,
        option_b_title, option_b_description, option_b_image,
        is_active, created_by, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
      RETURNING *`,
      [
        quizId, body.category, body.title, body.description,
        body.option_a_title, body.option_a_description, optionAImage,
        body.option_b_title, body.option_b_description, optionBImage,
        body.is_active, req.admin.id
      ]
    );

    const response: ApiResponse = {
      success: true,
      data: { quiz },
      message: 'A&B 퀴즈가 성공적으로 생성되었습니다',
      timestamp: new Date().toISOString()
    };

    res.json(response);
  } catch (error: any) {
    // Clean up uploaded files on error
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    if (files) {
      Object.values(files).flat().forEach(file => {
        const filePath = path.join('public/uploads', file.filename);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      });
    }
    throw error;
  }
}));

/**
 * PUT /admin/quizzes/:id
 * Update A&B quiz
 */
router.put('/quizzes/:id', authenticateAdmin, upload.fields([
  { name: 'option_a_image', maxCount: 1 },
  { name: 'option_b_image', maxCount: 1 }
]), asyncHandler(async (
  req: AdminAuthenticatedRequest,
  res: Response
) => {
  const quizId = req.params.id;
  const body = abQuizSchema.partial().parse(req.body);

  // Check if quiz exists
  const existing = await db.queryOne(
    'SELECT * FROM ab_quizzes WHERE id = $1',
    [quizId]
  );

  if (!existing) {
    throw createError('A&B 퀴즈를 찾을 수 없습니다', 404, 'QUIZ_NOT_FOUND');
  }

  const files = req.files as { [fieldname: string]: Express.Multer.File[] };
  let optionAImage = existing.option_a_image;
  let optionBImage = existing.option_b_image;

  // Handle new image uploads
  if (files['option_a_image']) {
    // Delete old image
    if (existing.option_a_image) {
      const oldPath = path.join('public/uploads', existing.option_a_image);
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }
    }
    optionAImage = files['option_a_image'][0].filename;
  }

  if (files['option_b_image']) {
    // Delete old image
    if (existing.option_b_image) {
      const oldPath = path.join('public/uploads', existing.option_b_image);
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }
    }
    optionBImage = files['option_b_image'][0].filename;
  }

  const updateFields = [];
  const params: any[] = [];
  let paramIndex = 1;

  // Add body fields
  for (const [key, value] of Object.entries(body)) {
    updateFields.push(`${key} = $${paramIndex}`);
    params.push(value);
    paramIndex++;
  }

  // Add image fields
  updateFields.push(`option_a_image = $${paramIndex}`);
  params.push(optionAImage);
  paramIndex++;

  updateFields.push(`option_b_image = $${paramIndex}`);
  params.push(optionBImage);
  paramIndex++;

  updateFields.push(`updated_at = NOW()`);
  params.push(quizId);

  const [quiz] = await db.query(
    `UPDATE ab_quizzes
     SET ${updateFields.join(', ')}
     WHERE id = $${paramIndex}
     RETURNING *`,
    params
  );

  const response: ApiResponse = {
    success: true,
    data: { quiz },
    message: 'A&B 퀴즈가 성공적으로 수정되었습니다',
    timestamp: new Date().toISOString()
  };

  res.json(response);
}));

/**
 * DELETE /admin/quizzes/:id
 * Delete A&B quiz
 */
router.delete('/quizzes/:id', authenticateAdmin, asyncHandler(async (
  req: AdminAuthenticatedRequest,
  res: Response
) => {
  const quizId = req.params.id;

  // Get quiz details before deletion
  const quiz = await db.queryOne(
    'SELECT * FROM ab_quizzes WHERE id = $1',
    [quizId]
  );

  if (!quiz) {
    throw createError('A&B 퀴즈를 찾을 수 없습니다', 404, 'QUIZ_NOT_FOUND');
  }

  // Delete associated responses first
  await db.query('DELETE FROM ab_quiz_responses WHERE quiz_id = $1', [quizId]);

  // Delete the quiz
  await db.query('DELETE FROM ab_quizzes WHERE id = $1', [quizId]);

  // Delete image files
  if (quiz.option_a_image) {
    const imagePath = path.join('public/uploads', quiz.option_a_image);
    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
    }
  }

  if (quiz.option_b_image) {
    const imagePath = path.join('public/uploads', quiz.option_b_image);
    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
    }
  }

  const response: ApiResponse = {
    success: true,
    message: 'A&B 퀴즈가 성공적으로 삭제되었습니다',
    timestamp: new Date().toISOString()
  };

  res.json(response);
}));

/**
 * POST /admin/generate-image
 * Generate image using Google Gemini 2.5 Flash Image
 */
router.post('/generate-image', authenticateAdmin, logAdminActivity('GENERATE_IMAGE', 'image'), asyncHandler(async (
  req: AdminAuthenticatedRequest,
  res: Response
) => {
  const body = generateImageSchema.parse(req.body);

  if (!process.env.GEMINI_API_KEY) {
    throw createError('Gemini API 키가 설정되지 않았습니다', 500, 'GEMINI_NOT_CONFIGURED');
  }

  // Build the final prompt using template and/or user input
  let finalPrompt = body.prompt;
  let templateInfo = null;

  // If template_id is provided, use the template as base prompt
  if (body.template_id) {
    const templates = await db.query(
      'SELECT * FROM ai_prompt_templates WHERE id = $1 AND is_active = true',
      [body.template_id]
    );

    if (templates.length > 0) {
      const template = templates[0];
      templateInfo = template;
      // Use the English prompt from template as base, add description if provided
      finalPrompt = template.english_prompt;
      if (body.description) {
        finalPrompt += `, ${body.description}`;
      }
    }
  } else if (body.description) {
    // If no template but description is provided, add it to the prompt
    finalPrompt += `, ${body.description}`;
  }

  // Analyze prompt context for intelligent enhancement
  const promptAnalysis = analyzePromptContext(body.prompt);
  const category = templateInfo?.category || body.category || promptAnalysis.category;

  console.log('🎨 Generating image with Gemini Nano Banana, original prompt:', body.prompt);
  console.log('🧠 Context analysis:', {
    category: promptAnalysis.category,
    emotion: promptAnalysis.emotion,
    style: promptAnalysis.style,
    finalCategory: category
  });

  finalPrompt = applyPhotographyEnhancements(finalPrompt, category);

  console.log('🎨 Final enhanced prompt:', finalPrompt);
  console.log('🎨 Using template:', templateInfo?.title || 'None');

  try {
    // Use Gemini 2.5 Flash Image (Nano Banana) for high-quality image generation
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-image-preview" });
    const result = await model.generateContent([finalPrompt]);

    if (!result.response.candidates || result.response.candidates.length === 0) {
      throw createError('이미지 생성에 실패했습니다', 500, 'IMAGE_GENERATION_FAILED');
    }

    // Find the image part in the response
    let imageBase64 = null;
    for (const part of result.response.candidates[0].content.parts) {
      if (part.inlineData && part.inlineData.data) {
        imageBase64 = part.inlineData.data;
        break;
      }
    }

    if (!imageBase64) {
      throw createError('생성된 이미지를 받을 수 없습니다', 500, 'IMAGE_DATA_MISSING');
    }

    console.log('✅ Image generated with Gemini Nano Banana');

    // Convert base64 to buffer
    const buffer = Buffer.from(imageBase64, 'base64');

    // Create filename based on title or fallback to timestamp
    let baseFilename;
    if (body.title) {
      // Sanitize title for filename (remove special characters, replace spaces with hyphens)
      baseFilename = body.title
        .toLowerCase()
        .replace(/[^a-z0-9가-힣]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
    } else {
      const timestamp = Date.now();
      const randomSuffix = Math.round(Math.random() * 1E9);
      baseFilename = `dalle-generated-${timestamp}-${randomSuffix}`;
    }

    const filename = `${baseFilename}.png`;
    const filepath = path.join('public/images/quiz', filename);

    // Ensure directory exists
    const dir = path.dirname(filepath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Save the image
    fs.writeFileSync(filepath, buffer);

    const imagePublicPath = `/images/quiz/${filename}`;

    console.log('💾 Image saved to:', imagePublicPath);

    const apiResponse: ApiResponse = {
      success: true,
      data: {
        prompt: body.prompt,
        size: body.size,
        filename,
        path: imagePublicPath,
        url: imagePublicPath
      },
      message: '이미지가 성공적으로 생성되었습니다',
      timestamp: new Date().toISOString()
    };

    res.json(apiResponse);

  } catch (error: any) {
    console.error('❌ Gemini image generation error:', error);

    if (error.status === 401 || error.message?.includes('API key') || error.message?.includes('PERMISSION_DENIED')) {
      throw createError('Gemini API 인증에 실패했습니다. 키를 확인해주세요.', 401, 'GEMINI_AUTH_FAILED');
    }

    if (error.status === 429 || error.message?.includes('quota') || error.message?.includes('Too Many Requests')) {
      throw createError('Gemini API 할당량을 초과했습니다. 잠시 후에 다시 시도해주세요.', 429, 'QUOTA_EXCEEDED');
    }

    if (error.status === 400 || error.message?.includes('SAFETY') || error.message?.includes('content_policy')) {
      throw createError('콘텐츠 정책에 위반되는 프롬프트입니다. 다른 내용으로 시도해주세요.', 400, 'CONTENT_POLICY_VIOLATION');
    }

    throw createError(
      error.message || '이미지 생성 중 오류가 발생했습니다',
      500,
      'IMAGE_GENERATION_ERROR'
    );
  }
}));

/**
 * POST /admin/log-error
 * Log client-side errors for debugging
 */
router.post('/log-error', asyncHandler(async (
  req: any,
  res: Response
) => {
  const { type, message, filename, line, column, stack, userAgent, timestamp } = req.body;

  console.log('🔴 Client Error:', {
    type,
    message,
    filename,
    line,
    column,
    stack,
    userAgent,
    timestamp
  });

  res.json({ success: true });
}));

/**
 * POST /admin/enhance-prompt
 * Enhance prompt using web search for better image generation
 */
router.post('/enhance-prompt', authenticateAdmin, logAdminActivity('ENHANCE_PROMPT', 'prompt'), asyncHandler(async (
  req: AdminAuthenticatedRequest,
  res: Response
) => {
  const { prompt, category } = req.body;

  if (!prompt) {
    throw createError('프롬프트가 필요합니다', 400, 'PROMPT_REQUIRED');
  }

  try {
    let enhancedPrompt = prompt;
    let searchInfo = null;

    // Enhanced knowledge-based prompt optimization (web search simulation)
    try {
      const enhancedFromKnowledge = enhancePromptWithKnowledge(prompt, category);

      if (enhancedFromKnowledge !== prompt) {
        enhancedPrompt = enhancedFromKnowledge;
        searchInfo = { query: `knowledge_base_${prompt}`, found: true };
        console.log(`🎯 Enhanced using knowledge base: ${prompt} → ${enhancedPrompt.substring(0, 100)}...`);
      }
    } catch (searchError) {
      console.log('Enhancement failed, using fallback');
    }

    // Fallback: Use predefined knowledge for common items
    if (!searchInfo) {
      enhancedPrompt = enhancePromptWithKnowledge(prompt, category);
      searchInfo = { query: 'fallback', found: false };
    }

    // Apply photography quality enhancements
    enhancedPrompt = applyPhotographyEnhancements(enhancedPrompt, category);

    res.json({
      success: true,
      data: {
        original_prompt: prompt,
        enhanced_prompt: enhancedPrompt,
        search_info: searchInfo,
        category: category
      }
    });

  } catch (error) {
    console.error('Prompt enhancement error:', error);

    // Return original prompt with basic enhancements on error
    const fallbackPrompt = applyPhotographyEnhancements(prompt, category);

    res.json({
      success: true,
      data: {
        original_prompt: prompt,
        enhanced_prompt: fallbackPrompt,
        search_info: { query: 'error_fallback', found: false },
        category: category
      }
    });
  }
}));

function extractVisualDescriptors(text, mainItem) {
  // Extract visual characteristics from web search text
  const visualTerms = [];

  // Color descriptors
  const colors = text.match(/(빨간|노란|파란|초록|흰|검은|갈색|주황|보라|분홍|황금|은색)색?/g);
  if (colors) visualTerms.push(...colors.slice(0, 2));

  // Texture/appearance descriptors
  const textures = text.match(/(바삭한|부드러운|촉촉한|쫄깃한|고소한|달콤한|매운|시원한|뜨거운)/g);
  if (textures) visualTerms.push(...textures.slice(0, 2));

  // Shape/form descriptors
  const shapes = text.match(/(둥근|길쭉한|네모난|삼각형|타원형|곡선|직선)/g);
  if (shapes) visualTerms.push(...shapes.slice(0, 1));

  return visualTerms.length > 0 ? visualTerms.join(', ') : null;
}

// AI-powered context and category detection system
function analyzePromptContext(prompt) {
  const prompt_lower = prompt.toLowerCase();

  // Enhanced category detection with context analysis
  const categoryKeywords = {
    '음식': [
      // Korean food
      '짜장면', '짬뽕', '불고기', '김치', '삼겹살', '치킨', '라면', '탕수육', '볶음밥', '떡볶이',
      '순대', '만두', '국밥', '비빔밥', '냉면', '갈비', '된장찌개', '김치찌개', '부대찌개',
      '냉면', '물냉면', '비빔냉면', '설렁탕', '곰탕', '삼계탕', '추어탕', '해장국',
      '보쌈', '족발', '찜닭', '닭갈비', '돼지갈비', '소갈비', '한우', '흑돼지',
      '회', '초밥', '사시미', '연어', '참치', '광어', '농어', '고등어', '삼치',
      '김밥', '주먹밥', '유부초밥', '컵밥', '도시락', '밥', '쌀', '현미',
      '국수', '칼국수', '잔치국수', '멸치국수', '온면', '소면', '중면', '우동',
      '파스타', '스파게티', '라자냐', '리조또', '피자', '햄버거', '샌드위치',
      '커피', '아메리카노', '라떼', '카푸치노', '차', '녹차', '홍차', '우유',
      '과일', '사과', '배', '포도', '딸기', '바나나', '오렌지', '귤', '수박', '참외',
      '야채', '상추', '배추', '양파', '마늘', '생강', '당근', '무', '오이', '토마토',
      '빵', '식빵', '크로아상', '베이글', '도넛', '케이크', '쿠키', '마카롱',
      // Food adjectives and context
      '맛있는', '달콤한', '매운', '짠', '신맛', '뜨거운', '차가운', '따뜻한',
      '요리', '음식', '식사', '간식', '디저트', '술안주', '반찬', '메인요리'
    ],
    '사람': [
      '남자', '여자', '아이', '어린이', '아기', '청소년', '대학생', '직장인',
      '할머니', '할아버지', '엄마', '아빠', '형', '누나', '동생', '언니', '오빠',
      '친구', '연인', '부부', '가족', '동료', '선생님', '학생', '의사', '간호사',
      '요리사', '운전사', '경찰', '소방관', '군인', '선수', '가수', '배우',
      '웃는', '행복한', '슬픈', '화난', '놀란', '즐거운', '피곤한', '집중하는',
      '사람', '인물', '초상화', '프로필', '얼굴', '표정', '미소', '눈물'
    ],
    '동물': [
      '개', '고양이', '강아지', '새끼고양이', '토끼', '햄스터', '기니피그', '앵무새',
      '소', '돼지', '닭', '오리', '거위', '양', '염소', '말', '당나귀',
      '사자', '호랑이', '표범', '치타', '곰', '늑대', '여우', '사슴', '토끼',
      '코끼리', '기린', '하마', '코뿔소', '얼룩말', '원숭이', '고릴라', '판다',
      '독수리', '매', '올빼미', '까마귀', '비둘기', '참새', '제비', '까치',
      '상어', '고래', '돌고래', '물개', '바다표범', '펭귄', '거북이', '악어',
      '귀여운', '무서운', '큰', '작은', '빠른', '느린', '털복숭이', '매끄러운'
    ],
    '자연': [
      '산', '바다', '강', '호수', '폭포', '계곡', '숲', '나무', '꽃', '잔디',
      '해변', '모래', '바위', '돌', '동굴', '절벽', '언덕', '평야', '사막',
      '하늘', '구름', '태양', '달', '별', '무지개', '번개', '비', '눈', '바람',
      '봄', '여름', '가을', '겨울', '새벽', '아침', '점심', '저녁', '밤',
      '장미', '튤립', '해바라기', '벚꽃', '매화', '국화', '코스모스', '라벤더',
      '소나무', '참나무', '은행나무', '단풍나무', '버드나무', '대나무',
      '아름다운', '평화로운', '고요한', '웅장한', '신비로운', '맑은', '푸른'
    ],
    '물건': [
      '스마트폰', '컴퓨터', '노트북', '태블릿', '키보드', '마우스', '이어폰', '헤드폰',
      '자동차', '오토바이', '자전거', '버스', '지하철', '기차', '비행기', '배',
      '의자', '책상', '침대', '소파', '책장', '옷장', '냉장고', '세탁기', 'TV',
      '가방', '지갑', '시계', '안경', '모자', '신발', '옷', '바지', '치마',
      '책', '펜', '연필', '지우개', '자', '가위', '종이', '노트', '다이어리',
      '그릇', '젓가락', '숟가락', '포크', '나이프', '컵', '물병', '접시',
      '공', '장난감', '인형', '블록', '퍼즐', '보드게임', '카드', '주사위',
      '새로운', '오래된', '큰', '작은', '무거운', '가벼운', '비싼', '저렴한'
    ],
    '장소': [
      '집', '방', '거실', '부엌', '화장실', '침실', '서재', '베란다', '마당',
      '학교', '교실', '도서관', '운동장', '체육관', '급식실', '화장실',
      '회사', '사무실', '회의실', '로비', '엘리베이터', '계단', '주차장',
      '병원', '약국', '은행', '우체국', '경찰서', '소방서', '시청', '법원',
      '마트', '편의점', '백화점', '쇼핑몰', '시장', '상점', '카페', '레스토랑',
      '공원', '놀이터', '동물원', '박물관', '미술관', '영화관', '극장',
      '지하철역', '버스정류장', '공항', '기차역', '항구', '고속도로',
      '해변', '산', '강', '호수', '섬', '도시', '시골', '마을',
      '넓은', '좁은', '높은', '낮은', '밝은', '어두운', '조용한', '시끄러운'
    ],
    '활동': [
      '운동', '달리기', '걷기', '수영', '자전거', '등산', '요가', '헬스', '축구', '야구',
      '농구', '배구', '테니스', '탁구', '배드민턴', '골프', '볼링', '스키', '스케이트',
      '공부', '독서', '쓰기', '그리기', '그림', '색칠', '만들기', '요리', '베이킹',
      '음악', '노래', '춤', '악기', '피아노', '기타', '드럼', '바이올린',
      '게임', '컴퓨터게임', '보드게임', '카드게임', '퍼즐', 'TV시청', '영화감상',
      '쇼핑', '산책', '여행', '드라이브', '피크닉', '캠핑', '낚시', '사진촬영',
      '청소', '빨래', '설거지', '정리', '수리', '만들기', '꾸미기', '심기',
      '먹기', '마시기', '자기', '일어나기', '씻기', '옷입기', '화장하기',
      '즐거운', '힘든', '쉬운', '어려운', '재미있는', '지루한', '유용한'
    ]
  };

  // Emotion and style detection
  const emotionKeywords = {
    '기쁨': ['행복한', '즐거운', '기쁜', '웃는', '미소', '환한', '밝은', '상쾌한'],
    '슬픔': ['슬픈', '우울한', '울고있는', '눈물', '침울한', '어두운', '쓸쓸한'],
    '화남': ['화난', '짜증난', '분노한', '성난', '찡그린', '험악한'],
    '놀람': ['놀란', '깜짝', '당황한', '충격받은', '벌어진입'],
    '평온': ['평온한', '고요한', '차분한', '조용한', '편안한', '안락한']
  };

  const styleKeywords = {
    '전통': ['한국전통', '한복', '고궁', '전통적인', '고전적인', '옛날', '전통문화'],
    '현대': ['현대적인', '모던', '세련된', '트렌디한', '최신', '신식'],
    '귀여운': ['귀여운', '애교', '사랑스러운', '예쁜', '앙증맞은', '깜찍한'],
    '고급': ['고급스러운', '럭셔리', '품격있는', '우아한', '세련된', '격조높은'],
    '자연스러운': ['자연스러운', '내추럴', '소박한', '순수한', '편안한']
  };

  // Auto-detect category
  let detectedCategory = null;
  let maxMatches = 0;

  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    const matches = keywords.filter(keyword => prompt_lower.includes(keyword)).length;
    if (matches > maxMatches) {
      maxMatches = matches;
      detectedCategory = category;
    }
  }

  // Detect emotion
  let detectedEmotion = null;
  for (const [emotion, keywords] of Object.entries(emotionKeywords)) {
    if (keywords.some(keyword => prompt_lower.includes(keyword))) {
      detectedEmotion = emotion;
      break;
    }
  }

  // Detect style
  let detectedStyle = null;
  for (const [style, keywords] of Object.entries(styleKeywords)) {
    if (keywords.some(keyword => prompt_lower.includes(keyword))) {
      detectedStyle = style;
      break;
    }
  }

  return {
    category: detectedCategory || '물건', // default category
    emotion: detectedEmotion,
    style: detectedStyle,
    keywords: categoryKeywords[detectedCategory] || []
  };
}

function enhancePromptWithKnowledge(prompt, category) {
  const prompt_lower = prompt.toLowerCase();
  const analysis = analyzePromptContext(prompt);

  // Ultra-detailed food knowledge database
  const foodEnhancements = {
    '짜장면': 'Korean jajangmyeon black bean noodles, white wheat noodles with thick dark brown bean sauce, diced white onions pork pieces, served in white ceramic bowl',
    '짬뽕': 'Korean jjamppong spicy seafood noodle soup, white wheat noodles in bright red spicy broth, mixed seafood vegetables scallions, steaming hot soup',
    '불고기': 'Korean bulgogi marinated beef, thin sliced ribeye beef in sweet soy marinade, caramelized golden brown, grilled with onions peppers',
    '김치': 'Korean kimchi fermented napa cabbage, bright red chili powder coating, white cabbage stems visible, aged fermented appearance',
    '삼겹살': 'Korean samgyeopsal pork belly, thick sliced fatty pork belly strips, golden brown crispy edges, grilled over charcoal',
    '치킨': 'Korean fried chicken, golden crispy coating exterior, crunchy texture juicy white meat interior, glossy sweet spicy glaze',
    '피자': 'Italian pizza with melted mozzarella cheese, rich tomato sauce base, various colorful toppings, golden brown crust edge',
    '햄버거': 'hamburger with beef patty, fresh lettuce tomato onions cheese, sesame seed bun, layered construction',
    '라면': 'Korean ramyeon instant noodles, curly yellow wheat noodles, hot clear broth, green scallions soft boiled egg, steam rising',
    '탕수육': 'Korean sweet and sour pork, golden battered fried pork pieces, glossy bright red sweet sauce coating, crispy exterior',
    '볶음밥': 'Korean fried rice, individual rice grains with diced vegetables egg pieces, light brown soy sauce coloring, mixed evenly',
    '떡볶이': 'Korean tteokbokki spicy rice cakes, white cylindrical chewy rice cakes, bright red gochujang sauce, fish cakes',
    '비빔밥': 'Korean bibimbap mixed rice bowl, white steamed rice topped with colorful seasoned vegetables, fried egg, red gochujang sauce',
    '냉면': 'Korean naengmyeon cold noodles, thin gray buckwheat noodles, clear cold broth with ice cubes, sliced vegetables',
    '갈비': 'Korean galbi marinated short ribs, beef short ribs in sweet soy garlic marinade, grilled caramelized surface'
  };

  // Contextual enhancements based on analysis
  const contextualEnhancements = {
    '음식': analysis.style === '전통' ? 'traditional Korean cuisine authentic restaurant style' : 'modern Korean food restaurant presentation',
    '사람': analysis.emotion === '기쁨' ? 'happy smiling Korean person' : analysis.emotion === '슬픔' ? 'melancholic Korean person' : 'Korean person natural expression',
    '장소': analysis.style === '전통' ? 'traditional Korean architecture cultural heritage' : 'modern Korean location contemporary design',
    '활동': 'Korean cultural activity modern lifestyle context',
    '물건': analysis.style === '전통' ? 'traditional Korean object cultural artifact' : 'modern Korean design object',
    '동물': 'animals in Korean natural habitat environment',
    '자연': 'Korean landscape mountains rivers natural beauty'
  };

  let enhanced = prompt;

  // Apply ultra-detailed food knowledge
  for (const [food, description] of Object.entries(foodEnhancements)) {
    if (prompt_lower.includes(food)) {
      enhanced = `${description}`;
      console.log(`🎯 Enhanced using knowledge base: ${food} → ${description.substring(0, 100)}...`);
      break;
    }
  }

  // Apply contextual enhancement based on detected category and style
  const categoryToUse = category || analysis.category;
  if (contextualEnhancements[categoryToUse]) {
    enhanced = `${enhanced}, ${contextualEnhancements[categoryToUse]}`;
  }

  return enhanced;
}

function applyPhotographyEnhancements(prompt, category) {
  const analysis = analyzePromptContext(prompt);
  const actualCategory = category || analysis.category;

  const baseEnhancements = 'high quality realistic professional photography studio lighting white background clean minimalist background 4k ultra realistic photo safe for work';
  const negativePrompts = 'not abstract art not cartoon not anime not painting not drawing not illustration not artistic not stylized not decorative background not busy background';

  // Enhanced category-specific photography styles
  const categoryPhotography = {
    '음식': {
      base: 'professional food photography clean white background studio lighting commercial food photo realistic detailed appetizing restaurant quality real food isolated on white',
      style: analysis.style === '전통' ? 'traditional Korean cuisine presentation ceramic dishware' : 'modern food styling contemporary plating',
      lighting: 'soft diffused lighting highlighting textures colors natural food appearance'
    },
    '사람': {
      base: 'professional portrait photography studio lighting clean background natural expression',
      style: analysis.emotion === '기쁨' ? 'bright cheerful portrait warm lighting' : analysis.emotion === '슬픔' ? 'moody portrait dramatic lighting' : 'natural portrait even lighting',
      lighting: 'flattering portrait lighting soft shadows professional headshot quality'
    },
    '장소': {
      base: 'architectural photography clean composition professional photo real location',
      style: analysis.style === '전통' ? 'traditional Korean architecture cultural heritage building' : 'modern architecture contemporary design clean lines',
      lighting: 'natural daylight architectural photography balanced exposure'
    },
    '활동': {
      base: 'lifestyle photography clean background professional photo real people activity',
      style: 'dynamic action shot natural movement authentic moment',
      lighting: 'natural lighting capturing motion clear sharp focus'
    },
    '물건': {
      base: 'product photography pure white background studio lighting commercial photo real object isolated',
      style: analysis.style === '전통' ? 'traditional Korean object cultural artifact heritage piece' : 'modern product design contemporary styling',
      lighting: 'even studio lighting no harsh shadows product showcase lighting'
    },
    '동물': {
      base: 'wildlife photography clean background professional animal portrait real animal photo',
      style: 'natural animal behavior authentic wildlife moment Korean native species',
      lighting: 'natural outdoor lighting animal photography soft natural light'
    },
    '자연': {
      base: 'nature photography clean composition professional photo real scenery',
      style: 'Korean landscape natural beauty scenic vista mountains rivers',
      lighting: 'golden hour lighting natural landscape photography atmospheric mood'
    }
  };

  const photoConfig = categoryPhotography[actualCategory] || {
    base: 'professional photo white background',
    style: 'clean professional photography',
    lighting: 'studio lighting'
  };

  const fullStyle = `${photoConfig.base}, ${photoConfig.style}, ${photoConfig.lighting}`;

  console.log(`📸 Photography style applied: ${actualCategory} → ${photoConfig.style}`);

  return `${prompt}, ${fullStyle}, ${baseEnhancements}, ${negativePrompts}`;
}

/**
 * DELETE /admin/delete-image
 * Delete a generated image file
 */
router.delete('/delete-image', authenticateAdmin, logAdminActivity('DELETE_IMAGE', 'image'), asyncHandler(async (
  req: AdminAuthenticatedRequest,
  res: Response
) => {
  const { filename } = req.body;

  if (!filename) {
    throw createError('파일명이 필요합니다', 400, 'FILENAME_REQUIRED');
  }

  try {
    const imagePath = path.join(process.cwd(), 'public', 'images', 'quiz', filename);

    // Check if file exists
    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
      console.log('🗑️ Deleted image:', filename);
    }

    res.json({
      success: true,
      message: '이미지가 삭제되었습니다'
    });

  } catch (error) {
    console.error('Image deletion error:', error);
    throw createError('이미지 삭제 중 오류가 발생했습니다', 500, 'IMAGE_DELETION_ERROR');
  }
}));

/**
 * GET /admin/ai-prompts
 * Get all AI prompt templates with pagination
 */
router.get('/ai-prompts', authenticateAdmin, asyncHandler(async (
  req: AdminAuthenticatedRequest,
  res: Response
) => {
  const page = parseInt(req.query.page as string) || 1;
  const perPage = Math.min(parseInt(req.query.per_page as string) || 20, 100);
  const offset = (page - 1) * perPage;

  const category = req.query.category as string;
  const active = req.query.active as string;

  let whereClause = '1=1';
  const params: any[] = [];
  let paramIndex = 1;

  if (category) {
    whereClause += ` AND category = $${paramIndex}`;
    params.push(category);
    paramIndex++;
  }

  if (active !== undefined) {
    whereClause += ` AND is_active = $${paramIndex}`;
    params.push(active === 'true');
    paramIndex++;
  }

  params.push(perPage, offset);

  const prompts = await db.query(
    `SELECT * FROM ai_prompt_templates
     WHERE ${whereClause}
     ORDER BY is_default DESC, created_at DESC
     LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    params
  );

  const [total] = await db.query(
    `SELECT COUNT(*) as count FROM ai_prompt_templates WHERE ${whereClause}`,
    params.slice(0, -2)
  );

  await logAdminActivity(req.admin.id, 'ai_prompts_list');

  res.json({
    success: true,
    data: prompts,
    pagination: {
      page,
      per_page: perPage,
      total: total.count,
      total_pages: Math.ceil(total.count / perPage)
    }
  });
}));

/**
 * POST /admin/ai-prompts
 * Create a new AI prompt template
 */
router.post('/ai-prompts', authenticateAdmin, asyncHandler(async (
  req: AdminAuthenticatedRequest,
  res: Response
) => {
  const data = aiPromptTemplateSchema.parse(req.body);

  const prompt = await db.query(
    `INSERT INTO ai_prompt_templates (
      id, title, description, korean_prompt, english_prompt,
      category, is_active, is_default, created_at, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
    RETURNING *`,
    [
      uuidv4(),
      data.title,
      data.description,
      data.korean_prompt,
      data.english_prompt,
      data.category,
      data.is_active,
      data.is_default
    ]
  );

  await logAdminActivity(req.admin.id, 'ai_prompt_create', { prompt_id: prompt[0].id });

  res.status(201).json({
    success: true,
    data: prompt[0],
    message: 'AI 프롬프트 템플릿이 생성되었습니다'
  });
}));

/**
 * PUT /admin/ai-prompts/:id
 * Update an AI prompt template
 */
router.put('/ai-prompts/:id', authenticateAdmin, asyncHandler(async (
  req: AdminAuthenticatedRequest,
  res: Response
) => {
  const { id } = req.params;
  const data = aiPromptTemplateSchema.parse(req.body);

  const prompt = await db.query(
    `UPDATE ai_prompt_templates
     SET title = $1, description = $2, korean_prompt = $3, english_prompt = $4,
         category = $5, is_active = $6, is_default = $7, updated_at = NOW()
     WHERE id = $8
     RETURNING *`,
    [
      data.title,
      data.description,
      data.korean_prompt,
      data.english_prompt,
      data.category,
      data.is_active,
      data.is_default,
      id
    ]
  );

  if (prompt.length === 0) {
    throw createError('프롬프트 템플릿을 찾을 수 없습니다', 404, 'PROMPT_NOT_FOUND');
  }

  await logAdminActivity(req.admin.id, 'ai_prompt_update', { prompt_id: id });

  res.json({
    success: true,
    data: prompt[0],
    message: 'AI 프롬프트 템플릿이 수정되었습니다'
  });
}));

/**
 * DELETE /admin/ai-prompts/:id
 * Delete an AI prompt template
 */
router.delete('/ai-prompts/:id', authenticateAdmin, asyncHandler(async (
  req: AdminAuthenticatedRequest,
  res: Response
) => {
  const { id } = req.params;

  const prompt = await db.query(
    'SELECT * FROM ai_prompt_templates WHERE id = $1',
    [id]
  );

  if (prompt.length === 0) {
    throw createError('프롬프트 템플릿을 찾을 수 없습니다', 404, 'PROMPT_NOT_FOUND');
  }

  // Don't allow deletion of default prompts
  if (prompt[0].is_default) {
    throw createError('기본 프롬프트 템플릿은 삭제할 수 없습니다', 400, 'CANNOT_DELETE_DEFAULT');
  }

  await db.query('DELETE FROM ai_prompt_templates WHERE id = $1', [id]);

  await logAdminActivity(req.admin.id, 'ai_prompt_delete', { prompt_id: id });

  res.json({
    success: true,
    message: 'AI 프롬프트 템플릿이 삭제되었습니다'
  });
}));

/**
 * GET /admin/ai-prompts/categories
 * Get all unique categories from AI prompt templates
 */
router.get('/ai-prompts/categories', authenticateAdmin, asyncHandler(async (
  req: AdminAuthenticatedRequest,
  res: Response
) => {
  const categories = await db.query(
    'SELECT DISTINCT category FROM ai_prompt_templates WHERE is_active = true ORDER BY category'
  );

  res.json({
    success: true,
    data: categories.map(cat => cat.category)
  });
}));

/**
 * GET /admin/all-quizzes
 * Get all quizzes from both trait_pairs and ab_quizzes systems with unified format
 */
router.get('/all-quizzes', authenticateAdmin, asyncHandler(async (
  req: AdminAuthenticatedRequest,
  res: Response
) => {
  const page = parseInt(req.query.page as string) || 1;
  const perPage = Math.min(parseInt(req.query.per_page as string) || 20, 100);
  const offset = (page - 1) * perPage;

  const category = req.query.category as string;
  const active = req.query.active as string;
  const search = req.query.search as string;
  const useMock = process.env.USE_MOCK_RING_SERVICE === 'true';

  let quizzes;
  let totalCount;

  if (useMock) {
    // Mock 퀴즈 데이터 (trait_pairs + ab_quizzes 통합)
    const mockQuizzes = [
      // Mock AB Quizzes (5개)
      {
        id: 'quiz-1',
        quiz_type: 'ab_quiz',
        source: 'User Created',
        category: 'food',
        title: '짜장면 vs 짬뽕',
        left_option: '짜장면',
        right_option: '짬뽕',
        left_image: null,
        right_image: null,
        is_active: true,
        created_at: new Date('2025-01-15'),
        creator_info: 'admin'
      },
      {
        id: 'quiz-2',
        quiz_type: 'ab_quiz',
        source: 'User Created',
        category: 'lifestyle',
        title: '아침형 vs 저녁형',
        left_option: '아침형 인간',
        right_option: '저녁형 인간',
        left_image: null,
        right_image: null,
        is_active: true,
        created_at: new Date('2025-01-14'),
        creator_info: 'admin'
      },
      {
        id: 'quiz-3',
        quiz_type: 'ab_quiz',
        source: 'User Created',
        category: 'food',
        title: '치킨 vs 피자',
        left_option: '치킨',
        right_option: '피자',
        left_image: null,
        right_image: null,
        is_active: true,
        created_at: new Date('2025-01-13'),
        creator_info: 'admin'
      },
      {
        id: 'quiz-4',
        quiz_type: 'ab_quiz',
        source: 'User Created',
        category: 'hobby',
        title: '독서 vs 영화',
        left_option: '독서',
        right_option: '영화 감상',
        left_image: null,
        right_image: null,
        is_active: true,
        created_at: new Date('2025-01-12'),
        creator_info: 'admin'
      },
      {
        id: 'quiz-5',
        quiz_type: 'ab_quiz',
        source: 'User Created',
        category: 'lifestyle',
        title: '커피 vs 차',
        left_option: '커피',
        right_option: '차',
        left_image: null,
        right_image: null,
        is_active: false,
        created_at: new Date('2025-01-11'),
        creator_info: 'admin'
      },
      // Mock Trait Pairs (5개)
      {
        id: 'pair-1',
        quiz_type: 'trait_pair',
        source: 'System Generated',
        category: 'hobby',
        title: 'indoor_outdoor',
        left_option: '실내활동',
        right_option: '야외활동',
        left_image: null,
        right_image: null,
        is_active: true,
        created_at: new Date('2025-01-10'),
        creator_info: null
      },
      {
        id: 'pair-2',
        quiz_type: 'trait_pair',
        source: 'System Generated',
        category: 'lifestyle',
        title: 'planning_spontaneous',
        left_option: '계획적',
        right_option: '즉흥적',
        left_image: null,
        right_image: null,
        is_active: true,
        created_at: new Date('2025-01-08'),
        creator_info: null
      },
      {
        id: 'pair-3',
        quiz_type: 'trait_pair',
        source: 'System Generated',
        category: 'nature',
        title: 'city_nature',
        left_option: '도시',
        right_option: '자연',
        left_image: null,
        right_image: null,
        is_active: true,
        created_at: new Date('2025-01-07'),
        creator_info: null
      },
      {
        id: 'pair-4',
        quiz_type: 'trait_pair',
        source: 'System Generated',
        category: 'hobby',
        title: 'active_passive',
        left_option: '활동적인 취미',
        right_option: '정적인 취미',
        left_image: null,
        right_image: null,
        is_active: true,
        created_at: new Date('2025-01-06'),
        creator_info: null
      },
      {
        id: 'pair-5',
        quiz_type: 'trait_pair',
        source: 'System Generated',
        category: 'food',
        title: 'spicy_mild',
        left_option: '매운맛',
        right_option: '순한맛',
        left_image: null,
        right_image: null,
        is_active: false,
        created_at: new Date('2025-01-05'),
        creator_info: null
      }
    ];

    // 필터링 적용
    let filtered = [...mockQuizzes];

    // 카테고리 필터
    if (category) {
      filtered = filtered.filter(q => q.category === category);
    }

    // 활성 상태 필터
    if (active !== undefined) {
      const isActive = active === 'true';
      filtered = filtered.filter(q => q.is_active === isActive);
    }

    // 검색 필터
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(q =>
        q.title.toLowerCase().includes(searchLower) ||
        q.left_option.toLowerCase().includes(searchLower) ||
        q.right_option.toLowerCase().includes(searchLower)
      );
    }

    totalCount = filtered.length;

    // 페이지네이션 적용
    quizzes = filtered.slice(offset, offset + perPage);

  } else {
    // Real database query (기존 코드 유지)
    let whereClauseAB = '1=1';
    let whereClauseTP = '1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (category) {
      whereClauseAB += ` AND category = $${paramIndex}`;
      whereClauseTP += ` AND category = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }

    if (active !== undefined) {
      whereClauseAB += ` AND is_active = $${paramIndex}`;
      whereClauseTP += ` AND is_active = $${paramIndex}`;
      params.push(active === 'true');
      paramIndex++;
    }

    if (search) {
      whereClauseAB += ` AND (
        title ILIKE $${paramIndex} OR
        option_a_title ILIKE $${paramIndex} OR
        option_b_title ILIKE $${paramIndex}
      )`;
      whereClauseTP += ` AND (
        key ILIKE $${paramIndex} OR
        left_label ILIKE $${paramIndex} OR
        right_label ILIKE $${paramIndex}
      )`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    const allParams = [...params, perPage, offset];

    const unifiedQuery = `
      WITH unified_quizzes AS (
        SELECT
          id,
          'ab_quiz' as quiz_type,
          'User Created' as source,
          category,
          title,
          option_a_title as left_option,
          option_b_title as right_option,
          option_a_image as left_image,
          option_b_image as right_image,
          is_active,
          created_at,
          (SELECT email FROM admins WHERE id = created_by) as creator_info
        FROM ab_quizzes
        WHERE ${whereClauseAB}

        UNION ALL

        SELECT
          id,
          'trait_pair' as quiz_type,
          'System Generated' as source,
          category,
          key as title,
          left_label as left_option,
          right_label as right_option,
          NULL as left_image,
          NULL as right_image,
          is_active,
          created_at,
          NULL as creator_info
        FROM trait_pairs
        WHERE ${whereClauseTP}
      )
      SELECT * FROM unified_quizzes
      ORDER BY created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    quizzes = await db.query(unifiedQuery, allParams);

    const countQuery = `
      WITH unified_quizzes AS (
        SELECT id FROM ab_quizzes WHERE ${whereClauseAB}
        UNION ALL
        SELECT id FROM trait_pairs WHERE ${whereClauseTP}
      )
      SELECT COUNT(*) as count FROM unified_quizzes
    `;

    const [total] = await db.query(countQuery, params);
    totalCount = total?.count || 0;
  }

  // 통계 계산
  const stats = {
    total: totalCount,
    ab_quizzes: quizzes.filter(q => q.quiz_type === 'ab_quiz').length,
    trait_pairs: quizzes.filter(q => q.quiz_type === 'trait_pair').length,
    active: quizzes.filter(q => q.is_active).length,
    inactive: quizzes.filter(q => !q.is_active).length
  };

  const response: ApiResponse = {
    success: true,
    data: {
      quizzes,
      stats,
      pagination: {
        page,
        per_page: perPage,
        total: totalCount,
        has_next: offset + perPage < totalCount,
        has_prev: page > 1
      }
    },
    timestamp: new Date().toISOString()
  };

  res.json(response);
}));

export default router;
