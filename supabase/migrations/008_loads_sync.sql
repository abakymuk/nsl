-- Migration: Sync loads table with current schema
-- Ensures all fields from quote flow and load creation are present

-- Add missing fields to loads table if they don't exist
ALTER TABLE loads ADD COLUMN IF NOT EXISTS origin TEXT;
ALTER TABLE loads ADD COLUMN IF NOT EXISTS destination TEXT;
ALTER TABLE loads ADD COLUMN IF NOT EXISTS eta TIMESTAMPTZ;
ALTER TABLE loads ADD COLUMN IF NOT EXISTS customer_name TEXT;
ALTER TABLE loads ADD COLUMN IF NOT EXISTS customer_email TEXT;

-- Update status constraint to include all statuses
ALTER TABLE loads DROP CONSTRAINT IF EXISTS loads_status_check;
ALTER TABLE loads ADD CONSTRAINT loads_status_check
  CHECK (status IN ('booked', 'dispatched', 'at_terminal', 'picked_up', 'in_transit', 'at_yard', 'out_for_delivery', 'delivered', 'completed', 'cancelled', 'exception'));

-- Ensure tracking_number has unique constraint
ALTER TABLE loads DROP CONSTRAINT IF EXISTS loads_tracking_number_key;
ALTER TABLE loads ADD CONSTRAINT loads_tracking_number_key UNIQUE (tracking_number);

-- Add description field to load_events if missing
ALTER TABLE load_events ADD COLUMN IF NOT EXISTS description TEXT;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_loads_tracking ON loads(tracking_number);
CREATE INDEX IF NOT EXISTS idx_loads_customer_email ON loads(customer_email);

-- Update trigger name if needed (was shipments_updated_at)
DROP TRIGGER IF EXISTS shipments_updated_at ON loads;
DROP TRIGGER IF EXISTS loads_updated_at ON loads;
CREATE TRIGGER loads_updated_at
  BEFORE UPDATE ON loads
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
