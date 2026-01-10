-- Multi-tenant organization architecture
-- Each company is an organization with multiple members

-- Organizations table (tenants)
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE, -- URL-friendly identifier
  email_domain TEXT, -- e.g., "@acme.com" for auto-matching
  primary_email TEXT,
  phone TEXT,
  address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Organization members (users linked to organizations)
CREATE TABLE IF NOT EXISTS organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  clerk_user_id TEXT NOT NULL, -- Clerk user ID
  email TEXT NOT NULL,
  role TEXT DEFAULT 'member', -- 'admin', 'member'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, clerk_user_id)
);

-- Add organization_id to quotes table
ALTER TABLE quotes
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);

-- Add organization_id to shipments table
ALTER TABLE shipments
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_org_members_clerk_user ON organization_members(clerk_user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_email ON organization_members(email);
CREATE INDEX IF NOT EXISTS idx_organizations_domain ON organizations(email_domain);
CREATE INDEX IF NOT EXISTS idx_quotes_organization ON quotes(organization_id);
CREATE INDEX IF NOT EXISTS idx_shipments_organization ON shipments(organization_id);

-- Function to auto-link users to organizations by email domain
CREATE OR REPLACE FUNCTION find_organization_by_email(user_email TEXT)
RETURNS UUID AS $$
DECLARE
  org_id UUID;
  domain TEXT;
BEGIN
  -- Extract domain from email
  domain := '@' || split_part(user_email, '@', 2);

  -- Try to find organization by domain
  SELECT id INTO org_id FROM organizations WHERE email_domain = domain LIMIT 1;

  RETURN org_id;
END;
$$ LANGUAGE plpgsql;
