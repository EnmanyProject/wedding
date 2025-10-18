-- ============================================================================
-- Migration 016: Fix Missing Columns
-- ============================================================================
-- Purpose: Add missing columns to daily_recommendations table
--
-- Issue: battleRoyaleService expects expires_at, reason, metadata columns
-- but they don't exist in the current schema
-- ============================================================================

-- Add missing columns to daily_recommendations
ALTER TABLE daily_recommendations
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE daily_recommendations
ADD COLUMN IF NOT EXISTS reason TEXT;

ALTER TABLE daily_recommendations
ADD COLUMN IF NOT EXISTS metadata JSONB;

ALTER TABLE daily_recommendations
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Set default expires_at for existing rows (7 days from creation)
UPDATE daily_recommendations
SET expires_at = created_at + INTERVAL '7 days'
WHERE expires_at IS NULL;

-- Add index for expires_at (for cleanup queries)
CREATE INDEX IF NOT EXISTS idx_daily_recommendations_expires_at
ON daily_recommendations(expires_at);

-- Add index for metadata (for JSONB queries)
CREATE INDEX IF NOT EXISTS idx_daily_recommendations_metadata
ON daily_recommendations USING GIN (metadata);

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION update_daily_recommendations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_daily_recommendations_updated_at
    BEFORE UPDATE ON daily_recommendations
    FOR EACH ROW
    EXECUTE FUNCTION update_daily_recommendations_updated_at();

-- Add comments
COMMENT ON COLUMN daily_recommendations.expires_at IS 'Expiration timestamp for recommendation (typically 7 days)';
COMMENT ON COLUMN daily_recommendations.reason IS 'Reason for recommendation (e.g., Battle Royale survivor)';
COMMENT ON COLUMN daily_recommendations.metadata IS 'Additional metadata (e.g., badges, special attributes)';

-- Migration summary
DO $$
BEGIN
    RAISE NOTICE '============================================================';
    RAISE NOTICE 'Migration 016: Fix Missing Columns Complete';
    RAISE NOTICE '============================================================';
    RAISE NOTICE 'Added columns to daily_recommendations:';
    RAISE NOTICE '  - expires_at (timestamp)';
    RAISE NOTICE '  - reason (text)';
    RAISE NOTICE '  - metadata (jsonb)';
    RAISE NOTICE '  - updated_at (timestamp)';
    RAISE NOTICE '============================================================';
END $$;
