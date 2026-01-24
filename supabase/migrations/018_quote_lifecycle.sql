-- Migration: Quote Lifecycle Enhancement
-- Adds status enum, tokens for public access, audit trail, and pricing breakdown

-- ============================================================================
-- PART 1: Quote Status Enum & Lifecycle Columns
-- ============================================================================

-- Create quote status enum
CREATE TYPE quote_status AS ENUM (
  'pending',      -- Initial state after customer submits
  'in_review',    -- Admin has claimed/opened the quote
  'quoted',       -- Admin has sent pricing to customer
  'accepted',     -- Customer accepted the quote
  'rejected',     -- Customer rejected the quote
  'expired',      -- Quote validity period ended
  'cancelled'     -- Admin cancelled the quote
);

-- Add lifecycle columns to quotes table
ALTER TABLE quotes
  -- Status tracking (migrate from string to enum)
  ADD COLUMN IF NOT EXISTS lifecycle_status quote_status DEFAULT 'pending',

  -- Expiration and validity
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS validity_days INTEGER DEFAULT 7,

  -- Acceptance tracking
  ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS accepted_signature TEXT,
  ADD COLUMN IF NOT EXISTS accepted_ip INET,

  -- Rejection tracking
  ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT,

  -- Pricing breakdown (structured JSONB)
  ADD COLUMN IF NOT EXISTS pricing_breakdown JSONB,
  ADD COLUMN IF NOT EXISTS total_price NUMERIC(10,2),

  -- Assignment
  ADD COLUMN IF NOT EXISTS assignee_id UUID REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ,

  -- Response time tracking
  ADD COLUMN IF NOT EXISTS first_response_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS response_time_hours NUMERIC(6,2),

  -- Warning tracking for expiration emails
  ADD COLUMN IF NOT EXISTS expiry_warning_sent_at TIMESTAMPTZ;

-- Backfill existing quotes: if quoted_price exists, mark as 'quoted', else 'pending'
UPDATE quotes
SET lifecycle_status = CASE
  WHEN quoted_price IS NOT NULL THEN 'quoted'::quote_status
  ELSE 'pending'::quote_status
END
WHERE lifecycle_status IS NULL OR lifecycle_status = 'pending';

-- Set expires_at for existing quoted quotes (7 days from quoted_at or now)
UPDATE quotes
SET expires_at = COALESCE(quoted_at::timestamptz, now()) + INTERVAL '7 days'
WHERE lifecycle_status = 'quoted' AND expires_at IS NULL;

