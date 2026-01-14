-- Migration: Rename shipments to loads
-- This aligns with industry-standard drayage terminology

-- Rename tables
ALTER TABLE IF EXISTS shipments RENAME TO loads;
ALTER TABLE IF EXISTS shipment_events RENAME TO load_events;

-- Rename foreign key column in load_events
ALTER TABLE IF EXISTS load_events RENAME COLUMN shipment_id TO load_id;

-- Drop old RLS policies if they exist
DROP POLICY IF EXISTS "Users can view their organization's shipments" ON loads;
DROP POLICY IF EXISTS "Users can insert shipments for their organization" ON loads;
DROP POLICY IF EXISTS "Users can update their organization's shipments" ON loads;
DROP POLICY IF EXISTS "Users can view their organization's shipment events" ON load_events;
DROP POLICY IF EXISTS "Users can insert shipment events for their organization" ON load_events;

-- Note: RLS policies for user access are handled at application level via Clerk auth
-- Service role has full access via existing policies

-- Rename indexes
ALTER INDEX IF EXISTS shipments_pkey RENAME TO loads_pkey;
ALTER INDEX IF EXISTS shipments_tracking_number_key RENAME TO loads_tracking_number_key;
ALTER INDEX IF EXISTS shipments_organization_id_idx RENAME TO loads_organization_id_idx;
ALTER INDEX IF EXISTS shipment_events_pkey RENAME TO load_events_pkey;
ALTER INDEX IF EXISTS shipment_events_shipment_id_idx RENAME TO load_events_load_id_idx;
