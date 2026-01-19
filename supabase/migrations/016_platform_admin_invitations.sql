-- Platform Admin Invitations
-- Extends invitations table to support platform-level admin invites (not tied to org)

-- Add platform_role column for super_admin invitations
ALTER TABLE invitations
  ADD COLUMN IF NOT EXISTS platform_role TEXT CHECK (platform_role IN ('super_admin', 'user')),
  ALTER COLUMN organization_id DROP NOT NULL;

-- Add index for platform invitations lookup
CREATE INDEX IF NOT EXISTS idx_invitations_platform_role
  ON invitations(platform_role)
  WHERE platform_role IS NOT NULL;

-- Function to accept platform admin invitation
CREATE OR REPLACE FUNCTION accept_platform_invitation(p_token TEXT, p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  inv RECORD;
BEGIN
  -- Get and validate invitation
  SELECT * INTO inv FROM invitations
  WHERE token = p_token
    AND status = 'pending'
    AND expires_at > NOW()
    AND platform_role IS NOT NULL;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid or expired invitation');
  END IF;

  -- Update user's profile to super_admin if platform_role is super_admin
  IF inv.platform_role = 'super_admin' THEN
    UPDATE profiles
    SET role = 'super_admin', updated_at = NOW()
    WHERE id = p_user_id;
  END IF;

  -- Update invitation status
  UPDATE invitations SET status = 'accepted', accepted_at = NOW() WHERE id = inv.id;

  RETURN jsonb_build_object(
    'success', true,
    'platform_role', inv.platform_role
  );
END;
$$;
