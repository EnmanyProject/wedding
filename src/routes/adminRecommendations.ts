/**
 * Admin Recommendations API Routes
 * 관리자용 추천 시스템 관리 API
 */

import { Router, Request, Response } from 'express';
import { RecommendationService } from '../services/recommendationService';
import { RecommendationScheduler } from '../utils/recommendationScheduler';
import pool from '../db';

const router = Router();

/**
 * GET /api/admin/recommendations/overview
 * 추천 시스템 전체 개요
 */
router.get('/overview', async (req: Request, res: Response) => {
  try {
    const stats = await pool.query(`
      SELECT
        COUNT(DISTINCT user_id) as total_users_with_recommendations,
        COUNT(*) as total_recommendations,
        SUM(CASE WHEN viewed_at IS NOT NULL THEN 1 ELSE 0 END) as total_viewed,
        SUM(CASE WHEN clicked_at IS NOT NULL THEN 1 ELSE 0 END) as total_clicked,
        SUM(CASE WHEN quiz_started_at IS NOT NULL THEN 1 ELSE 0 END) as total_quiz_started,
        AVG(score) as avg_score
      FROM daily_recommendations
      WHERE recommendation_date = CURRENT_DATE
    `);

    const userCount = await pool.query(`
      SELECT COUNT(*) as total_active_users
      FROM users
      WHERE is_active = true
    `);

    const schedulerStatus = RecommendationScheduler.getStatus();

    res.json({
      success: true,
      data: {
        today: stats.rows[0],
        totalActiveUsers: parseInt(userCount.rows[0].total_active_users),
        scheduler: schedulerStatus
      }
    });
  } catch (error) {
    console.error('Get recommendations overview error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get overview'
    });
  }
});

/**
 * GET /api/admin/recommendations/stats
 * 일별 통계 조회
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const days = parseInt(req.query.days as string) || 7;

    const stats = await pool.query(
      `SELECT
        date,
        SUM(total_recommendations) as total_recommendations,
        SUM(viewed_count) as total_viewed,
        SUM(clicked_count) as total_clicked,
        SUM(quiz_started_count) as total_quiz_started,
        AVG(view_rate) as avg_view_rate,
        AVG(click_rate) as avg_click_rate,
        AVG(conversion_rate) as avg_conversion_rate
       FROM recommendation_history
       WHERE date >= CURRENT_DATE - INTERVAL '${days} days'
       GROUP BY date
       ORDER BY date DESC`,
    );

    res.json({
      success: true,
      data: {
        stats: stats.rows,
        period: `Last ${days} days`
      }
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
 * GET /api/admin/recommendations/top-performers
 * 추천 성과가 좋은 사용자
 */
router.get('/top-performers', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;

    const topPerformers = await pool.query(
      `SELECT
        u.id,
        u.name,
        u.display_name,
        rh.conversion_rate,
        rh.click_rate,
        rh.view_rate,
        rh.total_recommendations,
        rh.quiz_started_count
       FROM recommendation_history rh
       JOIN users u ON rh.user_id = u.id
       WHERE rh.date = CURRENT_DATE
       ORDER BY rh.conversion_rate DESC
       LIMIT $1`,
      [limit]
    );

    res.json({
      success: true,
      data: topPerformers.rows
    });
  } catch (error) {
    console.error('Get top performers error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get top performers'
    });
  }
});

/**
 * POST /api/admin/recommendations/generate-all
 * 전체 사용자 추천 생성 (수동 트리거)
 */
router.post('/generate-all', async (req: Request, res: Response) => {
  try {
    await RecommendationScheduler.triggerManually();

    res.json({
      success: true,
      message: 'Recommendation generation triggered successfully'
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
 * POST /api/admin/recommendations/generate-user/:userId
 * 특정 사용자 추천 생성
 */
router.post('/generate-user/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    await RecommendationService.generateDailyRecommendations(userId);

    res.json({
      success: true,
      message: `Recommendations generated for user ${userId}`
    });
  } catch (error) {
    console.error('Generate user recommendations error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate recommendations'
    });
  }
});

/**
 * DELETE /api/admin/recommendations/cleanup
 * 오래된 추천 정리
 */
router.delete('/cleanup', async (req: Request, res: Response) => {
  try {
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

/**
 * GET /api/admin/recommendations/scheduler/status
 * 스케줄러 상태 조회
 */
router.get('/scheduler/status', (req: Request, res: Response) => {
  try {
    const status = RecommendationScheduler.getStatus();

    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    console.error('Get scheduler status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get scheduler status'
    });
  }
});

export default router;
