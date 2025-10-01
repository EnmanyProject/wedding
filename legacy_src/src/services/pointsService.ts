import { Database } from '../utils/database';
import { config } from '../utils/config';
import { UserPointBalance, UserPointLedger, Affinity } from '../types/database';
import { v4 as uuidv4 } from 'uuid';

export interface PointTransaction {
  delta: number;
  reason: 'TRAIT_ADD' | 'QUIZ_ENTER' | 'QUIZ_WRONG' | 'DAILY_BONUS' | 'PURCHASE';
  refId?: string;
}

export class PointsService {
  private db: Database;
  private rankingCache: Map<string, { data: any; timestamp: number }> = new Map();
  private readonly RANKING_CACHE_TTL = 30000; // 30초 서버 캐시

  constructor() {
    this.db = Database.getInstance();
  }

  /**
   * Get user's current point balance and recent transactions
   */
  async getUserPoints(userId: string): Promise<{
    balance: number;
    recentTransactions: Array<{
      id: string;
      delta: number;
      reason: string;
      created_at: Date;
    }>;
  }> {
    // Get balance
    const [balance] = await this.db.query<UserPointBalance>(
      'SELECT balance FROM user_point_balances WHERE user_id = $1',
      [userId]
    );

    // Get recent transactions (last 10)
    const transactions = await this.db.query<UserPointLedger>(
      `SELECT id, delta, reason, created_at
       FROM user_point_ledger
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 10`,
      [userId]
    );

    return {
      balance: balance?.balance || 0,
      recentTransactions: transactions.map(t => ({
        id: t.id,
        delta: t.delta,
        reason: t.reason,
        created_at: t.created_at
      }))
    };
  }

  /**
   * Award points to user
   */
  async earnPoints(userId: string, transaction: PointTransaction): Promise<{
    delta: number;
    newBalance: number;
    transactionId: string;
  }> {
    return await this.db.transaction(async (client) => {
      // Ensure user has point balance record
      await this.ensurePointBalance(client, userId);

      // Update balance
      const [updatedBalance] = await client.query<UserPointBalance>(
        'UPDATE user_point_balances SET balance = balance + $1, updated_at = NOW() WHERE user_id = $2 RETURNING balance',
        [transaction.delta, userId]
      );

      // Record transaction
      const transactionId = uuidv4();
      await client.query(
        `INSERT INTO user_point_ledger (id, user_id, delta, reason, ref_id, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [transactionId, userId, transaction.delta, transaction.reason, transaction.refId]
      );

      return {
        delta: transaction.delta,
        newBalance: updatedBalance.balance,
        transactionId
      };
    });
  }

  /**
   * Spend points (negative delta)
   */
  async spendPoints(userId: string, amount: number, reason: string, refId?: string): Promise<{
    success: boolean;
    newBalance?: number;
    transactionId?: string;
  }> {
    return await this.db.transaction(async (client) => {
      // Check current balance
      const [balance] = await client.query<UserPointBalance>(
        'SELECT balance FROM user_point_balances WHERE user_id = $1',
        [userId]
      );

      if (!balance || balance.balance < amount) {
        return { success: false };
      }

      // Deduct points
      const [updatedBalance] = await client.query<UserPointBalance>(
        'UPDATE user_point_balances SET balance = balance - $1, updated_at = NOW() WHERE user_id = $2 RETURNING balance',
        [amount, userId]
      );

      // Record transaction
      const transactionId = uuidv4();
      await client.query(
        `INSERT INTO user_point_ledger (id, user_id, delta, reason, ref_id, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [transactionId, userId, -amount, reason, refId]
      );

      return {
        success: true,
        newBalance: updatedBalance.balance,
        transactionId
      };
    });
  }

  /**
   * Initialize user point balance
   */
  async initializeUserPoints(userId: string, initialBalance: number = 10000): Promise<void> {
    await this.db.query(
      `INSERT INTO user_point_balances (user_id, balance, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (user_id) DO NOTHING`,
      [userId, initialBalance]
    );
  }

  /**
   * Ensure user has point balance record
   */
  private async ensurePointBalance(client: any, userId: string): Promise<void> {
    const [existing] = await client.query(
      'SELECT user_id FROM user_point_balances WHERE user_id = $1',
      [userId]
    );

    if (!existing) {
      await client.query(
        `INSERT INTO user_point_balances (user_id, balance, updated_at)
         VALUES ($1, $2, NOW())`,
        [userId, 10000] // Default balance
      );
    }
  }
}

export class AffinityService {
  private db: Database;
  private rankingCache: Map<string, { data: any; timestamp: number }> = new Map();
  private readonly RANKING_CACHE_TTL = 30000; // 30초 서버 캐시

