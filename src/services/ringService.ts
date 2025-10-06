import { db } from '../utils/database';

export interface RingBalance {
  balance: number;
  total_earned: number;
  total_spent: number;
}

export interface RingTransaction {
  id: string;
  user_id: string;
  amount: number;
  transaction_type: string;
  description: string;
  balance_after: number;
  metadata: any;
  created_at: string;
}

export interface LoginStreak {
  current_streak: number;
  longest_streak: number;
  last_login_date: string;
}

export class RingService {
  
  // Get user's ring balance
  async getRingBalance(userId: string): Promise<RingBalance | null> {
    try {
      const result = await db.queryOne<RingBalance>(
        'SELECT balance, total_earned, total_spent FROM user_ring_balance WHERE user_id = $1',
        [userId]
      );
      return result;
    } catch (error) {
      console.error('Error getting ring balance:', error);
      throw new Error('Failed to get ring balance');
    }
  }

  // Add rings to user's balance
  async addRings(
    userId: string, 
    amount: number, 
    transactionType: string, 
    description?: string,
    metadata?: any
  ): Promise<boolean> {
    try {
      const result = await db.queryOne<{ update_ring_balance: boolean }>(
        'SELECT update_ring_balance($1, $2, $3, $4, $5) as update_ring_balance',
        [userId, amount, transactionType, description, metadata ? JSON.stringify(metadata) : null]
      );
      return result?.update_ring_balance || false;
    } catch (error) {
      console.error('Error adding rings:', error);
      throw new Error('Failed to add rings');
    }
  }

  // Spend rings (deduct from balance)
  async spendRings(
    userId: string, 
    amount: number, 
    transactionType: string, 
    description?: string,
    metadata?: any
  ): Promise<boolean> {
    return this.addRings(userId, -amount, transactionType, description, metadata);
  }

  // Get user's transaction history
  async getTransactionHistory(
    userId: string, 
    limit: number = 20, 
    offset: number = 0
  ): Promise<RingTransaction[]> {
    try {
      const result = await db.query<RingTransaction>(
        `SELECT id, user_id, amount, transaction_type, description, balance_after, metadata, created_at 
         FROM ring_transactions 
         WHERE user_id = $1 
         ORDER BY created_at DESC 
         LIMIT $2 OFFSET $3`,
        [userId, limit, offset]
      );
      return result;
    } catch (error) {
      console.error('Error getting transaction history:', error);
      throw new Error('Failed to get transaction history');
    }
  }

  // Initialize ring balance for new user
  async initializeUserRings(userId: string): Promise<void> {
    try {
      // Insert ring balance if not exists
      await db.query(
        `INSERT INTO user_ring_balance (user_id, balance, total_earned, total_spent) 
         VALUES ($1, 100, 100, 0) 
         ON CONFLICT (user_id) DO NOTHING`,
        [userId]
      );

      // Add signup bonus transaction if not exists
      const existingBonus = await db.queryOne(
        'SELECT id FROM ring_transactions WHERE user_id = $1 AND transaction_type = $2',
        [userId, 'SIGNUP_BONUS']
      );

      if (!existingBonus) {
        await db.query(
          `INSERT INTO ring_transactions (user_id, amount, transaction_type, description, balance_after) 
           VALUES ($1, 100, 'SIGNUP_BONUS', '회원가입 보너스', 100)`,
          [userId]
        );
      }

      // Initialize login streak
      await db.query(
        `INSERT INTO user_login_streaks (user_id, current_streak, longest_streak, last_login_date) 
         VALUES ($1, 0, 0, NULL) 
         ON CONFLICT (user_id) DO NOTHING`,
        [userId]
      );
    } catch (error) {
      console.error('Error initializing user rings:', error);
      throw new Error('Failed to initialize user rings');
    }
  }

