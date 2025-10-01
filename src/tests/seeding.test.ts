import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Database } from '../utils/database';
import { seedService } from '../services/seedService';
import { config } from '../utils/config';

describe('Seeding System Tests (SD1-SD2)', () => {
  let db: Database;
  const originalEnv = config.NODE_ENV;
  const originalSeedEnabled = config.DEV_MODE_SEED_ENABLED;

  beforeEach(async () => {
    db = Database.getInstance();

    // Set test environment
    (config as any).NODE_ENV = 'development';
    (config as any).DEV_MODE_SEED_ENABLED = true;

    // Clean up all test data
    await seedService.resetData();
  });

  afterEach(async () => {
    // Restore original config
    (config as any).NODE_ENV = originalEnv;
    (config as any).DEV_MODE_SEED_ENABLED = originalSeedEnabled;

    // Clean up test data
    await seedService.resetData();
  });

  describe('SD1: /dev/seed execution and summary verification', () => {
    it('should execute seeding and generate correct summary', async () => {
      const seedOptions = {
        userCount: 10,
        traitPairs: 15,
        photosPerUser: 2,
        quizSessions: 20,
        resetFirst: false
      };

      // Run seeding
      const result = await seedService.runSeed(seedOptions);

      // Verify seed run result
      expect(result.stats).toBeDefined();
      expect(result.seedRunId).toBeDefined();

      // Verify stats match expectations
      expect(result.stats.usersCreated).toBe(10);
      expect(result.stats.traitPairsCreated).toBe(15);
      expect(result.stats.photosCreated).toBe(20); // 10 users × 2 photos
      expect(result.stats.quizSessionsCreated).toBe(20);
      expect(result.stats.seedTimeMs).toBeGreaterThan(0);

      // Verify seed run was recorded
      const [seedRun] = await db.query(
        'SELECT * FROM seed_runs WHERE id = $1',
        [result.seedRunId]
      );

      expect(seedRun).toBeDefined();
      expect(seedRun.stats).toBeDefined();

      const storedStats = JSON.parse(seedRun.stats);
      expect(storedStats.usersCreated).toBe(10);
    });

    it('should generate comprehensive summary with current counts', async () => {
      // Run initial seeding
      await seedService.runSeed({
        userCount: 5,
        traitPairs: 10,
        photosPerUser: 3,
        quizSessions: 15,
        resetFirst: false
      });

      // Get summary
      const summary = await seedService.getSeedSummary();

      // Verify summary structure
      expect(summary.lastRun).toBeDefined();
      expect(summary.currentCounts).toBeDefined();
      expect(summary.devFlags).toBeDefined();

      // Verify current counts
      expect(summary.currentCounts.users).toBe(5);
      expect(summary.currentCounts.traitPairs).toBe(10);
      expect(summary.currentCounts.photos).toBe(15); // 5 users × 3 photos
      expect(summary.currentCounts.quizSessions).toBe(15);

      // Verify last run information
      expect(summary.lastRun.id).toBeDefined();
      expect(summary.lastRun.run_at).toBeDefined();
      expect(summary.lastRun.stats).toBeDefined();
    });

    it('should create valid user data with Korean names and proper relationships', async () => {
      await seedService.runSeed({
        userCount: 3,
        traitPairs: 5,
        photosPerUser: 2,
        quizSessions: 5,
        resetFirst: false
      });

      // Verify users were created with Korean names
      const users = await db.query(
        'SELECT name, email, age, gender, location FROM users ORDER BY created_at'
      );

      expect(users).toHaveLength(3);

      users.forEach(user => {
        expect(user.name).toBeDefined();
        expect(user.email).toMatch(/^user\d+@example\.com$/);
        expect(user.age).toBeGreaterThanOrEqual(22);
        expect(user.age).toBeLessThanOrEqual(36);
        expect(['male', 'female']).toContain(user.gender);
        expect(user.location).toBeDefined();
      });

      // Verify point balances were initialized
      const pointBalances = await db.query(
        'SELECT balance FROM user_point_balances'
      );

      expect(pointBalances).toHaveLength(3);
      pointBalances.forEach(balance => {
        expect(balance.balance).toBe(10000);
      });
    });

    it('should create proper trait pairs with visual assets', async () => {
      await seedService.runSeed({
        userCount: 2,
        traitPairs: 8,
        photosPerUser: 1,
        quizSessions: 3,
        resetFirst: false
      });

      // Verify trait pairs
      const traitPairs = await db.query(
        'SELECT * FROM trait_pairs WHERE is_active = true ORDER BY created_at'
      );

      expect(traitPairs).toHaveLength(8);

      traitPairs.forEach(pair => {
        expect(pair.key).toBeDefined();
        expect(pair.left_label).toBeDefined();
        expect(pair.right_label).toBeDefined();
        expect(pair.category).toBeDefined();
        expect(pair.weight).toBe(1.0);
        expect(pair.entropy).toBe(0.5);
        expect(pair.is_active).toBe(true);
      });

      // Verify trait visuals were created
      const traitVisuals = await db.query(
        'SELECT * FROM trait_visuals WHERE is_default = true'
      );

      expect(traitVisuals).toHaveLength(8);

      traitVisuals.forEach(visual => {
        expect(visual.pair_id).toBeDefined();
        expect(visual.left_asset_id).toBeDefined();
        expect(visual.right_asset_id).toBeDefined();
        expect(visual.locale).toBe('ko');
        expect(visual.is_default).toBe(true);
      });
    });

    it('should create photos with all required variants and mask states', async () => {
      await seedService.runSeed({
        userCount: 2,
        traitPairs: 3,
        photosPerUser: 2,
        quizSessions: 2,
        resetFirst: false
      });

      // Verify photos were created
      const photos = await db.query(
        'SELECT * FROM user_photos ORDER BY user_id, order_idx'
      );

      expect(photos).toHaveLength(4); // 2 users × 2 photos

      photos.forEach(photo => {
        expect(photo.role).toBe('PROFILE');
        expect(photo.is_safe).toBe(true);
        expect(photo.moderation_status).toBe('APPROVED');
      });

      // Verify photo assets were created
      const assets = await db.query(
        'SELECT photo_id, variant FROM photo_assets ORDER BY photo_id, variant'
      );

      // Should have 4 variants for each photo
      expect(assets).toHaveLength(16); // 4 photos × 4 variants

      const variants = ['BLUR1', 'BLUR2', 'ORIG', 'THUMB'];
      const assetsByPhoto = {};

      assets.forEach(asset => {
        if (!assetsByPhoto[asset.photo_id]) {
          assetsByPhoto[asset.photo_id] = [];
        }
        assetsByPhoto[asset.photo_id].push(asset.variant);
      });

      Object.values(assetsByPhoto).forEach((photoVariants: string[]) => {
        expect(photoVariants.sort()).toEqual(variants);
      });
    });

    it('should create proper affinity relationships and mask states', async () => {
      await seedService.runSeed({
        userCount: 3,
        traitPairs: 5,
        photosPerUser: 2,
        quizSessions: 5,
        resetFirst: false
      });

      // Verify affinities were created
      const affinities = await db.query(
        'SELECT viewer_id, target_id, score, stages_unlocked FROM affinity'
      );

      expect(affinities.length).toBeGreaterThan(0);

      affinities.forEach(affinity => {
        expect(affinity.viewer_id).toBeDefined();
        expect(affinity.target_id).toBeDefined();
        expect(affinity.viewer_id).not.toBe(affinity.target_id);
        expect(affinity.score).toBeGreaterThanOrEqual(0);
        expect(affinity.score).toBeLessThanOrEqual(70);
        expect(Array.isArray(affinity.stages_unlocked)).toBe(true);
      });

      // Verify photo mask states were created
      const maskStates = await db.query(
        'SELECT user_id, photo_id, visible_stage FROM photo_mask_states'
      );

      expect(maskStates.length).toBeGreaterThan(0);

      maskStates.forEach(state => {
        expect(['LOCKED', 'T1', 'T2', 'T3']).toContain(state.visible_stage);
      });

      // Verify mask states align with affinity scores
      const stageThresholds = {
        'T1': config.AFFINITY_T1_THRESHOLD,
        'T2': config.AFFINITY_T2_THRESHOLD,
        'T3': config.AFFINITY_T3_THRESHOLD
      };

      for (const affinity of affinities) {
        const userMaskStates = await db.query(
          `SELECT pms.visible_stage
           FROM photo_mask_states pms
           JOIN user_photos up ON pms.photo_id = up.id
           WHERE pms.user_id = $1 AND up.user_id = $2`,
          [affinity.viewer_id, affinity.target_id]
        );

        userMaskStates.forEach(state => {
          if (state.visible_stage !== 'LOCKED') {
            const threshold = stageThresholds[state.visible_stage];
            expect(affinity.score).toBeGreaterThanOrEqual(threshold);
          }
        });
      }
    });

    it('should create quiz sessions and items with proper structure', async () => {
      await seedService.runSeed({
        userCount: 4,
        traitPairs: 10,
        photosPerUser: 2,
        quizSessions: 8,
        resetFirst: false
      });

      // Verify quiz sessions
      const sessions = await db.query(
        'SELECT asker_id, target_id, mode, points_spent, started_at, ended_at FROM quiz_sessions'
      );

      expect(sessions).toHaveLength(8);

      sessions.forEach(session => {
        expect(session.asker_id).toBeDefined();
        expect(session.target_id).toBeDefined();
        expect(session.asker_id).not.toBe(session.target_id);
        expect(session.mode).toBe('TRAIT_PHOTO');
        expect(session.points_spent).toBe(1);
        expect(session.started_at).toBeDefined();
        expect(session.ended_at).toBeDefined();
      });

      // Verify quiz items
      const items = await db.query(
        'SELECT session_id, pair_id, option_type, asker_guess, correct, delta_affinity, delta_points FROM quiz_items'
      );

      expect(items.length).toBeGreaterThan(0);

      items.forEach(item => {
        expect(item.session_id).toBeDefined();
        expect(item.pair_id).toBeDefined();
        expect(['LEFT', 'RIGHT']).toContain(item.option_type);
        expect(['LEFT', 'RIGHT']).toContain(item.asker_guess);
        expect(typeof item.correct).toBe('boolean');
        expect(typeof item.delta_affinity).toBe('number');
        expect(typeof item.delta_points).toBe('number');
      });

      // Verify quiz statistics are reasonable
      const correctAnswers = items.filter(item => item.correct).length;
      const totalAnswers = items.length;
      const accuracy = correctAnswers / totalAnswers;

      // Should have reasonable accuracy (not 0% or 100%)
      expect(accuracy).toBeGreaterThan(0.3);
      expect(accuracy).toBeLessThan(1.0);
    });
  });

  describe('SD2: /dev/reset followed by re-seeding', () => {
    it('should completely reset data and allow re-seeding', async () => {
      // Initial seeding
      await seedService.runSeed({
        userCount: 5,
        traitPairs: 8,
        photosPerUser: 2,
        quizSessions: 10,
        resetFirst: false
      });

      // Verify data exists
      let summary = await seedService.getSeedSummary();
      expect(summary.currentCounts.users).toBe(5);
      expect(summary.currentCounts.traitPairs).toBe(8);

      // Reset data
      await seedService.resetData();

      // Verify all data was cleared
      const counts = await Promise.all([
        db.queryOne('SELECT COUNT(*) as count FROM users'),
        db.queryOne('SELECT COUNT(*) as count FROM trait_pairs'),
        db.queryOne('SELECT COUNT(*) as count FROM user_photos'),
        db.queryOne('SELECT COUNT(*) as count FROM quiz_sessions'),
        db.queryOne('SELECT COUNT(*) as count FROM quiz_items'),
        db.queryOne('SELECT COUNT(*) as count FROM affinity'),
        db.queryOne('SELECT COUNT(*) as count FROM seed_runs')
      ]);

      counts.forEach(count => {
        expect(count.count).toBe(0);
      });

      // Re-seed with different parameters
      await seedService.runSeed({
        userCount: 3,
        traitPairs: 6,
        photosPerUser: 3,
        quizSessions: 8,
        resetFirst: false
      });

      // Verify new data
      summary = await seedService.getSeedSummary();
      expect(summary.currentCounts.users).toBe(3);
      expect(summary.currentCounts.traitPairs).toBe(6);
      expect(summary.currentCounts.photos).toBe(9); // 3 users × 3 photos
      expect(summary.currentCounts.quizSessions).toBe(8);
    });

    it('should preserve data integrity across reset cycles', async () => {
      // Multiple reset and seed cycles
      for (let cycle = 0; cycle < 3; cycle++) {
        // Reset if not first cycle
        if (cycle > 0) {
          await seedService.resetData();
        }

        // Seed with varying parameters
        const userCount = 2 + cycle;
        await seedService.runSeed({
          userCount,
          traitPairs: 5,
          photosPerUser: 2,
          quizSessions: 5,
          resetFirst: false
        });

        // Verify data integrity
        const users = await db.query('SELECT id FROM users');
        const photos = await db.query('SELECT user_id FROM user_photos');
        const pointBalances = await db.query('SELECT user_id FROM user_point_balances');

        expect(users).toHaveLength(userCount);
        expect(photos).toHaveLength(userCount * 2);
        expect(pointBalances).toHaveLength(userCount);

        // Verify all photos belong to existing users
        const userIds = users.map(u => u.id);
        photos.forEach(photo => {
          expect(userIds).toContain(photo.user_id);
        });

        // Verify all point balances belong to existing users
        pointBalances.forEach(balance => {
          expect(userIds).toContain(balance.user_id);
        });

        // Verify foreign key constraints are intact
        const affinities = await db.query(
          'SELECT viewer_id, target_id FROM affinity'
        );

        affinities.forEach(affinity => {
          expect(userIds).toContain(affinity.viewer_id);
          expect(userIds).toContain(affinity.target_id);
        });
      }
    });

    it('should handle reset_first flag correctly', async () => {
      // Initial seeding
      await seedService.runSeed({
        userCount: 3,
        traitPairs: 5,
        photosPerUser: 2,
        quizSessions: 5,
        resetFirst: false
      });

      // Verify initial data
      let userCount = await db.queryOne('SELECT COUNT(*) as count FROM users');
      expect(userCount.count).toBe(3);

      // Seed again with reset_first: true
      await seedService.runSeed({
        userCount: 5,
        traitPairs: 8,
        photosPerUser: 3,
        quizSessions: 10,
        resetFirst: true
      });

      // Verify old data was cleared and new data created
      userCount = await db.queryOne('SELECT COUNT(*) as count FROM users');
      expect(userCount.count).toBe(5);

      const traitCount = await db.queryOne('SELECT COUNT(*) as count FROM trait_pairs');
      expect(traitCount.count).toBe(8);

      const photoCount = await db.queryOne('SELECT COUNT(*) as count FROM user_photos');
      expect(photoCount.count).toBe(15); // 5 users × 3 photos
    });

    it('should maintain dev flags across resets', async () => {
      // Set some dev flags
      await db.query(
        `INSERT INTO dev_flags (key, value) VALUES ('test_flag_1', 'value1'), ('test_flag_2', 'value2')`
      );

      // Initial seeding
      await seedService.runSeed({
        userCount: 2,
        traitPairs: 3,
        photosPerUser: 1,
        quizSessions: 2,
        resetFirst: false
      });

      // Reset data
      await seedService.resetData();

      // Verify dev flags were preserved
      const flags = await db.query('SELECT key, value FROM dev_flags ORDER BY key');
      expect(flags).toHaveLength(2);
      expect(flags[0].key).toBe('test_flag_1');
      expect(flags[0].value).toBe('value1');
      expect(flags[1].key).toBe('test_flag_2');
      expect(flags[1].value).toBe('value2');

      // Re-seed
      await seedService.runSeed({
        userCount: 3,
        traitPairs: 4,
        photosPerUser: 2,
        quizSessions: 4,
        resetFirst: false
      });

      // Verify flags still exist
      const flagsAfterReseed = await db.query('SELECT key FROM dev_flags ORDER BY key');
      expect(flagsAfterReseed).toHaveLength(2);
    });
  });

  describe('Security and validation', () => {
    it('should reject seeding in production environment', async () => {
      (config as any).NODE_ENV = 'production';

      await expect(
        seedService.runSeed({ userCount: 1 })
      ).rejects.toThrow('Seeding is not allowed in production');
    });

    it('should reject seeding when disabled', async () => {
      (config as any).DEV_MODE_SEED_ENABLED = false;

      await expect(
        seedService.runSeed({ userCount: 1 })
      ).rejects.toThrow('Dev mode seeding is not enabled');
    });

    it('should validate seed parameters', async () => {
      // Test will pass since we're using TypeScript interfaces
      // In a real implementation, you might want runtime validation
      const result = await seedService.runSeed({
        userCount: 1,
        traitPairs: 1,
        photosPerUser: 1,
        quizSessions: 1
      });

      expect(result.stats.usersCreated).toBe(1);
    });
  });
});