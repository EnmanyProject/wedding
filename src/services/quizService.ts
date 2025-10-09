import { Database } from '../utils/database';
import { config } from '../utils/config';
import {
  QuizSession,
  QuizItem,
  TraitPair,
  UserTrait,
  Affinity,
  UserPhoto,
  PhotoMaskState,
  ABQuiz,
  QuizResponse
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

  // Expose database for route access
  public get database(): Database {
    return this.db;
  }

  /**
   * Start a new quiz session
   */
  async startQuizSession(request: QuizStartRequest): Promise<{ session: QuizSession; pointsRemaining: number }> {
    return await this.db.transaction(async (client) => {
      // Check if user has enough points
      const balanceResult = await client.query(
        'SELECT balance FROM user_ring_balances WHERE user_id = $1',
        [request.askerId]
      );
      const balance = balanceResult.rows?.[0];

      if (!balance || balance.balance < config.QUIZ_ENTER_COST) {
        throw new Error('퀴즈를 시작하기에 포인트가 부족합니다');
      }

      // Deduct points
      await client.query(
        'UPDATE user_ring_balances SET balance = balance - $1, updated_at = NOW() WHERE user_id = $2',
        [config.QUIZ_ENTER_COST, request.askerId]
      );

      // Record transaction
      await client.query(
        `INSERT INTO user_ring_ledger (id, user_id, delta, reason, ref_id, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [uuidv4(), request.askerId, -config.QUIZ_ENTER_COST, 'QUIZ_ENTER', null]
      );

      // Create quiz session
      const sessionId = uuidv4();
      const sessionResult = await client.query<QuizSession>(
        `INSERT INTO quiz_sessions (id, asker_id, target_id, mode, points_spent, started_at)
         VALUES ($1, $2, $3, $4, $5, NOW())
         RETURNING *`,
        [sessionId, request.askerId, request.targetId, request.mode || 'TRAIT_PHOTO', config.QUIZ_ENTER_COST]
      );
      const session = sessionResult.rows?.[0];

      const pointsRemaining = balance.balance - config.QUIZ_ENTER_COST;

      return { session, pointsRemaining };
    });
  }

  /**
   * Submit quiz answer and calculate results
   */
  async submitAnswer(request: QuizAnswerRequest): Promise<QuizResult> {
    console.log('🎮 [QuizService] submitAnswer 시작:', {
      sessionId: request.sessionId,
      pairId: request.pairId,
      guess: request.guess,
      selectedPhotoId: request.selectedPhotoId
    });

    return await this.db.transaction(async (client) => {
      // Get session info
      console.log('🔍 [QuizService] 퀴즈 세션 검색:', request.sessionId);
      const sessionResult = await client.query<QuizSession>(
        'SELECT * FROM quiz_sessions WHERE id = $1',
        [request.sessionId]
      );
      console.log('📊 [QuizService] 세션 검색 결과:', sessionResult.rows?.length || 0);
      const session = sessionResult.rows?.[0];

      if (!session) {
        console.error('❌ [QuizService] 퀴즈 세션을 찾을 수 없음:', request.sessionId);
        throw new Error('퀴즈 세션을 찾을 수 없습니다');
      }

      console.log('✅ [QuizService] 찾은 세션:', {
        id: session.id,
        asker_id: session.asker_id,
        target_id: session.target_id,
        mode: session.mode
      });

      // Get target's actual choice for this quiz (from virtual character responses)
      console.log('🎯 [QuizService] 타겟의 퀴즈 응답 검색:', {
        target_id: session.target_id,
        quiz_id: request.pairId // pairId is now quiz_id for ab_quizzes
      });
      const targetResponseResult = await client.query<QuizResponse>(
        'SELECT selected_option FROM quiz_responses WHERE user_id = $1 AND quiz_id = $2',
        [session.target_id, request.pairId]
      );
      console.log('📊 [QuizService] 타겟 응답 검색 결과:', targetResponseResult.rows?.length || 0);
      const targetResponse = targetResponseResult.rows?.[0];

      if (!targetResponse) {
        console.error('❌ [QuizService] 타겟이 이 퀴즈에 답하지 않음:', {
          target_id: session.target_id,
          quiz_id: request.pairId
        });
        throw new Error('상대방이 아직 이 퀴즈에 답하지 않았습니다');
      }

      console.log('✅ [QuizService] 타겟의 선택:', {
        selected_option: targetResponse.selected_option,
        user_id: session.target_id,
        quiz_id: request.pairId
      });

      // Convert A/B to LEFT/RIGHT for compatibility
      const targetChoice = targetResponse.selected_option === 'A' ? 'LEFT' : 'RIGHT';
      const correct = request.guess === targetChoice;

      console.log('🎯 [QuizService] 답안 분석:', {
        user_guess: request.guess,
        target_actual: targetChoice,
        correct: correct
      });

      // Calculate deltas
      const deltaAffinity = correct ? config.AFFINITY_ALPHA : -config.AFFINITY_BETA;
      const deltaPoints = correct ? 0 : -config.QUIZ_WRONG_PENALTY;

      console.log('📊 [QuizService] 점수 계산:', {
        correct,
        deltaAffinity,
        deltaPoints,
        AFFINITY_ALPHA: config.AFFINITY_ALPHA,
        AFFINITY_BETA: config.AFFINITY_BETA,
        QUIZ_WRONG_PENALTY: config.QUIZ_WRONG_PENALTY
      });

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

      // Currently we're using ab_quizzes system, so use quiz_id column
      const quizItemResult = await client.query<QuizItem>(
        `INSERT INTO quiz_items (
          id, session_id, quiz_id, option_type, asker_guess, correct,
          delta_affinity, delta_points, selected_photo_id, assets, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
        RETURNING *`,
        [
          quizItemId,
          request.sessionId,
          request.pairId, // This is actually quiz_id for ab_quizzes
          targetChoice,
          request.guess,
          correct,
          deltaAffinity,
          deltaPoints,
          request.selectedPhotoId,
          photoAssets ? JSON.stringify(photoAssets) : null
        ]
      );

      const quizItem = quizItemResult.rows?.[0];

      // Apply points penalty if wrong
      if (deltaPoints < 0) {
        await client.query(
          'UPDATE user_ring_balances SET balance = balance + $1, updated_at = NOW() WHERE user_id = $2',
          [deltaPoints, session.asker_id]
        );

        await client.query(
          `INSERT INTO user_ring_ledger (id, user_id, delta, reason, ref_id, created_at)
           VALUES ($1, $2, $3, $4, $5, NOW())`,
          [uuidv4(), session.asker_id, deltaPoints, 'QUIZ_WRONG', quizItemId]
        );
      }

      // Update or create affinity
      const affinityResult = await client.query<Affinity>(
        'SELECT * FROM affinity WHERE viewer_id = $1 AND target_id = $2',
        [session.asker_id, session.target_id]
      );
      const existingAffinity = affinityResult.rows || [];

      let affinityScore: number;
      let stagesUnlocked: string[] = [];

      if (existingAffinity.length > 0) {
        // Update existing affinity
        affinityScore = Math.max(0, existingAffinity[0].score + deltaAffinity);
        await client.query(
          'UPDATE affinity SET score = $1, last_quiz_at = NOW(), updated_at = NOW() WHERE id = $2',
          [affinityScore, existingAffinity[0].id]
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
    const photosResult = await client.query<UserPhoto>(
      'SELECT id FROM user_photos WHERE user_id = $1 AND moderation_status = $2',
      [targetId, 'APPROVED']
    );
    const photos = photosResult.rows || [];

    for (const photo of photos) {
      // Get current visibility state
      const maskStateResult = await client.query<PhotoMaskState>(
        'SELECT * FROM photo_mask_states WHERE user_id = $1 AND photo_id = $2',
        [viewerId, photo.id]
      );
      let maskState = maskStateResult.rows?.[0];

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
    const skillResult = await client.query(
      'SELECT * FROM user_skills WHERE user_id = $1',
      [userId]
    );
    const skill = skillResult.rows?.[0];

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
   * Get quiz template with admin-created quizzes
   */
  async getQuizTemplate(quizId?: string, targetId?: string): Promise<any> {
    console.log('🎯 [QuizService] getQuizTemplate 시작:', { quizId, targetId });

    // Get random admin quiz if not specified
    let quiz: ABQuiz;
    if (quizId) {
      console.log('🔍 [QuizService] 특정 quizId로 검색:', quizId);
      const foundQuizResult = await this.db.query<ABQuiz>(
        'SELECT * FROM ab_quizzes WHERE id = $1 AND is_active = true',
        [quizId]
      );
      console.log('📊 [QuizService] quizId 검색 결과:', foundQuizResult.length);
      const foundQuiz = foundQuizResult[0];
      if (!foundQuiz) {
        console.error('❌ [QuizService] 퀴즈를 찾을 수 없음:', quizId);
        throw new Error('퀴즈를 찾을 수 없습니다');
      }
      quiz = foundQuiz;
      console.log('✅ [QuizService] 찾은 퀴즈:', { id: quiz.id, title: quiz.title, option_a: quiz.option_a_title, option_b: quiz.option_b_title });
    } else if (targetId) {
      // If targetId is provided, get a random quiz that the target user has answered
      console.log('🎯 [QuizService] 타겟 유저가 답변한 퀴즈 중 랜덤 선택:', targetId);
      const targetQuizResult = await this.db.query<ABQuiz>(
        `SELECT aq.* FROM ab_quizzes aq
         INNER JOIN quiz_responses qr ON aq.id = qr.quiz_id
         WHERE qr.user_id = $1 AND aq.is_active = true
         ORDER BY RANDOM() LIMIT 1`,
        [targetId]
      );
      console.log('📊 [QuizService] 타겟 유저가 답변한 퀴즈 수:', targetQuizResult.length);
      const targetQuiz = targetQuizResult[0];
      if (!targetQuiz) {
        console.log('⚠️ [QuizService] 타겟 유저가 답변한 퀴즈가 없음, 랜덤 퀴즈로 대체');
        // Fallback to random quiz if target hasn't answered any
        const randomQuizResult = await this.db.query<ABQuiz>(
          'SELECT * FROM ab_quizzes WHERE is_active = true ORDER BY RANDOM() LIMIT 1'
        );
        const randomQuiz = randomQuizResult[0];
        if (!randomQuiz) {
          console.error('❌ [QuizService] 활성화된 어드민 퀴즈가 없음');
          throw new Error('활성화된 퀴즈가 없습니다');
        }
        quiz = randomQuiz;
        console.log('✅ [QuizService] 대체 랜덤 퀴즈 선택:', { id: quiz.id, title: quiz.title, option_a: quiz.option_a_title, option_b: quiz.option_b_title });
      } else {
        quiz = targetQuiz;
        console.log('✅ [QuizService] 타겟이 답변한 퀴즈 선택:', { id: quiz.id, title: quiz.title, option_a: quiz.option_a_title, option_b: quiz.option_b_title });
      }
    } else {
      // No target specified, get completely random quiz
      console.log('🎲 [QuizService] 랜덤 어드민 퀴즈 검색 중...');
      const randomQuizResult = await this.db.query<ABQuiz>(
        'SELECT * FROM ab_quizzes WHERE is_active = true ORDER BY RANDOM() LIMIT 1'
      );
      console.log('📊 [QuizService] 활성 어드민 퀴즈 수:', randomQuizResult.length);
      const randomQuiz = randomQuizResult[0];
      if (!randomQuiz) {
        console.error('❌ [QuizService] 활성화된 어드민 퀴즈가 없음');
        throw new Error('활성화된 퀴즈가 없습니다');
      }
      quiz = randomQuiz;
      console.log('✅ [QuizService] 선택된 랜덤 퀴즈:', { id: quiz.id, title: quiz.title, option_a: quiz.option_a_title, option_b: quiz.option_b_title });
    }

    // Get target info if specified
    let targetInfo = null;
    if (targetId) {
      console.log('👤 [QuizService] 타겟 유저 정보 검색:', targetId);
      const targetResult = await this.db.query(
        'SELECT id, name, display_name FROM users WHERE id = $1 AND is_active = true',
        [targetId]
      );
      console.log('📊 [QuizService] 타겟 유저 검색 결과:', targetResult.length);
      const target = targetResult[0];

      if (target) {
        console.log('✅ [QuizService] 찾은 타겟 유저:', { id: target.id, name: target.name });
        console.log('📸 [QuizService] 타겟 유저의 사진 검색 중...');

        const photos = await this.db.query(
          `SELECT up.id, pa.variant, pa.storage_key, pa.width, pa.height
           FROM user_photos up
           JOIN photo_assets pa ON up.id = pa.photo_id
           WHERE up.user_id = $1 AND up.moderation_status = 'APPROVED'
           ORDER BY up.order_idx, pa.variant`,
          [targetId]
        );
        console.log('📊 [QuizService] 타겟 유저 사진 수:', photos.length);

        targetInfo = {
          user_id: target.id,
          name: target.name,
          display_name: target.display_name,
          photos: photos
        };
        console.log('✅ [QuizService] 타겟 정보 구성 완료:', {
          user_id: targetInfo.user_id,
          name: targetInfo.name,
          display_name: targetInfo.display_name,
          photo_count: targetInfo.photos.length
        });
      } else {
        console.warn('⚠️ [QuizService] 타겟 유저를 찾을 수 없음:', targetId);
      }
    } else {
      console.log('📝 [QuizService] targetId가 제공되지 않음, targetInfo는 null');
    }

    const result = {
      quiz,
      targetInfo,
      instructions: `${targetInfo ? (targetInfo.display_name || targetInfo.name) : '상대방'}의 선택은?`
    };

    console.log('🎉 [QuizService] getQuizTemplate 완료:', {
      quiz_id: result.quiz.id,
      quiz_title: result.quiz.title,
      quiz_options: `${result.quiz.option_a_title} vs ${result.quiz.option_b_title}`,
      has_target: !!result.targetInfo,
      photo_count: result.targetInfo?.photos?.length || 0
    });

    return result;
  }

  /**
   * Get available quiz targets (users who have answered at least one quiz)
   */
  async getAvailableQuizTargets(askerId: string): Promise<any[]> {
    console.log('👥 [QuizService] getAvailableQuizTargets 시작:', { askerId });

    const result = await this.db.query(
      `SELECT u.id, u.name, u.display_name, COUNT(qr.id) as quiz_count,
              COALESCE(a.score, 0) as affinity_score
       FROM users u
       INNER JOIN quiz_responses qr ON u.id = qr.user_id
       LEFT JOIN affinity a ON a.viewer_id = $1 AND a.target_id = u.id
       WHERE u.id != $1 AND u.is_active = true
       GROUP BY u.id, u.name, u.display_name, a.score
       HAVING COUNT(qr.id) > 0
       ORDER BY u.display_name`,
      [askerId]
    );

    // 친밀도에 따른 실명 공개 로직 (친밀도 50 이상이면 실명 공개)
    const processedTargets = result.map(target => {
      const shouldShowRealName = target.affinity_score >= 50;
      return {
        ...target,
        display_name_for_ui: shouldShowRealName ? target.name : target.display_name,
        real_name_unlocked: shouldShowRealName
      };
    });

    console.log('📊 [QuizService] 사용 가능한 타겟 수:', processedTargets.length);
    return processedTargets;
  }

  /**
   * Get available quizzes for a specific target (quizzes they have answered)
   */
  async getAvailableQuizzesForTarget(targetId: string): Promise<any[]> {
    console.log('🎯 [QuizService] getAvailableQuizzesForTarget 시작:', { targetId });

    const result = await this.db.query(
      `SELECT aq.id, aq.title, aq.category, aq.option_a_title, aq.option_b_title, qr.selected_option
       FROM ab_quizzes aq
       INNER JOIN quiz_responses qr ON aq.id = qr.quiz_id
       WHERE qr.user_id = $1 AND aq.is_active = true
       ORDER BY aq.title`,
      [targetId]
    );

    console.log('📊 [QuizService] 타겟이 답한 퀴즈 수:', result.length);
    return result;
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