-- =====================================================
-- 퀴즈 시도 Ring Ledger Reason 값 추가
-- =====================================================

-- 기존 CHECK constraint 제거
ALTER TABLE user_ring_ledger
  DROP CONSTRAINT IF EXISTS user_point_ledger_reason_check;

-- 새로운 CHECK constraint 추가 (QUIZ_ATTEMPT 포함)
ALTER TABLE user_ring_ledger
  ADD CONSTRAINT user_point_ledger_reason_check
  CHECK (reason IN (
    'TRAIT_ADD',
    'QUIZ_ENTER',
    'QUIZ_ATTEMPT',
    'QUIZ_WRONG',
    'DAILY_BONUS',
    'PURCHASE',
    'BATTLE_ROYALE_ENTER',
    'BATTLE_ROYALE_WIN'
  ));

-- =====================================================
-- 완료!
-- =====================================================