  constructor() {
    this.db = Database.getInstance();
  }

  /**
   * Get affinity between two users
   */
  async getAffinity(viewerId: string, targetId: string): Promise<{
    targetId: string;
    score: number;
    stagesUnlocked: string[];
    photosUnlocked: number;
    lastQuizAt?: Date;
    canQuiz: boolean;
  }> {
    const [affinity] = await this.db.query<Affinity>(
      'SELECT * FROM affinity WHERE viewer_id = $1 AND target_id = $2',
      [viewerId, targetId]
    );

    const score = affinity?.score || 0;
    const stagesUnlocked = affinity?.stages_unlocked || [];

    // Count unlocked photos
    const [photoCount] = await this.db.query(
      `SELECT COUNT(*) as count
       FROM photo_mask_states pms
       JOIN user_photos up ON pms.photo_id = up.id
       WHERE pms.user_id = $1 AND up.user_id = $2 AND pms.visible_stage != 'LOCKED'`,
      [viewerId, targetId]
    );

    // Check if can quiz (limit to prevent spam)
    const canQuiz = await this.canUserQuiz(viewerId, targetId);

    return {
      targetId,
      score,
      stagesUnlocked,
      photosUnlocked: photoCount?.count || 0,
      lastQuizAt: affinity?.last_quiz_at,
      canQuiz
    };
  }

  /**
   * Check if user can start a quiz with target
   */
  async canUserQuiz(viewerId: string, targetId: string): Promise<boolean> {
    // Check point balance
    const [balance] = await this.db.query(
      'SELECT balance FROM user_point_balances WHERE user_id = $1',
      [viewerId]
    );

    if (!balance || balance.balance < config.QUIZ_ENTER_COST) {
      return false;
    }

    // Check rate limiting (max 3 quizzes per target per hour)
    const [recentQuizzes] = await this.db.query(
      `SELECT COUNT(*) as count
       FROM quiz_sessions
       WHERE asker_id = $1 AND target_id = $2 AND started_at > NOW() - INTERVAL '1 hour'`,
      [viewerId, targetId]
    );

    return (recentQuizzes?.count || 0) < 3;
  }

