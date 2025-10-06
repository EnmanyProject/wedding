/**
 * Recommendation Service
 * 룰 베이스 일일 추천 시스템
 */

import pool from '../db';

interface UserTraits {
  userId: string;
  traits: Map<string, string>; // trait_pair_id -> choice (A/B)
}

interface RecommendationCandidate {
  userId: string;
  similarityScore: number;
  activityScore: number;
  noveltyScore: number;
  totalScore: number;
}

interface DailyRecommendation {
  id: string;
  recommendedUserId: string;
  score: number;
  rank: number;
  userName: string;
  userDisplayName: string;
  userAge: number;
  userRegion: string;
}

export class RecommendationService {
  /**
   * 사용자의 취향 응답 가져오기
   */
  private static async getUserTraits(userId: string): Promise<UserTraits> {
    const result = await pool.query(
      `SELECT trait_pair_id, choice FROM user_traits WHERE user_id = $1`,
      [userId]
    );

    const traits = new Map<string, string>();
    result.rows.forEach(row => {
      traits.set(row.trait_pair_id, row.choice);
    });

    return { userId, traits };
  }

  /**
   * 두 사용자 간 취향 유사도 계산 (0-50점)
   */
  private static calculateSimilarityScore(
    userTraits: UserTraits,
    candidateTraits: UserTraits
  ): number {
    if (userTraits.traits.size === 0 || candidateTraits.traits.size === 0) {
      return 0;
    }

    let matchCount = 0;
    let totalCount = 0;

    // 공통 trait_pairs만 비교
    userTraits.traits.forEach((choice, traitPairId) => {
      if (candidateTraits.traits.has(traitPairId)) {
        totalCount++;
        if (candidateTraits.traits.get(traitPairId) === choice) {
          matchCount++;
        }
      }
    });

    if (totalCount === 0) return 0;

    const matchRate = matchCount / totalCount;
    return Math.round(matchRate * 50); // 0-50점
  }

