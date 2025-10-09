import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Database } from '../utils/database';
import { quizService } from '../services/quizService';
import { ringsService } from '../services/ringsService';
import { config } from '../utils/config';

describe('Quiz System Tests (QZ1-QZ3)', () => {
  let db: Database;
  let askerId: string;
  let targetId: string;
  let traitPairId: string;

  beforeEach(async () => {
    db = Database.getInstance();

    // Clean up test data
    await db.query('DELETE FROM quiz_items');
    await db.query('DELETE FROM quiz_sessions');
    await db.query('DELETE FROM user_ring_ledger');
    await db.query('DELETE FROM user_ring_balances');
    await db.query('DELETE FROM user_traits');
    await db.query('DELETE FROM affinity');
    await db.query('DELETE FROM trait_pairs WHERE key LIKE \'test-%\'');
    await db.query('DELETE FROM users WHERE email LIKE \'test-quiz-%\'');

    // Create test users
    const [asker] = await db.query(
      `INSERT INTO users (id, email, password_hash, name, profile_complete, is_active)
       VALUES (gen_random_uuid(), 'test-quiz-asker@example.com', 'hashedpass', 'Quiz Asker', true, true)
       RETURNING id`
    );
    askerId = asker.id;

    const [target] = await db.query(
      `INSERT INTO users (id, email, password_hash, name, profile_complete, is_active)
       VALUES (gen_random_uuid(), 'test-quiz-target@example.com', 'hashedpass', 'Quiz Target', true, true)
       RETURNING id`
    );
    targetId = target.id;

    // Initialize point balances
    await ringsService.initializeUserPoints(askerId, 100);
    await ringsService.initializeUserPoints(targetId, 100);

    // Create test trait pair
    const [traitPair] = await db.query(
      `INSERT INTO trait_pairs (id, key, left_label, right_label, category, is_active)
       VALUES (gen_random_uuid(), 'test-trait', 'Left Choice', 'Right Choice', 'test', true)
       RETURNING id`
    );
    traitPairId = traitPair.id;

    // Add target's trait response
    await db.query(
      `INSERT INTO user_traits (id, user_id, pair_id, choice, confidence)
       VALUES (gen_random_uuid(), $1, $2, 'left', 1.0)`,
      [targetId, traitPairId]
    );
  });

  afterEach(async () => {
    // Clean up test data
    await db.query('DELETE FROM quiz_items');
    await db.query('DELETE FROM quiz_sessions');
    await db.query('DELETE FROM user_ring_ledger');
    await db.query('DELETE FROM user_ring_balances');
    await db.query('DELETE FROM user_traits');
    await db.query('DELETE FROM affinity');
    await db.query('DELETE FROM trait_pairs WHERE key LIKE \'test-%\'');
    await db.query('DELETE FROM users WHERE email LIKE \'test-quiz-%\'');
  });

  describe('QZ1: Session creation with point deduction', () => {
    it('should create quiz session and deduct points', async () => {
      // Get initial points
      const initialPoints = await ringsService.getUserPoints(askerId);
      expect(initialPoints.balance).toBe(100);

      // Start quiz session
      const result = await quizService.startQuizSession({
        askerId,
        targetId,
        mode: 'TRAIT_PHOTO'
      });

      expect(result.session).toBeDefined();
      expect(result.session.asker_id).toBe(askerId);
      expect(result.session.target_id).toBe(targetId);
      expect(result.session.points_spent).toBe(config.QUIZ_ENTER_COST);

      // Verify points were deducted
      expect(result.pointsRemaining).toBe(100 - config.QUIZ_ENTER_COST);

      // Verify point ledger entry
      const transactions = await db.query(
        'SELECT * FROM user_ring_ledger WHERE user_id = $1 AND reason = $2',
        [askerId, 'QUIZ_ENTER']
      );

      expect(transactions).toHaveLength(1);
      expect(transactions[0].delta).toBe(-config.QUIZ_ENTER_COST);
    });

    it('should fail to create session with insufficient points', async () => {
      // Reduce user's points to below quiz cost
      await db.query(
        'UPDATE user_ring_balances SET balance = $1 WHERE user_id = $2',
        [config.QUIZ_ENTER_COST - 1, askerId]
      );

      // Attempt to start quiz session
      await expect(
        quizService.startQuizSession({
          askerId,
          targetId,
          mode: 'TRAIT_PHOTO'
        })
      ).rejects.toThrow('Insufficient points to start quiz');
    });
  });

  describe('QZ2: Answer recording and affinity updates', () => {
    let sessionId: string;

    beforeEach(async () => {
      // Create quiz session
      const result = await quizService.startQuizSession({
        askerId,
        targetId,
        mode: 'TRAIT_PHOTO'
      });
      sessionId = result.session.id;
    });

    it('should record correct answer and update affinity positively', async () => {
      // Submit correct answer (target chose 'left', we guess 'LEFT')
      const result = await quizService.submitAnswer({
        sessionId,
        pairId: traitPairId,
        guess: 'LEFT'
      });

      expect(result.correct).toBe(true);
      expect(result.targetChoice).toBe('LEFT');
      expect(result.deltaAffinity).toBe(config.AFFINITY_ALPHA);
      expect(result.deltaPoints).toBe(0); // No penalty for correct answer

      // Verify quiz item was recorded
      const [quizItem] = await db.query(
        'SELECT * FROM quiz_items WHERE session_id = $1',
        [sessionId]
      );

      expect(quizItem).toBeDefined();
      expect(quizItem.correct).toBe(true);
      expect(quizItem.asker_guess).toBe('LEFT');
      expect(quizItem.delta_affinity).toBe(config.AFFINITY_ALPHA);

      // Verify affinity was created/updated
      const [affinity] = await db.query(
        'SELECT * FROM affinity WHERE viewer_id = $1 AND target_id = $2',
        [askerId, targetId]
      );

      expect(affinity).toBeDefined();
      expect(affinity.score).toBe(config.AFFINITY_ALPHA);
    });

    it('should record wrong answer and apply penalties', async () => {
      // Submit wrong answer (target chose 'left', we guess 'RIGHT')
      const result = await quizService.submitAnswer({
        sessionId,
        pairId: traitPairId,
        guess: 'RIGHT'
      });

      expect(result.correct).toBe(false);
      expect(result.targetChoice).toBe('LEFT');
      expect(result.deltaAffinity).toBe(-config.AFFINITY_BETA);
      expect(result.deltaPoints).toBe(-config.QUIZ_WRONG_PENALTY);

      // Verify quiz item was recorded
      const [quizItem] = await db.query(
        'SELECT * FROM quiz_items WHERE session_id = $1',
        [sessionId]
      );

      expect(quizItem).toBeDefined();
      expect(quizItem.correct).toBe(false);
      expect(quizItem.asker_guess).toBe('RIGHT');
      expect(quizItem.delta_points).toBe(-config.QUIZ_WRONG_PENALTY);

      // Verify point penalty was applied
      const transactions = await db.query(
        'SELECT * FROM user_ring_ledger WHERE user_id = $1 AND reason = $2',
        [askerId, 'QUIZ_WRONG']
      );

      expect(transactions).toHaveLength(1);
      expect(transactions[0].delta).toBe(-config.QUIZ_WRONG_PENALTY);

      // Verify points balance
      const pointsData = await ringsService.getUserPoints(askerId);
      const expectedBalance = 100 - config.QUIZ_ENTER_COST - config.QUIZ_WRONG_PENALTY;
      expect(pointsData.balance).toBe(expectedBalance);
    });

    it('should record selected photo information in quiz item', async () => {
      // Create a test photo
      const [photo] = await db.query(
        `INSERT INTO user_photos (id, user_id, role, moderation_status)
         VALUES (gen_random_uuid(), $1, 'PROFILE', 'APPROVED')
         RETURNING id`,
        [targetId]
      );

      // Submit answer with selected photo
      const result = await quizService.submitAnswer({
        sessionId,
        pairId: traitPairId,
        guess: 'LEFT',
        selectedPhotoId: photo.id
      });

      expect(result.correct).toBe(true);

      // Verify quiz item includes photo information
      const [quizItem] = await db.query(
        'SELECT * FROM quiz_items WHERE session_id = $1',
        [sessionId]
      );

      expect(quizItem.selected_photo_id).toBe(photo.id);
      expect(quizItem.assets).toBeDefined();

      // Parse and verify assets JSON
      const assets = JSON.parse(quizItem.assets);
      expect(assets.selected_photo_assets).toBeDefined();
    });
  });

  describe('QZ3: Threshold unlock reflection', () => {
    let sessionId: string;

    beforeEach(async () => {
      // Create quiz session
      const result = await quizService.startQuizSession({
        askerId,
        targetId,
        mode: 'TRAIT_PHOTO'
      });
      sessionId = result.session.id;

      // Create test photos for target
      for (let i = 0; i < 3; i++) {
        const [photo] = await db.query(
          `INSERT INTO user_photos (id, user_id, role, moderation_status, order_idx)
           VALUES (gen_random_uuid(), $1, 'PROFILE', 'APPROVED', $2)
           RETURNING id`,
          [targetId, i]
        );

        // Initialize photo mask state as LOCKED
        await db.query(
          `INSERT INTO photo_mask_states (user_id, photo_id, visible_stage)
           VALUES ($1, $2, 'LOCKED')`,
          [askerId, photo.id]
        );
      }
    });

    it('should unlock T1 stage when reaching threshold', async () => {
      // Build affinity to just under T1 threshold
      const currentScore = config.AFFINITY_T1_THRESHOLD - config.AFFINITY_ALPHA;
      await db.query(
        `INSERT INTO affinity (id, viewer_id, target_id, score, stages_unlocked)
         VALUES (gen_random_uuid(), $1, $2, $3, '{}')
         ON CONFLICT (viewer_id, target_id) DO UPDATE SET score = $3`,
        [askerId, targetId, currentScore]
      );

      // Submit correct answer to cross T1 threshold
      const result = await quizService.submitAnswer({
        sessionId,
        pairId: traitPairId,
        guess: 'LEFT'
      });

      expect(result.correct).toBe(true);
      expect(result.affinityScore).toBe(currentScore + config.AFFINITY_ALPHA);
      expect(result.stagesUnlocked).toContain('T1');

      // Verify photo mask states were updated
      const maskStates = await db.query(
        `SELECT visible_stage FROM photo_mask_states
         WHERE user_id = $1 AND photo_id IN (
           SELECT id FROM user_photos WHERE user_id = $2
         )`,
        [askerId, targetId]
      );

      maskStates.forEach(state => {
        expect(state.visible_stage).toBe('T1');
      });
    });

    it('should unlock T2 stage when reaching second threshold', async () => {
      // Build affinity to just under T2 threshold
      const currentScore = config.AFFINITY_T2_THRESHOLD - config.AFFINITY_ALPHA;
      await db.query(
        `INSERT INTO affinity (id, viewer_id, target_id, score, stages_unlocked)
         VALUES (gen_random_uuid(), $1, $2, $3, '{t1}')
         ON CONFLICT (viewer_id, target_id) DO UPDATE SET score = $3, stages_unlocked = '{t1}'`,
        [askerId, targetId, currentScore]
      );

      // Update existing mask states to T1
      await db.query(
        `UPDATE photo_mask_states SET visible_stage = 'T1'
         WHERE user_id = $1 AND photo_id IN (
           SELECT id FROM user_photos WHERE user_id = $2
         )`,
        [askerId, targetId]
      );

      // Submit correct answer to cross T2 threshold
      const result = await quizService.submitAnswer({
        sessionId,
        pairId: traitPairId,
        guess: 'LEFT'
      });

      expect(result.affinityScore).toBe(currentScore + config.AFFINITY_ALPHA);
      expect(result.stagesUnlocked).toContain('T2');

      // Verify photo mask states were updated to T2
      const maskStates = await db.query(
        `SELECT visible_stage FROM photo_mask_states
         WHERE user_id = $1 AND photo_id IN (
           SELECT id FROM user_photos WHERE user_id = $2
         )`,
        [askerId, targetId]
      );

      maskStates.forEach(state => {
        expect(state.visible_stage).toBe('T2');
      });
    });

    it('should unlock T3 stage and enable meetings', async () => {
      // Build affinity to just under T3 threshold
      const currentScore = config.AFFINITY_T3_THRESHOLD - config.AFFINITY_ALPHA;
      await db.query(
        `INSERT INTO affinity (id, viewer_id, target_id, score, stages_unlocked)
         VALUES (gen_random_uuid(), $1, $2, $3, '{t1,t2}')
         ON CONFLICT (viewer_id, target_id) DO UPDATE SET score = $3, stages_unlocked = '{t1,t2}'`,
        [askerId, targetId, currentScore]
      );

      // Update existing mask states to T2
      await db.query(
        `UPDATE photo_mask_states SET visible_stage = 'T2'
         WHERE user_id = $1 AND photo_id IN (
           SELECT id FROM user_photos WHERE user_id = $2
         )`,
        [askerId, targetId]
      );

      // Submit correct answer to cross T3 threshold
      const result = await quizService.submitAnswer({
        sessionId,
        pairId: traitPairId,
        guess: 'LEFT'
      });

      expect(result.affinityScore).toBe(currentScore + config.AFFINITY_ALPHA);
      expect(result.stagesUnlocked).toContain('T3');

      // Verify photo mask states were updated to T3
      const maskStates = await db.query(
        `SELECT visible_stage FROM photo_mask_states
         WHERE user_id = $1 AND photo_id IN (
           SELECT id FROM user_photos WHERE user_id = $2
         )`,
        [askerId, targetId]
      );

      maskStates.forEach(state => {
        expect(state.visible_stage).toBe('T3');
      });

      // Verify affinity stages were updated
      const [updatedAffinity] = await db.query(
        'SELECT stages_unlocked FROM affinity WHERE viewer_id = $1 AND target_id = $2',
        [askerId, targetId]
      );

      expect(updatedAffinity.stages_unlocked).toContain('t1');
      expect(updatedAffinity.stages_unlocked).toContain('t2');
      expect(updatedAffinity.stages_unlocked).toContain('t3');
    });

    it('should track user skill statistics', async () => {
      // Submit multiple answers to build skill stats
      for (let i = 0; i < 5; i++) {
        const isCorrect = i < 3; // 3 correct, 2 wrong
        const guess = isCorrect ? 'LEFT' : 'RIGHT';

        await quizService.submitAnswer({
          sessionId,
          pairId: traitPairId,
          guess
        });

        // Create new session for next answer (simplified for test)
        if (i < 4) {
          const result = await quizService.startQuizSession({
            askerId,
            targetId,
            mode: 'TRAIT_PHOTO'
          });
          sessionId = result.session.id;
        }
      }

      // Check user skill stats
      const [skill] = await db.query(
        'SELECT * FROM user_skills WHERE user_id = $1',
        [askerId]
      );

      expect(skill).toBeDefined();
      expect(skill.total_attempts).toBe(5);
      expect(skill.accuracy).toBeCloseTo(0.6, 2); // 3/5 = 0.6
    });
  });
});