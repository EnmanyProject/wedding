import { RingBalance, RingTransaction, LoginStreak } from './ringService';

// In-memory mock data for development
class MockRingService {
  private balances = new Map<string, RingBalance>();
  private transactions = new Map<string, RingTransaction[]>();
  private streaks = new Map<string, LoginStreak>();
  private transactionIdCounter = 1;

  // Initialize with default data for demo user
  constructor() {
    const demoUserId = 'demo-user-123';
    this.balances.set(demoUserId, {
      balance: 150,
      total_earned: 200,
      total_spent: 50
    });

    this.streaks.set(demoUserId, {
      current_streak: 3,
      longest_streak: 7,
      last_login_date: new Date().toISOString().split('T')[0]
    });

    this.transactions.set(demoUserId, [
      {
        id: 'tx-1',
        user_id: demoUserId,
        amount: 100,
        transaction_type: 'SIGNUP_BONUS',
        description: '회원가입 보너스',
        balance_after: 100,
        metadata: null,
        created_at: new Date(Date.now() - 86400000 * 2).toISOString()
      },
      {
        id: 'tx-2',
        user_id: demoUserId,
        amount: 25,
        transaction_type: 'DAILY_LOGIN',
        description: '일일 로그인 보너스 (3일 연속)',
        balance_after: 125,
        metadata: { streak: 3, base_amount: 10, streak_bonus: 15 },
        created_at: new Date(Date.now() - 86400000).toISOString()
      },
      {
        id: 'tx-3',
        user_id: demoUserId,
        amount: 5,
        transaction_type: 'QUIZ_CORRECT',
        description: '퀴즈 정답 보상',
        balance_after: 130,
        metadata: null,
        created_at: new Date(Date.now() - 3600000).toISOString()
      },
      {
        id: 'tx-4',
        user_id: demoUserId,
        amount: 20,
        transaction_type: 'PHOTO_UPLOAD',
        description: '사진 업로드 보상',
        balance_after: 150,
        metadata: { photo_id: 'photo-123', daily_count: 1 },
        created_at: new Date().toISOString()
      }
    ]);
  }

  // Get user's ring balance
  async getRingBalance(userId: string): Promise<RingBalance | null> {
    // Always use demo user for development
    const demoUserId = 'demo-user-123';
    return this.balances.get(demoUserId) || null;
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
      const demoUserId = 'demo-user-123';
      const currentBalance = this.balances.get(demoUserId) || {
        balance: 0,
        total_earned: 0,
        total_spent: 0
      };

      const newBalance = currentBalance.balance + amount;
      const newTotalEarned = amount > 0 ? currentBalance.total_earned + amount : currentBalance.total_earned;
      const newTotalSpent = amount < 0 ? currentBalance.total_spent + Math.abs(amount) : currentBalance.total_spent;

      // Update balance
      this.balances.set(demoUserId, {
        balance: newBalance,
        total_earned: newTotalEarned,
        total_spent: newTotalSpent
      });

      // Add transaction
      const transaction: RingTransaction = {
        id: `tx-${this.transactionIdCounter++}`,
        user_id: demoUserId,
        amount,
        transaction_type: transactionType,
        description: description || 'Ring transaction',
        balance_after: newBalance,
        metadata,
        created_at: new Date().toISOString()
      };

      const userTransactions = this.transactions.get(demoUserId) || [];
      userTransactions.unshift(transaction); // Add to beginning (most recent first)
      this.transactions.set(demoUserId, userTransactions);

      return true;
    } catch (error) {
      console.error('Mock addRings error:', error);
      return false;
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
    const demoUserId = 'demo-user-123';
    const userTransactions = this.transactions.get(demoUserId) || [];
    return userTransactions.slice(offset, offset + limit);
  }

  // Initialize ring balance for new user
  async initializeUserRings(userId: string): Promise<void> {
    const demoUserId = 'demo-user-123';
    if (!this.balances.has(demoUserId)) {
      this.balances.set(demoUserId, {
        balance: 100,
        total_earned: 100,
        total_spent: 0
      });

      this.streaks.set(demoUserId, {
        current_streak: 0,
        longest_streak: 0,
        last_login_date: new Date().toISOString().split('T')[0]
      });

      await this.addRings(demoUserId, 100, 'SIGNUP_BONUS', '회원가입 보너스');
    }
  }

