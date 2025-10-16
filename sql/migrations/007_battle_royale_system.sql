-- =====================================================
-- 배틀 로얄 선호도 맞추기 시스템
-- =====================================================

-- 1. 선호 질문 테이블 (5개 질문)
CREATE TABLE IF NOT EXISTS battle_royale_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_number INT NOT NULL, -- 1-5
  question TEXT NOT NULL, -- 예: "당신은 어떤 것을 더 선호하나요?"
  option_left TEXT NOT NULL, -- 예: "고양이"
  option_left_image TEXT, -- 이미지 URL (선택적)
  option_right TEXT NOT NULL, -- 예: "강아지"
  option_right_image TEXT, -- 이미지 URL (선택적)
  category VARCHAR(50), -- 예: "동물", "음식", "취미" 등
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(round_number)
);

-- 2. 유저별 선호 답변 테이블 (100명 x 5개 = 500개 레코드)
CREATE TABLE IF NOT EXISTS user_preference_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  preference_id UUID NOT NULL REFERENCES battle_royale_preferences(id) ON DELETE CASCADE,
  answer VARCHAR(10) NOT NULL CHECK (answer IN ('LEFT', 'RIGHT')),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, preference_id)
);

-- 인덱스 추가 (빠른 조회)
CREATE INDEX idx_user_pref_answers_user ON user_preference_answers(user_id);
CREATE INDEX idx_user_pref_answers_pref ON user_preference_answers(preference_id);

-- 3. 배틀 로얄 세션 테이블
CREATE TABLE IF NOT EXISTS battle_royale_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'active', -- 'active', 'completed', 'abandoned'
  participants_count INT DEFAULT 100,
  survivors_count INT,
  current_round INT DEFAULT 1,
  ring_cost INT DEFAULT 100,
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

-- 인덱스 추가
CREATE INDEX idx_br_sessions_user ON battle_royale_sessions(user_id);
CREATE INDEX idx_br_sessions_status ON battle_royale_sessions(status);

-- 4. 배틀 로얄 라운드 결과 테이블
CREATE TABLE IF NOT EXISTS battle_royale_rounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES battle_royale_sessions(id) ON DELETE CASCADE,
  round_number INT NOT NULL,
  preference_id UUID NOT NULL REFERENCES battle_royale_preferences(id),
  user_answer VARCHAR(10) NOT NULL CHECK (user_answer IN ('LEFT', 'RIGHT')),
  survivors_before INT NOT NULL,
  survivors_after INT NOT NULL,
  eliminated_count INT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(session_id, round_number)
);

-- 인덱스 추가
CREATE INDEX idx_br_rounds_session ON battle_royale_rounds(session_id);

-- 5. 배틀 로얄 생존자 테이블 (최종 생존자 추적)
CREATE TABLE IF NOT EXISTS battle_royale_survivors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES battle_royale_sessions(id) ON DELETE CASCADE,
  survivor_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  matching_score INT, -- 선택적: 매칭 점수
  badge_awarded BOOLEAN DEFAULT TRUE, -- 배지 부여 여부
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(session_id, survivor_user_id)
);

-- 인덱스 추가
CREATE INDEX idx_br_survivors_session ON battle_royale_survivors(session_id);
CREATE INDEX idx_br_survivors_user ON battle_royale_survivors(survivor_user_id);

-- =====================================================
-- 시드 데이터: 5개 선호 질문
-- =====================================================

INSERT INTO battle_royale_preferences (round_number, question, option_left, option_right, category) VALUES
  (1, '당신은 어떤 동물을 더 좋아하나요?', '고양이 🐱', '강아지 🐶', '동물'),
  (2, '주말에 무엇을 하고 싶나요?', '집에서 영화 보기 🏠', '밖에서 운동하기 🏃', '활동'),
  (3, '이상적인 데이트는?', '조용한 카페 ☕', '시끌벅적한 축제 🎪', '데이트'),
  (4, '어떤 음식을 더 선호하나요?', '매운 음식 🌶️', '단 음식 🍰', '음식'),
  (5, '당신의 성격은?', '내향적 📚', '외향적 🎉', '성격')
ON CONFLICT (round_number) DO NOTHING;

-- =====================================================
-- 완료!
-- =====================================================
