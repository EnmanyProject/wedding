/**
 * Recommendations API Routes
 * 일일 추천 시스템 API 엔드포인트
 */

import { Router, Request, Response } from 'express';
import { MockRecommendationService } from '../services/mockRecommendationService';
import { authenticateToken } from '../middleware/auth';

// Mock 모드 여부
const useMock = process.env.USE_MOCK_RING_SERVICE === 'true';

// Synchronous import for RecommendationService (fix 500 error)
let RecommendationService: any = null;
if (!useMock) {
  try {
    const module = require('../services/recommendationService');
    RecommendationService = module.RecommendationService;
  } catch (error) {
    console.warn('Failed to load RecommendationService:', error);
  }
}

const router = Router();

/**
 * GET /api/recommendations/today
 * 오늘의 추천 조회
 */
router.get('/today', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;

    let recommendations;

    if (useMock) {
      recommendations = await MockRecommendationService.getTodayRecommendations(userId);
    } else {
      // Null check for RecommendationService
      if (!RecommendationService) {
        console.error('RecommendationService not loaded, falling back to mock');
        recommendations = await MockRecommendationService.getTodayRecommendations(userId);
      } else {
        recommendations = await RecommendationService.getTodayRecommendations(userId);

        // 조회했다는 기록 (첫 번째 로드 시)
        if (recommendations.length > 0) {
          for (const rec of recommendations) {
            await RecommendationService.markAsViewed(rec.id);
          }
        }
      }
    }

    res.json({
      success: true,
      recommendations,
      count: recommendations.length
    });
  } catch (error) {
    console.error('Get today recommendations error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get recommendations'
    });
  }
});

/**
 * POST /api/recommendations/generate
 * 추천 생성 (수동 트리거 - 개발/테스트용)
 */
router.post('/generate', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;

    await RecommendationService.generateDailyRecommendations(userId);

    const recommendations = await RecommendationService.getTodayRecommendations(userId);

    res.json({
      success: true,
      message: 'Recommendations generated successfully',
      recommendations,
      count: recommendations.length
    });
  } catch (error) {
    console.error('Generate recommendations error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate recommendations'
    });
  }
});

/**
 * POST /api/recommendations/:id/click
 * 추천 클릭 기록
 */
router.post('/:id/click', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await RecommendationService.markAsClicked(id);

    res.json({
      success: true,
      message: 'Click recorded'
    });
  } catch (error) {
    console.error('Mark as clicked error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to record click'
    });
  }
});

/**
 * POST /api/recommendations/:id/quiz-started
 * 추천에서 퀴즈 시작 기록
 */
router.post('/:id/quiz-started', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await RecommendationService.markQuizStarted(id);

    res.json({
      success: true,
      message: 'Quiz start recorded'
    });
  } catch (error) {
    console.error('Mark quiz started error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to record quiz start'
    });
  }
});

/**
 * GET /api/recommendations/stats
 * 추천 통계 조회
 */
router.get('/stats', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const days = parseInt(req.query.days as string) || 7;

    const stats = await RecommendationService.getRecommendationStats(userId, days);

    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Get recommendation stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get statistics'
    });
  }
});

/**
 * POST /api/recommendations/generate-all
 * 모든 사용자의 추천 생성 (관리자/크론잡용)
 */
router.post('/generate-all', async (req: Request, res: Response) => {
  try {
    // TODO: 관리자 인증 추가
    const { adminKey } = req.body;

    if (adminKey !== process.env.ADMIN_KEY) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized'
      });
    }

    await RecommendationService.generateAllDailyRecommendations();

    res.json({
      success: true,
      message: 'All daily recommendations generated'
    });
  } catch (error) {
    console.error('Generate all recommendations error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate recommendations'
    });
  }
});

/**
 * DELETE /api/recommendations/cleanup
 * 오래된 추천 정리 (30일+)
 */
router.delete('/cleanup', async (req: Request, res: Response) => {
  try {
    // TODO: 관리자 인증 추가
    const { adminKey } = req.body;

    if (adminKey !== process.env.ADMIN_KEY) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized'
      });
    }

    const deletedCount = await RecommendationService.cleanupOldRecommendations();

    res.json({
      success: true,
      message: `Deleted ${deletedCount} old recommendations`
    });
  } catch (error) {
    console.error('Cleanup recommendations error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to cleanup recommendations'
    });
  }
});

export default router;
