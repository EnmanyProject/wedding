import { Database } from '../utils/database';
import { config } from '../utils/config';
import {
  QuizSession,
  QuizItem,
  TraitPair,
  UserTrait,
  Affinity,
  UserPhoto,
  PhotoMaskState
} from '../types/database';
import { v4 as uuidv4 } from 'uuid';

export interface QuizStartRequest {
  askerId: string;
  targetId: string;
  mode?: 'TRAIT_PHOTO' | 'PREFERENCE';
}

export interface QuizAnswerRequest {
  sessionId: string;
  pairId: string;
  guess: 'LEFT' | 'RIGHT';
  selectedPhotoId?: string;
}

export interface QuizResult {
  correct: boolean;
  targetChoice: 'LEFT' | 'RIGHT';
  deltaAffinity: number;
  deltaPoints: number;
  affinityScore: number;
  stagesUnlocked: string[];
  quizItem: QuizItem;
}

export class QuizService {
  private db: Database;

  constructor() {
    this.db = Database.getInstance();
  }

  /**
   * Start a new quiz session
   */
  async startQuizSession(request: QuizStartRequest): Promise<{ session: QuizSession; pointsRemaining: number }> {
    return await this.db.transaction(async (client) => {
      // Check if user has enough points
      const [balance] = await client.query(
        'SELECT balance FROM user_point_balances WHERE user_id = $1',
        [request.askerId]
      );

      if (!balance || balance.balance < config.QUIZ_ENTER_COST) {
        throw new Error('Insufficient points to start quiz');
      }

      // Deduct points
      await client.query(
        'UPDATE user_point_balances SET balance = balance - $1, updated_at = NOW() WHERE user_id = $2',
        [config.QUIZ_ENTER_COST, request.askerId]
      );

      // Record transaction
      await client.query(
        `INSERT INTO user_point_ledger (id, user_id, delta, reason, ref_id, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [uuidv4(), request.askerId, -config.QUIZ_ENTER_COST, 'QUIZ_ENTER', null]
      );

      // Create quiz session
      const sessionId = uuidv4();
      const [session] = await client.query<QuizSession>(
        `INSERT INTO quiz_sessions (id, asker_id, target_id, mode, points_spent, started_at)
         VALUES ($1, $2, $3, $4, $5, NOW())
         RETURNING *`,
        [sessionId, request.askerId, request.targetId, request.mode || 'TRAIT_PHOTO', config.QUIZ_ENTER_COST]
      );

      const pointsRemaining = balance.balance - config.QUIZ_ENTER_COST;

      return { session, pointsRemaining };
    });
  }

  /**
   * Submit quiz answer and calculate results
   */
  async submitAnswer(request: QuizAnswerRequest): Promise<QuizResult> {
    return await this.db.transaction(async (client) => {
      // Get session info
      const [session] = await client.query<QuizSession>(
        'SELECT * FROM quiz_sessions WHERE id = $1',
        [request.sessionId]
      );

      if (!session) {
        throw new Error('Quiz session not found');
      }

      // Get target's actual choice for this trait
      const [targetTrait] = await client.query<UserTrait>(
        'SELECT choice FROM user_traits WHERE user_id = $1 AND pair_id = $2',
        [session.target_id, request.pairId]
      );

      if (!targetTrait) {
        throw new Error('Target has not answered this trait question');
      }

      const targetChoice = targetTrait.choice.toUpperCase() as 'LEFT' | 'RIGHT';
      const correct = request.guess === targetChoice;

      // Calculate deltas
      const deltaAffinity = correct ? config.AFFINITY_ALPHA : -config.AFFINITY_BETA;
      const deltaPoints = correct ? 0 : -config.QUIZ_WRONG_PENALTY;

      // Get photo assets for logging
      let photoAssets: any = null;
      if (request.selectedPhotoId) {
        const assets = await client.query(
          `SELECT pa.variant, pa.storage_key, pa.width, pa.height
           FROM photo_assets pa
           WHERE pa.photo_id = $1`,
          [request.selectedPhotoId]
        );
        photoAssets = { selected_photo_assets: assets };
      }

      // Create quiz item record
      const quizItemId = uuidv4();
      const [quizItem] = await client.query<QuizItem>(
        `INSERT INTO quiz_items (
          id, session_id, pair_id, option_type, asker_guess, correct,
          delta_affinity, delta_points, selected_photo_id, assets, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
        RETURNING *`,
        [
          quizItemId,
          request.sessionId,
          request.pairId,
          targetChoice,
          request.guess,
          correct,
          deltaAffinity,
          deltaPoints,
          request.selectedPhotoId,
          photoAssets ? JSON.stringify(photoAssets) : null
        ]
      );

      // Apply points penalty if wrong
      if (deltaPoints < 0) {
        await client.query(
          'UPDATE user_point_balances SET balance = balance + $1, updated_at = NOW() WHERE user_id = $2',
          [deltaPoints, session.asker_id]
        );

        await client.query(
          `INSERT INTO user_point_ledger (id, user_id, delta, reason, ref_id, created_at)
           VALUES ($1, $2, $3, $4, $5, NOW())`,
          [uuidv4(), session.asker_id, deltaPoints, 'QUIZ_WRONG', quizItemId]
        );
      }

      // Update or create affinity
      let affinity = await client.query<Affinity>(
        'SELECT * FROM affinity WHERE viewer_id = $1 AND target_id = $2',
        [session.asker_id, session.target_id]
      );

      let affinityScore: number;
      let stagesUnlocked: string[] = [];

      if (affinity.length > 0) {
        // Update existing affinity
        affinityScore = Math.max(0, affinity[0].score + deltaAffinity);
        await client.query(
          'UPDATE affinity SET score = $1, last_quiz_at = NOW(), updated_at = NOW() WHERE id = $2',
          [affinityScore, affinity[0].id]
        );
      } else {
        // Create new affinity
        affinityScore = Math.max(0, deltaAffinity);
        const affinityId = uuidv4();
        await client.query(
          `INSERT INTO affinity (id, viewer_id, target_id, score, last_quiz_at, created_at, updated_at)
           VALUES ($1, $2, $3, $4, NOW(), NOW(), NOW())`,
          [affinityId, session.asker_id, session.target_id, affinityScore]
        );
      }

      // Check for stage unlocks and update photo visibility
      const newStagesUnlocked = await this.updatePhotoVisibility(
        client,
        session.asker_id,
        session.target_id,
        affinityScore
      );

      stagesUnlocked = newStagesUnlocked;

      // Update user skill stats
      await this.updateUserSkill(client, session.asker_id, correct);

      return {
        correct,
        targetChoice,
        deltaAffinity,
        deltaPoints,
        affinityScore,
        stagesUnlocked,
        quizItem
      };
    });
  }

  /**
   * Update photo visibility based on affinity score
   */
  private async updatePhotoVisibility(
    client: any,
    viewerId: string,
    targetId: string,
    affinityScore: number
  ): Promise<string[]> {
    const stagesUnlocked: string[] = [];

    // Get target's photos
    const photos = await client.query<UserPhoto>(
      'SELECT id FROM user_photos WHERE user_id = $1 AND moderation_status = $2',
      [targetId, 'APPROVED']
    );

    for (const photo of photos) {
      // Get current visibility state
      let [maskState] = await client.query<PhotoMaskState>(
        'SELECT * FROM photo_mask_states WHERE user_id = $1 AND photo_id = $2',
        [viewerId, photo.id]
      );

      if (!maskState) {
        // Create initial mask state
        await client.query(
          `INSERT INTO photo_mask_states (user_id, photo_id, visible_stage, updated_at)
           VALUES ($1, $2, $3, NOW())`,
          [viewerId, photo.id, 'LOCKED']
        );
        maskState = { user_id: viewerId, photo_id: photo.id, visible_stage: 'LOCKED' };
      }

      // Determine new stage based on affinity score
      let newStage = maskState.visible_stage;

      if (affinityScore >= config.AFFINITY_T3_THRESHOLD && maskState.visible_stage !== 'T3') {
        newStage = 'T3';
        if (!stagesUnlocked.includes('T3')) stagesUnlocked.push('T3');
      } else if (affinityScore >= config.AFFINITY_T2_THRESHOLD && maskState.visible_stage === 'LOCKED') {
        newStage = 'T2';
        if (!stagesUnlocked.includes('T2')) stagesUnlocked.push('T2');
      } else if (affinityScore >= config.AFFINITY_T1_THRESHOLD && maskState.visible_stage === 'LOCKED') {
        newStage = 'T1';
        if (!stagesUnlocked.includes('T1')) stagesUnlocked.push('T1');
      }

      // Update if stage changed
      if (newStage !== maskState.visible_stage) {
        await client.query(
          'UPDATE photo_mask_states SET visible_stage = $1, updated_at = NOW() WHERE user_id = $2 AND photo_id = $3',
          [newStage, viewerId, photo.id]
        );
      }
    }

    // Update affinity stages_unlocked
    if (stagesUnlocked.length > 0) {
      const currentStages = await client.query(
        'SELECT stages_unlocked FROM affinity WHERE viewer_id = $1 AND target_id = $2',
        [viewerId, targetId]
      );

      const allStages = new Set([
        ...(currentStages[0]?.stages_unlocked || []),
        ...stagesUnlocked
      ]);

      await client.query(
        'UPDATE affinity SET stages_unlocked = $1 WHERE viewer_id = $2 AND target_id = $3',
        [Array.from(allStages), viewerId, targetId]
      );
    }

    return stagesUnlocked;
  }

  /**
   * Update user skill metrics
   */
  private async updateUserSkill(client: any, userId: string, correct: boolean): Promise<void> {
    const [skill] = await client.query(
      'SELECT * FROM user_skills WHERE user_id = $1',
      [userId]
    );

    if (skill) {
      const newAttempts = skill.total_attempts + 1;
      const correctCount = Math.round(skill.accuracy * skill.total_attempts) + (correct ? 1 : 0);
      const newAccuracy = correctCount / newAttempts;

      await client.query(
        'UPDATE user_skills SET accuracy = $1, total_attempts = $2, updated_at = NOW() WHERE user_id = $3',
        [newAccuracy, newAttempts, userId]
      );
    } else {
      await client.query(
        `INSERT INTO user_skills (user_id, accuracy, total_attempts, bias, updated_at)
         VALUES ($1, $2, $3, $4, NOW())`,
        [userId, correct ? 1.0 : 0.0, 1, 0.0]
      );
    }
  }

  /**
   * Get quiz template with visual assets
   */
  async getQuizTemplate(pairId?: string, targetId?: string): Promise<any> {
    // Get random trait pair if not specified
    let pair: TraitPair;
    if (pairId) {
      const [foundPair] = await this.db.query<TraitPair>(
        'SELECT * FROM trait_pairs WHERE id = $1 AND is_active = true',
        [pairId]
      );
      if (!foundPair) {
        throw new Error('Trait pair not found');
      }
      pair = foundPair;
    } else {
      const [randomPair] = await this.db.query<TraitPair>(
        'SELECT * FROM trait_pairs WHERE is_active = true ORDER BY RANDOM() LIMIT 1'
      );
      if (!randomPair) {
        throw new Error('No active trait pairs found');
      }
      pair = randomPair;
    }

    // Get visual assets for the pair
    const [visual] = await this.db.query(
      'SELECT * FROM trait_visuals WHERE pair_id = $1 AND is_default = true',
      [pair.id]
    );

    // Get target info if specified
    let targetInfo = null;
    if (targetId) {
      const [target] = await this.db.query(
        'SELECT id, name FROM users WHERE id = $1 AND is_active = true',
        [targetId]
      );

      if (target) {
        const photos = await this.db.query(
          `SELECT up.id, pa.variant, pa.storage_key, pa.width, pa.height
           FROM user_photos up
           JOIN photo_assets pa ON up.id = pa.photo_id
           WHERE up.user_id = $1 AND up.moderation_status = 'APPROVED'
           ORDER BY up.order_idx, pa.variant`,
          [targetId]
        );

        targetInfo = {
          user_id: target.id,
          name: target.name,
          photos: photos
        };
      }
    }

    return {
      pair,
      visual,
      targetInfo,
      instructions: `Choose which option ${targetInfo ? targetInfo.name : 'the target user'} would prefer for "${pair.left_label}" vs "${pair.right_label}"`
    };
  }

  /**
   * End quiz session
   */
  async endQuizSession(sessionId: string): Promise<void> {
    await this.db.query(
      'UPDATE quiz_sessions SET ended_at = NOW() WHERE id = $1',
      [sessionId]
    );
  }
}

export const quizService = new QuizService();