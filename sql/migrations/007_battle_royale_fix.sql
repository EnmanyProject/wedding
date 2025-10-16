-- =====================================================
-- 배틀 로얄 스키마 수정 (Fix Critical Issues)
-- =====================================================

-- 1. battle_royale_sessions 테이블 컬럼 수정
ALTER TABLE battle_royale_sessions
  DROP COLUMN IF EXISTS participants_count,
  DROP COLUMN IF EXISTS survivors_count,
  DROP COLUMN IF EXISTS ring_cost,
  DROP COLUMN IF EXISTS completed_at;

ALTER TABLE battle_royale_sessions
  ADD COLUMN IF NOT EXISTS cost INTEGER DEFAULT 100,
  ADD COLUMN IF NOT EXISTS total_rounds INTEGER DEFAULT 5,
  ADD COLUMN IF NOT EXISTS final_survivor_count INTEGER,
  ADD COLUMN IF NOT EXISTS started_at TIMESTAMP DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS ended_at TIMESTAMP;

-- status 컬럼 값 업데이트
UPDATE battle_royale_sessions
SET status = 'IN_PROGRESS'
WHERE status = 'active';

UPDATE battle_royale_sessions
SET status = 'COMPLETED'
WHERE status = 'completed';

UPDATE battle_royale_sessions
SET status = 'ABANDONED'
WHERE status = 'abandoned';

-- 2. battle_royale_survivors 테이블 수정
-- 기존 UNIQUE 제약 조건 제거
ALTER TABLE battle_royale_survivors
  DROP CONSTRAINT IF EXISTS battle_royale_survivors_session_id_survivor_user_id_key;

-- 컬럼명 변경
ALTER TABLE battle_royale_survivors
  RENAME COLUMN survivor_user_id TO participant_id;

-- round_number 컬럼 추가 (기존 레코드는 5라운드로 가정)
ALTER TABLE battle_royale_survivors
  ADD COLUMN IF NOT EXISTS round_number INTEGER NOT NULL DEFAULT 5;

-- 불필요한 컬럼 제거
ALTER TABLE battle_royale_survivors
  DROP COLUMN IF EXISTS matching_score,
  DROP COLUMN IF EXISTS badge_awarded;

-- 새로운 UNIQUE 제약 조건 추가
ALTER TABLE battle_royale_survivors
  DROP CONSTRAINT IF EXISTS battle_royale_survivors_unique;

ALTER TABLE battle_royale_survivors
  ADD CONSTRAINT battle_royale_survivors_unique
  UNIQUE (session_id, round_number, participant_id);

-- 3. 인덱스 재생성
DROP INDEX IF EXISTS idx_br_survivors_user;
CREATE INDEX IF NOT EXISTS idx_br_survivors_participant
  ON battle_royale_survivors(participant_id);

-- =====================================================
-- 완료!
-- =====================================================