  /**
   * Get user's ranking relative to a target
   */
  async getUserRanking(userId: string): Promise<{
    rankings: Array<{
      targetId: string;
      targetName: string;
      rankPosition: number;
      affinityScore: number;
      photosUnlocked: number;
      canMeet: boolean;
    }>;
    userPosition?: {
      rank: number;
      percentile: number;
    };
  }> {
    console.log('🏆 [AffinityService] getUserRanking 시작:', userId);

    // 🛡️ 캐시 시스템 안전성 검증
    try {
      // 서버 메모리 캐시 확인 (성능 최적화)
      const cacheKey = `ranking_${userId}`;

      // 캐시가 정상적으로 초기화되었는지 확인
      if (this.rankingCache && this.rankingCache instanceof Map) {
        const cached = this.rankingCache.get(cacheKey);

        if (cached && Date.now() - cached.timestamp < this.RANKING_CACHE_TTL) {
          console.log('⚡ [AffinityService] 서버 캐시 히트 - 즉시 반환');
          return cached.data;
        }
      } else {
        // 캐시가 손상된 경우 재초기화
        console.warn('⚠️ [AffinityService] 캐시 시스템 손상 감지 - 재초기화');
        this.rankingCache = new Map();
      }
    } catch (cacheError) {
      // 캐시 오류가 발생해도 서비스는 계속 작동
      console.error('🚨 [AffinityService] 캐시 읽기 오류:', cacheError);
      console.log('🔄 [AffinityService] 캐시 우회하여 데이터베이스에서 직접 조회');

      // 캐시 시스템을 재초기화
      try {
        this.rankingCache = new Map();
      } catch (reinitError) {
        console.error('💥 [AffinityService] 캐시 재초기화 실패:', reinitError);
        // 캐시 없이도 작동 가능하도록 null로 설정
        this.rankingCache = null;
      }
    }

    console.log('🔍 [AffinityService] 캐시 미스 - 새로운 쿼리 실행');

    let rankings = [];

    try {
      // 🛡️ 데이터베이스 작업을 안전하게 수행

      // Check if ranking cache exists for user
      const [cacheCount] = await this.db.query(
        'SELECT COUNT(*) as count FROM user_ranking_cache WHERE user_id = $1',
        [userId]
      );

      console.log('📊 [AffinityService] 랭킹 캐시 상태:', {
        userId,
        cacheCount: cacheCount?.count || 0
      });

      // If no cache exists, update it first
      if (!cacheCount || cacheCount.count === 0) {
        console.log('⚠️ [AffinityService] 랭킹 캐시가 없음, 생성 중...');

        try {
          await this.updateRankingCache(userId);
          console.log('✅ [AffinityService] 랭킹 캐시 생성 완료');
        } catch (updateError) {
          console.error('🚨 [AffinityService] 랭킹 캐시 생성 실패:', updateError);
          // 캐시 생성 실패시 빈 결과로 대체하여 시스템 안정성 유지
          console.log('🔄 [AffinityService] 빈 랭킹으로 대체하여 안정성 유지');

          return {
            rankings: [],
            userPosition: undefined
          };
        }
      }

      // Get rankings for user
      console.log('🔍 [AffinityService] 랭킹 데이터 조회 중...');
      rankings = await this.db.query(
        `SELECT
           urc.target_id,
           u.name as target_name,
           urc.rank_position,
           urc.affinity_score,
           COALESCE(photo_counts.unlocked_count, 0) as photos_unlocked,
           (urc.affinity_score >= $1) as can_meet
         FROM user_ranking_cache urc
         JOIN users u ON urc.target_id = u.id
         LEFT JOIN (
           SELECT
             up.user_id,
             COUNT(*) as unlocked_count
           FROM user_photos up
           JOIN photo_mask_states pms ON up.id = pms.photo_id
           WHERE pms.user_id = $2 AND pms.visible_stage != 'LOCKED'
           GROUP BY up.user_id
         ) photo_counts ON urc.target_id = photo_counts.user_id
         WHERE urc.user_id = $2
         ORDER BY urc.rank_position
         LIMIT $3`,
        [config.AFFINITY_T3_THRESHOLD, userId, config.RANKING_TOP_COUNT]
      );
    } catch (dbError) {
      // 데이터베이스 오류 시 안전한 대체 응답
      console.error('🚨 [AffinityService] 데이터베이스 조회 오류:', dbError);
      console.log('🔄 [AffinityService] 안전한 빈 응답으로 대체');

      return {
        rankings: [],
        userPosition: undefined
      };
    }

    console.log('📊 [AffinityService] 랭킹 조회 결과:', {
      userId,
      rankingCount: rankings.length,
      T3_THRESHOLD: config.AFFINITY_T3_THRESHOLD,
      TOP_COUNT: config.RANKING_TOP_COUNT
    });

    if (rankings.length > 0) {
      console.log('🏆 [AffinityService] 상위 랭킹:', rankings.slice(0, 3).map(r => ({
        rank: r.rank_position,
        target: r.target_name,
        score: r.affinity_score,
        canMeet: r.can_meet
      })));
    } else {
      console.warn('⚠️ [AffinityService] 랭킹 데이터가 없음');
    }

    const result = {
      rankings: rankings.map(r => ({
        targetId: r.target_id,
        targetName: r.target_name,
        rankPosition: r.rank_position,
        affinityScore: r.affinity_score,
        photosUnlocked: r.photos_unlocked,
        canMeet: r.can_meet
      })),
      userPosition: undefined // Could implement user's own ranking position
    };

    console.log('🎉 [AffinityService] getUserRanking 완료:', {
      returnedRankings: result.rankings.length
    });

    // 🛡️ 서버 메모리 캐시에 안전하게 저장 (성능 최적화)
    try {
      if (this.rankingCache && this.rankingCache instanceof Map) {
        const cacheKey = `ranking_${userId}`;

        // 캐시에 결과 저장
        this.rankingCache.set(cacheKey, {
          data: result,
          timestamp: Date.now()
        });

        // 캐시 크기 제한 (최대 100개 사용자)
        if (this.rankingCache.size > 100) {
          try {
            const oldestKey = this.rankingCache.keys().next().value;
            if (oldestKey) {
              this.rankingCache.delete(oldestKey);
            }
          } catch (cleanupError) {
            console.warn('⚠️ [AffinityService] 캐시 정리 오류:', cleanupError);
            // 정리 실패시 캐시 전체 재설정
            this.rankingCache = new Map();
            this.rankingCache.set(cacheKey, {
              data: result,
              timestamp: Date.now()
            });
          }
        }

        console.log('💾 [AffinityService] 서버 캐시 저장 완료');
      } else {
        console.warn('⚠️ [AffinityService] 캐시 시스템 비활성화됨 - 저장 건너뜀');
      }
    } catch (saveError) {
      // 캐시 저장 실패해도 응답은 정상적으로 반환
      console.error('🚨 [AffinityService] 캐시 저장 오류:', saveError);
      console.log('✅ [AffinityService] 캐시 저장 실패했지만 응답은 정상 반환');
    }

    return result;
  }

