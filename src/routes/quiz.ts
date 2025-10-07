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
  quiz_id: z.string().uuid(), // Changed from pair_id to quiz_id for ab_quizzes
  guess: z.enum(['LEFT', 'RIGHT']),
  selected_photo_id: z.string().uuid().optional().nullable()
});

const templateSchema = z.object({
  quiz_id: z.string().uuid().optional(), // Changed from pair_id to quiz_id for ab_quizzes
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
  console.log('🚀 [QuizRoute] POST /quiz/session 요청 시작');
  console.log('📝 [QuizRoute] 요청 바디:', req.body);
  console.log('👤 [QuizRoute] 인증된 사용자 ID:', req.userId);

  const body = sessionSchema.parse(req.body) as QuizSessionRequest;
  const userId = req.userId!;

  console.log('✅ [QuizRoute] 요청 데이터 검증 완료:', body);

  if (userId === body.target_id) {
    console.error('❌ [QuizRoute] 자기 자신과 퀴즈 시도:', { userId, targetId: body.target_id });
    throw createError('자기 자신과는 퀴즈를 할 수 없습니다', 400, 'SELF_QUIZ_FORBIDDEN');
  }

  console.log('✅ [QuizRoute] 타겟 유저 검증 완료');

  const useMock = process.env.USE_MOCK_RING_SERVICE === 'true';

  try {
    let result;

    if (useMock) {
      // Mock 모드: Mock 세션 데이터 생성
      console.log('🎭 [QuizRoute] Mock 모드로 퀴즈 세션 생성');
      const { v4: uuidv4 } = require('uuid');
      const sessionId = uuidv4();

      result = {
        session: {
          id: sessionId,
          asker_id: userId,
          target_id: body.target_id,
          mode: body.mode || 'TRAIT_PHOTO',
          status: 'ACTIVE',
          started_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        pointsRemaining: 100 // Mock 포인트
      };
    } else {
      // Real 모드: 데이터베이스 조회
      console.log('🔧 [QuizRoute] quizService.startQuizSession 호출');
      result = await quizService.startQuizSession({
        askerId: userId,
        targetId: body.target_id,
        mode: body.mode
      });
    }

    console.log('✅ [QuizRoute] 퀴즈 세션 생성 성공:', {
      sessionId: result.session.id,
      pointsRemaining: result.pointsRemaining,
      mode: result.session.mode,
      useMock
    });

    const response: ApiResponse<QuizSessionResponse> = {
      success: true,
      data: {
        session: result.session,
        points_remaining: result.pointsRemaining
      },
      timestamp: new Date().toISOString()
    };

    console.log('🎉 [QuizRoute] 세션 생성 응답 전송 완료');
    res.json(response);
  } catch (error: any) {
    console.error('❌ [QuizRoute] 퀴즈 세션 생성 오류:', {
      message: error.message,
      stack: error.stack,
      requestData: { userId, body }
    });

    if (error.message.includes('포인트가 부족') || error.message === 'Insufficient points to start quiz') {
      throw createError('퀴즈를 시작하기에 포인트가 부족합니다', 400, 'INSUFFICIENT_POINTS');
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

  console.log('🎮 [QuizRoute] POST /quiz/:sessionId/answer 요청 시작');
  console.log('📝 [QuizRoute] 요청 데이터:', {
    sessionId,
    userId,
    body
  });

  const useMock = process.env.USE_MOCK_RING_SERVICE === 'true';

  // Validate session belongs to user (additional security check)
  console.log('🔍 [QuizRoute] 세션 소유권 확인 중...');

  let session;
  if (useMock) {
    // Mock 모드: 세션 소유권 자동 승인
    console.log('🎭 [QuizRoute] Mock 모드 - 세션 소유권 자동 승인');
    session = { asker_id: userId };
  } else {
    session = await quizService.database.queryOne(
      'SELECT asker_id FROM quiz_sessions WHERE id = $1',
      [sessionId]
    );
    console.log('📊 [QuizRoute] 세션 검색 결과:', session);
  }

  if (!session || session.asker_id !== userId) {
    console.error('❌ [QuizRoute] 세션 소유권 검증 실패:', {
      session_exists: !!session,
      session_asker: session?.asker_id,
      current_user: userId
    });
    throw createError('퀴즈 세션을 찾을 수 없거나 권한이 없습니다', 404, 'SESSION_NOT_FOUND');
  }

  console.log('✅ [QuizRoute] 세션 소유권 확인 완료');

  try {
    let result;

    if (useMock) {
      // Mock 모드: Mock 답변 결과 생성
      console.log('🎭 [QuizRoute] Mock 모드로 답변 처리');

      // 랜덤으로 정답/오답 결정 (70% 정답률)
      const correct = Math.random() > 0.3;
      const targetChoice = correct ? body.guess : (body.guess === 'LEFT' ? 'RIGHT' : 'LEFT');

      result = {
        correct,
        targetChoice: targetChoice as 'LEFT' | 'RIGHT',
        deltaAffinity: correct ? 5 : -2,
        deltaPoints: correct ? 10 : -5,
        affinityScore: 50 + (correct ? 5 : -2),
        stagesUnlocked: [],
        quizItem: {
          id: `${sessionId}-item`,
          session_id: sessionId,
          pair_id: body.quiz_id,
          option_type: null,
          asker_guess: body.guess,
          target_choice: targetChoice as 'LEFT' | 'RIGHT',
          is_correct: correct,
          delta_affinity: correct ? 5 : -2,
          created_at: new Date(),
          updated_at: new Date()
        }
      };

      console.log('✅ [QuizRoute] Mock 답변 처리 완료:', {
        correct: result.correct,
        targetChoice: result.targetChoice,
        deltaAffinity: result.deltaAffinity
      });
    } else {
      console.log('🔧 [QuizRoute] quizService.submitAnswer 호출');
      result = await quizService.submitAnswer({
        sessionId,
        pairId: body.quiz_id, // quiz_id is now used as pairId for compatibility
        guess: body.guess,
        selectedPhotoId: body.selected_photo_id
      });
    }

    console.log('✅ [QuizRoute] 답안 제출 성공:', {
      correct: result.correct,
      targetChoice: result.targetChoice,
      deltaAffinity: result.deltaAffinity,
      deltaPoints: result.deltaPoints,
      affinityScore: result.affinityScore,
      stagesUnlocked: result.stagesUnlocked
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

    console.log('🎉 [QuizRoute] 응답 전송 완료');
    res.json(response);
  } catch (error: any) {
    console.error('❌ [QuizRoute] 답안 제출 오류:', {
      message: error.message,
      stack: error.stack,
      requestData: { sessionId, body }
    });

    if (error.message.includes('상대방이 아직') || error.message === 'Target has not answered this quiz question') {
      throw createError('상대방이 아직 이 퀴즈에 답하지 않았습니다', 400, 'TARGET_NO_QUIZ_ANSWER');
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
  console.log('🎯 [QuizRoute] GET /quiz/template 요청 시작');
  console.log('📝 [QuizRoute] 요청 파라미터:', req.query);
  console.log('👤 [QuizRoute] 인증된 사용자 ID:', req.userId);

  const query = templateSchema.parse(req.query) as QuizTemplateRequest;
  console.log('✅ [QuizRoute] 파라미터 검증 완료:', query);

  const useMock = process.env.USE_MOCK_RING_SERVICE === 'true';

  try {
    let template;

    if (useMock) {
      // Mock 모드: Mock 퀴즈 템플릿 생성
      console.log('🎭 [QuizRoute] Mock 모드로 퀴즈 템플릿 생성');

      // Mock 퀴즈 데이터 (AB Quiz)
      const mockQuizzes = [
        {
          id: '650e8400-e29b-41d4-a716-446655440001',
          category: 'food',
          title: '점심 메뉴는?',
          description: '점심시간 메뉴 고르기',
          option_a_title: '파스타',
          option_a_description: '크림 파스타',
          option_b_title: '라면',
          option_b_description: '매운 라면',
          is_active: true
        },
        {
          id: '650e8400-e29b-41d4-a716-446655440002',
          category: 'hobby',
          title: '주말 활동',
          description: '주말에 하고 싶은 것',
          option_a_title: '독서',
          option_a_description: '조용한 독서',
          option_b_title: '운동',
          option_b_description: '활발한 운동',
          is_active: true
        }
      ];

      // 랜덤 퀴즈 선택
      const randomQuiz = mockQuizzes[Math.floor(Math.random() * mockQuizzes.length)];

      // Mock 타겟 정보
      const mockTargetInfo = {
        user_id: query.target_id || '550e8400-e29b-41d4-a716-446655440002',
        name: 'user2',
        display_name: '부산아가씨'
      };

      template = {
        quiz: randomQuiz,
        targetInfo: mockTargetInfo,
        pair: null, // 구 시스템 호환성
        visual: null
      };

      console.log('✅ [QuizRoute] Mock 템플릿 생성 완료:', {
        quizId: randomQuiz.id,
        quizTitle: randomQuiz.title,
        targetId: mockTargetInfo.user_id
      });
    } else {
      console.log('🔧 [QuizRoute] quizService.getQuizTemplate 호출');
      template = await quizService.getQuizTemplate(query.quiz_id, query.target_id);
      console.log('✅ [QuizRoute] 템플릿 생성 성공');
    }

    const response: ApiResponse<QuizTemplateResponse> = {
      success: true,
      data: template,
      timestamp: new Date().toISOString()
    };

    console.log('🎉 [QuizRoute] 응답 전송:', {
      success: response.success,
      has_quiz: !!template.quiz,
      has_target: !!template.targetInfo,
      quiz_options: template.quiz ? `${template.quiz.option_a_title} vs ${template.quiz.option_b_title}` : 'N/A'
    });

    res.json(response);
  } catch (error: any) {
    console.error('❌ [QuizRoute] 템플릿 생성 오류:', {
      message: error.message,
      stack: error.stack,
      query: query
    });

    if (error.message.includes('퀴즈') || error.message === 'Quiz not found' || error.message === 'No active quizzes found') {
      throw createError(error.message, 404, 'QUIZ_NOT_FOUND');
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
  const session = await quizService.database.queryOne(
    'SELECT asker_id FROM quiz_sessions WHERE id = $1',
    [sessionId]
  );

  if (!session || session.asker_id !== userId) {
    throw createError('퀴즈 세션을 찾을 수 없거나 권한이 없습니다', 404, 'SESSION_NOT_FOUND');
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

  const sessions = await quizService.database.query(
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

  const [total] = await quizService.database.query(
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

/**
 * GET /quiz/targets
 * Get available quiz targets (users who have answered quizzes)
 */
router.get('/targets', authenticateToken, asyncHandler(async (
  req: AuthenticatedRequest,
  res: Response
) => {
  const userId = req.userId!;
  const useMock = process.env.USE_MOCK_RING_SERVICE === 'true';

  let targets;
  if (useMock) {
    // Mock 모드: 테스트용 사용자 데이터 반환 (UUID 형식, 여성형)
    const mockUsers = [
      { id: '550e8400-e29b-41d4-a716-446655440001', name: 'user1', display_name: '서울공주', quiz_count: 5, affinity_score: 85 },
      { id: '550e8400-e29b-41d4-a716-446655440002', name: 'user2', display_name: '부산아가씨', quiz_count: 8, affinity_score: 72 },
      { id: '550e8400-e29b-41d4-a716-446655440003', name: 'user3', display_name: '대구공주', quiz_count: 3, affinity_score: 68 },
      { id: '550e8400-e29b-41d4-a716-446655440004', name: 'user4', display_name: '인천언니', quiz_count: 6, affinity_score: 91 },
      { id: '550e8400-e29b-41d4-a716-446655440005', name: 'user5', display_name: '광주공주', quiz_count: 4, affinity_score: 76 },
      { id: '550e8400-e29b-41d4-a716-446655440006', name: 'user6', display_name: '대전언니', quiz_count: 7, affinity_score: 83 },
      { id: '550e8400-e29b-41d4-a716-446655440007', name: 'user7', display_name: '울산아가씨', quiz_count: 2, affinity_score: 59 },
      { id: '550e8400-e29b-41d4-a716-446655440008', name: 'user8', display_name: '세종공주', quiz_count: 9, affinity_score: 94 },
      { id: '550e8400-e29b-41d4-a716-446655440009', name: 'user9', display_name: '제주아가씨', quiz_count: 5, affinity_score: 88 },
      { id: '550e8400-e29b-41d4-a716-44665544000a', name: 'user10', display_name: '강원언니', quiz_count: 6, affinity_score: 79 },
    ];

    // 자신을 제외한 사용자만 반환
    targets = mockUsers.filter(u => u.id !== userId);
  } else {
    // Real 모드: 데이터베이스에서 조회
    targets = await quizService.getAvailableQuizTargets(userId);
  }

  const response: ApiResponse = {
    success: true,
    data: {
      targets
    },
    timestamp: new Date().toISOString()
  };

  res.json(response);
}));

/**
 * GET /quiz/targets/:targetId/quizzes
 * Get available quizzes for a specific target
 */
router.get('/targets/:targetId/quizzes', authenticateToken, asyncHandler(async (
  req: AuthenticatedRequest,
  res: Response
) => {
  const targetId = req.params.targetId;

  const quizzes = await quizService.getAvailableQuizzesForTarget(targetId);

  const response: ApiResponse = {
    success: true,
    data: {
      quizzes
    },
    timestamp: new Date().toISOString()
  };

  res.json(response);
}));

/**
 * GET /quiz/admin-quizzes
 * Get public admin quizzes (no authentication required)
 */
router.get('/admin-quizzes', asyncHandler(async (req, res: Response) => {
  console.log('🎭 [QuizRoute] GET /quiz/admin-quizzes 요청 시작 (공개 엔드포인트)');

  try {
    // Get active admin quizzes from ab_quizzes table
    const quizzes = await quizService.database.query(
      `SELECT
         id,
         category,
         title,
         description,
         option_a_title,
         option_a_description,
         option_b_title,
         option_b_description,
         created_at
       FROM ab_quizzes
       WHERE is_active = true
       ORDER BY created_at DESC
       LIMIT 50`
    );

    console.log('✅ [QuizRoute] 어드민 퀴즈 조회 성공:', quizzes.length, '개');

    const response: ApiResponse = {
      success: true,
      data: quizzes,
      timestamp: new Date().toISOString()
    };

    res.json(response);
  } catch (error: any) {
    console.error('❌ [QuizRoute] 어드민 퀴즈 조회 오류:', error);
    throw createError('어드민 퀴즈를 불러올 수 없습니다', 500, 'ADMIN_QUIZ_FETCH_ERROR');
  }
}));

export default router;