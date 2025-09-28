import { Router, Response } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest, authenticateToken } from '../middleware/auth';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { quizService } from '../services/quizService';
import {
  QuizSessionRequest,
  QuizSessionResponse,
  QuizAnswerRequest,
  QuizAnswerResponse,
  QuizTemplateRequest,
  QuizTemplateResponse,
  ApiResponse
} from '../types/api';

const router = Router();

// Validation schemas
const sessionSchema = z.object({
  target_id: z.string().uuid(),
  mode: z.enum(['TRAIT_PHOTO', 'PREFERENCE']).optional().default('TRAIT_PHOTO')
});

const answerSchema = z.object({
  pair_id: z.string().uuid(),
  guess: z.enum(['LEFT', 'RIGHT']),
  selected_photo_id: z.string().uuid().optional()
});

const templateSchema = z.object({
  pair_id: z.string().uuid().optional(),
  target_id: z.string().uuid().optional()
});

/**
 * POST /quiz/session
 * Start a new quiz session
 */
router.post('/session', authenticateToken, asyncHandler(async (
  req: AuthenticatedRequest,
  res: Response
) => {
  const body = sessionSchema.parse(req.body) as QuizSessionRequest;
  const userId = req.userId!;

  if (userId === body.target_id) {
    throw createError('Cannot quiz yourself', 400, 'SELF_QUIZ_FORBIDDEN');
  }

  try {
    const result = await quizService.startQuizSession({
      askerId: userId,
      targetId: body.target_id,
      mode: body.mode
    });

    const response: ApiResponse<QuizSessionResponse> = {
      success: true,
      data: {
        session: result.session,
        points_remaining: result.pointsRemaining
      },
      timestamp: new Date().toISOString()
    };

    res.json(response);
  } catch (error: any) {
    if (error.message === 'Insufficient points to start quiz') {
      throw createError(error.message, 400, 'INSUFFICIENT_POINTS');
    }
    throw error;
  }
}));

/**
 * POST /quiz/:sessionId/answer
 * Submit quiz answer
 */
router.post('/:sessionId/answer', authenticateToken, asyncHandler(async (
  req: AuthenticatedRequest,
  res: Response
) => {
  const sessionId = req.params.sessionId;
  const body = answerSchema.parse(req.body) as QuizAnswerRequest;
  const userId = req.userId!;

  // Validate session belongs to user (additional security check)
  const session = await quizService.db.queryOne(
    'SELECT asker_id FROM quiz_sessions WHERE id = $1',
    [sessionId]
  );

  if (!session || session.asker_id !== userId) {
    throw createError('Quiz session not found or unauthorized', 404, 'SESSION_NOT_FOUND');
  }

  try {
    const result = await quizService.submitAnswer({
      sessionId,
      pairId: body.pair_id,
      guess: body.guess,
      selectedPhotoId: body.selected_photo_id
    });

    const response: ApiResponse<QuizAnswerResponse> = {
      success: true,
      data: {
        correct: result.correct,
        target_choice: result.targetChoice,
        delta_affinity: result.deltaAffinity,
        delta_points: result.deltaPoints,
        affinity_score: result.affinityScore,
        stages_unlocked: result.stagesUnlocked,
        quiz_item: result.quizItem
      },
      timestamp: new Date().toISOString()
    };

    res.json(response);
  } catch (error: any) {
    if (error.message === 'Target has not answered this trait question') {
      throw createError(error.message, 400, 'TARGET_NO_TRAIT_ANSWER');
    }
    throw error;
  }
}));

/**
 * GET /quiz/template
 * Get quiz template with visual assets
 */
router.get('/template', authenticateToken, asyncHandler(async (
  req: AuthenticatedRequest,
  res: Response
) => {
  const query = templateSchema.parse(req.query) as QuizTemplateRequest;

  try {
    const template = await quizService.getQuizTemplate(query.pair_id, query.target_id);

    const response: ApiResponse<QuizTemplateResponse> = {
      success: true,
      data: template,
      timestamp: new Date().toISOString()
    };

    res.json(response);
  } catch (error: any) {
    if (error.message === 'Trait pair not found' || error.message === 'No active trait pairs found') {
      throw createError(error.message, 404, 'TRAIT_PAIR_NOT_FOUND');
    }
    throw error;
  }
}));

/**
 * POST /quiz/:sessionId/end
 * End quiz session
 */
router.post('/:sessionId/end', authenticateToken, asyncHandler(async (
  req: AuthenticatedRequest,
  res: Response
) => {
  const sessionId = req.params.sessionId;
  const userId = req.userId!;

  // Validate session belongs to user
  const session = await quizService.db.queryOne(
    'SELECT asker_id FROM quiz_sessions WHERE id = $1',
    [sessionId]
  );

  if (!session || session.asker_id !== userId) {
    throw createError('Quiz session not found or unauthorized', 404, 'SESSION_NOT_FOUND');
  }

  await quizService.endQuizSession(sessionId);

  const response: ApiResponse = {
    success: true,
    timestamp: new Date().toISOString()
  };

  res.json(response);
}));

/**
 * GET /quiz/sessions/me
 * Get user's quiz sessions history
 */
router.get('/sessions/me', authenticateToken, asyncHandler(async (
  req: AuthenticatedRequest,
  res: Response
) => {
  const userId = req.userId!;
  const page = parseInt(req.query.page as string) || 1;
  const perPage = Math.min(parseInt(req.query.per_page as string) || 10, 50);
  const offset = (page - 1) * perPage;

  const sessions = await quizService.db.query(
    `SELECT
       qs.*,
       u.name as target_name,
       COUNT(qi.id) as question_count,
       COUNT(CASE WHEN qi.correct = true THEN 1 END) as correct_count
     FROM quiz_sessions qs
     JOIN users u ON qs.target_id = u.id
     LEFT JOIN quiz_items qi ON qs.id = qi.session_id
     WHERE qs.asker_id = $1
     GROUP BY qs.id, u.name
     ORDER BY qs.started_at DESC
     LIMIT $2 OFFSET $3`,
    [userId, perPage, offset]
  );

  const [total] = await quizService.db.query(
    'SELECT COUNT(*) as count FROM quiz_sessions WHERE asker_id = $1',
    [userId]
  );

  const response: ApiResponse = {
    success: true,
    data: {
      sessions,
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

export default router;