-- A&B Wedding App Database Schema v5
-- Photo Storage + Photo-based Quiz Logging + Dummy Seeding

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    age INTEGER,
    gender VARCHAR(10) CHECK (gender IN ('male', 'female', 'other')),
    location VARCHAR(100),
    bio TEXT,
    profile_complete BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- OAuth providers for social login
CREATE TABLE oauth_providers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(20) NOT NULL CHECK (provider IN ('google', 'kakao', 'instagram')),
    provider_user_id VARCHAR(255) NOT NULL,
    provider_email VARCHAR(255),
    access_token TEXT,
    refresh_token TEXT,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(provider, provider_user_id)
);

-- Photo storage system
CREATE TABLE user_photos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'PROFILE' CHECK (role IN ('PROFILE', 'QUIZ', 'OTHER')),
    order_idx INTEGER DEFAULT 0,
    is_safe BOOLEAN DEFAULT TRUE,
    moderation_status VARCHAR(20) DEFAULT 'PENDING' CHECK (moderation_status IN ('PENDING', 'APPROVED', 'REJECTED')),
    exif_meta JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE photo_assets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    photo_id UUID REFERENCES user_photos(id) ON DELETE CASCADE,
    variant VARCHAR(20) NOT NULL CHECK (variant IN ('ORIG', 'THUMB', 'BLUR1', 'BLUR2')),
    storage_key VARCHAR(500) NOT NULL,
    width INTEGER,
    height INTEGER,
    mime_type VARCHAR(50),
    size_bytes BIGINT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE photo_mask_states (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    photo_id UUID REFERENCES user_photos(id) ON DELETE CASCADE,
    visible_stage VARCHAR(10) DEFAULT 'LOCKED' CHECK (visible_stage IN ('LOCKED', 'T1', 'T2', 'T3')),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (user_id, photo_id)
);

-- Trait system with visual assets
CREATE TABLE trait_pairs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key VARCHAR(50) UNIQUE NOT NULL,
    left_label VARCHAR(100) NOT NULL,
    right_label VARCHAR(100) NOT NULL,
    category VARCHAR(50),
    weight DECIMAL(3,2) DEFAULT 1.0,
    entropy DECIMAL(5,4) DEFAULT 0.5,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE trait_visuals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pair_id UUID REFERENCES trait_pairs(id) ON DELETE CASCADE,
    left_asset_id VARCHAR(255),
    right_asset_id VARCHAR(255),
    locale VARCHAR(10) DEFAULT 'ko',
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User trait responses
CREATE TABLE user_traits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    pair_id UUID REFERENCES trait_pairs(id) ON DELETE CASCADE,
    choice VARCHAR(10) NOT NULL CHECK (choice IN ('left', 'right')),
    confidence DECIMAL(3,2) DEFAULT 1.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, pair_id)
);

