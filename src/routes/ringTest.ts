import { Router, Request, Response } from 'express';
import { mockRingService } from '../services/mockRingService';

const router = Router();

// Test endpoint without authentication for development
router.get('/test', async (req: Request, res: Response) => {
  try {
    console.log('🧪 Testing Ring Service...');
    
    // Test basic functionality with mock service
    const balance = await mockRingService.getRingBalance('demo-user-123');
    const transactions = await mockRingService.getTransactionHistory('demo-user-123', 5);
    const rules = await mockRingService.getRingEarningRules();
    const streak = await mockRingService.getLoginStreak('demo-user-123');
    
    // Test daily login
    const dailyLogin = await mockRingService.processDailyLogin('demo-user-123');
    
    res.json({
      success: true,
      message: 'Ring service test successful',
      data: {
        balance,
        recent_transactions: transactions,
        earning_rules: rules,
        login_streak: streak,
        daily_login_test: dailyLogin,
        service_type: 'mock'
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

// Test daily login bonus
router.post('/test/daily-login', async (req: Request, res: Response) => {
  try {
    console.log('🧪 Testing Daily Login Bonus...');
    
    const result = await mockRingService.processDailyLogin('demo-user-123');
    const newBalance = await mockRingService.getRingBalance('demo-user-123');
    
    res.json({
      success: true,
      daily_login: result,
      balance: newBalance
    });
  } catch (error) {
    console.error('Daily login test failed:', error);
    res.status(500).json({
      success: false,
      error: 'Daily login test failed',
      message: error.message
    });
  }
});

// Test adding rings
router.post('/test/add-rings', async (req: Request, res: Response) => {
  try {
    const { amount, type, description } = req.body;
    console.log('🧪 Testing Add Rings...', { amount, type, description });
    
    const success = await mockRingService.addRings(
      'demo-user-123',
      amount || 25,
      type || 'TEST_REWARD',
      description || 'Test reward',
      { test: true }
    );
    
    const newBalance = await mockRingService.getRingBalance('demo-user-123');
    
    res.json({
      success,
      balance: newBalance,
      message: `Added ${amount || 25} rings`
    });
  } catch (error) {
    console.error('Add rings test failed:', error);
    res.status(500).json({
      success: false,
      error: 'Add rings test failed',
      message: error.message
    });
  }
});

// Test quiz reward
router.post('/test/quiz-reward', async (req: Request, res: Response) => {
  try {
    const { correct } = req.body;
    console.log('🧪 Testing Quiz Reward...', { correct });
    
    const amount = await mockRingService.processQuizReward('demo-user-123', correct !== false);
    const newBalance = await mockRingService.getRingBalance('demo-user-123');
    
    res.json({
      success: true,
      awarded_amount: amount,
      balance: newBalance,
      message: `Quiz ${correct !== false ? 'correct' : 'incorrect'} - awarded ${amount} rings`
    });
  } catch (error) {
    console.error('Quiz reward test failed:', error);
    res.status(500).json({
      success: false,
      error: 'Quiz reward test failed',
      message: error.message
    });
  }
});

export default router;