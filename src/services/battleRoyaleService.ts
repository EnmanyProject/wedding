import { Database } from '../utils/database';
import { config } from '../utils/config';
import { v4 as uuidv4 } from 'uuid';

export interface BattleRoyaleSession {
  id: string;
  user_id: string;
  cost: number;
  status: 'IN_PROGRESS' | 'COMPLETED' | 'ABANDONED';
  current_round: number;
  total_rounds: number;
  final_survivor_count: number | null;
  started_at: Date;
  ended_at: Date | null;
}

export interface BattleRoyalePreference {
  id: string;
  round_number: number;
  question: string;
  option_left: string;
  option_right: string;
  category: string;
}

export interface BattleRoyaleParticipant {
  id: string;
  user_id: string;
  display_name: string;
  profile_image: string | null;
  answer: 'LEFT' | 'RIGHT';
}

export interface BattleRoyaleRoundResult {
  round_number: number;
  question: BattleRoyalePreference;
  user_answer: 'LEFT' | 'RIGHT';
  survivors_before: number;
  survivors_after: number;
  eliminated_count: number;
  survivors: BattleRoyaleParticipant[];
  eliminated_ids: string[];
}

export interface BattleRoyaleFinalResult {
  session_id: string;
  total_rounds: number;
  initial_count: number;
  final_survivor_count: number;
  survivors: BattleRoyaleParticipant[];
  user_answers: Array<{
    round: number;
    question: string;
    answer: 'LEFT' | 'RIGHT';
  }>;
}

export class BattleRoyaleService {
  private db: Database;
  private ENTRY_COST = 100; // Ring -100
  private TOTAL_ROUNDS = 5;
  private INITIAL_PARTICIPANTS = 100;

  constructor() {
    this.db = Database.getInstance();
  }

