import { Database } from '../utils/database';
import { storageService } from '../utils/storage';
import { config } from '../utils/config';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcrypt';

export interface SeedOptions {
  userCount?: number;
  traitPairs?: number;
  photosPerUser?: number;
  quizSessions?: number;
  resetFirst?: boolean;
}

export interface SeedStats {
  usersCreated: number;
  photosCreated: number;
  traitPairsCreated: number;
  quizSessionsCreated: number;
  quizItemsCreated: number;
  affinitiesCreated: number;
  seedTimeMs: number;
}

export class SeedService {
  private db: Database;

  constructor() {
    this.db = Database.getInstance();
  }

  /**
   * Run complete seeding process
   */
  async runSeed(options: SeedOptions = {}): Promise<{ stats: SeedStats; seedRunId: string }> {
    if (config.NODE_ENV === 'production') {
      throw new Error('Seeding is not allowed in production');
    }

    if (!config.DEV_MODE_SEED_ENABLED) {
      throw new Error('Dev mode seeding is not enabled');
    }

    const startTime = Date.now();

    const defaults: Required<SeedOptions> = {
      userCount: 30,
      traitPairs: 50,
      photosPerUser: 4,
      quizSessions: 50,
      resetFirst: false
    };

    const opts = { ...defaults, ...options };

    if (opts.resetFirst) {
      await this.resetData();
    }

    const stats: SeedStats = {
      usersCreated: 0,
      photosCreated: 0,
      traitPairsCreated: 0,
      quizSessionsCreated: 0,
      quizItemsCreated: 0,
      affinitiesCreated: 0,
      seedTimeMs: 0
    };

    // Run seeding steps
    await this.seedTraitPairs(opts.traitPairs, stats);
    const users = await this.seedUsers(opts.userCount, stats);
    await this.seedUserPhotos(users, opts.photosPerUser, stats);
    await this.seedUserTraits(users, stats);
    await this.seedAffinities(users, stats);
    await this.seedQuizSessions(users, opts.quizSessions, stats);

    stats.seedTimeMs = Date.now() - startTime;

    // Record seed run
    const seedRunId = await this.recordSeedRun(stats);

    return { stats, seedRunId };
  }

  /**
   * Reset all development data
   */
  async resetData(): Promise<void> {
    console.log('Resetting development data...');

    await this.db.transaction(async (client) => {
      // Delete in dependency order
      const tables = [
        'quiz_items',
        'quiz_sessions',
        'user_ranking_cache',
        'photo_mask_states',
        'photo_assets',
        'user_photos',
        'user_point_ledger',
        'user_point_balances',
        'user_skills',
        'affinity',
        'user_traits',
        'trait_visuals',
        'trait_pairs',
        'oauth_providers',
        'users',
        'seed_runs'
      ];

      for (const table of tables) {
        await client.query(`DELETE FROM ${table}`);
      }
    });

    console.log('Development data reset complete');
  }

