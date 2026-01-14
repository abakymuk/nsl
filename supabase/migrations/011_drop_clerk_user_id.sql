-- Drop legacy clerk_user_id column completely
ALTER TABLE organization_members DROP COLUMN IF EXISTS clerk_user_id;
