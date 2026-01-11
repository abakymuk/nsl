-- Add missing shipment tracking fields
-- These columns are needed for proper tracking functionality

-- Add tracking number (unique identifier for customer-facing tracking)
ALTER TABLE shipments
  ADD COLUMN IF NOT EXISTS tracking_number TEXT;

-- Add origin and destination
ALTER TABLE shipments
  ADD COLUMN IF NOT EXISTS origin TEXT,
  ADD COLUMN IF NOT EXISTS destination TEXT;

-- Add ETA
ALTER TABLE shipments
  ADD COLUMN IF NOT EXISTS eta TIMESTAMPTZ;

-- Add customer info
ALTER TABLE shipments
  ADD COLUMN IF NOT EXISTS customer_name TEXT,
  ADD COLUMN IF NOT EXISTS customer_email TEXT;

-- Add description to shipment events
ALTER TABLE shipment_events
  ADD COLUMN IF NOT EXISTS description TEXT;

-- Create index for tracking number lookups
CREATE INDEX IF NOT EXISTS idx_shipments_tracking ON shipments(tracking_number);

-- Generate tracking numbers for existing shipments that don't have one
UPDATE shipments
SET tracking_number = 'NSL' || UPPER(SUBSTRING(MD5(id::text) FROM 1 FOR 8))
WHERE tracking_number IS NULL;
