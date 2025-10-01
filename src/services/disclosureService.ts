import { Database } from '../utils/database';
import { config } from '../utils/config';

export interface DisclosureMilestone {
  t1_unlocked: boolean; // 10 points - basic demographics
  t1_unlocked_at?: Date;
  t2_unlocked: boolean; // 50 points - economic/family/education/lifestyle
  t2_unlocked_at?: Date;
  t3_unlocked: boolean; // 100 points - marriage history/health/verification
  t3_unlocked_at?: Date;
  current_affinity_score: number;
}

export interface UserProfile {
  basic?: any;
  economic?: any;
  family?: any;
  marriage?: any;
  education?: any;
  lifestyle?: any;
  health?: any;
  verification?: any;
}

export class DisclosureService {
  private db: Database;

  constructor() {
    this.db = Database.getInstance();
  }

  /**
   * Get user disclosure milestones with target
   */
  async getDisclosureMilestones(userId: string, targetId: string): Promise<DisclosureMilestone> {
    console.log('🔐 [DisclosureService] getDisclosureMilestones 시작:', { userId, targetId });

    const [milestone] = await this.db.query(
      `SELECT t1_unlocked, t1_unlocked_at, t2_unlocked, t2_unlocked_at,
              t3_unlocked, t3_unlocked_at, current_affinity_score
       FROM user_disclosure_milestones
       WHERE user_id = $1 AND target_user_id = $2`,
      [userId, targetId]
    );

    console.log('📊 [DisclosureService] 마일스톤 조회 결과:', milestone);

    if (!milestone) {
      // Create initial milestone record
      console.log('⚠️ [DisclosureService] 마일스톤 없음, 생성 중...');

      // Get current affinity score
      const [affinity] = await this.db.query(
        'SELECT score FROM affinity WHERE viewer_id = $1 AND target_id = $2',
        [userId, targetId]
      );

      const currentScore = affinity?.score || 0;
      console.log('🎯 [DisclosureService] 현재 호감도 점수:', currentScore);

      const initialMilestone = {
        t1_unlocked: currentScore >= config.AFFINITY_T1_THRESHOLD,
        t2_unlocked: currentScore >= config.AFFINITY_T2_THRESHOLD,
        t3_unlocked: currentScore >= config.AFFINITY_T3_THRESHOLD,
        current_affinity_score: currentScore
      };

      await this.createDisclosureMilestone(userId, targetId, currentScore);
      console.log('✅ [DisclosureService] 초기 마일스톤 생성 완료');
      return initialMilestone;
    }

    return milestone;
  }

  /**
   * Create initial disclosure milestone
   */
  async createDisclosureMilestone(userId: string, targetId: string, affinityScore: number): Promise<void> {
    console.log('🔨 [DisclosureService] createDisclosureMilestone:', { userId, targetId, affinityScore });

    const t1Unlocked = affinityScore >= config.AFFINITY_T1_THRESHOLD;
    const t2Unlocked = affinityScore >= config.AFFINITY_T2_THRESHOLD;
    const t3Unlocked = affinityScore >= config.AFFINITY_T3_THRESHOLD;

    await this.db.query(
      `INSERT INTO user_disclosure_milestones
       (user_id, target_user_id, current_affinity_score,
        t1_unlocked, t1_unlocked_at, t2_unlocked, t2_unlocked_at,
        t3_unlocked, t3_unlocked_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (user_id, target_user_id)
       DO UPDATE SET
         current_affinity_score = $3,
         t1_unlocked = $4,
         t1_unlocked_at = CASE WHEN $4 AND NOT user_disclosure_milestones.t1_unlocked THEN NOW() ELSE user_disclosure_milestones.t1_unlocked_at END,
         t2_unlocked = $6,
         t2_unlocked_at = CASE WHEN $6 AND NOT user_disclosure_milestones.t2_unlocked THEN NOW() ELSE user_disclosure_milestones.t2_unlocked_at END,
         t3_unlocked = $8,
         t3_unlocked_at = CASE WHEN $8 AND NOT user_disclosure_milestones.t3_unlocked THEN NOW() ELSE user_disclosure_milestones.t3_unlocked_at END,
         updated_at = NOW()`,
      [
        userId, targetId, affinityScore,
        t1Unlocked, t1Unlocked ? new Date() : null,
        t2Unlocked, t2Unlocked ? new Date() : null,
        t3Unlocked, t3Unlocked ? new Date() : null
      ]
    );

    console.log('✅ [DisclosureService] 마일스톤 생성/업데이트 완료:', {
      t1Unlocked,
      t2Unlocked,
      t3Unlocked
    });
  }

  /**
   * Update milestone when affinity score changes
   */
  async updateMilestoneFromAffinity(userId: string, targetId: string): Promise<void> {
    console.log('🔄 [DisclosureService] updateMilestoneFromAffinity:', { userId, targetId });

    // Get current affinity score
    const [affinity] = await this.db.query(
      'SELECT score FROM affinity WHERE viewer_id = $1 AND target_id = $2',
      [userId, targetId]
    );

    const currentScore = affinity?.score || 0;
    console.log('🎯 [DisclosureService] 업데이트할 호감도 점수:', currentScore);

    await this.createDisclosureMilestone(userId, targetId, currentScore);
  }

