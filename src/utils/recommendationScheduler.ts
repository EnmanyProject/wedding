/**
 * Recommendation Scheduler
 * 자동 일일 추천 생성 크론잡
 */

import cron from 'node-cron';
import { RecommendationService } from '../services/recommendationService';

export class RecommendationScheduler {
  private static cronJob: cron.ScheduledTask | null = null;
  private static isRunning = false;

  /**
   * 스케줄러 시작
   */
  static start() {
    const isDevelopment = process.env.NODE_ENV === 'development';

    // 개발 환경: 3분마다 실행 (테스트용)
    // 프로덕션: 매일 자정 실행
    const schedule = isDevelopment
      ? '*/3 * * * *'  // 3분마다
      : '0 0 * * *';   // 매일 자정

    console.log(`🔄 [Scheduler] Starting recommendation scheduler...`);
    console.log(`📅 [Scheduler] Schedule: ${isDevelopment ? 'Every 3 minutes (DEV)' : 'Daily at midnight (PROD)'}`);

    this.cronJob = cron.schedule(schedule, async () => {
      await this.generateDailyRecommendations();
    });

    console.log('✅ [Scheduler] Recommendation scheduler started successfully');
  }

  /**
   * 스케줄러 중지
   */
  static stop() {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
      console.log('🛑 [Scheduler] Recommendation scheduler stopped');
    }
  }

  /**
   * 일일 추천 생성 작업
   */
  private static async generateDailyRecommendations() {
    if (this.isRunning) {
      console.log('⚠️ [Scheduler] Previous recommendation generation still running, skipping...');
      return;
    }

    this.isRunning = true;
    const startTime = Date.now();

    try {
      console.log('🚀 [Scheduler] Starting daily recommendation generation...');

      await RecommendationService.generateAllDailyRecommendations();

      const duration = Date.now() - startTime;
      console.log(`✅ [Scheduler] Daily recommendations generated successfully (${duration}ms)`);
    } catch (error) {
      console.error('❌ [Scheduler] Failed to generate daily recommendations:', error);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * 수동 트리거 (테스트/관리자용)
   */
  static async triggerManually() {
    console.log('🔧 [Scheduler] Manual trigger requested');
    await this.generateDailyRecommendations();
  }

  /**
   * 다음 실행 시간 조회
   */
  static getNextRun(): Date | null {
    if (!this.cronJob) return null;

    const isDevelopment = process.env.NODE_ENV === 'development';

    if (isDevelopment) {
      // 개발: 다음 3분 단위 시간
      const now = new Date();
      const minutes = now.getMinutes();
      const nextMinutes = Math.ceil(minutes / 3) * 3;
      const nextRun = new Date(now);
      nextRun.setMinutes(nextMinutes, 0, 0);
      if (nextRun <= now) {
        nextRun.setMinutes(nextRun.getMinutes() + 3);
      }
      return nextRun;
    } else {
      // 프로덕션: 다음 자정
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      return tomorrow;
    }
  }

  /**
   * 스케줄러 상태 조회
   */
  static getStatus() {
    return {
      isRunning: this.cronJob !== null,
      isProcessing: this.isRunning,
      nextRun: this.getNextRun(),
      schedule: process.env.NODE_ENV === 'development' ? 'Every 3 minutes' : 'Daily at midnight'
    };
  }
}
