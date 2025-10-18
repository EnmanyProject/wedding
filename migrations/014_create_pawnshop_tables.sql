-- =====================================================
-- 전당포 시스템 Phase 1 마이그레이션
-- =====================================================
-- 사용자가 정보/사진을 맡기고 Ring을 획득하는 시스템
-- 다른 사용자가 정보 열람 시 제공자가 추가 Ring 획득
-- =====================================================

-- 1. 맡긴 사진 테이블
CREATE TABLE IF NOT EXISTS pawnshop_photos (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  storage_key VARCHAR(500) NOT NULL,
  photo_type VARCHAR(50) NOT NULL CHECK (photo_type IN ('face', 'body', 'hobby', 'lifestyle')),
  file_size INTEGER NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  rings_earned INTEGER NOT NULL DEFAULT 50,
  view_count INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT pawnshop_photos_user_type_unique UNIQUE(user_id, photo_type)
);

CREATE INDEX idx_pawnshop_photos_user_id ON pawnshop_photos(user_id);
CREATE INDEX idx_pawnshop_photos_is_active ON pawnshop_photos(is_active);
CREATE INDEX idx_pawnshop_photos_created_at ON pawnshop_photos(created_at DESC);

COMMENT ON TABLE pawnshop_photos IS '전당포에 맡긴 사진 정보';
COMMENT ON COLUMN pawnshop_photos.photo_type IS '사진 타입: face(얼굴), body(전신), hobby(취미), lifestyle(일상)';
COMMENT ON COLUMN pawnshop_photos.rings_earned IS '사진 맡기기로 획득한 Ring 금액';
COMMENT ON COLUMN pawnshop_photos.view_count IS '다른 사용자들이 열람한 횟수';

-- 2. 맡긴 정보 테이블
CREATE TABLE IF NOT EXISTS pawnshop_info (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  info_type VARCHAR(50) NOT NULL CHECK (info_type IN ('ideal_type', 'job', 'hobby')),
  content TEXT NOT NULL,
  rings_earned INTEGER NOT NULL,
  view_count INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT pawnshop_info_user_type_unique UNIQUE(user_id, info_type)
);

CREATE INDEX idx_pawnshop_info_user_id ON pawnshop_info(user_id);
CREATE INDEX idx_pawnshop_info_info_type ON pawnshop_info(info_type);
CREATE INDEX idx_pawnshop_info_is_active ON pawnshop_info(is_active);
CREATE INDEX idx_pawnshop_info_created_at ON pawnshop_info(created_at DESC);

COMMENT ON TABLE pawnshop_info IS '전당포에 맡긴 정보 (이상형/직업/취미)';
COMMENT ON COLUMN pawnshop_info.info_type IS '정보 타입: ideal_type(이상형), job(직업), hobby(취미)';
COMMENT ON COLUMN pawnshop_info.rings_earned IS '정보 맡기기로 획득한 Ring 금액';
COMMENT ON COLUMN pawnshop_info.view_count IS '다른 사용자들이 열람한 횟수';

-- 3. 열람 기록 테이블
CREATE TABLE IF NOT EXISTS pawnshop_views (
  id SERIAL PRIMARY KEY,
  viewer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  item_type VARCHAR(50) NOT NULL CHECK (item_type IN ('photo', 'info')),
  item_id INTEGER NOT NULL,
  rings_spent INTEGER NOT NULL DEFAULT 30,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT pawnshop_views_unique UNIQUE(viewer_id, item_type, item_id)
);

CREATE INDEX idx_pawnshop_views_viewer_id ON pawnshop_views(viewer_id);
CREATE INDEX idx_pawnshop_views_owner_id ON pawnshop_views(owner_id);
CREATE INDEX idx_pawnshop_views_item ON pawnshop_views(item_type, item_id);
CREATE INDEX idx_pawnshop_views_created_at ON pawnshop_views(created_at DESC);

COMMENT ON TABLE pawnshop_views IS '전당포 정보 열람 기록';
COMMENT ON COLUMN pawnshop_views.viewer_id IS '열람한 사용자 ID';
COMMENT ON COLUMN pawnshop_views.owner_id IS '정보 제공자 ID';
COMMENT ON COLUMN pawnshop_views.item_type IS '열람 항목 타입: photo 또는 info';
COMMENT ON COLUMN pawnshop_views.item_id IS '열람 항목 ID (pawnshop_photos.id 또는 pawnshop_info.id)';
COMMENT ON COLUMN pawnshop_views.rings_spent IS '열람에 사용한 Ring 금액';

-- 4. 전당포 전용 거래 내역 테이블
CREATE TABLE IF NOT EXISTS pawnshop_transactions (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  transaction_type VARCHAR(50) NOT NULL CHECK (transaction_type IN ('PAWN_PHOTO', 'PAWN_INFO', 'VIEW_PHOTO', 'VIEW_INFO', 'VIEW_REWARD')),
  amount INTEGER NOT NULL,
  description TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_pawnshop_transactions_user_id ON pawnshop_transactions(user_id);
CREATE INDEX idx_pawnshop_transactions_type ON pawnshop_transactions(transaction_type);
CREATE INDEX idx_pawnshop_transactions_created_at ON pawnshop_transactions(created_at DESC);

COMMENT ON TABLE pawnshop_transactions IS '전당포 시스템 전용 거래 내역';
COMMENT ON COLUMN pawnshop_transactions.transaction_type IS 'PAWN_PHOTO: 사진 맡기기, PAWN_INFO: 정보 맡기기, VIEW_PHOTO: 사진 열람, VIEW_INFO: 정보 열람, VIEW_REWARD: 열람 보상';
COMMENT ON COLUMN pawnshop_transactions.amount IS 'Ring 금액 (양수: 획득, 음수: 지출)';
COMMENT ON COLUMN pawnshop_transactions.metadata IS '추가 메타데이터 (photo_type, info_type, viewer_id 등)';

-- =====================================================
-- Phase 1 완료
-- =====================================================
