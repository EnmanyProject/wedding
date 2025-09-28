import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config } from './utils/config';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

// Import routes
import photosRouter from './routes/photos';
import quizRouter from './routes/quiz';
import pointsRouter from './routes/points';
import affinityRouter from './routes/affinity';
import meetingRouter from './routes/meeting';
import devRouter from './routes/dev';

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3001',
  credentials: true
}));

// Rate limiting
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

// API routes
app.use('/api', photosRouter);
app.use('/api/quiz', quizRouter);
app.use('/api/points', pointsRouter);
app.use('/api/affinity', affinityRouter);
app.use('/api/meeting', meetingRouter);

// Development routes
if (config.NODE_ENV === 'development') {
  app.use('/api/dev', devRouter);
}

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Start server
const server = app.listen(config.PORT, () => {
  console.log(`🚀 Server running on port ${config.PORT}`);
  console.log(`📝 Environment: ${config.NODE_ENV}`);
  console.log(`🔗 Health check: http://localhost:${config.PORT}/health`);

  if (config.NODE_ENV === 'development') {
    console.log(`🛠️ Dev API: http://localhost:${config.PORT}/api/dev`);
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
  });
});

export default app;