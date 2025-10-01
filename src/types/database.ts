export interface User {
  id: string;
  email: string;
  password_hash: string;
  name: string;
  age?: number;
  gender?: 'male' | 'female' | 'other';
  location?: string;
  bio?: string;
  profile_complete: boolean;
  is_active: boolean;
  last_login_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface UserPhoto {
  id: string;
  user_id: string;
  role: 'PROFILE' | 'QUIZ' | 'OTHER';
  order_idx: number;
  is_safe: boolean;
  moderation_status: 'PENDING' | 'APPROVED' | 'REJECTED';
  exif_meta?: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

export interface PhotoAsset {
  id: string;
  photo_id: string;
  variant: 'ORIG' | 'THUMB' | 'BLUR1' | 'BLUR2';
  storage_key: string;
  width?: number;
  height?: number;
  mime_type?: string;
  size_bytes?: number;
  created_at: Date;
}

export interface PhotoMaskState {
  user_id: string;
  photo_id: string;
  visible_stage: 'LOCKED' | 'T1' | 'T2' | 'T3';
  updated_at: Date;
}

export interface TraitPair {
  id: string;
  key: string;
  left_label: string;
  right_label: string;
  category?: string;
  weight: number;
  entropy: number;
  is_active: boolean;
  created_at: Date;
}

export interface TraitVisual {
  id: string;
  pair_id: string;
  left_asset_id?: string;
  right_asset_id?: string;
  locale: string;
  is_default: boolean;
  created_at: Date;
}

export interface UserTrait {
  id: string;
  user_id: string;
  pair_id: string;
  choice: 'left' | 'right';
  confidence: number;
  created_at: Date;
  updated_at: Date;
}

export interface UserPointBalance {
  user_id: string;
  balance: number;
  updated_at: Date;
}

export interface UserPointLedger {
  id: string;
  user_id: string;
  delta: number;
  reason: 'TRAIT_ADD' | 'QUIZ_ENTER' | 'QUIZ_WRONG' | 'DAILY_BONUS' | 'PURCHASE';
  ref_id?: string;
  created_at: Date;
}

export interface QuizSession {
  id: string;
  asker_id: string;
  target_id: string;
  mode: 'TRAIT_PHOTO' | 'PREFERENCE';
  points_spent: number;
  started_at: Date;
  ended_at?: Date;
}

export interface QuizItem {
  id: string;
  session_id: string;
  pair_id: string;
  option_type?: 'LEFT' | 'RIGHT';
  asker_guess?: 'LEFT' | 'RIGHT';
  correct?: boolean;
  delta_affinity: number;
  delta_points: number;
  selected_photo_id?: string;
  assets?: Record<string, any>;
  created_at: Date;
}

export interface UserSkill {
  user_id: string;
  accuracy: number;
  total_attempts: number;
  bias: number;
  updated_at: Date;
}

export interface Affinity {
  id: string;
  viewer_id: string;
  target_id: string;
  score: number;
  stages_unlocked: string[];
  last_quiz_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface UserRankingCache {
  user_id: string;
  target_id: string;
  rank_position: number;
  affinity_score: number;
  updated_at: Date;
}

export interface MeetingState {
  id: string;
  user1_id: string;
  user2_id: string;
  state: 'LOCKED' | 'AVAILABLE' | 'CONNECTED' | 'CHATTING';
  unlocked_at?: Date;
  connected_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface SeedRun {
  id: string;
  run_at: Date;
  stats?: Record<string, any>;
  run_by_user?: string;
}

export interface DevFlag {
  key: string;
  value?: string;
  updated_at: Date;
}

export interface ABQuiz {
  id: string;
  category: string;
  title: string;
  description?: string;
  option_a_title: string;
  option_a_description?: string;
  option_a_image?: string;
  option_b_title: string;
  option_b_description?: string;
  option_b_image?: string;
  is_active: boolean;
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

export interface QuizResponse {
  id: string;
  quiz_id: string;
  user_id: string;
  selected_option: 'A' | 'B';
  created_at: Date;
}