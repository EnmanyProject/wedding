import { Router } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { Database } from '../utils/database';
import { config } from '../utils/config';

const router = Router();

// 개발용 간단 로그인 - 이메일만으로 로그인
router.post('/login', async (req, res) => {
  try {
    const { email, password = 'password123' } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required',
        timestamp: new Date().toISOString()
      });
    }

    const db = Database.getInstance();

    // 사용자 조회
    const [user] = await db.query(
      'SELECT id, email, name, is_active FROM users WHERE email = $1',
      [email]
    );

    if (!user || !user.is_active) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials',
        timestamp: new Date().toISOString()
      });
    }

    // JWT 토큰 생성
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      config.JWT_SECRET,
      { expiresIn: config.JWT_EXPIRES_IN }
    );

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name
        }
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Login failed',
      timestamp: new Date().toISOString()
    });
  }
});

// 개발용 자동 로그인 - 첫 번째 사용자로 자동 로그인
router.post('/dev-login', async (req, res) => {
  try {
    if (config.NODE_ENV !== 'development') {
      return res.status(403).json({
        success: false,
        error: 'Development login only available in development mode',
        timestamp: new Date().toISOString()
      });
    }

    const useMock = process.env.USE_MOCK_RING_SERVICE === 'true';

    let user;
    if (useMock) {
      // Mock 모드: Mock 사용자 반환 (UUID 형식)
      user = {
        id: '550e8400-e29b-41d4-a716-446655440001',
        email: 'user1@test.com',
        name: 'user1',
        is_active: true
      };
    } else {
      // Real 모드: 데이터베이스에서 조회
      const db = Database.getInstance();
      [user] = await db.query(
        'SELECT id, email, name, is_active FROM users WHERE is_active = true ORDER BY created_at LIMIT 1'
      );

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'No users found',
          timestamp: new Date().toISOString()
        });
      }
    }

    // JWT 토큰 생성
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      config.JWT_SECRET,
      { expiresIn: config.JWT_EXPIRES_IN }
    );

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name
        }
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Dev login error:', error);
    res.status(500).json({
      success: false,
      error: 'Dev login failed',
      timestamp: new Date().toISOString()
    });
  }
});

// 회원가입
router.post('/signup', async (req, res) => {
  try {
    const { name, gender, age, region } = req.body;

    // Validation
    if (!name || !gender || !age || !region) {
      return res.status(400).json({
        success: false,
        error: 'All fields are required (name, gender, age, region)',
        timestamp: new Date().toISOString()
      });
    }

    // 임시 이메일 및 비밀번호 생성 (v3에서는 이메일/비밀번호 입력 안 받음)
    const email = `${name}@wedding.app`;
    const password = crypto.randomBytes(16).toString('hex');
    const passwordHash = crypto.createHash('sha256').update(password).digest('hex');

    const db = Database.getInstance();

    // 이메일 중복 체크
    const [existingUser] = await db.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: 'User already exists',
        timestamp: new Date().toISOString()
      });
    }

    // 사용자 생성
    const [newUser] = await db.query(
      `INSERT INTO users (email, password_hash, name, age, gender, location, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, true)
       RETURNING id, email, name, age, gender, location, created_at`,
      [email, passwordHash, name, parseInt(age), gender, region]
    );

    console.log('✅ User created:', newUser);

    // JWT 토큰 생성
    const token = jwt.sign(
      { userId: newUser.id, email: newUser.email },
      config.JWT_SECRET,
      { expiresIn: config.JWT_EXPIRES_IN }
    );

    res.status(201).json({
      success: true,
      data: {
        token,
        user: {
          id: newUser.id,
          email: newUser.email,
          name: newUser.name,
          age: newUser.age,
          gender: newUser.gender,
          location: newUser.location
        }
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({
      success: false,
      error: 'Signup failed',
      timestamp: new Date().toISOString()
    });
  }
});

// 현재 사용자 정보 조회
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Access token required',
        timestamp: new Date().toISOString()
      });
    }

    const decoded = jwt.verify(token, config.JWT_SECRET) as any;
    const db = Database.getInstance();

    const [user] = await db.query(
      'SELECT id, email, name, is_active FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (!user || !user.is_active) {
      return res.status(401).json({
        success: false,
        error: 'Invalid token',
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name
        }
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    res.status(401).json({
      success: false,
      error: 'Invalid token',
      timestamp: new Date().toISOString()
    });
  }
});

export default router;