-- Auth System Migration
-- Adds profiles table, invitations table, and updates organization_members

-- =====================================================
-- 1. PROFILES TABLE
-- Auto-created on auth.users signup via trigger
-- =====================================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('super_admin', 'user')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for role-based queries
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- Trigger function: auto-create profile on auth.users insert
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name')
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
    updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists, then create
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- =====================================================
-- 2. INVITATIONS TABLE
-- For org admins to invite team members
-- =====================================================
CREATE TABLE IF NOT EXISTS invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  invited_by UUID REFERENCES profiles(id),
  inviter_name TEXT, -- Cached for email display
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  UNIQUE(organization_id, email, status) -- Allow re-inviting after revoked/expired
);

-- Indexes for invitation lookups
CREATE INDEX IF NOT EXISTS idx_invitations_token ON invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON invitations(email);
CREATE INDEX IF NOT EXISTS idx_invitations_org_status ON invitations(organization_id, status);

-- =====================================================
-- 3. UPDATE ORGANIZATION_MEMBERS
-- Add user_id (UUID) and invitation_id references
-- =====================================================

-- Add user_id column (UUID referencing profiles)
ALTER TABLE organization_members
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES profiles(id) ON DELETE CASCADE;

-- Add invitation_id for tracking how user joined
ALTER TABLE organization_members
  ADD COLUMN IF NOT EXISTS invitation_id UUID REFERENCES invitations(id);

-- Create unique index on user_id (single org per user)
CREATE UNIQUE INDEX IF NOT EXISTS idx_org_members_user_id ON organization_members(user_id);

-- =====================================================
-- 4. HELPER FUNCTIONS
-- =====================================================

-- Function to check if user is super_admin
CREATE OR REPLACE FUNCTION is_super_admin(user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role FROM profiles WHERE id = user_id;
  RETURN user_role = 'super_admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's organization membership
CREATE OR REPLACE FUNCTION get_user_org_membership(p_user_id UUID)
RETURNS TABLE(
  organization_id UUID,
  organization_name TEXT,
  org_role TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    om.organization_id,
    o.name as organization_name,
    om.role as org_role
  FROM organization_members om
  JOIN organizations o ON o.id = om.organization_id
  WHERE om.user_id = p_user_id
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check for pending invitation by email
CREATE OR REPLACE FUNCTION get_pending_invitation(p_email TEXT)
RETURNS TABLE(
  invitation_id UUID,
  organization_id UUID,
  organization_name TEXT,
  inv_role TEXT,
  token TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    i.id as invitation_id,
    i.organization_id,
    o.name as organization_name,
    i.role as inv_role,
    i.token
  FROM invitations i
  JOIN organizations o ON o.id = i.organization_id
  WHERE i.email = p_email
    AND i.status = 'pending'
    AND i.expires_at > NOW()
  ORDER BY i.created_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to accept invitation
CREATE OR REPLACE FUNCTION accept_invitation(p_token TEXT, p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  inv RECORD;
  result JSONB;
BEGIN
  -- Get and validate invitation
  SELECT * INTO inv FROM invitations
  WHERE token = p_token
    AND status = 'pending'
    AND expires_at > NOW();

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid or expired invitation');
  END IF;

  -- Check if user email matches invitation
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_user_id AND email = inv.email) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Email does not match invitation');
  END IF;

  -- Check if user already in an org
  IF EXISTS (SELECT 1 FROM organization_members WHERE user_id = p_user_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'User already belongs to an organization');
  END IF;

  -- Add user to organization
  INSERT INTO organization_members (organization_id, user_id, email, role, invitation_id)
  VALUES (inv.organization_id, p_user_id, inv.email, inv.role, inv.id);

  -- Update invitation status
  UPDATE invitations SET status = 'accepted', accepted_at = NOW() WHERE id = inv.id;

  RETURN jsonb_build_object(
    'success', true,
    'organization_id', inv.organization_id,
    'role', inv.role
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 5. MIGRATE EXISTING DATA (if needed)
-- =====================================================

-- Create profiles for existing auth users who don't have one
INSERT INTO profiles (id, email, full_name)
SELECT
  id,
  email,
  raw_user_meta_data->>'full_name'
FROM auth.users
WHERE NOT EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.users.id)
ON CONFLICT (id) DO NOTHING;