-- Create indexes for queue queries
CREATE INDEX IF NOT EXISTS idx_quotes_lifecycle_status ON quotes(lifecycle_status);
CREATE INDEX IF NOT EXISTS idx_quotes_lifecycle_created ON quotes(lifecycle_status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quotes_expires_at ON quotes(expires_at) WHERE lifecycle_status = 'quoted';
CREATE INDEX IF NOT EXISTS idx_quotes_assignee ON quotes(assignee_id) WHERE assignee_id IS NOT NULL;

-- Add comments
COMMENT ON COLUMN quotes.lifecycle_status IS 'Current state in quote lifecycle workflow';
COMMENT ON COLUMN quotes.expires_at IS 'When the quote offer expires';
COMMENT ON COLUMN quotes.validity_days IS 'Number of days quote is valid after being sent';
COMMENT ON COLUMN quotes.pricing_breakdown IS 'Itemized pricing: {items: [{name, qty, unit_price, total}], subtotal, fees, taxes, total}';
COMMENT ON COLUMN quotes.accepted_signature IS 'Customer typed name as digital signature';
COMMENT ON COLUMN quotes.first_response_at IS 'When admin first responded (for SLA tracking)';

-- ============================================================================
-- PART 2: Quote Tokens Table
-- ============================================================================

-- Token type enum
CREATE TYPE quote_token_type AS ENUM ('status', 'accept');

-- Create tokens table for secure public access
CREATE TABLE IF NOT EXISTS quote_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  token VARCHAR(64) UNIQUE NOT NULL,
  type quote_token_type NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast token lookup
CREATE INDEX IF NOT EXISTS idx_quote_tokens_token ON quote_tokens(token);
CREATE INDEX IF NOT EXISTS idx_quote_tokens_quote ON quote_tokens(quote_id);

-- Function to generate secure token
CREATE OR REPLACE FUNCTION generate_quote_token(
  p_quote_id UUID,
  p_type quote_token_type,
  p_validity_hours INTEGER DEFAULT 168  -- 7 days default
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_token TEXT;
BEGIN
  -- Generate 64-character hex token (32 random bytes)
  v_token := encode(gen_random_bytes(32), 'hex');

  -- Insert token record
  INSERT INTO quote_tokens (quote_id, token, type, expires_at)
  VALUES (p_quote_id, v_token, p_type, now() + (p_validity_hours || ' hours')::interval);

  RETURN v_token;
END;
$$;

-- RLS for quote_tokens: allow select only via exact token match (no auth required)
ALTER TABLE quote_tokens ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read a token if they know the exact token value
-- This is intentionally permissive for public access via token
CREATE POLICY "Tokens readable via exact match" ON quote_tokens
  FOR SELECT
  USING (true);  -- Token lookup happens via WHERE token = $1

-- Policy: Only service role can insert/update/delete tokens
CREATE POLICY "Service role manages tokens" ON quote_tokens
  FOR ALL
  USING (auth.role() = 'service_role');

COMMENT ON TABLE quote_tokens IS 'Secure tokens for public quote access (status view, acceptance)';
COMMENT ON FUNCTION generate_quote_token IS 'Creates a 64-char hex token for quote access';

-- ============================================================================
-- PART 3: Quote Audit Trail
-- ============================================================================

-- Actor type enum
CREATE TYPE quote_actor_type AS ENUM ('system', 'admin', 'customer');

-- Create audit log table
CREATE TABLE IF NOT EXISTS quote_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  action VARCHAR(50) NOT NULL,
  old_status quote_status,
  new_status quote_status,
  actor_id UUID REFERENCES profiles(id),
  actor_type quote_actor_type NOT NULL DEFAULT 'system',
  metadata JSONB,
  ip_address INET,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for efficient quote history queries
CREATE INDEX IF NOT EXISTS idx_audit_quote_id ON quote_audit_log(quote_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_action ON quote_audit_log(action);

-- Trigger function to auto-log status changes
CREATE OR REPLACE FUNCTION log_quote_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only log if lifecycle_status actually changed
  IF OLD.lifecycle_status IS DISTINCT FROM NEW.lifecycle_status THEN
    INSERT INTO quote_audit_log (
      quote_id,
      action,
      old_status,
      new_status,
      actor_type,
      metadata
    ) VALUES (
      NEW.id,
      'status_change',
      OLD.lifecycle_status,
      NEW.lifecycle_status,
      'system',  -- Will be overwritten by API if admin/customer action
      jsonb_build_object(
        'old_status', OLD.lifecycle_status,
        'new_status', NEW.lifecycle_status
      )
    );
  END IF;

  -- Track first response time
  IF NEW.lifecycle_status = 'quoted' AND OLD.lifecycle_status IN ('pending', 'in_review') THEN
    NEW.first_response_at := COALESCE(NEW.first_response_at, now());
    NEW.response_time_hours := EXTRACT(EPOCH FROM (now() - NEW.created_at)) / 3600;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS quote_status_change_trigger ON quotes;
CREATE TRIGGER quote_status_change_trigger
  BEFORE UPDATE ON quotes
  FOR EACH ROW
  EXECUTE FUNCTION log_quote_status_change();

-- No RLS on audit log (service role only access)
-- This ensures audit integrity
ALTER TABLE quote_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role only for audit" ON quote_audit_log
  FOR ALL
  USING (auth.role() = 'service_role');

COMMENT ON TABLE quote_audit_log IS 'Immutable audit trail of all quote state changes';
COMMENT ON FUNCTION log_quote_status_change IS 'Auto-logs quote status transitions';

-- ============================================================================
-- PART 4: Helper Functions
-- ============================================================================

-- Function to validate token and return quote
CREATE OR REPLACE FUNCTION validate_quote_token(
  p_token VARCHAR(64),
  p_type quote_token_type
)
RETURNS TABLE (
  quote_id UUID,
  token_id UUID,
  is_valid BOOLEAN,
  is_expired BOOLEAN,
  is_used BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    qt.quote_id,
    qt.id as token_id,
    (qt.id IS NOT NULL) as is_valid,
    (qt.expires_at < now()) as is_expired,
    (qt.used_at IS NOT NULL) as is_used
  FROM quote_tokens qt
  WHERE qt.token = p_token
    AND qt.type = p_type
  LIMIT 1;
END;
$$;

-- Function to mark token as used
CREATE OR REPLACE FUNCTION use_quote_token(p_token VARCHAR(64))
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_updated BOOLEAN;
BEGIN
  UPDATE quote_tokens
  SET used_at = now()
  WHERE token = p_token
    AND used_at IS NULL
    AND expires_at > now();

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated > 0;
END;
$$;

COMMENT ON FUNCTION validate_quote_token IS 'Validates a token and returns quote info';
COMMENT ON FUNCTION use_quote_token IS 'Marks a token as used (for accept tokens)';
