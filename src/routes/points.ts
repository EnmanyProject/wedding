import { Router, Response } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest, authenticateToken } from '../middleware/auth';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { pointsService } from '../services/pointsService';
import {
  UserPointsResponse,
  EarnPointsRequest,
  EarnPointsResponse,
  ApiResponse
} from '../types/api';

const router = Router();

// Validation schemas
const earnPointsSchema = z.object({
  reason: z.enum(['TRAIT_ADD', 'DAILY_BONUS']),
  ref_id: z.string().uuid().optional()
});

/**
 * GET /me/points
 * Get user's current points and recent transactions
 */
router.get('/me/points', authenticateToken, asyncHandler(async (
  req: AuthenticatedRequest,
  res: Response
) => {
  const userId = req.userId!;
  const useMock = process.env.USE_MOCK_RING_SERVICE === 'true';

  let pointsData;
  if (useMock) {
    // Mock 모드: Mock 포인트 데이터
    pointsData = {
      balance: 100,
      recentTransactions: [
        {
          id: '1',
          amount: 50,
          reason: 'DAILY_BONUS',
          created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: '2',
          amount: 50,
          reason: 'TRAIT_ADD',
          created_at: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()
        }
      ]
    };
  } else {
    // Real 모드: 데이터베이스에서 조회
    pointsData = await pointsService.getUserPoints(userId);
  }

  const response: ApiResponse<UserPointsResponse> = {
    success: true,
    data: {
      balance: pointsData.balance,
      recent_transactions: pointsData.recentTransactions
    },
    timestamp: new Date().toISOString()
  };

  res.json(response);
}));

/**
 * POST /points/earn
 * Award points to user
 */
router.post('/earn', authenticateToken, asyncHandler(async (
  req: AuthenticatedRequest,
  res: Response
) => {
  const body = earnPointsSchema.parse(req.body) as EarnPointsRequest;
  const userId = req.userId!;

  let delta = 0;
  switch (body.reason) {
    case 'TRAIT_ADD':
      delta = 1; // Points for adding a trait response
      break;
    case 'DAILY_BONUS':
      delta = 10; // Daily login bonus
      break;
  }

  const result = await pointsService.earnPoints(userId, {
    delta,
    reason: body.reason,
    refId: body.ref_id
  });

  const response: ApiResponse<EarnPointsResponse> = {
    success: true,
    data: {
      delta: result.delta,
      new_balance: result.newBalance,
      transaction_id: result.transactionId
    },
    timestamp: new Date().toISOString()
  };

  res.json(response);
}));

export default router;