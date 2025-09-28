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

  const ranking = await affinityService.getUserRanking(userId);

  const response: ApiResponse<UserRankingResponse> = {
    success: true,
    data: ranking,
    timestamp: new Date().toISOString()
  };

  res.json(response);
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

  await affinityService.updateRankingCache(userId);

  const response: ApiResponse = {
    success: true,
    timestamp: new Date().toISOString()
  };

  res.json(response);
}));

export default router;