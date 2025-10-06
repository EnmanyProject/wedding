import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
// import { createServer } from 'http';
// import { Server as SocketIOServer } from 'socket.io';
import { config } from './utils/config';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

// Import routes
import authRouter from './routes/auth';
import photosRouter from './routes/photos';
import quizRouter from './routes/quiz';
import pointsRouter from './routes/points';
import affinityRouter from './routes/affinity';
import meetingRouter from './routes/meeting';
import profileRouter from './routes/profile';
import devRouter from './routes/dev';
import adminRouter from './routes/admin';
import adminAuthRouter from './routes/adminAuth';
import ringsRouter from './routes/rings';
import ringTestRouter from './routes/ringTest';
import recommendationsRouter from './routes/recommendations';
import adminRecommendationsRouter from './routes/adminRecommendations';

const app = express();
// Socket.IO 임시 비활성화
// const server = createServer(app);
// const io = new SocketIOServer(server, {
//   cors: {
//     origin: process.env.FRONTEND_URL || 'http://localhost:3000',
//     credentials: true
//   }
// });

// Security middleware - 개발 환경에서 더 관대한 CSP 설정
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.socket.io"],
      styleSrc: ["'self'", "'unsafe-inline'", "https:"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "ws:", "wss:", "https://cdn.socket.io", "https://fonts.googleapis.com", "https://fonts.gstatic.com"],
      fontSrc: ["'self'", "https:", "data:"]
    }
  }
}));
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Rate limiting - 개발 환경에서는 비활성화
if (config.NODE_ENV !== 'development') {
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: {
      success: false,
      error: 'Too many requests, please try again later',
      timestamp: new Date().toISOString()
    }
  });
  app.use(limiter);
} else {
  console.log('⚠️ Rate limiting disabled in development mode');
}

// Raw body parsing for photo upload - MUST come before express.json()
app.use('/api/me/photos/upload', express.raw({
  type: 'image/*',
  limit: '10mb'
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: config.NODE_ENV
  });
});

// Static files - public 폴더의 정적 파일들 서빙
app.use(express.static('public', {
  setHeaders: (res, path) => {
    if (path.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript');
    }

    // 개발 환경에서는 캐시 비활성화
    if (config.NODE_ENV === 'development') {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, private, max-age=0');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.setHeader('Last-Modified', new Date().toUTCString());
      res.setHeader('ETag', `"${Date.now()}"`);
    }
  }
}));

// Uploads - 로컬 파일 시스템 storage를 위한 추가 경로
app.use('/uploads', express.static('public/uploads', {
  setHeaders: (res, path) => {
    // 이미지 파일 MIME 타입 설정
    if (path.endsWith('.jpg') || path.endsWith('.jpeg')) {
      res.setHeader('Content-Type', 'image/jpeg');
    } else if (path.endsWith('.png')) {
      res.setHeader('Content-Type', 'image/png');
    }

    // 개발 환경에서는 캐시 비활성화
    if (config.NODE_ENV === 'development') {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, private, max-age=0');
    }
  }
}));

// API routes
app.use('/api/auth', authRouter);
app.use('/api', photosRouter);
app.use('/api/quiz', quizRouter);
app.use('/api/points', pointsRouter);
app.use('/api/rings', ringsRouter);
app.use('/api/ring-test', ringTestRouter);
app.use('/api/recommendations', recommendationsRouter);
app.use('/api/affinity', affinityRouter);
app.use('/api/meeting', meetingRouter);
app.use('/api/profile', profileRouter);
app.use('/api/admin-auth', adminAuthRouter);
app.use('/api/admin', adminRouter);
app.use('/api/admin/recommendations', adminRecommendationsRouter);

// Assets route for photo serving
app.get('/api/assets/*', async (req, res) => {
  try {
    const storageKey = req.path.replace('/api/assets/', '');

    // Import storageService here to avoid circular dependency
    const { storageService } = await import('./utils/storage');

    // Generate presigned download URL
    const downloadUrl = await storageService.generatePresignedDownloadUrl(storageKey);

    // Fix SSL protocol error: Convert HTTPS to HTTP for localhost MinIO
    const httpUrl = downloadUrl.replace('https://localhost:9000', 'http://localhost:9000');

    // Redirect to the presigned URL
    res.redirect(httpUrl);
  } catch (error) {
    console.error('Asset serving error:', error);
    res.status(404).json({
      success: false,
      error: 'Asset not found',
      code: 'ASSET_NOT_FOUND',
      timestamp: new Date().toISOString()
    });
  }
});

// Development routes
if (config.NODE_ENV === 'development') {
  app.use('/api/dev', devRouter);
}

// SPA fallback - 모든 non-API 라우트를 index.html로 리다이렉트
app.get('*', (req, res) => {
  // API 라우트가 아닌 경우에만 index.html 제공
  if (!req.path.startsWith('/api')) {
    // 개발 환경에서는 HTML 파일도 캐시 비활성화
    if (config.NODE_ENV === 'development') {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, private, max-age=0');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.setHeader('Last-Modified', new Date().toUTCString());
      res.setHeader('ETag', `"${Date.now()}"`);
    }
    res.sendFile('index.html', { root: 'public' });
  } else {
    res.status(404).json({
      success: false,
      error: `Route ${req.path} not found`,
      code: 'ROUTE_NOT_FOUND',
      timestamp: new Date().toISOString()
    });
  }
});

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Socket.IO 임시 비활성화
// io.on('connection', (socket) => {
//   console.log('Socket.IO client connected:', socket.id);
//   socket.on('disconnect', () => {
//     console.log('Socket.IO client disconnected:', socket.id);
//   });
// });

// Start server
const server = app.listen(config.PORT, () => {
  console.log(`🚀 Server running on port ${config.PORT}`);
  console.log(`📝 Environment: ${config.NODE_ENV}`);
  console.log(`🔗 Health check: http://localhost:${config.PORT}/health`);

  if (config.NODE_ENV === 'development') {
    console.log(`🛠️ Dev API: http://localhost:${config.PORT}/api/dev`);
  }

  // Start recommendation scheduler
  import('./utils/recommendationScheduler').then(({ RecommendationScheduler }) => {
    RecommendationScheduler.start();
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');

  // Stop recommendation scheduler
  import('./utils/recommendationScheduler').then(({ RecommendationScheduler }) => {
    RecommendationScheduler.stop();
  });

  // io.close(); // Socket.IO 임시 비활성화
  server.close(() => {
    console.log('Process terminated');
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');

  // Stop recommendation scheduler
  import('./utils/recommendationScheduler').then(({ RecommendationScheduler }) => {
    RecommendationScheduler.stop();
  });

  // io.close(); // Socket.IO 임시 비활성화
  server.close(() => {
    console.log('Process terminated');
  });
});

export default app;