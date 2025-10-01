import { Router, Response } from 'express';
import { z } from 'zod';
import { AdminAuthenticatedRequest, authenticateAdmin, requireSuperAdmin, logAdminActivity } from '../middleware/adminAuth';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { adminAuthService } from '../services/adminAuthService';
import { ApiResponse } from '../types/database';

const router = Router();

// Validation schemas
const loginSchema = z.object({
  username: z.string().min(1, '사용자명을 입력해주세요'),
  password: z.string().min(1, '비밀번호를 입력해주세요')
});

const createAdminSchema = z.object({
  username: z.string().min(3, '사용자명은 3자 이상이어야 합니다').max(50),
  email: z.string().email('유효한 이메일 주소를 입력해주세요'),
  password: z.string().min(6, '비밀번호는 6자 이상이어야 합니다'),
  name: z.string().min(1, '이름을 입력해주세요').max(100),
  role: z.enum(['admin', 'superadmin'])
});

const updateAdminSchema = z.object({
  email: z.string().email().optional(),
  name: z.string().min(1).max(100).optional(),
  role: z.enum(['admin', 'superadmin']).optional(),
  is_active: z.boolean().optional()
});

const changePasswordSchema = z.object({
  current_password: z.string().min(1, '현재 비밀번호를 입력해주세요'),
  new_password: z.string().min(6, '새 비밀번호는 6자 이상이어야 합니다')
});

/**
 * POST /admin-auth/login
 * Admin login
 */
router.post('/login', asyncHandler(async (req: AdminAuthenticatedRequest, res: Response) => {
  const body = loginSchema.parse(req.body);

  const result = await adminAuthService.login(
    body,
    req.ip,
    req.get('User-Agent')
  );

  const response: ApiResponse = {
    success: true,
    data: result,
    timestamp: new Date().toISOString()
  };

  res.json(response);
}));

/**
 * POST /admin-auth/logout
 * Admin logout
 */
router.post('/logout', authenticateAdmin, asyncHandler(async (req: AdminAuthenticatedRequest, res: Response) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    await adminAuthService.logout(token);
  }

  const response: ApiResponse = {
    success: true,
    message: '로그아웃되었습니다',
    timestamp: new Date().toISOString()
  };

  res.json(response);
}));

/**
 * GET /admin-auth/me
 * Get current admin info
 */
router.get('/me', authenticateAdmin, asyncHandler(async (req: AdminAuthenticatedRequest, res: Response) => {
  const response: ApiResponse = {
    success: true,
    data: { admin: req.admin },
    timestamp: new Date().toISOString()
  };

  res.json(response);
}));

/**
 * POST /admin-auth/admins
 * Create new admin (superadmin only)
 */
router.post('/admins',
  authenticateAdmin,
  requireSuperAdmin,
  logAdminActivity('CREATE_ADMIN', 'admin_user'),
  asyncHandler(async (req: AdminAuthenticatedRequest, res: Response) => {
    const body = createAdminSchema.parse(req.body);

    const admin = await adminAuthService.createAdmin(body, req.adminId!);

    const response: ApiResponse = {
      success: true,
      data: { admin },
      message: '관리자가 성공적으로 생성되었습니다',
      timestamp: new Date().toISOString()
    };

    res.json(response);
  })
);

/**
 * GET /admin-auth/admins
 * Get all admins (superadmin only)
 */
router.get('/admins',
  authenticateAdmin,
  requireSuperAdmin,
  asyncHandler(async (req: AdminAuthenticatedRequest, res: Response) => {
    const admins = await adminAuthService.db.query(
      `SELECT id, username, email, name, role, is_active, last_login_at, created_at, updated_at
       FROM admin_users
       ORDER BY created_at DESC`
    );

    const response: ApiResponse = {
      success: true,
      data: { admins },
      timestamp: new Date().toISOString()
    };

    res.json(response);
  })
);

/**
 * PUT /admin-auth/admins/:id
 * Update admin (superadmin or self)
 */
router.put('/admins/:id',
  authenticateAdmin,
  logAdminActivity('UPDATE_ADMIN', 'admin_user'),
  asyncHandler(async (req: AdminAuthenticatedRequest, res: Response) => {
    const adminId = req.params.id;
    const body = updateAdminSchema.parse(req.body);

    const admin = await adminAuthService.updateAdmin(adminId, body, req.adminId!);

    const response: ApiResponse = {
      success: true,
      data: { admin },
      message: '관리자 정보가 수정되었습니다',
      timestamp: new Date().toISOString()
    };

    res.json(response);
  })
);

/**
 * POST /admin-auth/change-password
 * Change admin password
 */
router.post('/change-password',
  authenticateAdmin,
  logAdminActivity('CHANGE_PASSWORD'),
  asyncHandler(async (req: AdminAuthenticatedRequest, res: Response) => {
    const body = changePasswordSchema.parse(req.body);

    await adminAuthService.changePassword(
      req.adminId!,
      body.current_password,
      body.new_password
    );

    const response: ApiResponse = {
      success: true,
      message: '비밀번호가 변경되었습니다. 다시 로그인해주세요.',
      timestamp: new Date().toISOString()
    };

    res.json(response);
  })
);

/**
 * GET /admin-auth/activity-log
 * Get admin activity log
 */
router.get('/activity-log',
  authenticateAdmin,
  asyncHandler(async (req: AdminAuthenticatedRequest, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const perPage = Math.min(parseInt(req.query.per_page as string) || 50, 100);
    const offset = (page - 1) * perPage;

    // Superadmins can see all activity, admins can only see their own
    const adminId = req.admin!.role === 'superadmin' ? undefined : req.adminId;

    const activities = await adminAuthService.getActivityLog(adminId, perPage, offset);

    const [total] = await adminAuthService.db.query(
      adminId
        ? 'SELECT COUNT(*) as count FROM admin_activity_log WHERE admin_id = $1'
        : 'SELECT COUNT(*) as count FROM admin_activity_log',
      adminId ? [adminId] : []
    );

    const response: ApiResponse = {
      success: true,
      data: {
        activities,
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
  })
);

/**
 * POST /admin-auth/clean-sessions
 * Clean expired sessions (superadmin only)
 */
router.post('/clean-sessions',
  authenticateAdmin,
  requireSuperAdmin,
  logAdminActivity('CLEAN_SESSIONS'),
  asyncHandler(async (req: AdminAuthenticatedRequest, res: Response) => {
    await adminAuthService.cleanExpiredSessions();

    const response: ApiResponse = {
      success: true,
      message: '만료된 세션이 정리되었습니다',
      timestamp: new Date().toISOString()
    };

    res.json(response);
  })
);

export default router;