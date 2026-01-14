-- ================================================
-- New Stream Logistics Database Schema
-- Run this in Supabase SQL Editor
-- ================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================================
-- QUOTES TABLE
-- Stores all quote requests from customers
-- ================================================
CREATE TABLE IF NOT EXISTS quotes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'quoted', 'accepted', 'rejected', 'completed', 'cancelled')),
  reference_number TEXT UNIQUE DEFAULT ('NSL-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0')),

  -- Contact info
  company_name TEXT,
  contact_name TEXT,
  email TEXT,
  phone TEXT,

  -- Container details
  container_number TEXT NOT NULL,
  container_size TEXT,
  container_type TEXT NOT NULL,
  weight_lbs INTEGER,
  is_hazmat BOOLEAN DEFAULT FALSE,
  is_overweight BOOLEAN DEFAULT FALSE,
  is_reefer BOOLEAN DEFAULT FALSE,

  -- Locations
  pickup_terminal TEXT NOT NULL,
  delivery_address TEXT,
  delivery_city TEXT,
  delivery_state TEXT,
  delivery_zip TEXT NOT NULL,

  -- Service details
  service_type TEXT DEFAULT 'standard',
  earliest_pickup DATE,
  latest_delivery DATE,
  lfd DATE,
  special_instructions TEXT,

  -- Quote response (filled by admin)
  quoted_price DECIMAL(10,2),
  quoted_at TIMESTAMPTZ,
  quoted_by TEXT,
  quote_notes TEXT,
  quote_valid_until DATE
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_quotes_container ON quotes(container_number);
CREATE INDEX IF NOT EXISTS idx_quotes_reference ON quotes(reference_number);
CREATE INDEX IF NOT EXISTS idx_quotes_status ON quotes(status);
CREATE INDEX IF NOT EXISTS idx_quotes_created ON quotes(created_at DESC);

-- ================================================
-- CONTACTS TABLE
-- Stores contact form submissions
-- ================================================
CREATE TABLE IF NOT EXISTS contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  company TEXT,
  subject TEXT,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'read', 'replied', 'archived'))
);

CREATE INDEX IF NOT EXISTS idx_contacts_status ON contacts(status);
CREATE INDEX IF NOT EXISTS idx_contacts_created ON contacts(created_at DESC);

-- ================================================
-- LOADS TABLE
-- Tracks active loads (drayage shipments)
-- ================================================
CREATE TABLE IF NOT EXISTS loads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quote_id UUID REFERENCES quotes(id) ON DELETE SET NULL,
  tracking_number TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Container details
  container_number TEXT NOT NULL,
  container_size TEXT,
  status TEXT DEFAULT 'booked' CHECK (status IN ('booked', 'dispatched', 'at_terminal', 'picked_up', 'in_transit', 'at_yard', 'out_for_delivery', 'delivered', 'completed', 'cancelled', 'exception')),

  -- Route
  origin TEXT,
  destination TEXT,
  eta TIMESTAMPTZ,
  pickup_time TIMESTAMPTZ,
  delivery_time TIMESTAMPTZ,
  current_location TEXT,

  -- Assignment
  driver_name TEXT,
  truck_number TEXT,

  -- Customer info
  customer_name TEXT,
  customer_email TEXT,

  -- Notes
  public_notes TEXT,
  internal_notes TEXT,

  -- PortPro integration
  portpro_reference TEXT,
  portpro_load_id TEXT,
  seal_number TEXT,
  chassis_number TEXT,
  weight INTEGER
);

CREATE INDEX IF NOT EXISTS idx_loads_container ON loads(container_number);
CREATE INDEX IF NOT EXISTS idx_loads_tracking ON loads(tracking_number);
CREATE INDEX IF NOT EXISTS idx_loads_status ON loads(status);
CREATE INDEX IF NOT EXISTS idx_loads_created ON loads(created_at DESC);

-- ================================================
-- LOAD EVENTS TABLE
-- Timeline of status updates for each load
-- ================================================
CREATE TABLE IF NOT EXISTS load_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  load_id UUID NOT NULL REFERENCES loads(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT NOT NULL,
  description TEXT,
  location TEXT,
  notes TEXT,
  created_by TEXT,
  portpro_event BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_load_events_load ON load_events(load_id);
CREATE INDEX IF NOT EXISTS idx_load_events_created ON load_events(created_at DESC);

-- ================================================
-- ROW LEVEL SECURITY (RLS)
-- ================================================

-- Enable RLS on all tables
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE loads ENABLE ROW LEVEL SECURITY;
ALTER TABLE load_events ENABLE ROW LEVEL SECURITY;

-- Service role policies (full access for server-side client)
CREATE POLICY "Service role can do everything on quotes" ON quotes
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role can do everything on contacts" ON contacts
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role can do everything on loads" ON loads
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role can do everything on load_events" ON load_events
  FOR ALL USING (true) WITH CHECK (true);

-- ================================================
-- FUNCTIONS
-- ================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER quotes_updated_at
  BEFORE UPDATE ON quotes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER loads_updated_at
  BEFORE UPDATE ON loads
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ================================================
-- DONE!
-- ================================================
