-- Migration: Enhanced tracking for container moves
-- Captures detailed tracking data like PortPro: moves, stops, times, distances, drivers

-- Add enhanced fields to load_events for detailed tracking
ALTER TABLE load_events ADD COLUMN IF NOT EXISTS event_type TEXT DEFAULT 'status_update';
ALTER TABLE load_events ADD COLUMN IF NOT EXISTS move_number INTEGER;
ALTER TABLE load_events ADD COLUMN IF NOT EXISTS stop_number INTEGER;
ALTER TABLE load_events ADD COLUMN IF NOT EXISTS stop_type TEXT; -- pickup, drop, hook, deliver, return
ALTER TABLE load_events ADD COLUMN IF NOT EXISTS location_name TEXT;
ALTER TABLE load_events ADD COLUMN IF NOT EXISTS location_address TEXT;
ALTER TABLE load_events ADD COLUMN IF NOT EXISTS driver_id TEXT;
ALTER TABLE load_events ADD COLUMN IF NOT EXISTS driver_name TEXT;
ALTER TABLE load_events ADD COLUMN IF NOT EXISTS driver_avatar TEXT;
ALTER TABLE load_events ADD COLUMN IF NOT EXISTS start_time TIMESTAMPTZ;
ALTER TABLE load_events ADD COLUMN IF NOT EXISTS arrival_time TIMESTAMPTZ;
ALTER TABLE load_events ADD COLUMN IF NOT EXISTS departure_time TIMESTAMPTZ;
ALTER TABLE load_events ADD COLUMN IF NOT EXISTS duration_minutes INTEGER;
ALTER TABLE load_events ADD COLUMN IF NOT EXISTS distance_miles DECIMAL(10,2);
ALTER TABLE load_events ADD COLUMN IF NOT EXISTS portpro_move_id TEXT;
ALTER TABLE load_events ADD COLUMN IF NOT EXISTS portpro_stop_id TEXT;

-- Add event_type constraint
ALTER TABLE load_events DROP CONSTRAINT IF EXISTS load_events_event_type_check;
ALTER TABLE load_events ADD CONSTRAINT load_events_event_type_check
  CHECK (event_type IN ('status_update', 'move_start', 'stop', 'document', 'note', 'exception'));

-- Add stop_type constraint
ALTER TABLE load_events DROP CONSTRAINT IF EXISTS load_events_stop_type_check;
ALTER TABLE load_events ADD CONSTRAINT load_events_stop_type_check
  CHECK (stop_type IS NULL OR stop_type IN ('pickup', 'drop', 'hook', 'deliver', 'return', 'yard', 'terminal'));

-- Create index for move lookups
CREATE INDEX IF NOT EXISTS idx_load_events_move ON load_events(load_id, move_number);
CREATE INDEX IF NOT EXISTS idx_load_events_type ON load_events(event_type);

-- Add driver assignment fields to loads table
ALTER TABLE loads ADD COLUMN IF NOT EXISTS assigned_driver_id TEXT;
ALTER TABLE loads ADD COLUMN IF NOT EXISTS assigned_driver_name TEXT;
ALTER TABLE loads ADD COLUMN IF NOT EXISTS current_move_number INTEGER DEFAULT 0;
ALTER TABLE loads ADD COLUMN IF NOT EXISTS total_distance_miles DECIMAL(10,2);
