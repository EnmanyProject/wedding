-- Ring Currency System Migration
-- Phase 1A: Ring System Implementation

-- Ring balance table (extends existing point system)
CREATE TABLE user_ring_balance (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    balance INTEGER DEFAULT 100,  -- Starting with 100 rings
    total_earned INTEGER DEFAULT 100,
    total_spent INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ring transaction log
CREATE TABLE ring_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL,  -- Positive for earning, negative for spending
    transaction_type VARCHAR(50) NOT NULL CHECK (transaction_type IN (
        'SIGNUP_BONUS',           -- 회원가입 보너스
        'DAILY_LOGIN',            -- 일일 로그인 보너스
        'QUIZ_CORRECT',           -- 퀴즈 정답 보상
        'PHOTO_UPLOAD',           -- 사진 업로드 보상
        'PROFILE_COMPLETE',       -- 프로필 완성 보상
        'INVITE_FRIEND',          -- 친구 초대 보상
        'STREAK_BONUS',           -- 연속 로그인 보너스
        'SPECIAL_EVENT',          -- 특별 이벤트 보상
        'QUIZ_PLAY',              -- 퀴즈 플레이 비용
        'PHOTO_UNLOCK',           -- 사진 잠금 해제 비용
        'PREMIUM_FEATURE',        -- 프리미엄 기능 이용 비용
        'GIFT_RING',              -- 링 선물하기
        'PURCHASE_ITEM',          -- 아이템 구매
        'ADMIN_ADJUST',           -- 관리자 조정
        'PAWN_PHOTO',             -- 전당포 사진 맡기기
        'PAWN_INFO'               -- 전당포 정보 맡기기
    )),
    description TEXT,
    balance_after INTEGER NOT NULL,
    metadata JSONB,  -- Additional data (e.g., quiz_id, photo_id, etc.)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Daily login streak tracking for bonus calculation
CREATE TABLE user_login_streaks (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    last_login_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ring earning rules configuration
CREATE TABLE ring_earning_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rule_type VARCHAR(50) NOT NULL UNIQUE,
    base_amount INTEGER NOT NULL,
    max_daily_amount INTEGER,
    conditions JSONB,  -- Additional conditions for earning
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default ring earning rules
INSERT INTO ring_earning_rules (rule_type, base_amount, max_daily_amount, conditions) VALUES
('SIGNUP_BONUS', 100, NULL, '{"one_time": true}'),
('DAILY_LOGIN', 10, 10, '{"reset_daily": true}'),
('QUIZ_CORRECT', 5, 50, '{"per_correct_answer": true}'),
('PHOTO_UPLOAD', 20, 60, '{"per_photo": true, "max_photos_per_day": 3}'),
('PROFILE_COMPLETE', 50, NULL, '{"one_time": true}'),
('INVITE_FRIEND', 100, 500, '{"per_successful_invite": true}'),
('STREAK_BONUS', 5, NULL, '{"multiplier_per_day": true, "max_multiplier": 10}');

-- Create indexes for performance
CREATE INDEX idx_ring_transactions_user_id ON ring_transactions(user_id);
CREATE INDEX idx_ring_transactions_type ON ring_transactions(transaction_type);
CREATE INDEX idx_ring_transactions_created_at ON ring_transactions(created_at);
CREATE INDEX idx_user_login_streaks_user_id ON user_login_streaks(user_id);
CREATE INDEX idx_user_login_streaks_last_login ON user_login_streaks(last_login_date);
CREATE INDEX idx_ring_earning_rules_type ON ring_earning_rules(rule_type);

-- Add updated_at triggers
CREATE TRIGGER update_user_ring_balance_updated_at BEFORE UPDATE ON user_ring_balance
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_login_streaks_updated_at BEFORE UPDATE ON user_login_streaks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ring_earning_rules_updated_at BEFORE UPDATE ON ring_earning_rules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Migrate existing users to ring system (give 100 rings to all existing users)
INSERT INTO user_ring_balance (user_id, balance, total_earned, total_spent)
SELECT id, 100, 100, 0 FROM users
ON CONFLICT (user_id) DO NOTHING;

-- Add initial signup bonus transaction for existing users
INSERT INTO ring_transactions (user_id, amount, transaction_type, description, balance_after, created_at)
SELECT 
    u.id, 
    100, 
    'SIGNUP_BONUS', 
    '회원가입 보너스', 
    100,
    u.created_at
FROM users u
LEFT JOIN ring_transactions rt ON rt.user_id = u.id AND rt.transaction_type = 'SIGNUP_BONUS'
WHERE rt.id IS NULL;

-- Initialize login streaks for existing users
INSERT INTO user_login_streaks (user_id, current_streak, longest_streak, last_login_date)
SELECT 
    id, 
    CASE WHEN last_login_at IS NOT NULL AND last_login_at::date = CURRENT_DATE THEN 1 ELSE 0 END,
    CASE WHEN last_login_at IS NOT NULL AND last_login_at::date = CURRENT_DATE THEN 1 ELSE 0 END,
    CASE WHEN last_login_at IS NOT NULL THEN last_login_at::date ELSE NULL END
FROM users
ON CONFLICT (user_id) DO NOTHING;

-- Function to safely update ring balance
CREATE OR REPLACE FUNCTION update_ring_balance(
    p_user_id UUID,
    p_amount INTEGER,
    p_transaction_type VARCHAR(50),
    p_description TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
    current_balance INTEGER;
    new_balance INTEGER;
BEGIN
    -- Get current balance
    SELECT balance INTO current_balance 
    FROM user_ring_balance 
    WHERE user_id = p_user_id;
    
    IF current_balance IS NULL THEN
        RAISE EXCEPTION 'User ring balance not found for user_id: %', p_user_id;
    END IF;
    
    -- Calculate new balance
    new_balance := current_balance + p_amount;
    
    -- Prevent negative balance for spending transactions
    IF new_balance < 0 THEN
        RETURN FALSE;
    END IF;
    
    -- Update balance
    UPDATE user_ring_balance 
    SET 
        balance = new_balance,
        total_earned = total_earned + GREATEST(p_amount, 0),
        total_spent = total_spent + GREATEST(-p_amount, 0),
        updated_at = NOW()
    WHERE user_id = p_user_id;
    
    -- Log transaction
    INSERT INTO ring_transactions (
        user_id, 
        amount, 
        transaction_type, 
        description, 
        balance_after, 
        metadata
    ) VALUES (
        p_user_id, 
        p_amount, 
        p_transaction_type, 
        p_description, 
        new_balance, 
        p_metadata
    );
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to get user's ring balance
CREATE OR REPLACE FUNCTION get_ring_balance(p_user_id UUID)
RETURNS TABLE(
    balance INTEGER,
    total_earned INTEGER,
    total_spent INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        urb.balance,
        urb.total_earned,
        urb.total_spent
    FROM user_ring_balance urb
    WHERE urb.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;