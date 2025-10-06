import { Router, Request, Response } from 'express';
import { ringService } from '../services/ringService';
import { mockRingService } from '../services/mockRingService';
import { authenticateToken } from '../middleware/auth';

// Use mock service in development when database is unavailable
const getCurrentRingService = () => {
  if (process.env.NODE_ENV === 'development' && process.env.USE_MOCK_RING_SERVICE === 'true') {
    console.log('🎭 Using Mock Ring Service for development');
    return mockRingService;
  }
  return ringService;
};

const router = Router();

// Test endpoint without authentication for development
router.get('/test', async (req: Request, res: Response) => {
  try {
    const service = getCurrentRingService();
    console.log('🧪 Testing Ring Service...');
    
    // Test basic functionality
    const balance = await service.getRingBalance('demo-user-123');
    const transactions = await service.getTransactionHistory('demo-user-123', 5);
    const rules = await service.getRingEarningRules();
    
    res.json({
      success: true,
      message: 'Ring service test successful',
      data: {
        balance,
        recent_transactions: transactions,
        earning_rules: rules,
        service_type: process.env.USE_MOCK_RING_SERVICE === 'true' ? 'mock' : 'database'
      }
    });
  } catch (error) {
    console.error('Ring service test failed:', error);
    res.status(500).json({
      success: false,
      error: 'Ring service test failed',
      message: error.message
    });
  }
});

// Apply authentication to all other ring routes
router.use(authenticateToken);

// Get user's ring balance
router.get('/balance', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const service = getCurrentRingService();
    const balance = await service.getRingBalance(userId);
    if (!balance) {
      // Initialize rings for new user
      await service.initializeUserRings(userId);
      const newBalance = await service.getRingBalance(userId);
      return res.json(newBalance);
    }

    res.json(balance);
  } catch (error) {
    console.error('Error getting ring balance:', error);
    res.status(500).json({ error: 'Failed to get ring balance' });
  }
});

// Get transaction history
router.get('/transactions', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;

    const service = getCurrentRingService();
    const transactions = await service.getTransactionHistory(userId, limit, offset);
    res.json(transactions);
  } catch (error) {
    console.error('Error getting transaction history:', error);
    res.status(500).json({ error: 'Failed to get transaction history' });
  }
});

// Process daily login bonus
router.post('/daily-login', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const service = getCurrentRingService();
    const result = await service.processDailyLogin(userId);
    res.json(result);
  } catch (error) {
    console.error('Error processing daily login:', error);
    res.status(500).json({ error: 'Failed to process daily login' });
  }
});

// Spend rings
router.post('/spend', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { amount, transaction_type, description, metadata } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    if (!transaction_type) {
      return res.status(400).json({ error: 'Transaction type is required' });
    }

    const service = getCurrentRingService();
    
    // Check if user can afford
    const canAfford = await service.canAfford(userId, amount);
    if (!canAfford) {
      return res.status(400).json({ error: 'Insufficient rings' });
    }

    const success = await service.spendRings(userId, amount, transaction_type, description, metadata);
    
    if (success) {
      const newBalance = await service.getRingBalance(userId);
      res.json({ success: true, balance: newBalance });
    } else {
      res.status(400).json({ error: 'Failed to spend rings' });
    }
  } catch (error) {
    console.error('Error spending rings:', error);
    res.status(500).json({ error: 'Failed to spend rings' });
  }
});

// Award rings (for quiz correct answers, photo uploads, etc.)
router.post('/award', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { amount, transaction_type, description, metadata } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    if (!transaction_type) {
      return res.status(400).json({ error: 'Transaction type is required' });
    }

    const service = getCurrentRingService();
    const success = await service.addRings(userId, amount, transaction_type, description, metadata);
    
    if (success) {
      const newBalance = await service.getRingBalance(userId);
      res.json({ success: true, balance: newBalance });
    } else {
      res.status(400).json({ error: 'Failed to award rings' });
    }
  } catch (error) {
    console.error('Error awarding rings:', error);
    res.status(500).json({ error: 'Failed to award rings' });
  }
});

// Process quiz reward
router.post('/quiz-reward', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { correct, metadata } = req.body;

    const service = getCurrentRingService();
    const amount = await service.processQuizReward(userId, correct, metadata);
    
    if (amount > 0) {
      const newBalance = await service.getRingBalance(userId);
      res.json({ awarded: true, amount, balance: newBalance });
    } else {
      res.json({ awarded: false, amount: 0 });
    }
  } catch (error) {
    console.error('Error processing quiz reward:', error);
    res.status(500).json({ error: 'Failed to process quiz reward' });
  }
});

// Process photo upload reward
router.post('/photo-reward', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { photo_id } = req.body;

    if (!photo_id) {
      return res.status(400).json({ error: 'Photo ID is required' });
    }

    const service = getCurrentRingService();
    const amount = await service.processPhotoUploadReward(userId, photo_id);
    
    if (amount > 0) {
      const newBalance = await service.getRingBalance(userId);
      res.json({ awarded: true, amount, balance: newBalance });
    } else {
      res.json({ awarded: false, amount: 0, reason: 'Daily limit reached' });
    }
  } catch (error) {
    console.error('Error processing photo reward:', error);
    res.status(500).json({ error: 'Failed to process photo reward' });
  }
});

// Get login streak
router.get('/streak', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const service = getCurrentRingService();
    const streak = await service.getLoginStreak(userId);
    res.json(streak);
  } catch (error) {
    console.error('Error getting login streak:', error);
    res.status(500).json({ error: 'Failed to get login streak' });
  }
});

// Get ring earning rules
router.get('/rules', async (req: Request, res: Response) => {
  try {
    const service = getCurrentRingService();
    const rules = await service.getRingEarningRules();
    res.json(rules);
  } catch (error) {
    console.error('Error getting ring earning rules:', error);
    res.status(500).json({ error: 'Failed to get ring earning rules' });
  }
});

// Get leaderboard
router.get('/leaderboard', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const service = getCurrentRingService();
    const leaderboard = await service.getLeaderboard(limit);
    res.json(leaderboard);
  } catch (error) {
    console.error('Error getting leaderboard:', error);
    res.status(500).json({ error: 'Failed to get leaderboard' });
  }
});

// Check affordability
router.post('/can-afford', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { amount } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    const service = getCurrentRingService();
    const canAfford = await service.canAfford(userId, amount);
    res.json({ can_afford: canAfford });
  } catch (error) {
    console.error('Error checking affordability:', error);
    res.status(500).json({ error: 'Failed to check affordability' });
  }
});

export default router;