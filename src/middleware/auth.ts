import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../utils/config';
import { Database } from '../utils/database';

export interface AuthenticatedRequest extends Request {
  userId?: string;
  user?: {
    id: string;
    email: string;
    name: string;
  };
}

export const authenticateToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      res.status(401).json({
        success: false,
        error: 'Access token required',
        timestamp: new Date().toISOString()
      });
      return;
    }

    const decoded = jwt.verify(token, config.JWT_SECRET) as any;

    // Verify user still exists and is active
    const db = Database.getInstance();
    const [user] = await db.query(
      'SELECT id, email, name, is_active FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (!user || !user.is_active) {
      res.status(401).json({
        success: false,
        error: 'Invalid or expired token',
        timestamp: new Date().toISOString()
      });
      return;
    }

    req.userId = user.id;
    req.user = {
      id: user.id,
      email: user.email,
      name: user.name
    };

    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      error: 'Invalid token',
      timestamp: new Date().toISOString()
    });
  }
};

export const optionalAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const decoded = jwt.verify(token, config.JWT_SECRET) as any;
      const db = Database.getInstance();
      const [user] = await db.query(
        'SELECT id, email, name, is_active FROM users WHERE id = $1',
        [decoded.userId]
      );

      if (user && user.is_active) {
        req.userId = user.id;
        req.user = {
          id: user.id,
          email: user.email,
          name: user.name
        };
      }
    }

    next();
  } catch (error) {
    // Continue without authentication
    next();
  }
};

export const requireAdmin = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  // In a real app, check admin status from database
  // For now, just check if in development mode
  if (config.NODE_ENV !== 'development') {
    res.status(403).json({
      success: false,
      error: 'Admin access required',
      timestamp: new Date().toISOString()
    });
    return;
  }

  next();
};