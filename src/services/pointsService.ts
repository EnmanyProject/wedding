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
    // Get rankings for user
    const rankings = await this.db.query(
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

    return {
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
  }

  /**
   * Update ranking cache for user
   */
  async updateRankingCache(userId: string): Promise<void> {
    await this.db.transaction(async (client) => {
      // Get user's affinities sorted by score
      const affinities = await client.query(
        `SELECT target_id, score
         FROM affinity
         WHERE viewer_id = $1
         ORDER BY score DESC`,
        [userId]
      );

      // Clear existing cache
      await client.query(
        'DELETE FROM user_ranking_cache WHERE user_id = $1',
        [userId]
      );

      // Insert new rankings
      for (let i = 0; i < affinities.length; i++) {
        await client.query(
          `INSERT INTO user_ranking_cache (user_id, target_id, rank_position, affinity_score, updated_at)
           VALUES ($1, $2, $3, $4, NOW())`,
          [userId, affinities[i].target_id, i + 1, affinities[i].score]
        );
      }
    });
  }
}

export const pointsService = new PointsService();
export const affinityService = new AffinityService();