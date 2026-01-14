-- Fix organization_members table
-- Remove legacy clerk_user_id column (not using Clerk)

-- First make nullable, then drop
ALTER TABLE organization_members
  ALTER COLUMN clerk_user_id DROP NOT NULL;

ALTER TABLE organization_members
  DROP COLUMN IF EXISTS clerk_user_id;
