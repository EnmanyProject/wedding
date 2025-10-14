-- Unify quiz structure: Add missing fields to trait_pairs
-- This allows trait_pairs to have the same capabilities as ab_quizzes

-- Add description field
ALTER TABLE trait_pairs
ADD COLUMN IF NOT EXISTS description TEXT;

-- Add image fields for left and right options
ALTER TABLE trait_pairs
ADD COLUMN IF NOT EXISTS left_image VARCHAR(255);

ALTER TABLE trait_pairs
ADD COLUMN IF NOT EXISTS right_image VARCHAR(255);

-- Add updated_at timestamp for tracking modifications
ALTER TABLE trait_pairs
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- Add created_by to track who created/modified (nullable for existing system-generated ones)
ALTER TABLE trait_pairs
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES admin_users(id) ON DELETE SET NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_trait_pairs_updated_at ON trait_pairs(updated_at);

-- Update trigger to automatically update updated_at
CREATE OR REPLACE FUNCTION update_trait_pairs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_trait_pairs_updated_at
    BEFORE UPDATE ON trait_pairs
    FOR EACH ROW
    EXECUTE FUNCTION update_trait_pairs_updated_at();

-- Comment for documentation
COMMENT ON TABLE trait_pairs IS 'Unified quiz structure: Supports both system-generated and admin-created quizzes with images and descriptions';
