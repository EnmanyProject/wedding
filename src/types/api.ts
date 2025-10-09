import { UserPhoto, PhotoAsset, TraitPair, TraitVisual, QuizSession, QuizItem } from './database';

// Photo API types
export interface PhotoPresignRequest {
  filename: string;
  content_type: string;
  role?: 'PROFILE' | 'QUIZ' | 'OTHER';
}

export interface PhotoPresignResponse {
  upload_url: string;
  photo_id: string;
  storage_key: string;
  expires_in: number;
}

export interface PhotoCommitRequest {
  photo_id: string;
  exif_meta?: Record<string, any>;
}

export interface PhotoCommitResponse {
  photo: UserPhoto;
  processing_started: boolean;
}

export interface PhotoWithAssets extends UserPhoto {
  assets: PhotoAsset[];
}

export interface UserPhotoList {
  photos: PhotoWithAssets[];
  total: number;
}

export interface ProfilePhotosResponse {
  photos: Array<{
    id: string;
    role: string;
    order_idx: number;
    assets: Array<{
      variant: string;
      url?: string;
      width?: number;
      height?: number;
    }>;
  }>;
  visible_stage: 'LOCKED' | 'T1' | 'T2' | 'T3';
  affinity_score?: number;
}

// Quiz API types
export interface QuizSessionRequest {
  target_id: string;
  mode?: 'TRAIT_PHOTO' | 'PREFERENCE';
}

export interface QuizSessionResponse {
  session: QuizSession;
  rings_remaining: number;
}

export interface QuizAnswerRequest {
  pair_id: string;
  guess: 'LEFT' | 'RIGHT';
  selected_photo_id?: string;
}

export interface QuizAnswerResponse {
  correct: boolean;
  target_choice: 'LEFT' | 'RIGHT';
  delta_affinity: number;
  delta_rings: number;
  affinity_score: number;
  stages_unlocked: string[];
  quiz_item: QuizItem;
}

export interface QuizTemplateRequest {
  pair_id?: string;
  target_id?: string;
}

export interface QuizTemplateResponse {
  pair: TraitPair;
  visual?: TraitVisual;
  target_info?: {
    user_id: string;
    name: string;
    photos: Array<{
      id: string;
      variant: string;
      url?: string;
    }>;
  };
  instructions: string;
}

// Rings API types
export interface UserRingsResponse {
  balance: number;
  recent_transactions: Array<{
    id: string;
    delta: number;
    reason: string;
    created_at: Date;
  }>;
}

export interface EarnRingsRequest {
  reason: 'TRAIT_ADD' | 'DAILY_BONUS';
  ref_id?: string;
}

export interface EarnRingsResponse {
  delta: number;
  new_balance: number;
  transaction_id: string;
}

// Affinity API types
export interface AffinityResponse {
  target_id: string;
  score: number;
  stages_unlocked: string[];
  photos_unlocked: number;
  last_quiz_at?: Date;
  can_quiz: boolean;
}

// Ranking API types
export interface UserRankingResponse {
  rankings: Array<{
    target_id: string;
    target_name: string;
    rank_position: number;
    affinity_score: number;
    photos_unlocked: number;
    can_meet: boolean;
  }>;
  user_position?: {
    rank: number;
    percentile: number;
  };
}

// Meeting API types
export interface MeetingStateResponse {
  available_meetings: Array<{
    target_id: string;
    target_name: string;
    affinity_score: number;
    unlocked_at: Date;
  }>;
  active_chats: Array<{
    meeting_id: string;
    target_id: string;
    target_name: string;
    last_message?: string;
    last_message_at?: Date;
    unread_count: number;
  }>;
}

export interface MeetingEnterRequest {
  target_id: string;
}

export interface MeetingEnterResponse {
  meeting_id: string;
  state: string;
  connected_at: Date;
  chat_enabled: boolean;
}

// Dev/Seeding API types
export interface SeedRequest {
  user_count?: number;
  trait_pairs?: number;
  photos_per_user?: number;
  quiz_sessions?: number;
  reset_first?: boolean;
}

export interface SeedResponse {
  success: boolean;
  stats: {
    users_created: number;
    photos_created: number;
    trait_pairs_created: number;
    quiz_sessions_created: number;
    quiz_items_created: number;
    affinities_created: number;
    seed_time_ms: number;
  };
  seed_run_id: string;
}

export interface SeedSummaryResponse {
  last_run?: {
    id: string;
    run_at: Date;
    stats: Record<string, any>;
  };
  current_counts: {
    users: number;
    photos: number;
    trait_pairs: number;
    quiz_sessions: number;
    quiz_items: number;
    affinities: number;
  };
  dev_flags: Record<string, string>;
}

// Common response wrappers
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
  timestamp: string;
}

export interface PaginatedResponse<T = any> {
  items: T[];
  total: number;
  page: number;
  per_page: number;
  has_next: boolean;
  has_prev: boolean;
}

// Error response types
export interface ApiError {
  success: false;
  error: string;
  code?: string;
  details?: Record<string, any>;
  timestamp: string;
}