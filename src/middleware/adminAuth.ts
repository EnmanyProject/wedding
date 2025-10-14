import { Request, Response, NextFunction } from 'express';
import { adminAuthService, AdminUser } from '../services/adminAuthService';
import { createError } from './errorHandler';

export interface AdminAuthenticatedRequest extends Request {
  admin?: AdminUser;
  adminId?: string;
}

/**
 * Admin authentication middleware
 */
export const authenticateAdmin = async (
  req: AdminAuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // 🔧 DEV MODE: Skip authentication for development convenience
    if (process.env.NODE_ENV === 'development') {
      const authHeader = req.headers.authorization;

      // Check if this is a dev token
      if (authHeader && authHeader.includes('dev-admin-token')) {
        console.log('🔧 [DEV] Admin auth bypassed for development');

        // Create fake admin user for development (using valid UUID format)
        req.admin = {
          id: '00000000-0000-0000-0000-000000000001',
          username: 'dev-admin',
          name: 'Dev Admin',
          role: 'super_admin',
          is_active: true,
          created_at: new Date(),
          updated_at: new Date()
        } as AdminUser;
        req.adminId = '00000000-0000-0000-0000-000000000001';

        return next();
      }
    }

    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw createError('관리자 인증이 필요합니다', 401, 'ADMIN_AUTH_REQUIRED');
    }

    const token = authHeader.substring(7);
    const admin = await adminAuthService.verifyToken(token);

    if (!admin) {
      throw createError('유효하지 않은 관리자 토큰입니다', 401, 'INVALID_ADMIN_TOKEN');
    }

    req.admin = admin;
    req.adminId = admin.id;

    next();
  } catch (error: any) {
    if (error.statusCode) {
      throw error;
    }
    throw createError('관리자 인증 실패', 401, 'ADMIN_AUTH_FAILED');
  }
};

/**
 * Require superadmin role
 */
export const requireSuperAdmin = (
  req: AdminAuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.admin || req.admin.role !== 'superadmin') {
    throw createError('슈퍼관리자 권한이 필요합니다', 403, 'SUPERADMIN_REQUIRED');
  }
  next();
};

/**
 * Admin activity logging middleware
 */
export const logAdminActivity = (action: string, resourceType?: string) => {
  return async (
    req: AdminAuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    // Store original json method
    const originalJson = res.json;

    // Override json method to log activity after successful response
    res.json = function(body: any) {
      if (req.admin && res.statusCode >= 200 && res.statusCode < 300) {
        setImmediate(async () => {
          try {
            const resourceId = req.params.id || req.body?.id || body?.data?.id;
            const details = {
              method: req.method,
              url: req.originalUrl,
              body: req.method !== 'GET' ? req.body : undefined,
              response_status: res.statusCode
            };

            await adminAuthService.logActivity(
              req.admin!.id,
              action,
              resourceType,
              resourceId,
              details,
              req.ip,
              req.get('User-Agent')
            );
          } catch (error) {
            console.error('Failed to log admin activity:', error);
          }
        });
      }

      return originalJson.call(this, body);
    };

    next();
  };
};