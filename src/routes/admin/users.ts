import { Router, Response } from 'express';
import { z } from 'zod';
import { AdminAuthenticatedRequest, authenticateAdmin } from '../../middleware/adminAuth';
import { asyncHandler, createError } from '../../middleware/errorHandler';
import { ApiResponse } from '../../types/api';
import { db } from '../../utils/database';

const router = Router();

// Validation schemas
const getUsersQuerySchema = z.object({
  page: z.string().optional().default('1'),
  limit: z.string().optional().default('20'),
  search: z.string().optional(),
  status: z.enum(['all', 'active', 'inactive']).optional().default('all')
});

const updateUserSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  display_name: z.string().min(1).max(50).optional(),
  is_active: z.boolean().optional()
});

/**
 * GET /admin/users
 * Get paginated users list with filters
 */
router.get('/', authenticateAdmin, asyncHandler(async (
  req: AdminAuthenticatedRequest,
  res: Response
) => {
  console.log('👥 [AdminUsersRoute] GET /admin/users 요청 시작');

  const query = getUsersQuerySchema.parse(req.query);
  const page = parseInt(query.page);
  const limit = parseInt(query.limit);
  const offset = (page - 1) * limit;

  try {
    // Build base query
    let whereConditions = [];
    let queryParams: any[] = [];
    let paramIndex = 1;

    // Status filter
    if (query.status !== 'all') {
      whereConditions.push(`is_active = $${paramIndex++}`);
      queryParams.push(query.status === 'active');
    }

    // Search filter
    if (query.search && query.search.trim()) {
      whereConditions.push(`(name ILIKE $${paramIndex} OR display_name ILIKE $${paramIndex})`);
      queryParams.push(`%${query.search.trim()}%`);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM users ${whereClause}`;
    const countResult = await db.queryOne(countQuery, queryParams);
    const total = parseInt(countResult?.total || '0');

    // Get users with additional info
    const usersQuery = `
      SELECT
        u.id,
        u.name,
        u.display_name,
        u.is_active,
        u.created_at,
        u.updated_at,
        COUNT(DISTINCT up.id) as photo_count,
        COUNT(DISTINCT CASE WHEN up.moderation_status = 'APPROVED' THEN up.id END) as approved_photos,
        COUNT(DISTINCT ut.id) as trait_responses,
        COUNT(DISTINCT qr.id) as quiz_responses,
        MAX(a.score) as max_affinity_score
      FROM users u
      LEFT JOIN user_photos up ON u.id = up.user_id
      LEFT JOIN user_traits ut ON u.id = ut.user_id
      LEFT JOIN quiz_responses qr ON u.id = qr.user_id
      LEFT JOIN affinity a ON u.id = a.target_id
      ${whereClause}
      GROUP BY u.id, u.name, u.display_name, u.is_active, u.created_at, u.updated_at
      ORDER BY u.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    queryParams.push(limit, offset);
    const users = await db.query(usersQuery, queryParams);

    const response: ApiResponse = {
      success: true,
      data: {
        users: users.map(user => ({
          id: user.id,
          name: user.name,
          display_name: user.display_name,
          is_active: user.is_active,
          created_at: user.created_at,
          updated_at: user.updated_at,
          stats: {
            photo_count: parseInt(user.photo_count) || 0,
            approved_photos: parseInt(user.approved_photos) || 0,
            trait_responses: parseInt(user.trait_responses) || 0,
            quiz_responses: parseInt(user.quiz_responses) || 0,
            max_affinity_score: parseInt(user.max_affinity_score) || 0
          }
        })),
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        },
        filters: {
          search: query.search,
          status: query.status
        }
      },
      timestamp: new Date().toISOString()
    };

    console.log('✅ [AdminUsersRoute] 유저 목록 조회 성공:', {
      userCount: users.length,
      total,
      page
    });

    res.json(response);
  } catch (error: any) {
    console.error('❌ [AdminUsersRoute] 유저 목록 조회 오류:', error);
    throw error;
  }
}));

/**
 * GET /admin/users/:userId
 * Get detailed user information
 */
