import { Database } from '../utils/database';
import { config } from '../utils/config';
import { AffinityResponse, UserRankingResponse } from '../types/api';

// Simple cache with TTL (15 minutes)
interface CacheEntry<T> {
  data: T;
  expires: number;
}

const rankingCache = new Map<string, CacheEntry<UserRankingResponse>>();
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes

export class AffinityService {
  private db: Database;

  constructor() {
    this.db = Database.getInstance();
  }

  /**
   * Get affinity with specific user
   */
  async getAffinity(viewerId: string, targetId: string): Promise<AffinityResponse> {
    const result = await this.db.queryOne(
      `SELECT score, stages_unlocked, last_quiz_at, created_at
       FROM affinity
       WHERE viewer_id = $1 AND target_id = $2`,
      [viewerId, targetId]
    );

    if (!result) {
      return {
        target_id: targetId,
        score: 0,
        stages_unlocked: [],
        photos_unlocked: 0,
        can_quiz: true
      };
    }

    const photosUnlocked = result.stages_unlocked?.length || 0;
    const canQuiz = !result.last_quiz_at ||
      (new Date().getTime() - new Date(result.last_quiz_at).getTime()) > 3600000; // 1 hour

    return {
      target_id: targetId,
      score: result.score,
      stages_unlocked: result.stages_unlocked || [],
      photos_unlocked: photosUnlocked,
      last_quiz_at: result.last_quiz_at,
      can_quiz: canQuiz
    };
  }

  /**
   * Get user's ranking and top connections
   */
  async getUserRanking(userId: string): Promise<UserRankingResponse> {
    console.log('🏆 [AffinityService] getUserRanking 시작:', userId);

    // Check server cache
    const cacheKey = `ranking:${userId}`;
    const cached = rankingCache.get(cacheKey);
    if (cached && cached.expires > Date.now()) {
      console.log('⚡ [AffinityService] 서버 캐시 히트 - 즉시 반환');
      return cached.data;
    }

    console.log('🔍 [AffinityService] 캐시 미스 - 새로운 쿼리 실행');

    const T3_THRESHOLD = config.AFFINITY_T3_THRESHOLD;
    const TOP_COUNT = 5;

    console.log('📊 [AffinityService] 랭킹 캐시 상태:', {
      userId,
      cacheCount: rankingCache.size
    });

    console.log('🔍 [AffinityService] 랭킹 데이터 조회 중...');

    const rankings = await this.db.query(
      `SELECT
        a.target_id,
        u.name as target_name,
        a.score as affinity_score,
        a.stages_unlocked,
        CASE
          WHEN a.score >= $1 THEN true
          ELSE false
        END as can_meet,
        ROW_NUMBER() OVER (ORDER BY a.score DESC) as rank_position
       FROM affinity a
       JOIN users u ON a.target_id = u.id
       WHERE a.viewer_id = $2
       ORDER BY a.score DESC
       LIMIT $3`,
      [T3_THRESHOLD, userId, TOP_COUNT]
    );

    console.log('📊 [AffinityService] 랭킹 조회 결과:', {
      userId,
      rankingCount: rankings.length,
      T3_THRESHOLD,
      TOP_COUNT
    });

    const result: UserRankingResponse = {
      rankings: rankings.map(r => ({
        target_id: r.target_id,
        target_name: r.target_name,
        rank_position: parseInt(r.rank_position),
        affinity_score: r.affinity_score,
        photos_unlocked: r.stages_unlocked?.length || 0,
        can_meet: r.can_meet
      }))
    };

    if (rankings.length > 0) {
      console.log('🏆 [AffinityService] 상위 랭킹:', rankings.slice(0, 3).map(r => ({
        rank: r.rank_position,
        target: r.target_name,
        score: r.affinity_score,
        canMeet: r.can_meet
      })));
    }

    // Cache the result
    rankingCache.set(cacheKey, {
      data: result,
      expires: Date.now() + CACHE_TTL
    });
    console.log('💾 [AffinityService] 서버 캐시 저장 완료');

    console.log('🎉 [AffinityService] getUserRanking 완료:', { returnedRankings: result.rankings.length });

    return result;
  }

  /**
   * Update ranking cache for user
   */
  async updateRankingCache(userId: string): Promise<void> {
    const cacheKey = `ranking:${userId}`;
    rankingCache.delete(cacheKey);

    // Regenerate cache
    await this.getUserRanking(userId);
  }
}

export const affinityService = new AffinityService();
