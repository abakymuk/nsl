-- Migration: Add lead qualification fields to quotes table
-- Supports the new conversion-optimized quote flow with urgency detection

-- Add new columns to quotes table
ALTER TABLE quotes
  -- Request context
  ADD COLUMN IF NOT EXISTS port TEXT DEFAULT 'la',
  ADD COLUMN IF NOT EXISTS request_type TEXT DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS time_sensitive BOOLEAN DEFAULT FALSE,

  -- Lead scoring
  ADD COLUMN IF NOT EXISTS lead_score INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_urgent BOOLEAN DEFAULT FALSE,

  -- Delivery details
  ADD COLUMN IF NOT EXISTS delivery_type TEXT,
  ADD COLUMN IF NOT EXISTS appointment_required BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS availability_date DATE;

-- Make container_number nullable (now optional in form)
ALTER TABLE quotes
  ALTER COLUMN container_number DROP NOT NULL,
  ALTER COLUMN container_number SET DEFAULT 'TBD';

-- Make pickup_terminal nullable (now optional in form)
ALTER TABLE quotes
  ALTER COLUMN pickup_terminal DROP NOT NULL,
  ALTER COLUMN pickup_terminal SET DEFAULT 'TBD';

-- Make container_type nullable with default
ALTER TABLE quotes
  ALTER COLUMN container_type DROP NOT NULL,
  ALTER COLUMN container_type SET DEFAULT '40ft';

-- Add check constraints for valid values
ALTER TABLE quotes
  ADD CONSTRAINT check_port CHECK (port IN ('la', 'lb')),
  ADD CONSTRAINT check_request_type CHECK (request_type IN ('standard', 'urgent_lfd', 'rolled', 'hold_released', 'customs_check', 'not_sure')),
  ADD CONSTRAINT check_delivery_type CHECK (delivery_type IS NULL OR delivery_type IN ('business', 'warehouse', 'residential', 'other'));

-- Create index on urgent quotes for faster filtering
CREATE INDEX IF NOT EXISTS idx_quotes_is_urgent ON quotes(is_urgent) WHERE is_urgent = TRUE;
CREATE INDEX IF NOT EXISTS idx_quotes_lead_score ON quotes(lead_score DESC);
CREATE INDEX IF NOT EXISTS idx_quotes_request_type ON quotes(request_type);

-- Add comment for documentation
COMMENT ON COLUMN quotes.port IS 'Port of origin: la (Los Angeles) or lb (Long Beach)';
COMMENT ON COLUMN quotes.request_type IS 'Type of request for lead qualification';
COMMENT ON COLUMN quotes.time_sensitive IS 'Whether penalties/demurrage may apply';
COMMENT ON COLUMN quotes.lead_score IS 'Calculated lead priority score (0-10)';
COMMENT ON COLUMN quotes.is_urgent IS 'Whether this is a priority/urgent request';
COMMENT ON COLUMN quotes.delivery_type IS 'Type of delivery location';
COMMENT ON COLUMN quotes.appointment_required IS 'Whether delivery requires appointment';
COMMENT ON COLUMN quotes.availability_date IS 'Container availability date';
