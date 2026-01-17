-- Migration: Enable Supabase Realtime and add sync status tracking
-- This enables real-time updates for loads and load_events tables

-- Enable realtime for loads table
ALTER PUBLICATION supabase_realtime ADD TABLE loads;

-- Enable realtime for load_events table
ALTER PUBLICATION supabase_realtime ADD TABLE load_events;

-- Create sync_status table for tracking sync operations
CREATE TABLE IF NOT EXISTS sync_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_type TEXT NOT NULL, -- 'webhook', 'reconcile', 'manual'
  status TEXT NOT NULL DEFAULT 'running', -- 'running', 'completed', 'failed'
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  records_processed INTEGER DEFAULT 0,
  records_failed INTEGER DEFAULT 0,
  error_message TEXT,
  metadata JSONB
);

-- Add check constraint for sync_type
ALTER TABLE sync_status ADD CONSTRAINT sync_status_type_check
  CHECK (sync_type IN ('webhook', 'reconcile', 'manual', 'dlq_retry'));

-- Add check constraint for status
ALTER TABLE sync_status ADD CONSTRAINT sync_status_status_check
  CHECK (status IN ('running', 'completed', 'failed'));

-- Create index for recent syncs lookup
CREATE INDEX IF NOT EXISTS idx_sync_status_started ON sync_status(started_at DESC);

-- Create index for sync type filtering
CREATE INDEX IF NOT EXISTS idx_sync_status_type ON sync_status(sync_type);

-- Add comment for documentation
COMMENT ON TABLE sync_status IS 'Tracks PortPro sync operations for monitoring and debugging';
