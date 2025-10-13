-- Migration: Add profile_image_url to users table
-- Date: 2025-10-11
-- Purpose: Store local profile image paths for users

-- Add profile_image_url column to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS profile_image_url VARCHAR(500);

-- Add comment to the column
COMMENT ON COLUMN users.profile_image_url IS 'URL or path to user profile image (local or external)';

-- Create index for faster lookups (optional but recommended)
CREATE INDEX IF NOT EXISTS idx_users_profile_image_url ON users(profile_image_url) WHERE profile_image_url IS NOT NULL;
