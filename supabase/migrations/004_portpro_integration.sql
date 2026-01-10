-- PortPro TMS Integration
-- Adds fields for syncing with PortPro and logging webhook events

-- Add PortPro reference fields to shipments
ALTER TABLE shipments
  ADD COLUMN IF NOT EXISTS portpro_reference TEXT,
  ADD COLUMN IF NOT EXISTS portpro_load_id TEXT,
  ADD COLUMN IF NOT EXISTS container_size TEXT,
  ADD COLUMN IF NOT EXISTS seal_number TEXT,
  ADD COLUMN IF NOT EXISTS chassis_number TEXT,
  ADD COLUMN IF NOT EXISTS pickup_time TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS weight DECIMAL;

-- Add PortPro flag to shipment events
ALTER TABLE shipment_events
  ADD COLUMN IF NOT EXISTS portpro_event BOOLEAN DEFAULT FALSE;

-- Create index for PortPro reference lookups
CREATE INDEX IF NOT EXISTS idx_shipments_portpro_reference ON shipments(portpro_reference);
CREATE INDEX IF NOT EXISTS idx_shipments_portpro_load_id ON shipments(portpro_load_id);

-- Webhook logs table for debugging and auditing
CREATE TABLE IF NOT EXISTS portpro_webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  reference_number TEXT,
  payload JSONB NOT NULL,
  processed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for querying webhook logs
CREATE INDEX IF NOT EXISTS idx_portpro_logs_event_type ON portpro_webhook_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_portpro_logs_reference ON portpro_webhook_logs(reference_number);
CREATE INDEX IF NOT EXISTS idx_portpro_logs_created ON portpro_webhook_logs(created_at DESC);

-- Clean up old webhook logs (older than 30 days) - can be run periodically
-- DELETE FROM portpro_webhook_logs WHERE created_at < NOW() - INTERVAL '30 days';