  /**
   * 활성도 점수 계산 (0-30점)
   */
  private static async calculateActivityScore(userId: string): Promise<number> {
    const result = await pool.query(
      `SELECT last_login FROM users WHERE id = $1`,
      [userId]
    );

    if (result.rows.length === 0) return 0;

    const lastLogin = result.rows[0].last_login;
    if (!lastLogin) return 0;

    const daysSinceLogin = Math.floor(
      (Date.now() - new Date(lastLogin).getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysSinceLogin <= 7) return 30; // 최근 7일 이내
    if (daysSinceLogin <= 30) return 15; // 최근 30일 이내
    return 0; // 비활성
  }

  /**
   * 신규도 점수 계산 (0-20점)
   */
  private static async calculateNoveltyScore(
    currentUserId: string,
    candidateUserId: string
  ): Promise<number> {
    // 기존 호감도 확인
    const affinityResult = await pool.query(
      `SELECT score FROM affinity
       WHERE user_id = $1 AND target_user_id = $2`,
      [currentUserId, candidateUserId]
    );

    if (affinityResult.rows.length === 0) {
      return 20; // 아직 퀴즈 안 한 사람
    }

    const affinityScore = affinityResult.rows[0].score;
    if (affinityScore < 20) return 15; // 호감도 낮음
    if (affinityScore < 60) return 5; // 호감도 중간
    return 0; // 호감도 높음 (이미 친밀함)
  }

  /**
   * 추천 후보 필터링 및 점수 계산
   */
  private static async getCandidates(
    currentUserId: string,
    userTraits: UserTraits,
    limit: number = 20
  ): Promise<RecommendationCandidate[]> {
    // 추천 후보 쿼리
    const candidatesResult = await pool.query(
      `SELECT DISTINCT u.id
       FROM users u
       WHERE u.id != $1
       AND u.is_active = true
       AND NOT EXISTS (
         SELECT 1 FROM affinity a
         WHERE a.user_id = $1 AND a.target_user_id = u.id AND a.score >= 60
       )
       LIMIT $2`,
      [currentUserId, limit * 2] // 여유있게 가져오기
    );

    const candidates: RecommendationCandidate[] = [];

    for (const row of candidatesResult.rows) {
      const candidateId = row.id;

      // 후보자 취향 가져오기
      const candidateTraits = await this.getUserTraits(candidateId);

      // 점수 계산
      const similarityScore = this.calculateSimilarityScore(userTraits, candidateTraits);
      const activityScore = await this.calculateActivityScore(candidateId);
      const noveltyScore = await this.calculateNoveltyScore(currentUserId, candidateId);

      const totalScore = similarityScore + activityScore + noveltyScore;

      candidates.push({
        userId: candidateId,
        similarityScore,
        activityScore,
        noveltyScore,
        totalScore
      });
    }

    // 점수순 정렬
    candidates.sort((a, b) => b.totalScore - a.totalScore);

    return candidates.slice(0, limit);
  }

  /**
   * 일일 추천 생성
   */
  static async generateDailyRecommendations(
    userId: string,
    count: number = 5
  ): Promise<void> {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // 오늘 날짜의 기존 추천 삭제
      await client.query(
        `DELETE FROM daily_recommendations
         WHERE user_id = $1 AND recommendation_date = CURRENT_DATE`,
        [userId]
      );

      // 사용자 취향 가져오기
      const userTraits = await this.getUserTraits(userId);

      // 추천 후보 계산
      const candidates = await this.getCandidates(userId, userTraits, count);

      if (candidates.length === 0) {
        console.log(`No candidates found for user ${userId}`);
        await client.query('COMMIT');
        return;
      }

      // 추천 저장
      for (let i = 0; i < candidates.length && i < count; i++) {
        const candidate = candidates[i];
        await client.query(
          `INSERT INTO daily_recommendations (
            user_id, recommended_user_id, score,
            similarity_score, activity_score, novelty_score,
            rank, recommendation_date
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_DATE)`,
          [
            userId,
            candidate.userId,
            candidate.totalScore,
            candidate.similarityScore,
            candidate.activityScore,
            candidate.noveltyScore,
            i + 1 // rank
          ]
        );
      }

      // recommendation_history 초기화
      await client.query(
        `INSERT INTO recommendation_history (user_id, date, total_recommendations)
         VALUES ($1, CURRENT_DATE, $2)
         ON CONFLICT (user_id, date)
         DO UPDATE SET total_recommendations = $2`,
        [userId, candidates.length]
      );

      await client.query('COMMIT');
      console.log(`Generated ${candidates.length} recommendations for user ${userId}`);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * 모든 활성 사용자의 일일 추천 생성
   */
  static async generateAllDailyRecommendations(): Promise<void> {
    const result = await pool.query(
      `SELECT id FROM users WHERE is_active = true`
    );

    console.log(`Generating recommendations for ${result.rows.length} users...`);

    for (const row of result.rows) {
      try {
        await this.generateDailyRecommendations(row.id);
      } catch (error) {
        console.error(`Failed to generate recommendations for user ${row.id}:`, error);
      }
    }

    console.log('Daily recommendations generation completed');
  }

  /**
   * 오늘의 추천 조회
   */
  static async getTodayRecommendations(userId: string): Promise<DailyRecommendation[]> {
    const result = await pool.query(
      `SELECT
        dr.id,
        dr.recommended_user_id,
        dr.score,
        dr.rank,
        u.name AS user_name,
        u.display_name AS user_display_name,
        u.age AS user_age,
        u.region AS user_region
       FROM daily_recommendations dr
       JOIN users u ON dr.recommended_user_id = u.id
       WHERE dr.user_id = $1
       AND dr.recommendation_date = CURRENT_DATE
       ORDER BY dr.rank ASC`,
      [userId]
    );

    return result.rows.map(row => ({
      id: row.id,
      recommendedUserId: row.recommended_user_id,
      score: row.score,
      rank: row.rank,
      userName: row.user_name,
      userDisplayName: row.user_display_name,
      userAge: row.user_age,
      userRegion: row.user_region
    }));
  }

  /**
   * 추천 조회 기록
   */
  static async markAsViewed(recommendationId: string): Promise<void> {
    await pool.query(
      `UPDATE daily_recommendations
       SET viewed_at = NOW()
       WHERE id = $1 AND viewed_at IS NULL`,
      [recommendationId]
    );
  }

  /**
   * 추천 클릭 기록
   */
  static async markAsClicked(recommendationId: string): Promise<void> {
    await pool.query(
      `UPDATE daily_recommendations
       SET clicked_at = NOW()
       WHERE id = $1 AND clicked_at IS NULL`,
      [recommendationId]
    );
  }

  /**
   * 추천에서 퀴즈 시작 기록
   */
  static async markQuizStarted(recommendationId: string): Promise<void> {
    await pool.query(
      `UPDATE daily_recommendations
       SET quiz_started_at = NOW()
       WHERE id = $1 AND quiz_started_at IS NULL`,
      [recommendationId]
    );
  }

  /**
   * 추천 통계 조회
   */
  static async getRecommendationStats(userId: string, days: number = 7) {
    const result = await pool.query(
      `SELECT
        date,
        total_recommendations,
        viewed_count,
        clicked_count,
        quiz_started_count,
        view_rate,
        click_rate,
        conversion_rate
       FROM recommendation_history
       WHERE user_id = $1
       AND date >= CURRENT_DATE - INTERVAL '${days} days'
       ORDER BY date DESC`,
      [userId]
    );

    return result.rows;
  }

  /**
   * 오래된 추천 정리 (30일 이상)
   */
  static async cleanupOldRecommendations(): Promise<number> {
    const result = await pool.query(
      `DELETE FROM daily_recommendations
       WHERE recommendation_date < CURRENT_DATE - INTERVAL '30 days'`
    );

    return result.rowCount || 0;
  }
}
