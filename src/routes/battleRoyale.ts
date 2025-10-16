import { Router, Response } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest, authenticateToken } from '../middleware/auth';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { battleRoyaleService } from '../services/battleRoyaleService';
import { ApiResponse } from '../types/api';

const router = Router();

// Validation schemas
const answerSchema = z.object({
  session_id: z.string().uuid(),
  round_number: z.number().int().min(1).max(5),
  answer: z.enum(['LEFT', 'RIGHT'])
});

/**
 * POST /battle-royale/start
 * Start a new Battle Royale session
 */
router.post('/start', authenticateToken, asyncHandler(async (
  req: AuthenticatedRequest,
  res: Response
) => {
  console.log('🎮 [BattleRoyale] POST /battle-royale/start 요청 시작');
  console.log('👤 [BattleRoyale] 인증된 사용자 ID:', req.userId);

  const userId = req.userId!;

  try {
    const result = await battleRoyaleService.startSession(userId);

    console.log('✅ [BattleRoyale] 세션 생성 성공:', {
      sessionId: result.session.id,
      participants: result.participants.length,
      totalRounds: result.session.total_rounds
    });

    const response: ApiResponse = {
      success: true,
      data: {
        session: result.session,
        participants: result.participants
      },
      timestamp: new Date().toISOString()
    };

    res.json(response);
  } catch (error: any) {
    console.error('❌ [BattleRoyale] 세션 생성 오류:', {
      message: error.message,
      stack: error.stack
    });

    if (error.message.includes('링이 부족')) {
      throw createError(error.message, 400, 'INSUFFICIENT_RINGS');
    }
    throw error;
  }
}));

/**
 * GET /battle-royale/round/:sessionId/:roundNumber
 * Get preference question and current survivors for a specific round
 */
router.get('/round/:sessionId/:roundNumber', authenticateToken, asyncHandler(async (
  req: AuthenticatedRequest,
  res: Response
) => {
  const sessionId = req.params.sessionId;
  const roundNumber = parseInt(req.params.roundNumber);

  console.log('🎮 [BattleRoyale] GET /battle-royale/round/:sessionId/:roundNumber 요청:', {
    sessionId,
    roundNumber
  });

  // Validate round number
  if (isNaN(roundNumber) || roundNumber < 1 || roundNumber > 5) {
    throw createError('유효하지 않은 라운드 번호입니다 (1-5)', 400, 'INVALID_ROUND_NUMBER');
  }

  try {
    const result = await battleRoyaleService.getRound(sessionId, roundNumber);

    console.log('✅ [BattleRoyale] 라운드 로드 성공:', {
      round: roundNumber,
      question: result.question.question,
      survivors: result.survivors.length
    });

    const response: ApiResponse = {
      success: true,
      data: {
        round_number: roundNumber,
        question: result.question,
        survivors: result.survivors
      },
      timestamp: new Date().toISOString()
    };

    res.json(response);
  } catch (error: any) {
    console.error('❌ [BattleRoyale] 라운드 로드 오류:', {
      message: error.message,
      stack: error.stack
    });

    if (error.message.includes('찾을 수 없습니다')) {
      throw createError(error.message, 404, 'NOT_FOUND');
    }
    throw error;
  }
}));

/**
 * POST /battle-royale/answer
 * Submit user's answer and filter survivors
 */
router.post('/answer', authenticateToken, asyncHandler(async (
  req: AuthenticatedRequest,
  res: Response
) => {
  console.log('🎮 [BattleRoyale] POST /battle-royale/answer 요청 시작');
  console.log('📝 [BattleRoyale] 요청 바디:', req.body);

  const userId = req.userId!;
  const body = answerSchema.parse(req.body);

  try {
    const result = await battleRoyaleService.submitAnswer(
      body.session_id,
      body.round_number,
      userId,
      body.answer
    );

    console.log('✅ [BattleRoyale] 답변 제출 성공:', {
      round: result.round_number,
      userAnswer: result.user_answer,
      survivorsBefore: result.survivors_before,
      survivorsAfter: result.survivors_after,
      eliminated: result.eliminated_count
    });

    const response: ApiResponse = {
      success: true,
      data: {
        round_number: result.round_number,
        question: result.question,
        user_answer: result.user_answer,
        survivors_before: result.survivors_before,
        survivors_after: result.survivors_after,
        eliminated_count: result.eliminated_count,
        survivors: result.survivors,
        eliminated_ids: result.eliminated_ids
      },
      timestamp: new Date().toISOString()
    };

    res.json(response);
  } catch (error: any) {
    console.error('❌ [BattleRoyale] 답변 제출 오류:', {
      message: error.message,
      stack: error.stack,
      body
    });

    throw error;
  }
}));

/**
 * GET /battle-royale/result/:sessionId
 * Get final results of a completed session
 */
router.get('/result/:sessionId', authenticateToken, asyncHandler(async (
  req: AuthenticatedRequest,
  res: Response
) => {
  const sessionId = req.params.sessionId;

  console.log('🎮 [BattleRoyale] GET /battle-royale/result/:sessionId 요청:', sessionId);

  try {
    const result = await battleRoyaleService.getFinalResults(sessionId);

    console.log('✅ [BattleRoyale] 최종 결과 로드 성공:', {
      sessionId,
      survivors: result.final_survivor_count,
      rounds: result.total_rounds
    });

    const response: ApiResponse = {
      success: true,
      data: {
        session_id: result.session_id,
        total_rounds: result.total_rounds,
        initial_count: result.initial_count,
        final_survivor_count: result.final_survivor_count,
        survivors: result.survivors,
        user_answers: result.user_answers
      },
      timestamp: new Date().toISOString()
    };

    res.json(response);
  } catch (error: any) {
    console.error('❌ [BattleRoyale] 최종 결과 로드 오류:', {
      message: error.message,
      stack: error.stack
    });

    if (error.message.includes('찾을 수 없습니다')) {
      throw createError(error.message, 404, 'SESSION_NOT_FOUND');
    }
    throw error;
  }
}));

/**
 * POST /battle-royale/add-to-recommendations/:sessionId
 * Add survivors to user's recommendation list
 */
router.post('/add-to-recommendations/:sessionId', authenticateToken, asyncHandler(async (
  req: AuthenticatedRequest,
  res: Response
) => {
  const sessionId = req.params.sessionId;
  const userId = req.userId!;

  console.log('🎮 [BattleRoyale] POST /battle-royale/add-to-recommendations/:sessionId 요청:', {
    sessionId,
    userId
  });

  try {
    const result = await battleRoyaleService.addSurvivorsToRecommendations(userId, sessionId);

    console.log('✅ [BattleRoyale] 추천 목록 추가 성공:', {
      addedCount: result.added_count
    });

    const response: ApiResponse = {
      success: true,
      data: {
        added_count: result.added_count
      },
      timestamp: new Date().toISOString()
    };

    res.json(response);
  } catch (error: any) {
    console.error('❌ [BattleRoyale] 추천 목록 추가 오류:', {
      message: error.message,
      stack: error.stack
    });

    throw error;
  }
}));

export default router;