  // Process daily login bonus
  async processDailyLogin(userId: string): Promise<{ awarded: boolean; amount: number; streak: number }> {
    try {
      const demoUserId = 'demo-user-123';
      const today = new Date().toISOString().split('T')[0];
      
      let streakInfo = this.streaks.get(demoUserId);
      if (!streakInfo) {
        await this.initializeUserRings(demoUserId);
        streakInfo = this.streaks.get(demoUserId)!;
      }

      const lastLoginDate = streakInfo.last_login_date;
      const currentStreak = streakInfo.current_streak || 0;

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
        newStreak = currentStreak + 1;
      } else {
        newStreak = 1;
      }

      // Calculate bonus amount
      const baseAmount = 10;
      const streakBonus = Math.min(newStreak - 1, 9) * 5;
      const totalAmount = baseAmount + streakBonus;

      // Update streak
      this.streaks.set(demoUserId, {
        current_streak: newStreak,
        longest_streak: Math.max(streakInfo.longest_streak, newStreak),
        last_login_date: today
      });

      // Award rings
      const awarded = await this.addRings(
        demoUserId,
        totalAmount,
        'DAILY_LOGIN',
        `일일 로그인 보너스 (${newStreak}일 연속)`,
        { streak: newStreak, base_amount: baseAmount, streak_bonus: streakBonus }
      );

      return { awarded, amount: totalAmount, streak: newStreak };
    } catch (error) {
      console.error('Mock processDailyLogin error:', error);
      return { awarded: false, amount: 0, streak: 0 };
    }
  }

  // Process quiz reward
  async processQuizReward(userId: string, correct: boolean, metadata?: any): Promise<number> {
    if (!correct) return 0;

    try {
      const amount = 5;
      const awarded = await this.addRings(
        userId,
        amount,
        'QUIZ_CORRECT',
        '퀴즈 정답 보상',
        metadata
      );

      return awarded ? amount : 0;
    } catch (error) {
      console.error('Mock processQuizReward error:', error);
      return 0;
    }
  }

  // Process photo upload reward
  async processPhotoUploadReward(userId: string, photoId: string): Promise<number> {
    try {
      // Mock daily limit check
      const amount = 20;
      const awarded = await this.addRings(
        userId,
        amount,
        'PHOTO_UPLOAD',
        '사진 업로드 보상',
        { photo_id: photoId, daily_count: 1 }
      );

      return awarded ? amount : 0;
    } catch (error) {
      console.error('Mock processPhotoUploadReward error:', error);
      return 0;
    }
  }

  // Get ring earning rules
  async getRingEarningRules(): Promise<any[]> {
    return [
      {
        id: '1',
        rule_type: 'DAILY_LOGIN',
        amount: 10,
        description: '일일 로그인 기본 보상',
        is_active: true
      },
      {
        id: '2',
        rule_type: 'QUIZ_CORRECT',
        amount: 5,
        description: '퀴즈 정답 보상',
        is_active: true
      },
      {
        id: '3',
        rule_type: 'PHOTO_UPLOAD',
        amount: 20,
        description: '사진 업로드 보상 (하루 3장 제한)',
        is_active: true
      },
      {
        id: '4',
        rule_type: 'SIGNUP_BONUS',
        amount: 100,
        description: '회원가입 보너스',
        is_active: true
      }
    ];
  }

  // Get user's login streak
  async getLoginStreak(userId: string): Promise<LoginStreak | null> {
    const demoUserId = 'demo-user-123';
    return this.streaks.get(demoUserId) || null;
  }

  // Check if user can afford a purchase
  async canAfford(userId: string, amount: number): Promise<boolean> {
    const balance = await this.getRingBalance(userId);
    return balance ? balance.balance >= amount : false;
  }

  // Get leaderboard (top ring earners)
  async getLeaderboard(limit: number = 10): Promise<any[]> {
    return [
      {
        id: 'demo-user-123',
        name: '데모 사용자',
        total_earned: 200
      },
      {
        id: 'user-2',
        name: '다른 사용자',
        total_earned: 150
      },
      {
        id: 'user-3',
        name: '또 다른 사용자',
        total_earned: 100
      }
    ];
  }
}

export const mockRingService = new MockRingService();
export default mockRingService;