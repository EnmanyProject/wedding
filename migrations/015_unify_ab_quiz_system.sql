-- ============================================================================
-- Migration 015: Unify A&B Quiz System
-- ============================================================================
-- Purpose: Consolidate trait_pairs and ab_quizzes into a single unified system
--
-- Business Model:
-- - Single source of A&B questions (ab_quizzes)
-- - Single source of user responses (ab_quiz_responses)
-- - Continuous collection of user preference data
--
-- Steps:
-- 1. Migrate trait_pairs → ab_quizzes
-- 2. Migrate user_traits → ab_quiz_responses
-- 3. Keep old tables for reference (don't drop yet)
-- ============================================================================

-- Step 1: Make created_by nullable in ab_quizzes (for system-generated quizzes)
ALTER TABLE ab_quizzes
ALTER COLUMN created_by DROP NOT NULL;

-- Add comment to clarify NULL means system-generated
COMMENT ON COLUMN ab_quizzes.created_by IS 'Admin user who created the quiz. NULL = system-generated from trait_pairs migration';

-- Step 2: Add source tracking column to know where quiz came from
ALTER TABLE ab_quizzes
ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'admin_created';

COMMENT ON COLUMN ab_quizzes.source IS 'Origin of quiz: admin_created, trait_pair_migration, or api_generated';

-- Step 3: Add original_trait_pair_id for reference (optional, for tracking)
ALTER TABLE ab_quizzes
ADD COLUMN IF NOT EXISTS original_trait_pair_id UUID;

-- Step 4: Migrate trait_pairs to ab_quizzes
INSERT INTO ab_quizzes (
    id,
    category,
    title,
    description,
    option_a_title,
    option_a_description,
    option_a_image,
    option_b_title,
    option_b_description,
    option_b_image,
    is_active,
    created_by,
    created_at,
    updated_at,
    source,
    original_trait_pair_id
)
SELECT
    gen_random_uuid(),  -- New ID for ab_quizzes
    tp.category,
    tp.key as title,  -- Use key as title
    tp.description,
    tp.left_label as option_a_title,
    NULL as option_a_description,  -- trait_pairs don't have descriptions
    tp.left_image as option_a_image,
    tp.right_label as option_b_title,
    NULL as option_b_description,
    tp.right_image as option_b_image,
    tp.is_active,
    tp.created_by,  -- May be NULL for system-generated
    tp.created_at,
    COALESCE(tp.updated_at, tp.created_at) as updated_at,
    'trait_pair_migration' as source,
    tp.id as original_trait_pair_id
FROM trait_pairs tp
WHERE NOT EXISTS (
    -- Don't migrate if already exists (in case script runs twice)
    SELECT 1 FROM ab_quizzes abq
    WHERE abq.original_trait_pair_id = tp.id
);

-- Step 5: Create mapping table for user_traits migration
CREATE TEMP TABLE trait_pair_quiz_mapping AS
SELECT
    tp.id as trait_pair_id,
    abq.id as ab_quiz_id
FROM trait_pairs tp
JOIN ab_quizzes abq ON abq.original_trait_pair_id = tp.id;

-- Step 6: Migrate user_traits to ab_quiz_responses
-- Note: user_traits uses choice ('left' or 'right'), we need to convert to 'A' or 'B'
-- Logic: choice = 'left' → 'A', choice = 'right' → 'B'
INSERT INTO ab_quiz_responses (
    id,
    quiz_id,
    user_id,
    choice,
    created_at
)
SELECT
    gen_random_uuid(),
    mapping.ab_quiz_id,
    ut.user_id,
    CASE
        WHEN ut.choice = 'left' THEN 'A'  -- Left option
        WHEN ut.choice = 'right' THEN 'B'  -- Right option
        ELSE 'A'  -- Default fallback (shouldn't happen)
    END as choice,
    ut.created_at
FROM user_traits ut
JOIN trait_pair_quiz_mapping mapping ON ut.pair_id = mapping.trait_pair_id
WHERE NOT EXISTS (
    -- Avoid duplicates
    SELECT 1 FROM ab_quiz_responses abr
    WHERE abr.quiz_id = mapping.ab_quiz_id
    AND abr.user_id = ut.user_id
)
ON CONFLICT (quiz_id, user_id) DO NOTHING;

-- Step 7: Add indexes for the new column
CREATE INDEX IF NOT EXISTS idx_ab_quizzes_source ON ab_quizzes(source);
CREATE INDEX IF NOT EXISTS idx_ab_quizzes_original_trait_pair ON ab_quizzes(original_trait_pair_id);

-- Step 8: Update statistics
ANALYZE ab_quizzes;
ANALYZE ab_quiz_responses;

-- Step 9: Rename old tables to indicate they're deprecated
ALTER TABLE trait_pairs RENAME TO trait_pairs_deprecated;
ALTER TABLE user_traits RENAME TO user_traits_deprecated;

-- Add comments for clarity
COMMENT ON TABLE trait_pairs_deprecated IS 'DEPRECATED: Migrated to ab_quizzes. Kept for reference only.';
COMMENT ON TABLE user_traits_deprecated IS 'DEPRECATED: Migrated to ab_quiz_responses. Kept for reference only.';

-- Step 10: Print migration summary
DO $$
DECLARE
    migrated_quizzes INTEGER;
    migrated_responses INTEGER;
    total_quizzes INTEGER;
    total_responses INTEGER;
BEGIN
    SELECT COUNT(*) INTO migrated_quizzes FROM ab_quizzes WHERE source = 'trait_pair_migration';
    SELECT COUNT(*) INTO total_quizzes FROM ab_quizzes;
    SELECT COUNT(*) INTO migrated_responses FROM ab_quiz_responses;
    SELECT COUNT(*) INTO total_responses FROM ab_quiz_responses;

    RAISE NOTICE '============================================================';
    RAISE NOTICE 'Migration 015: A&B Quiz System Unification Complete';
    RAISE NOTICE '============================================================';
    RAISE NOTICE 'Migrated Quizzes: % quizzes from trait_pairs', migrated_quizzes;
    RAISE NOTICE 'Total A&B Quizzes: %', total_quizzes;
    RAISE NOTICE 'Total User Responses: %', total_responses;
    RAISE NOTICE '============================================================';
END $$;
