import { Database } from '../utils/database';
import { config } from '../utils/config';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

export interface AdminUser {
  id: string;
  username: string;
  email: string;
  name: string;
  role: 'admin' | 'superadmin';
  is_active: boolean;
  last_login_at?: string;
  created_at: string;
  updated_at: string;
}

export interface AdminLoginRequest {
  username: string;
  password: string;
}

export interface AdminLoginResponse {
  admin: Omit<AdminUser, 'password_hash'>;
  token: string;
  expires_at: string;
}

export class AdminAuthService {
  private db: Database;

  constructor() {
    this.db = Database.getInstance();
  }

  /**
   * Admin login
   */
  async login(request: AdminLoginRequest, ipAddress?: string, userAgent?: string): Promise<AdminLoginResponse> {
    const { username, password } = request;

    // Hash the provided password
    const passwordHash = crypto.createHash('sha256').update(password).digest('hex');

    // Find admin user
    const [admin] = await this.db.query<AdminUser>(
      `SELECT * FROM admin_users
       WHERE (username = $1 OR email = $1)
       AND password_hash = $2
       AND is_active = true`,
      [username, passwordHash]
    );

    if (!admin) {
      throw new Error('잘못된 사용자명 또는 비밀번호입니다');
    }

    // Generate JWT token
    const tokenPayload = {
      adminId: admin.id,
      username: admin.username,
      role: admin.role,
      type: 'admin'
    };

    const token = jwt.sign(tokenPayload, config.JWT_SECRET, {
      expiresIn: '8h', // Admin sessions expire in 8 hours
      issuer: 'ab-wedding-admin'
    });

    // Store session in database
    const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000); // 8 hours
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    await this.db.query(
      `INSERT INTO admin_sessions (admin_id, token_hash, expires_at, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5)`,
      [admin.id, tokenHash, expiresAt, ipAddress, userAgent]
    );

    // Update last login
    await this.db.query(
      'UPDATE admin_users SET last_login_at = NOW(), updated_at = NOW() WHERE id = $1',
      [admin.id]
    );

    // Log activity
    await this.logActivity(admin.id, 'LOGIN', null, null, {
      ip_address: ipAddress,
      user_agent: userAgent
    }, ipAddress, userAgent);

    // Remove password hash from response
    const { password_hash, ...adminResponse } = admin;