  // Process daily login bonus
  async processDailyLogin(userId: string): Promise<{ awarded: boolean; amount: number; streak: number }> {
    try {
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
      
      // Get current streak info
      const streakInfo = await db.queryOne<LoginStreak>(
        'SELECT current_streak, longest_streak, last_login_date FROM user_login_streaks WHERE user_id = $1',
        [userId]
      );

      if (!streakInfo) {
        await this.initializeUserRings(userId);
        return this.processDailyLogin(userId); // Retry after initialization
      }

      const lastLoginDate = streakInfo.last_login_date;
      const currentStreak = streakInfo.current_streak || 0;
      const longestStreak = streakInfo.longest_streak || 0;

      // Check if already got bonus today
      if (lastLoginDate === today) {
        return { awarded: false, amount: 0, streak: currentStreak };
      }

      // Calculate new streak
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      let newStreak: number;
      if (lastLoginDate === yesterdayStr) {
        // Consecutive day
        newStreak = currentStreak + 1;
      } else {
        // Reset streak
        newStreak = 1;
      }

      // Calculate bonus amount (base 10 + streak bonus up to 10 days)
      const baseAmount = 10;
      const streakBonus = Math.min(newStreak - 1, 9) * 5; // +5 rings per day up to 9 days
      const totalAmount = baseAmount + streakBonus;

      // Update streak
      await db.query(
        `UPDATE user_login_streaks 
         SET current_streak = $2, longest_streak = GREATEST(longest_streak, $2), last_login_date = $3, updated_at = NOW()
         WHERE user_id = $1`,
        [userId, newStreak, today]
      );

      // Award rings
      const awarded = await this.addRings(
        userId, 
        totalAmount, 
        'DAILY_LOGIN', 
        `일일 로그인 보너스 (${newStreak}일 연속)`,
        { streak: newStreak, base_amount: baseAmount, streak_bonus: streakBonus }
      );

      return { awarded, amount: totalAmount, streak: newStreak };
    } catch (error) {
      console.error('Error processing daily login:', error);
      throw new Error('Failed to process daily login');
    }
  }

  // Process quiz reward
  async processQuizReward(userId: string, correct: boolean, metadata?: any): Promise<number> {
    if (!correct) return 0;

    try {
      const amount = 5; // 5 rings per correct answer
      const awarded = await this.addRings(
        userId,
        amount,
        'QUIZ_CORRECT',
        '퀴즈 정답 보상',
        metadata
      );

      return awarded ? amount : 0;
    } catch (error) {
      console.error('Error processing quiz reward:', error);
      throw new Error('Failed to process quiz reward');
    }
  }

  // Process photo upload reward
  async processPhotoUploadReward(userId: string, photoId: string): Promise<number> {
    try {
      // Check daily limit (max 3 photos per day)
      const today = new Date().toISOString().split('T')[0];
      const todayStart = `${today}T00:00:00.000Z`;
      const tomorrowStart = new Date();
      tomorrowStart.setDate(tomorrowStart.getDate() + 1);
      const tomorrowStartStr = tomorrowStart.toISOString().split('T')[0] + 'T00:00:00.000Z';

      const todayUploads = await db.query(
        `SELECT COUNT(*) as count FROM ring_transactions 
         WHERE user_id = $1 AND transaction_type = 'PHOTO_UPLOAD' 
         AND created_at >= $2 AND created_at < $3`,
        [userId, todayStart, tomorrowStartStr]
      );

      const uploadCount = parseInt(todayUploads[0]?.count || '0');
      if (uploadCount >= 3) {
        return 0; // Daily limit reached
      }

      const amount = 20; // 20 rings per photo upload
      const awarded = await this.addRings(
        userId,
        amount,
        'PHOTO_UPLOAD',
        '사진 업로드 보상',
        { photo_id: photoId, daily_count: uploadCount + 1 }
      );

      return awarded ? amount : 0;
    } catch (error) {
      console.error('Error processing photo upload reward:', error);
      throw new Error('Failed to process photo upload reward');
    }
  }

  // Get ring earning rules
  async getRingEarningRules(): Promise<any[]> {
    try {
      const result = await db.query(
        'SELECT * FROM ring_earning_rules WHERE is_active = true ORDER BY rule_type'
      );
      return result;
    } catch (error) {
      console.error('Error getting ring earning rules:', error);
      throw new Error('Failed to get ring earning rules');
    }
  }

  // Get user's login streak
  async getLoginStreak(userId: string): Promise<LoginStreak | null> {
    try {
      const result = await db.queryOne<LoginStreak>(
        'SELECT current_streak, longest_streak, last_login_date FROM user_login_streaks WHERE user_id = $1',
        [userId]
      );
      return result;
    } catch (error) {
      console.error('Error getting login streak:', error);
      throw new Error('Failed to get login streak');
    }
  }

  // Check if user can afford a purchase
  async canAfford(userId: string, amount: number): Promise<boolean> {
    try {
      const balance = await this.getRingBalance(userId);
      return balance ? balance.balance >= amount : false;
    } catch (error) {
      console.error('Error checking affordability:', error);
      return false;
    }
  }

  // Get leaderboard (top ring earners)
  async getLeaderboard(limit: number = 10): Promise<any[]> {
    try {
      const result = await db.query(
        `SELECT u.name, u.id, urb.total_earned 
         FROM user_ring_balance urb
         JOIN users u ON u.id = urb.user_id
         WHERE u.is_active = true
         ORDER BY urb.total_earned DESC
         LIMIT $1`,
        [limit]
      );
      return result;
    } catch (error) {
      console.error('Error getting leaderboard:', error);
      throw new Error('Failed to get leaderboard');
    }
  }
}

export const ringService = new RingService();