  /**
   * Start a new Battle Royale session
   * 1. Check Ring balance >= 100
   * 2. Deduct 100 Rings
   * 3. Load 100 random active users
   * 4. Create session record
   * 5. Return session and participants
   */
  async startSession(userId: string): Promise<{
    session: BattleRoyaleSession;
    participants: BattleRoyaleParticipant[];
  }> {
    console.log('🎮 [BattleRoyale] Starting session for user:', userId);

    return await this.db.transaction(async (client) => {
      // 1. Check Ring balance
      const balanceResult = await client.query(
        'SELECT balance FROM user_ring_balances WHERE user_id = $1',
        [userId]
      );
      const balance = balanceResult.rows?.[0];

      if (!balance || balance.balance < this.ENTRY_COST) {
        throw new Error('배틀 로얄 입장에 필요한 링이 부족합니다 (100 Ring 필요)');
      }

      console.log('✅ [BattleRoyale] Balance check passed:', balance.balance);

      // 2. Deduct Rings
      await client.query(
        'UPDATE user_ring_balances SET balance = balance - $1, updated_at = NOW() WHERE user_id = $2',
        [this.ENTRY_COST, userId]
      );

      // 3. Record transaction
      await client.query(
        `INSERT INTO user_ring_ledger (id, user_id, delta, reason, ref_id, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [uuidv4(), userId, -this.ENTRY_COST, 'BATTLE_ROYALE_ENTER', null]
      );

      console.log('✅ [BattleRoyale] Ring deducted:', this.ENTRY_COST);

      // 3. Load 100 random active users with their preference answers
      const participantsResult = await client.query(
        `SELECT u.id, u.display_name, u.profile_image_url
         FROM users u
         WHERE u.is_active = true
           AND u.id != $1
           AND EXISTS (
             SELECT 1 FROM user_preference_answers upa
             WHERE upa.user_id = u.id
           )
         ORDER BY RANDOM()
         LIMIT $2`,
        [userId, this.INITIAL_PARTICIPANTS]
      );

      const participants = participantsResult.rows.map((row: any) => ({
        id: row.id,
        user_id: row.id,
        display_name: row.display_name,
        profile_image: row.profile_image_url || '/images/Bety1.png',
        answer: 'LEFT' as 'LEFT' | 'RIGHT' // Will be updated per round
      }));

      console.log('✅ [BattleRoyale] Loaded participants:', participants.length);

      // 4. Create session
      const sessionId = uuidv4();
      const sessionResult = await client.query<BattleRoyaleSession>(
        `INSERT INTO battle_royale_sessions
         (id, user_id, cost, status, current_round, total_rounds, started_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())
         RETURNING *`,
        [sessionId, userId, this.ENTRY_COST, 'IN_PROGRESS', 0, this.TOTAL_ROUNDS]
      );

      const session = sessionResult.rows[0];

      console.log('✅ [BattleRoyale] Session created:', session.id);

      return {
        session,
        participants
      };
    });
  }

  /**
   * Get preference question and current survivors for a specific round
   */
  async getRound(
    sessionId: string,
    roundNumber: number
  ): Promise<{
    question: BattleRoyalePreference;
    survivors: BattleRoyaleParticipant[];
  }> {
    console.log('🎮 [BattleRoyale] Getting round:', { sessionId, roundNumber });

    return await this.db.transaction(async (client) => {
      // Get session
      const sessionResult = await client.query(
        'SELECT * FROM battle_royale_sessions WHERE id = $1',
        [sessionId]
      );
      const session = sessionResult.rows?.[0];

      if (!session) {
        throw new Error('세션을 찾을 수 없습니다');
      }

      // Get preference question for this round
      const preferenceResult = await client.query<BattleRoyalePreference>(
        'SELECT * FROM battle_royale_preferences WHERE round_number = $1',
        [roundNumber]
      );
      const question = preferenceResult.rows?.[0];

      if (!question) {
        throw new Error(`라운드 ${roundNumber}의 질문을 찾을 수 없습니다`);
      }

      // Get current survivors for this round
      let survivors: BattleRoyaleParticipant[] = [];

      if (roundNumber === 1) {
        // First round: get initial 100 participants with their answers
        const participantsResult = await client.query(
          `SELECT u.id, u.display_name, u.profile_image_url, upa.answer
           FROM users u
           INNER JOIN user_preference_answers upa ON u.id = upa.user_id
           WHERE upa.preference_id = $1
             AND u.is_active = true
             AND u.id != $2
           ORDER BY RANDOM()
           LIMIT $3`,
          [question.id, session.user_id, this.INITIAL_PARTICIPANTS]
        );

        survivors = participantsResult.rows.map((row: any) => ({
          id: row.id,
          user_id: row.id,
          display_name: row.display_name,
          profile_image: row.profile_image_url || '/images/Bety1.png',
          answer: row.answer
        }));
      } else {
        // Subsequent rounds: get survivors from previous round
        const survivorsResult = await client.query(
          `SELECT brs.participant_id, u.display_name, u.profile_image_url, upa.answer
           FROM battle_royale_survivors brs
           INNER JOIN users u ON brs.participant_id = u.id
           INNER JOIN user_preference_answers upa ON u.id = upa.user_id
           INNER JOIN battle_royale_preferences brp ON upa.preference_id = brp.id
           WHERE brs.session_id = $1 AND brs.round_number = $2 AND brp.round_number = $3`,
          [sessionId, roundNumber - 1, roundNumber]
        );

        survivors = survivorsResult.rows.map((row: any) => ({
          id: row.participant_id,
          user_id: row.participant_id,
          display_name: row.display_name,
          profile_image: row.profile_image_url || '/images/Bety1.png',
          answer: row.answer
        }));
      }

      console.log('✅ [BattleRoyale] Round loaded:', {
        round: roundNumber,
        question: question.question,
        survivors: survivors.length
      });

      return {
        question,
        survivors
      };
    });
  }

  /**
   * Submit user's answer and filter survivors
   */
  async submitAnswer(
    sessionId: string,
    roundNumber: number,
    userId: string,
    userAnswer: 'LEFT' | 'RIGHT'
  ): Promise<BattleRoyaleRoundResult> {
    console.log('🎮 [BattleRoyale] Submitting answer:', {
      sessionId,
      roundNumber,
      userId,
      userAnswer
    });

    return await this.db.transaction(async (client) => {
      // Get current round data
      const roundData = await this.getRound(sessionId, roundNumber);
      const { question, survivors } = roundData;

      const survivorsBefore = survivors.length;

      // Filter survivors: keep only those who chose the SAME answer as user
      const newSurvivors = survivors.filter(p => p.answer === userAnswer);
      const eliminated = survivors.filter(p => p.answer !== userAnswer);

      console.log('📊 [BattleRoyale] Filtering results:', {
        user_answer: userAnswer,
        survivors_before: survivorsBefore,
        survivors_after: newSurvivors.length,
        eliminated: eliminated.length
      });

      // Record round result
      const roundId = uuidv4();
      await client.query(
        `INSERT INTO battle_royale_rounds
         (id, session_id, round_number, preference_id, user_answer, survivors_before, survivors_after, eliminated_count, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
        [
          roundId,
          sessionId,
          roundNumber,
          question.id,
          userAnswer,
          survivorsBefore,
          newSurvivors.length,
          eliminated.length
        ]
      );

      // Record survivors for this round (Batch INSERT)
      if (newSurvivors.length > 0) {
        const values = newSurvivors.map((_, idx) =>
          `($${idx * 3 + 1}, $${idx * 3 + 2}, $${idx * 3 + 3})`
        ).join(', ');

        const params = newSurvivors.flatMap(s =>
          [sessionId, roundNumber, s.user_id]
        );

        await client.query(
          `INSERT INTO battle_royale_survivors (session_id, round_number, participant_id)
           VALUES ${values}
           ON CONFLICT (session_id, round_number, participant_id) DO NOTHING`,
          params
        );
      }

      // Update session current_round
      await client.query(
        'UPDATE battle_royale_sessions SET current_round = $1, updated_at = NOW() WHERE id = $2',
        [roundNumber, sessionId]
      );

      // If this was the last round, mark session as completed
      if (roundNumber === this.TOTAL_ROUNDS) {
        await client.query(
          `UPDATE battle_royale_sessions
           SET status = $1, final_survivor_count = $2, ended_at = NOW()
           WHERE id = $3`,
          ['COMPLETED', newSurvivors.length, sessionId]
        );

        console.log('🎉 [BattleRoyale] Session completed:', {
          session_id: sessionId,
          final_survivors: newSurvivors.length
        });
      }

      return {
        round_number: roundNumber,
        question,
        user_answer: userAnswer,
        survivors_before: survivorsBefore,
        survivors_after: newSurvivors.length,
        eliminated_count: eliminated.length,
        survivors: newSurvivors,
        eliminated_ids: eliminated.map(e => e.user_id)
      };
    });
  }

  /**
   * Get final results of a completed session
   */
  async getFinalResults(sessionId: string): Promise<BattleRoyaleFinalResult> {
    console.log('🎮 [BattleRoyale] Getting final results:', sessionId);

    return await this.db.transaction(async (client) => {
      // Get session
      const sessionResult = await client.query(
        'SELECT * FROM battle_royale_sessions WHERE id = $1',
        [sessionId]
      );
      const session = sessionResult.rows?.[0];

      if (!session) {
        throw new Error('세션을 찾을 수 없습니다');
      }

      // Get final survivors (from last round)
      const survivorsResult = await client.query(
        `SELECT brs.participant_id, u.display_name, u.profile_image_url
         FROM battle_royale_survivors brs
         INNER JOIN users u ON brs.participant_id = u.id
         WHERE brs.session_id = $1 AND brs.round_number = $2`,
        [sessionId, this.TOTAL_ROUNDS]
      );

      const survivors = survivorsResult.rows.map((row: any) => ({
        id: row.participant_id,
        user_id: row.participant_id,
        display_name: row.display_name,
        profile_image: row.profile_image_url || '/images/Bety1.png',
        answer: 'LEFT' as 'LEFT' | 'RIGHT' // Not relevant for final results
      }));

      // Get all user answers from rounds
      const roundsResult = await client.query(
        `SELECT brr.round_number, brr.user_answer, brp.question
         FROM battle_royale_rounds brr
         INNER JOIN battle_royale_preferences brp ON brr.preference_id = brp.id
         WHERE brr.session_id = $1
         ORDER BY brr.round_number`,
        [sessionId]
      );

      const userAnswers = roundsResult.rows.map((row: any) => ({
        round: row.round_number,
        question: row.question,
        answer: row.user_answer
      }));

      console.log('✅ [BattleRoyale] Final results:', {
        survivors: survivors.length,
        rounds_completed: userAnswers.length
      });

      return {
        session_id: sessionId,
        total_rounds: this.TOTAL_ROUNDS,
        initial_count: this.INITIAL_PARTICIPANTS,
        final_survivor_count: survivors.length,
        survivors,
        user_answers: userAnswers
      };
    });
  }

  /**
   * Add survivors to user's recommendation list with badge
   */
  async addSurvivorsToRecommendations(
    userId: string,
    sessionId: string
  ): Promise<{ added_count: number }> {
    console.log('🎮 [BattleRoyale] Adding survivors to recommendations:', {
      userId,
      sessionId
    });

    return await this.db.transaction(async (client) => {
      // Get final survivors
      const results = await this.getFinalResults(sessionId);
      const { survivors } = results;

      let addedCount = 0;

      for (const survivor of survivors) {
        // Check if already in recommendations
        const existingResult = await client.query(
          `SELECT id FROM daily_recommendations
           WHERE user_id = $1 AND recommended_user_id = $2 AND expires_at > NOW()`,
          [userId, survivor.user_id]
        );

        if (existingResult.rows.length === 0) {
          // Add to recommendations with special badge metadata
          await client.query(
            `INSERT INTO daily_recommendations
             (id, user_id, recommended_user_id, score, reason, expires_at, metadata, created_at)
             VALUES ($1, $2, $3, $4, $5, NOW() + INTERVAL '7 days', $6, NOW())
             ON CONFLICT (user_id, recommended_user_id)
             DO UPDATE SET
               metadata = EXCLUDED.metadata,
               updated_at = NOW()`,
            [
              uuidv4(),
              userId,
              survivor.user_id,
              100, // High score for battle royale survivors
              'BATTLE_ROYALE_SURVIVOR',
              JSON.stringify({ battle_royale_survivor: true, session_id: sessionId })
            ]
          );

          addedCount++;
        }
      }

      console.log('✅ [BattleRoyale] Added to recommendations:', addedCount);

      return { added_count: addedCount };
    });
  }
}

export const battleRoyaleService = new BattleRoyaleService();