-- Points system
CREATE TABLE user_point_balances (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    balance INTEGER DEFAULT 10000,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE user_point_ledger (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    delta INTEGER NOT NULL,
    reason VARCHAR(50) NOT NULL CHECK (reason IN ('TRAIT_ADD', 'QUIZ_ENTER', 'QUIZ_WRONG', 'DAILY_BONUS', 'PURCHASE')),
    ref_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Quiz system with photo logging
CREATE TABLE quiz_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    asker_id UUID REFERENCES users(id) ON DELETE CASCADE,
    target_id UUID REFERENCES users(id) ON DELETE CASCADE,
    mode VARCHAR(20) DEFAULT 'TRAIT_PHOTO' CHECK (mode IN ('TRAIT_PHOTO', 'PREFERENCE')),
    points_spent INTEGER DEFAULT 1,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ended_at TIMESTAMP WITH TIME ZONE,
    CHECK (asker_id != target_id)
);

CREATE TABLE quiz_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES quiz_sessions(id) ON DELETE CASCADE,
    pair_id UUID REFERENCES trait_pairs(id) ON DELETE CASCADE,
    option_type VARCHAR(10) CHECK (option_type IN ('LEFT', 'RIGHT')),
    asker_guess VARCHAR(10) CHECK (asker_guess IN ('LEFT', 'RIGHT')),
    correct BOOLEAN,
    delta_affinity INTEGER DEFAULT 0,
    delta_points INTEGER DEFAULT 0,
    selected_photo_id UUID REFERENCES user_photos(id),
    assets JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User quiz performance tracking
CREATE TABLE user_skills (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    accuracy DECIMAL(5,4) DEFAULT 0.5,
    total_attempts INTEGER DEFAULT 0,
    bias DECIMAL(3,2) DEFAULT 0.0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Affinity between users
CREATE TABLE affinity (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    viewer_id UUID REFERENCES users(id) ON DELETE CASCADE,
    target_id UUID REFERENCES users(id) ON DELETE CASCADE,
    score INTEGER DEFAULT 0,
    stages_unlocked TEXT[] DEFAULT '{}',
    last_quiz_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(viewer_id, target_id),
    CHECK (viewer_id != target_id)
);

-- Ranking cache
CREATE TABLE user_ranking_cache (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    target_id UUID REFERENCES users(id) ON DELETE CASCADE,
    rank_position INTEGER,
    affinity_score INTEGER,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (user_id, target_id)
);

-- Meeting states and connections
CREATE TABLE meeting_states (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user1_id UUID REFERENCES users(id) ON DELETE CASCADE,
    user2_id UUID REFERENCES users(id) ON DELETE CASCADE,
    state VARCHAR(20) DEFAULT 'LOCKED' CHECK (state IN ('LOCKED', 'AVAILABLE', 'CONNECTED', 'CHATTING')),
    unlocked_at TIMESTAMP WITH TIME ZONE,
    connected_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user1_id, user2_id),
    CHECK (user1_id < user2_id)
);

-- Chat messages
CREATE TABLE chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    meeting_id UUID REFERENCES meeting_states(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    message_type VARCHAR(20) DEFAULT 'TEXT' CHECK (message_type IN ('TEXT', 'IMAGE', 'STICKER')),
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Development and seeding tables
CREATE TABLE seed_runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    run_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    stats JSONB,
    run_by_user VARCHAR(100)
);

CREATE TABLE dev_flags (
    key VARCHAR(50) PRIMARY KEY,
    value TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Analytics and logging (anonymized)
CREATE TABLE event_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type VARCHAR(50) NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_active ON users(is_active);
CREATE INDEX idx_user_photos_user_role ON user_photos(user_id, role);
CREATE INDEX idx_user_photos_moderation ON user_photos(moderation_status);
CREATE INDEX idx_photo_assets_photo_variant ON photo_assets(photo_id, variant);
CREATE INDEX idx_photo_mask_user ON photo_mask_states(user_id);
CREATE INDEX idx_trait_pairs_active ON trait_pairs(is_active);
CREATE INDEX idx_trait_pairs_category ON trait_pairs(category);
CREATE INDEX idx_user_traits_user ON user_traits(user_id);
CREATE INDEX idx_user_traits_pair ON user_traits(pair_id);
CREATE INDEX idx_quiz_sessions_asker ON quiz_sessions(asker_id);
CREATE INDEX idx_quiz_sessions_target ON quiz_sessions(target_id);
CREATE INDEX idx_quiz_items_session ON quiz_items(session_id);
CREATE INDEX idx_affinity_viewer_target ON affinity(viewer_id, target_id);
CREATE INDEX idx_affinity_score ON affinity(score DESC);
CREATE INDEX idx_ranking_cache_user ON user_ranking_cache(user_id);
CREATE INDEX idx_meeting_states_users ON meeting_states(user1_id, user2_id);
CREATE INDEX idx_chat_messages_meeting ON chat_messages(meeting_id);
CREATE INDEX idx_event_logs_type_time ON event_logs(event_type, created_at);

-- Triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_photos_updated_at BEFORE UPDATE ON user_photos
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_traits_updated_at BEFORE UPDATE ON user_traits
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_point_balances_updated_at BEFORE UPDATE ON user_point_balances
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_affinity_updated_at BEFORE UPDATE ON affinity
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_meeting_states_updated_at BEFORE UPDATE ON meeting_states
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_photo_mask_states_updated_at BEFORE UPDATE ON photo_mask_states
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_skills_updated_at BEFORE UPDATE ON user_skills
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();