router.get('/:userId', authenticateAdmin, asyncHandler(async (
  req: AdminAuthenticatedRequest,
  res: Response
) => {
  console.log('👤 [AdminUsersRoute] GET /admin/users/:userId 요청 시작');

  const { userId } = req.params;

  if (!userId) {
    throw createError('사용자 ID가 필요합니다', 400, 'MISSING_USER_ID');
  }

  try {
    // Get user basic info
    const userQuery = `
      SELECT
        id, name, display_name, is_active,
        created_at, updated_at
      FROM users
      WHERE id = $1
    `;
    const user = await db.queryOne(userQuery, [userId]);

    if (!user) {
      throw createError('사용자를 찾을 수 없습니다', 404, 'USER_NOT_FOUND');
    }

    // Get user photos
    const photosQuery = `
      SELECT
        up.id, up.moderation_status, up.created_at,
        pa.variant, pa.storage_key
      FROM user_photos up
      LEFT JOIN photo_assets pa ON up.id = pa.photo_id
      WHERE up.user_id = $1
      ORDER BY up.created_at DESC
    `;
    const photos = await db.query(photosQuery, [userId]);

    // Get user trait responses
    const traitsQuery = `
      SELECT
        ut.id, ut.choice, ut.created_at,
        tp.left_label, tp.right_label, tp.key
      FROM user_traits ut
      JOIN trait_pairs tp ON ut.pair_id = tp.id
      WHERE ut.user_id = $1
      ORDER BY ut.created_at DESC
      LIMIT 10
    `;
    const traits = await db.query(traitsQuery, [userId]);

    // Get user quiz responses
    const quizQuery = `
      SELECT
        qr.id, qr.selected_option, qr.created_at,
        aq.title, aq.option_a_title, aq.option_b_title
      FROM quiz_responses qr
      JOIN ab_quizzes aq ON qr.quiz_id = aq.id
      WHERE qr.user_id = $1
      ORDER BY qr.created_at DESC
      LIMIT 10
    `;
    const quizzes = await db.query(quizQuery, [userId]);

    // Get affinity data (as target)
    const affinityQuery = `
      SELECT
        a.viewer_id, a.score, a.stages_unlocked,
        u.name as viewer_name, u.display_name as viewer_display_name
      FROM affinity a
      JOIN users u ON a.viewer_id = u.id
      WHERE a.target_id = $1
      ORDER BY a.score DESC
      LIMIT 10
    `;
    const affinity = await db.query(affinityQuery, [userId]);

    // Calculate photo statistics
    const totalPhotos = photos.length;
    const approvedPhotos = photos.filter(p => p.moderation_status === 'APPROVED').length;
    const pendingPhotos = photos.filter(p => p.moderation_status === 'PENDING').length;
    const rejectedPhotos = photos.filter(p => p.moderation_status === 'REJECTED').length;

    const response: ApiResponse = {
      success: true,
      data: {
        user: {
          id: user.id,
          name: user.name,
          display_name: user.display_name,
          is_active: user.is_active,
          created_at: user.created_at,
          updated_at: user.updated_at,
          stats: {
            total_photos: totalPhotos,
            approved_photos: approvedPhotos,
            pending_photos: pendingPhotos,
            rejected_photos: rejectedPhotos
          }
        },
        photos: photos.map(photo => ({
          id: photo.id,
          moderation_status: photo.moderation_status,
          variant: photo.variant,
          storage_key: photo.storage_key,
          created_at: photo.created_at
        })),
        traits: traits.map(trait => ({
          id: trait.id,
          choice: trait.choice,
          trait_key: trait.key,
          left_label: trait.left_label,
          right_label: trait.right_label,
          created_at: trait.created_at
        })),
        quizzes: quizzes.map(quiz => ({
          id: quiz.id,
          selected_option: quiz.selected_option,
          title: quiz.title,
          option_a_title: quiz.option_a_title,
          option_b_title: quiz.option_b_title,
          created_at: quiz.created_at
        })),
        affinity: {
          towards_user: affinity.map(aff => ({
            viewer_id: aff.viewer_id,
            viewer_name: aff.viewer_name,
            viewer_display_name: aff.viewer_display_name,
            score: aff.score,
            stages_unlocked: aff.stages_unlocked
          })),
          from_user: [] // TODO: 이 유저가 다른 사람에게 보낸 호감도
        },
        stats: {
          photo_count: totalPhotos,
          trait_responses: traits.length,
          quiz_responses: quizzes.length,
          affinity_received: affinity.length
        }
      },
      timestamp: new Date().toISOString()
    };

    console.log('✅ [AdminUsersRoute] 유저 상세 조회 성공:', { userId, stats: response.data.stats });

    res.json(response);
  } catch (error: any) {
    console.error('❌ [AdminUsersRoute] 유저 상세 조회 오류:', error);
    throw error;
  }
}));

/**
 * PUT /admin/users/:userId
 * Update user information
 */
