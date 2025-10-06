import { Router, Request, Response } from 'express';
import { ringService } from '../services/ringService';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Apply authentication to all ring routes
router.use(authenticateToken);

// Get user's ring balance
router.get('/balance', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const balance = await ringService.getRingBalance(userId);
    if (!balance) {
      // Initialize rings for new user
      await ringService.initializeUserRings(userId);
      const newBalance = await ringService.getRingBalance(userId);
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

    const transactions = await ringService.getTransactionHistory(userId, limit, offset);
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

    const result = await ringService.processDailyLogin(userId);
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

    // Check if user can afford
    const canAfford = await ringService.canAfford(userId, amount);
    if (!canAfford) {
      return res.status(400).json({ error: 'Insufficient rings' });
    }

    const success = await ringService.spendRings(userId, amount, transaction_type, description, metadata);
    
    if (success) {
      const newBalance = await ringService.getRingBalance(userId);
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

    const success = await ringService.addRings(userId, amount, transaction_type, description, metadata);
    
    if (success) {
      const newBalance = await ringService.getRingBalance(userId);
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

    const amount = await ringService.processQuizReward(userId, correct, metadata);
    
    if (amount > 0) {
      const newBalance = await ringService.getRingBalance(userId);
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

    const amount = await ringService.processPhotoUploadReward(userId, photo_id);
    
    if (amount > 0) {
      const newBalance = await ringService.getRingBalance(userId);
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

    const streak = await ringService.getLoginStreak(userId);
    res.json(streak);
  } catch (error) {
    console.error('Error getting login streak:', error);
    res.status(500).json({ error: 'Failed to get login streak' });
  }
});

// Get ring earning rules
router.get('/rules', async (req: Request, res: Response) => {
  try {
    const rules = await ringService.getRingEarningRules();
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
    const leaderboard = await ringService.getLeaderboard(limit);
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

    const canAfford = await ringService.canAfford(userId, amount);
    res.json({ can_afford: canAfford });
  } catch (error) {
    console.error('Error checking affordability:', error);
    res.status(500).json({ error: 'Failed to check affordability' });
  }
});

export default router;