  /**
   * Update ranking cache for user
   */
  async updateRankingCache(userId: string): Promise<void> {
    try {
      await this.db.transaction(async (client) => {
        try {
          // 🛡️ 사용자 친화도 데이터 안전하게 조회
          const affinities = await client.query(
            `SELECT target_id, score
             FROM affinity
             WHERE viewer_id = $1
             ORDER BY score DESC`,
            [userId]
          );

          console.log(`📊 [AffinityService] ${userId} 사용자의 친화도 데이터 ${affinities.length}개 조회됨`);

          // 🛡️ 기존 캐시 안전하게 삭제
          try {
            await client.query(
              'DELETE FROM user_ranking_cache WHERE user_id = $1',
              [userId]
            );
            console.log(`🗑️ [AffinityService] ${userId} 사용자의 기존 캐시 삭제 완료`);
          } catch (deleteError) {
            console.warn('⚠️ [AffinityService] 기존 캐시 삭제 실패 (무시됨):', deleteError);
          }

          // 🛡️ 새로운 랭킹 안전하게 삽입
          let insertCount = 0;
          for (let i = 0; i < affinities.length; i++) {
            try {
              await client.query(
                `INSERT INTO user_ranking_cache (user_id, target_id, rank_position, affinity_score, updated_at)
                 VALUES ($1, $2, $3, $4, NOW())`,
                [userId, affinities[i].target_id, i + 1, affinities[i].score]
              );
              insertCount++;
            } catch (insertError) {
              console.warn(`⚠️ [AffinityService] 랭킹 ${i + 1} 삽입 실패:`, insertError);
              // 개별 삽입 실패는 전체 작업을 중단하지 않음
            }
          }

          console.log(`✅ [AffinityService] ${userId} 사용자 랭킹 캐시 업데이트 완료: ${insertCount}/${affinities.length}`);

        } catch (transactionError) {
          console.error('🚨 [AffinityService] 트랜잭션 내부 오류:', transactionError);
          throw transactionError; // 트랜잭션 롤백을 위해 다시 throw
        }
      });
    } catch (error) {
      console.error('💥 [AffinityService] updateRankingCache 전체 실패:', error);
      throw new Error(`랭킹 캐시 업데이트 실패: ${error.message}`);
    }
  }
}

export const pointsService = new PointsService();
export const affinityService = new AffinityService();