  /**
   * Seed trait pairs with Korean wedding/dating context
   */
  private async seedTraitPairs(count: number, stats: SeedStats): Promise<void> {
    console.log(`Seeding ${count} trait pairs...`);

    const traitPairs = [
      { key: 'communication_style', left: '많은 대화', right: '조용한 시간', category: 'communication' },
      { key: 'date_preference', left: '야외 활동', right: '실내 활동', category: 'lifestyle' },
      { key: 'food_style', left: '한식', right: '양식', category: 'food' },
      { key: 'weekend_style', left: '활동적인', right: '휴식', category: 'lifestyle' },
      { key: 'social_energy', left: '외향적', right: '내향적', category: 'personality' },
      { key: 'planning_style', left: '계획적', right: '즉흥적', category: 'personality' },
      { key: 'decision_making', left: '신중한', right: '빠른', category: 'personality' },
      { key: 'living_space', left: '깔끔한', right: '편안한', category: 'lifestyle' },
      { key: 'fashion_style', left: '클래식', right: '트렌디', category: 'style' },
      { key: 'travel_style', left: '계획 여행', right: '배낭 여행', category: 'lifestyle' },
      { key: 'career_priority', left: '일 우선', right: '균형', category: 'values' },
      { key: 'financial_style', left: '저축', right: '소비', category: 'values' },
      { key: 'hobby_type', left: '창작', right: '감상', category: 'interests' },
      { key: 'exercise_type', left: '개인 운동', right: '팀 스포츠', category: 'lifestyle' },
      { key: 'conflict_style', left: '직접 대화', right: '시간 두고', category: 'communication' },
      { key: 'gift_preference', left: '실용적', right: '로맨틱', category: 'love_language' },
      { key: 'family_time', left: '자주', right: '가끔', category: 'family' },
      { key: 'future_planning', left: '구체적', right: '유연한', category: 'values' },
      { key: 'learning_style', left: '독서', right: '체험', category: 'interests' },
      { key: 'pet_preference', left: '강아지', right: '고양이', category: 'lifestyle' }
    ];

    // Add more random pairs to reach desired count
    while (traitPairs.length < count) {
      const categories = ['personality', 'lifestyle', 'values', 'interests', 'communication'];
      const category = categories[Math.floor(Math.random() * categories.length)];

      traitPairs.push({
        key: `trait_${traitPairs.length + 1}`,
        left: `선택 A`,
        right: `선택 B`,
        category
      });
    }

    for (const pair of traitPairs.slice(0, count)) {
      const pairId = uuidv4();
      await this.db.query(
        `INSERT INTO trait_pairs (id, key, left_label, right_label, category, weight, entropy, is_active, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
        [pairId, pair.key, pair.left, pair.right, pair.category, 1.0, 0.5, true]
      );

      // Add visual assets (placeholder)
      await this.db.query(
        `INSERT INTO trait_visuals (id, pair_id, left_asset_id, right_asset_id, locale, is_default, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
        [uuidv4(), pairId, `asset_${pair.key}_left`, `asset_${pair.key}_right`, 'ko', true]
      );

      stats.traitPairsCreated++;
    }

    console.log(`Created ${stats.traitPairsCreated} trait pairs`);
  }

  /**
   * Seed users with Korean names
   */
  private async seedUsers(count: number, stats: SeedStats): Promise<string[]> {
    console.log(`Seeding ${count} users...`);

    const koreanNames = [
      '김민수', '이수진', '박준호', '최은영', '정다영', '강민준', '윤서연', '장태현',
      '임소영', '한지민', '송우진', '배현정', '조성민', '신예린', '오준석', '홍지은',
      '김다은', '이현우', '박서진', '최민호', '정예은', '강지훈', '윤하늘', '장서영',
      '임준영', '한서윤', '송지원', '배민성', '조은지', '신동하', '오서현', '홍민지',
      '김태영', '이지수', '박성현', '최다인', '정민규', '강예진', '윤서준', '장하은'
    ];

    const userIds: string[] = [];
    const passwordHash = await bcrypt.hash('password123', 10);

    for (let i = 0; i < count; i++) {
      const userId = uuidv4();
      const name = koreanNames[i % koreanNames.length] + (i >= koreanNames.length ? i : '');
      const email = `user${i + 1}@example.com`;
      const age = 22 + Math.floor(Math.random() * 15); // 22-36
      const gender = Math.random() > 0.5 ? 'male' : 'female';
      const locations = ['서울', '부산', '대구', '인천', '대전', '광주', '울산', '세종'];
      const location = locations[Math.floor(Math.random() * locations.length)];

      await this.db.query(
        `INSERT INTO users (id, email, password_hash, name, age, gender, location, bio, profile_complete, is_active, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())`,
        [userId, email, passwordHash, name, age, gender, location, `안녕하세요, ${name}입니다.`, true, true]
      );

      // Initialize points
      await this.db.query(
        `INSERT INTO user_point_balances (user_id, balance, updated_at)
         VALUES ($1, $2, NOW())`,
        [userId, 10000]
      );

      userIds.push(userId);
      stats.usersCreated++;
    }

    console.log(`Created ${stats.usersCreated} users`);
    return userIds;
  }

  /**
   * Seed user photos (dummy data, no actual image files)
   */
  private async seedUserPhotos(userIds: string[], photosPerUser: number, stats: SeedStats): Promise<void> {
    console.log(`Seeding ${userIds.length * photosPerUser} user photos...`);

    for (const userId of userIds) {
      for (let i = 0; i < photosPerUser; i++) {
        const photoId = uuidv4();

        // Create user photo record
        await this.db.query(
          `INSERT INTO user_photos (id, user_id, role, order_idx, is_safe, moderation_status, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())`,
          [photoId, userId, 'PROFILE', i, true, 'APPROVED']
        );

        // Create dummy photo assets
        const variants = ['ORIG', 'THUMB', 'BLUR1', 'BLUR2'];
        for (const variant of variants) {
          const storageKey = `users/${userId}/photos/${photoId}/${variant.toLowerCase()}.jpg`;

          await this.db.query(
            `INSERT INTO photo_assets (id, photo_id, variant, storage_key, width, height, mime_type, size_bytes, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
            [
              uuidv4(),
              photoId,
              variant,
              storageKey,
              variant === 'THUMB' ? 256 : 800,
              variant === 'THUMB' ? 256 : 600,
              'image/jpeg',
              variant === 'THUMB' ? 25000 : 150000
            ]
          );
        }

        stats.photosCreated++;
      }
    }

    console.log(`Created ${stats.photosCreated} user photos`);
  }

  /**
   * Seed user trait responses
   */
  private async seedUserTraits(userIds: string[], stats: SeedStats): Promise<void> {
    console.log('Seeding user trait responses...');

    // Get all trait pairs
    const traitPairs = await this.db.query('SELECT id FROM trait_pairs WHERE is_active = true');

    for (const userId of userIds) {
      // Each user answers 20-30 random traits
      const traitCount = 20 + Math.floor(Math.random() * 11);
      const selectedPairs = traitPairs
        .sort(() => 0.5 - Math.random())
        .slice(0, traitCount);

      for (const pair of selectedPairs) {
        const choice = Math.random() > 0.5 ? 'left' : 'right';
        const confidence = 0.6 + Math.random() * 0.4; // 0.6-1.0

        await this.db.query(
          `INSERT INTO user_traits (id, user_id, pair_id, choice, confidence, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
          [uuidv4(), userId, pair.id, choice, confidence]
        );
      }
    }

    console.log('Seeded user trait responses');
  }

  /**
   * Seed affinities between users
   */
  private async seedAffinities(userIds: string[], stats: SeedStats): Promise<void> {
    console.log('Seeding user affinities...');

    for (let i = 0; i < userIds.length; i++) {
      const viewerId = userIds[i];

      // Create affinities with 5-10 random other users
      const affinityCount = 5 + Math.floor(Math.random() * 6);
      const targetUsers = userIds
        .filter(id => id !== viewerId)
        .sort(() => 0.5 - Math.random())
        .slice(0, affinityCount);

      for (const targetId of targetUsers) {
        const score = Math.floor(Math.random() * 70); // 0-70
        const stagesUnlocked: string[] = [];

        if (score >= config.AFFINITY_T1_THRESHOLD) stagesUnlocked.push('t1');
        if (score >= config.AFFINITY_T2_THRESHOLD) stagesUnlocked.push('t2');
        if (score >= config.AFFINITY_T3_THRESHOLD) stagesUnlocked.push('t3');

        await this.db.query(
          `INSERT INTO affinity (id, viewer_id, target_id, score, stages_unlocked, last_quiz_at, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, NOW() - INTERVAL '1 hour', NOW(), NOW())`,
          [uuidv4(), viewerId, targetId, score, stagesUnlocked]
        );

        // Create photo mask states
        const targetPhotos = await this.db.query(
          'SELECT id FROM user_photos WHERE user_id = $1',
          [targetId]
        );

        for (const photo of targetPhotos) {
          let visibleStage = 'LOCKED';
          if (score >= config.AFFINITY_T3_THRESHOLD) visibleStage = 'T3';
          else if (score >= config.AFFINITY_T2_THRESHOLD) visibleStage = 'T2';
          else if (score >= config.AFFINITY_T1_THRESHOLD) visibleStage = 'T1';

          await this.db.query(
            `INSERT INTO photo_mask_states (user_id, photo_id, visible_stage, updated_at)
             VALUES ($1, $2, $3, NOW())`,
            [viewerId, photo.id, visibleStage]
          );
        }

        stats.affinitiesCreated++;
      }
    }

    console.log(`Created ${stats.affinitiesCreated} affinities`);
  }

  /**
   * Seed quiz sessions and items
   */
  private async seedQuizSessions(userIds: string[], sessionCount: number, stats: SeedStats): Promise<void> {
    console.log(`Seeding ${sessionCount} quiz sessions...`);

    const traitPairs = await this.db.query('SELECT id FROM trait_pairs WHERE is_active = true LIMIT 20');

    for (let i = 0; i < sessionCount; i++) {
      const askerId = userIds[Math.floor(Math.random() * userIds.length)];
      let targetId = userIds[Math.floor(Math.random() * userIds.length)];

      // Ensure different users
      while (targetId === askerId) {
        targetId = userIds[Math.floor(Math.random() * userIds.length)];
      }

      const sessionId = uuidv4();
      await this.db.query(
        `INSERT INTO quiz_sessions (id, asker_id, target_id, mode, points_spent, started_at, ended_at)
         VALUES ($1, $2, $3, $4, $5, NOW() - INTERVAL '2 hours', NOW() - INTERVAL '1 hour')`,
        [sessionId, askerId, targetId, 'TRAIT_PHOTO', 1]
      );

      // Add 3-5 quiz items per session
      const itemCount = 3 + Math.floor(Math.random() * 3);
      for (let j = 0; j < itemCount; j++) {
        const pairId = traitPairs[Math.floor(Math.random() * traitPairs.length)].id;
        const guess = Math.random() > 0.5 ? 'LEFT' : 'RIGHT';
        const correct = Math.random() > 0.3; // 70% accuracy
        const targetChoice = correct ? guess : (guess === 'LEFT' ? 'RIGHT' : 'LEFT');

        await this.db.query(
          `INSERT INTO quiz_items (id, session_id, pair_id, option_type, asker_guess, correct, delta_affinity, delta_points, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW() - INTERVAL '90 minutes')`,
          [
            uuidv4(),
            sessionId,
            pairId,
            targetChoice,
            guess,
            correct,
            correct ? 3 : -1,
            correct ? 0 : -1
          ]
        );

        stats.quizItemsCreated++;
      }

      stats.quizSessionsCreated++;
    }

    console.log(`Created ${stats.quizSessionsCreated} quiz sessions with ${stats.quizItemsCreated} items`);
  }

  /**
   * Record seed run
   */
  private async recordSeedRun(stats: SeedStats): Promise<string> {
    const seedRunId = uuidv4();
    await this.db.query(
      `INSERT INTO seed_runs (id, run_at, stats, run_by_user)
       VALUES ($1, NOW(), $2, $3)`,
      [seedRunId, JSON.stringify(stats), 'dev-script']
    );

    return seedRunId;
  }

  /**
   * Get seed summary
   */
  async getSeedSummary(): Promise<any> {
    // Get last seed run
    const [lastRun] = await this.db.query(
      'SELECT * FROM seed_runs ORDER BY run_at DESC LIMIT 1'
    );

    // Get current counts
    const counts = await Promise.all([
      this.db.queryOne('SELECT COUNT(*) as count FROM users'),
      this.db.queryOne('SELECT COUNT(*) as count FROM user_photos'),
      this.db.queryOne('SELECT COUNT(*) as count FROM trait_pairs'),
      this.db.queryOne('SELECT COUNT(*) as count FROM quiz_sessions'),
      this.db.queryOne('SELECT COUNT(*) as count FROM quiz_items'),
      this.db.queryOne('SELECT COUNT(*) as count FROM affinity'),
    ]);

    // Get dev flags
    const devFlags = await this.db.query('SELECT key, value FROM dev_flags');
    const flagsObj = devFlags.reduce((acc: any, flag: any) => {
      acc[flag.key] = flag.value;
      return acc;
    }, {});

    return {
      lastRun: lastRun ? {
        id: lastRun.id,
        run_at: lastRun.run_at,
        stats: lastRun.stats
      } : null,
      currentCounts: {
        users: counts[0]?.count || 0,
        photos: counts[1]?.count || 0,
        traitPairs: counts[2]?.count || 0,
        quizSessions: counts[3]?.count || 0,
        quizItems: counts[4]?.count || 0,
        affinities: counts[5]?.count || 0,
      },
      devFlags: flagsObj
    };
  }
}

export const seedService = new SeedService();