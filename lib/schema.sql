-- Vercel Postgres migration script
-- Core tables for wedding app

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (main user accounts)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE,
    display_name VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- AB Quiz system tables
CREATE TABLE IF NOT EXISTS ab_quizzes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category VARCHAR(50),
    title VARCHAR(200) NOT NULL,
    description TEXT,
    option_a_title VARCHAR(100) NOT NULL,
    option_a_description TEXT,
    option_a_image TEXT,
    option_b_title VARCHAR(100) NOT NULL,
    option_b_description TEXT,
    option_b_image TEXT,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Quiz responses
CREATE TABLE IF NOT EXISTS quiz_responses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quiz_id UUID NOT NULL REFERENCES ab_quizzes(id),
    user_id UUID NOT NULL REFERENCES users(id),
    selected_option VARCHAR(10) NOT NULL CHECK (selected_option IN ('A', 'B')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(quiz_id, user_id)
);

-- User photos
CREATE TABLE IF NOT EXISTS user_photos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    storage_key TEXT,
    moderation_status VARCHAR(20) DEFAULT 'PENDING',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Photo assets (different sizes/variants)
CREATE TABLE IF NOT EXISTS photo_assets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    photo_id UUID NOT NULL REFERENCES user_photos(id),
    variant VARCHAR(20) NOT NULL, -- original, thumbnail, medium
    storage_key TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Trait pairs (personality matching system)
CREATE TABLE IF NOT EXISTS trait_pairs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key VARCHAR(100) NOT NULL,
    left_label VARCHAR(100) NOT NULL,
    right_label VARCHAR(100) NOT NULL,
    category VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- User trait responses
CREATE TABLE IF NOT EXISTS user_traits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    pair_id UUID NOT NULL REFERENCES trait_pairs(id),
    choice VARCHAR(10) NOT NULL, -- left, right
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, pair_id)
);

-- Affinity scoring system
CREATE TABLE IF NOT EXISTS affinity (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    viewer_id UUID NOT NULL REFERENCES users(id),
    target_id UUID NOT NULL REFERENCES users(id),
    score INTEGER DEFAULT 0,
    stages_unlocked INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(viewer_id, target_id)
);

-- User ranking cache
CREATE TABLE IF NOT EXISTS user_ranking_cache (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    target_id UUID NOT NULL REFERENCES users(id),
    rank_position INTEGER,
    affinity_score INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, target_id)
);

-- Admin users
CREATE TABLE IF NOT EXISTS admin_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_quiz_responses_user_id ON quiz_responses(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_responses_quiz_id ON quiz_responses(quiz_id);
CREATE INDEX IF NOT EXISTS idx_user_photos_user_id ON user_photos(user_id);
CREATE INDEX IF NOT EXISTS idx_photo_assets_photo_id ON photo_assets(photo_id);
CREATE INDEX IF NOT EXISTS idx_user_traits_user_id ON user_traits(user_id);
CREATE INDEX IF NOT EXISTS idx_user_traits_pair_id ON user_traits(pair_id);
CREATE INDEX IF NOT EXISTS idx_affinity_viewer_id ON affinity(viewer_id);
CREATE INDEX IF NOT EXISTS idx_affinity_target_id ON affinity(target_id);
CREATE INDEX IF NOT EXISTS idx_ranking_cache_user_id ON user_ranking_cache(user_id);