router.put('/:userId', authenticateAdmin, asyncHandler(async (
  req: AdminAuthenticatedRequest,
  res: Response
) => {
  console.log('✏️ [AdminUsersRoute] PUT /admin/users/:userId 요청 시작');

  const { userId } = req.params;
  const updateData = updateUserSchema.parse(req.body);

  if (!userId) {
    throw createError('사용자 ID가 필요합니다', 400, 'MISSING_USER_ID');
  }

  if (Object.keys(updateData).length === 0) {
    throw createError('업데이트할 데이터가 없습니다', 400, 'NO_UPDATE_DATA');
  }

  try {
    // Check if user exists
    const existingUser = await db.queryOne('SELECT id FROM users WHERE id = $1', [userId]);
    if (!existingUser) {
      throw createError('사용자를 찾을 수 없습니다', 404, 'USER_NOT_FOUND');
    }

    // Build update query
    const updateFields = [];
    const updateValues = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(updateData)) {
      if (value !== undefined) {
        updateFields.push(`${key} = $${paramIndex++}`);
        updateValues.push(value);
      }
    }

    updateFields.push(`updated_at = $${paramIndex}`);
    updateValues.push(new Date());

    const updateQuery = `
      UPDATE users
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex + 1}
      RETURNING id, name, display_name, is_active, updated_at
    `;
    updateValues.push(userId);

    const updatedUser = await db.queryOne(updateQuery, updateValues);

    console.log('✅ [AdminUsersRoute] 유저 업데이트 성공:', {
      userId,
      updatedFields: Object.keys(updateData)
    });

    const response: ApiResponse = {
      success: true,
      data: {
        user: updatedUser,
        updated_fields: Object.keys(updateData)
      },
      timestamp: new Date().toISOString()
    };

    res.json(response);
  } catch (error: any) {
    console.error('❌ [AdminUsersRoute] 유저 업데이트 오류:', error);
    throw error;
  }
}));

/**
 * DELETE /admin/users/:userId
 * Deactivate user (soft delete)
 */
router.delete('/:userId', authenticateAdmin, asyncHandler(async (
  req: AdminAuthenticatedRequest,
  res: Response
) => {
  console.log('🗑️ [AdminUsersRoute] DELETE /admin/users/:userId 요청 시작');

  const { userId } = req.params;

  if (!userId) {
    throw createError('사용자 ID가 필요합니다', 400, 'MISSING_USER_ID');
  }

  try {
    // Check if user exists and is active
    const existingUser = await db.queryOne(
      'SELECT id, name, is_active FROM users WHERE id = $1',
      [userId]
    );

    if (!existingUser) {
      throw createError('사용자를 찾을 수 없습니다', 404, 'USER_NOT_FOUND');
    }

    if (!existingUser.is_active) {
      throw createError('이미 비활성화된 사용자입니다', 400, 'USER_ALREADY_INACTIVE');
    }

    // Soft delete by setting is_active to false
    const deactivateQuery = `
      UPDATE users
      SET is_active = false, updated_at = $1
      WHERE id = $2
      RETURNING id, name, display_name, is_active
    `;

    const deactivatedUser = await db.queryOne(deactivateQuery, [new Date(), userId]);

    console.log('✅ [AdminUsersRoute] 유저 비활성화 성공:', {
      userId,
      userName: deactivatedUser.name
    });

    const response: ApiResponse = {
      success: true,
      data: {
        user: deactivatedUser,
        message: '사용자가 비활성화되었습니다'
      },
      timestamp: new Date().toISOString()
    };

    res.json(response);
  } catch (error: any) {
    console.error('❌ [AdminUsersRoute] 유저 비활성화 오류:', error);
    throw error;
  }
}));

/**
 * POST /admin/users/:userId/activate
 * Reactivate user
 */
router.post('/:userId/activate', authenticateAdmin, asyncHandler(async (
  req: AdminAuthenticatedRequest,
  res: Response
) => {
  console.log('🔄 [AdminUsersRoute] POST /admin/users/:userId/activate 요청 시작');

  const { userId } = req.params;

  if (!userId) {
    throw createError('사용자 ID가 필요합니다', 400, 'MISSING_USER_ID');
  }

  try {
    // Check if user exists and is inactive
    const existingUser = await db.queryOne(
      'SELECT id, name, is_active FROM users WHERE id = $1',
      [userId]
    );

    if (!existingUser) {
      throw createError('사용자를 찾을 수 없습니다', 404, 'USER_NOT_FOUND');
    }

    if (existingUser.is_active) {
      throw createError('이미 활성화된 사용자입니다', 400, 'USER_ALREADY_ACTIVE');
    }

    // Reactivate user
    const activateQuery = `
      UPDATE users
      SET is_active = true, updated_at = $1
      WHERE id = $2
      RETURNING id, name, display_name, is_active
    `;

    const activatedUser = await db.queryOne(activateQuery, [new Date(), userId]);

    console.log('✅ [AdminUsersRoute] 유저 활성화 성공:', {
      userId,
      userName: activatedUser.name
    });

    const response: ApiResponse = {
      success: true,
      data: {
        user: activatedUser,
        message: '사용자가 활성화되었습니다'
      },
      timestamp: new Date().toISOString()
    };

    res.json(response);
  } catch (error: any) {
    console.error('❌ [AdminUsersRoute] 유저 활성화 오류:', error);
    throw error;
  }
}));

export default router;