  /**
   * Get user profile data based on disclosure level
   */
  async getUserProfileWithDisclosure(
    viewerId: string,
    targetId: string
  ): Promise<{ profile: UserProfile; milestones: DisclosureMilestone }> {
    console.log('👤 [DisclosureService] getUserProfileWithDisclosure:', { viewerId, targetId });

    const milestones = await this.getDisclosureMilestones(viewerId, targetId);
    const profile: UserProfile = {};

    console.log('🔓 [DisclosureService] 공개 단계:', {
      t1: milestones.t1_unlocked,
      t2: milestones.t2_unlocked,
      t3: milestones.t3_unlocked,
      score: milestones.current_affinity_score
    });

    // T1: Basic information (10+ points)
    if (milestones.t1_unlocked) {
      console.log('📊 [DisclosureService] T1 정보 조회 중...');
      const [basic] = await this.db.query(
        `SELECT age, height, weight, blood_type, zodiac_sign,
                residence_city, residence_district, hometown_city, hometown_district,
                body_type, face_shape, skin_tone, personality_type, introduction
         FROM user_basic_profiles WHERE user_id = $1`,
        [targetId]
      );
      profile.basic = basic;
      console.log('✅ [DisclosureService] T1 기본 정보 조회 완료');
    }

    // T2: Detailed information (50+ points)
    if (milestones.t2_unlocked) {
      console.log('💰 [DisclosureService] T2 정보 조회 중...');

      // Economic profile
      const [economic] = await this.db.query(
        `SELECT occupation, company_name, company_size, position, years_of_experience,
                annual_income, income_level, real_estate_owned, savings_amount,
                car_owned, financial_stability
         FROM user_economic_profiles WHERE user_id = $1`,
        [targetId]
      );
      profile.economic = economic;

      // Family profile
      const [family] = await this.db.query(
        `SELECT father_alive, father_occupation, mother_alive, mother_occupation,
                siblings_count, birth_order, family_income_level, family_social_status,
                family_religion, family_support_level
         FROM user_family_profiles WHERE user_id = $1`,
        [targetId]
      );
      profile.family = family;

      // Education profile
      const [education] = await this.db.query(
        `SELECT highest_education, university_name, university_ranking, major,
                graduation_year, language_skills, certifications, career_goals,
                career_stability, career_ambition_level
         FROM user_education_profiles WHERE user_id = $1`,
        [targetId]
      );
      profile.education = education;

      // Lifestyle profile
      const [lifestyle] = await this.db.query(
        `SELECT lifestyle_type, hobbies, interests, exercise_habits, diet_type,
                social_circle_size, travel_frequency, smoking_status, drinking_frequency,
                religion, religious_devotion, political_view
         FROM user_lifestyle_profiles WHERE user_id = $1`,
        [targetId]
      );
      profile.lifestyle = lifestyle;

      console.log('✅ [DisclosureService] T2 상세 정보 조회 완료');
    }

    // T3: Private information (100+ points)
    if (milestones.t3_unlocked) {
      console.log('🔒 [DisclosureService] T3 민감 정보 조회 중...');

      // Marriage history
      const [marriage] = await this.db.query(
        `SELECT marriage_status, previous_marriages_count, has_children, children_count,
                children_custody, longest_relationship_duration, wants_children,
                desired_children_count, marriage_timeline
         FROM user_marriage_history WHERE user_id = $1`,
        [targetId]
      );
      profile.marriage = marriage;

      // Health profile (limited)
      const [health] = await this.db.query(
        `SELECT overall_health, chronic_conditions, fertility_status,
                exercise_frequency, fitness_level
         FROM user_health_profiles WHERE user_id = $1`,
        [targetId]
      );
      profile.health = health;

      // Verification status
      const [verification] = await this.db.query(
        `SELECT identity_verified, income_verified, education_verified,
                employment_verified, overall_verification_score, verification_level
         FROM user_verifications WHERE user_id = $1`,
        [targetId]
      );
      profile.verification = verification;

      console.log('✅ [DisclosureService] T3 민감 정보 조회 완료');
    }

    console.log('🎉 [DisclosureService] 프로필 조회 완료:', {
      hasBasic: !!profile.basic,
      hasEconomic: !!profile.economic,
      hasFamily: !!profile.family,
      hasEducation: !!profile.education,
      hasLifestyle: !!profile.lifestyle,
      hasMarriage: !!profile.marriage,
      hasHealth: !!profile.health,
      hasVerification: !!profile.verification
    });

    return { profile, milestones };
  }

  /**
   * Check what milestones would unlock at given affinity score
   */
  checkMilestoneUnlocks(currentScore: number, newScore: number): {
    newUnlocks: string[];
    t1: boolean;
    t2: boolean;
    t3: boolean;
  } {
    const newUnlocks: string[] = [];

    const t1 = newScore >= config.AFFINITY_T1_THRESHOLD;
    const t2 = newScore >= config.AFFINITY_T2_THRESHOLD;
    const t3 = newScore >= config.AFFINITY_T3_THRESHOLD;

    if (!t1 && currentScore < config.AFFINITY_T1_THRESHOLD && newScore >= config.AFFINITY_T1_THRESHOLD) {
      newUnlocks.push('T1_BASIC');
    }
    if (!t2 && currentScore < config.AFFINITY_T2_THRESHOLD && newScore >= config.AFFINITY_T2_THRESHOLD) {
      newUnlocks.push('T2_DETAILED');
    }
    if (!t3 && currentScore < config.AFFINITY_T3_THRESHOLD && newScore >= config.AFFINITY_T3_THRESHOLD) {
      newUnlocks.push('T3_PRIVATE');
    }

    return { newUnlocks, t1, t2, t3 };
  }
}

export const disclosureService = new DisclosureService();