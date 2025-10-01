import { Router, Response } from 'express';
import { AuthenticatedRequest, authenticateToken } from '../middleware/auth';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { affinityService } from '../services/pointsService';
import {
  AffinityResponse,
  UserRankingResponse,
  MeetingStateResponse,
  MeetingEnterRequest,
  MeetingEnterResponse,
  ApiResponse
} from '../types/api';

const router = Router();

/**
 * GET /affinity/:targetId
 * Get affinity with specific user
 */
router.get('/:targetId', authenticateToken, asyncHandler(async (
  req: AuthenticatedRequest,
  res: Response
) => {
  const userId = req.userId!;
  const targetId = req.params.targetId;

  if (userId === targetId) {
    throw createError('Cannot get affinity with yourself', 400, 'SELF_AFFINITY_FORBIDDEN');
  }

  const affinity = await affinityService.getAffinity(userId, targetId);

  const response: ApiResponse<AffinityResponse> = {
    success: true,
    data: affinity,
    timestamp: new Date().toISOString()
  };

  res.json(response);
}));

/**
 * GET /me/ranking
 * Get user's ranking and top connections
 */
router.get('/me/ranking', authenticateToken, asyncHandler(async (
  req: AuthenticatedRequest,
  res: Response
) => {
  const userId = req.userId!;

  console.log('🏆 [AffinityRoute] GET /me/ranking 요청 시작');
  console.log('👤 [AffinityRoute] 인증된 사용자 ID:', userId);

  try {
    console.log('🔧 [AffinityRoute] affinityService.getUserRanking 호출');
    const ranking = await affinityService.getUserRanking(userId);

    console.log('✅ [AffinityRoute] 랭킹 조회 성공:', {
      rankingCount: ranking.rankings.length,
      hasUserPosition: !!ranking.userPosition
    });

    const response: ApiResponse<UserRankingResponse> = {
      success: true,
      data: ranking,
      timestamp: new Date().toISOString()
    };

    console.log('🎉 [AffinityRoute] 랭킹 응답 전송 완료');
    res.json(response);
  } catch (error: any) {
    console.error('❌ [AffinityRoute] 랭킹 조회 오류:', {
      message: error.message,
      stack: error.stack,
      userId
    });
    throw error;
  }
}));

/**
 * POST /me/ranking/refresh
 * Update user's ranking cache
 */
router.post('/me/ranking/refresh', authenticateToken, asyncHandler(async (
  req: AuthenticatedRequest,
  res: Response
) => {
  const userId = req.userId!;

  console.log('🔄 [AffinityRoute] POST /me/ranking/refresh 요청 시작');
  console.log('👤 [AffinityRoute] 인증된 사용자 ID:', userId);

  try {
    console.log('🔧 [AffinityRoute] affinityService.updateRankingCache 호출');
    await affinityService.updateRankingCache(userId);

    console.log('✅ [AffinityRoute] 랭킹 캐시 갱신 완료');

    const response: ApiResponse = {
      success: true,
      timestamp: new Date().toISOString()
    };

    console.log('🎉 [AffinityRoute] 캐시 갱신 응답 전송 완료');
    res.json(response);
  } catch (error: any) {
    console.error('❌ [AffinityRoute] 랭킹 캐시 갱신 오류:', {
      message: error.message,
      stack: error.stack,
      userId
    });
    throw error;
  }
}));

export default router;