    return {
      admin: adminResponse,
      token,
      expires_at: expiresAt.toISOString()
    };
  }

  /**
   * Admin logout
   */
  async logout(token: string): Promise<void> {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Find and remove session
    const [session] = await this.db.query(
      'SELECT admin_id FROM admin_sessions WHERE token_hash = $1',
      [tokenHash]
    );

    if (session) {
      await this.db.query(
        'DELETE FROM admin_sessions WHERE token_hash = $1',
        [tokenHash]
      );

      // Log activity
      await this.logActivity(session.admin_id, 'LOGOUT');
    }
  }

  /**
   * Verify admin token
   */
  async verifyToken(token: string): Promise<AdminUser | null> {
    try {
      // Verify JWT
      const decoded = jwt.verify(token, config.JWT_SECRET) as any;

      if (decoded.type !== 'admin') {
        return null;
      }

      // Check if session exists and is not expired
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      const [session] = await this.db.query(
        `SELECT s.*, a.* FROM admin_sessions s
         JOIN admin_users a ON s.admin_id = a.id
         WHERE s.token_hash = $1 AND s.expires_at > NOW() AND a.is_active = true`,
        [tokenHash]
      );

      if (!session) {
        return null;
      }

      return {
        id: session.admin_id,
        username: session.username,
        email: session.email,
        name: session.name,
        role: session.role,
        is_active: session.is_active,
        last_login_at: session.last_login_at,
        created_at: session.created_at,
        updated_at: session.updated_at
      };

    } catch (error) {
      return null;
    }
  }

  /**
   * Clean expired sessions
   */
  async cleanExpiredSessions(): Promise<void> {
    await this.db.query(
      'DELETE FROM admin_sessions WHERE expires_at < NOW()'
    );
  }

  /**
   * Get admin user by ID
   */
  async getAdminById(adminId: string): Promise<AdminUser | null> {
    const [admin] = await this.db.query<AdminUser>(
      'SELECT * FROM admin_users WHERE id = $1 AND is_active = true',
      [adminId]
    );

    return admin || null;
  }

  /**
   * Create new admin user (superadmin only)
   */
  async createAdmin(data: {
    username: string;
    email: string;
    password: string;
    name: string;
    role: 'admin' | 'superadmin';
  }, createdBy: string): Promise<AdminUser> {
    // Check if creator is superadmin
    const creator = await this.getAdminById(createdBy);
    if (!creator || creator.role !== 'superadmin') {
      throw new Error('권한이 없습니다. 슈퍼관리자만 새 관리자를 생성할 수 있습니다');
    }

    // Check if username or email already exists
    const [existing] = await this.db.query(
      'SELECT id FROM admin_users WHERE username = $1 OR email = $2',
      [data.username, data.email]
    );

    if (existing) {
      throw new Error('이미 존재하는 사용자명 또는 이메일입니다');
    }

    // Hash password
    const passwordHash = crypto.createHash('sha256').update(data.password).digest('hex');

    // Create admin user
    const adminId = uuidv4();
    const [admin] = await this.db.query<AdminUser>(
      `INSERT INTO admin_users (id, username, email, password_hash, name, role)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [adminId, data.username, data.email, passwordHash, data.name, data.role]
    );

    // Log activity
    await this.logActivity(createdBy, 'CREATE_ADMIN', 'admin_user', adminId, {
      username: data.username,
      email: data.email,
      role: data.role
    });

    return admin;
  }

  /**
   * Update admin user
   */
  async updateAdmin(adminId: string, data: Partial<{
    email: string;
    name: string;
    role: 'admin' | 'superadmin';
    is_active: boolean;
  }>, updatedBy: string): Promise<AdminUser> {
    // Check if updater has permission
    const updater = await this.getAdminById(updatedBy);
    if (!updater) {
      throw new Error('권한이 없습니다');
    }

    // Superadmin can update anyone, admin can only update themselves
    if (updater.role !== 'superadmin' && updater.id !== adminId) {
      throw new Error('다른 관리자의 정보를 수정할 권한이 없습니다');
    }

    // Build update query
    const updateFields = [];
    const params: any[] = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        updateFields.push(`${key} = $${paramIndex}`);
        params.push(value);
        paramIndex++;
      }
    }

    updateFields.push(`updated_at = NOW()`);
    params.push(adminId);

    const [admin] = await this.db.query<AdminUser>(
      `UPDATE admin_users
       SET ${updateFields.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING *`,
      params
    );

    // Log activity
    await this.logActivity(updatedBy, 'UPDATE_ADMIN', 'admin_user', adminId, data);

    return admin;
  }

  /**
   * Change admin password
   */
  async changePassword(adminId: string, currentPassword: string, newPassword: string): Promise<void> {
    // Verify current password
    const currentHash = crypto.createHash('sha256').update(currentPassword).digest('hex');
    const [admin] = await this.db.query(
      'SELECT id FROM admin_users WHERE id = $1 AND password_hash = $2',
      [adminId, currentHash]
    );

    if (!admin) {
      throw new Error('현재 비밀번호가 일치하지 않습니다');
    }

    // Update password
    const newHash = crypto.createHash('sha256').update(newPassword).digest('hex');
    await this.db.query(
      'UPDATE admin_users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [newHash, adminId]
    );

    // Invalidate all sessions for this admin
    await this.db.query(
      'DELETE FROM admin_sessions WHERE admin_id = $1',
      [adminId]
    );

    // Log activity
    await this.logActivity(adminId, 'CHANGE_PASSWORD');
  }

  /**
   * Log admin activity
   */
  async logActivity(
    adminId: string,
    action: string,
    resourceType?: string | null,
    resourceId?: string | null,
    details?: any,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.db.query(
      `INSERT INTO admin_activity_log (admin_id, action, resource_type, resource_id, details, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [adminId, action, resourceType, resourceId, details ? JSON.stringify(details) : null, ipAddress, userAgent]
    );
  }

  /**
   * Get admin activity log
   */
  async getActivityLog(adminId?: string, limit = 50, offset = 0): Promise<any[]> {
    let query = `
      SELECT al.*, au.username, au.name
      FROM admin_activity_log al
      JOIN admin_users au ON al.admin_id = au.id
    `;
    const params: any[] = [];

    if (adminId) {
      query += ' WHERE al.admin_id = $1';
      params.push(adminId);
    }

    query += ' ORDER BY al.created_at DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
    params.push(limit, offset);

    return await this.db.query(query, params);
  }
}

export const adminAuthService = new AdminAuthService();