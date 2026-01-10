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

  -- Contact info (optional for anonymous quotes)
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
-- SHIPMENTS TABLE
-- Tracks active shipments
-- ================================================
CREATE TABLE IF NOT EXISTS shipments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quote_id UUID REFERENCES quotes(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  container_number TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'picked_up', 'in_transit', 'out_for_delivery', 'delivered', 'exception')),

  pickup_time TIMESTAMPTZ,
  delivery_time TIMESTAMPTZ,
  current_location TEXT,
  driver_name TEXT,
  truck_number TEXT,

  -- Customer can see these
  public_notes TEXT,
  -- Internal notes (admin only)
  internal_notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_shipments_container ON shipments(container_number);
CREATE INDEX IF NOT EXISTS idx_shipments_status ON shipments(status);

-- ================================================
-- SHIPMENT EVENTS TABLE
-- Timeline of status updates for each shipment
-- ================================================
CREATE TABLE IF NOT EXISTS shipment_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shipment_id UUID NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT NOT NULL,
  location TEXT,
  notes TEXT,
  created_by TEXT
);

CREATE INDEX IF NOT EXISTS idx_events_shipment ON shipment_events(shipment_id);
CREATE INDEX IF NOT EXISTS idx_events_created ON shipment_events(created_at DESC);

-- ================================================
-- ROW LEVEL SECURITY (RLS)
-- ================================================

-- Enable RLS on all tables
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipment_events ENABLE ROW LEVEL SECURITY;

-- For now, allow service role full access (we'll add user policies later)
-- These policies allow the server-side client to perform all operations

CREATE POLICY "Service role can do everything on quotes" ON quotes
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role can do everything on contacts" ON contacts
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role can do everything on shipments" ON shipments
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role can do everything on shipment_events" ON shipment_events
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

CREATE TRIGGER shipments_updated_at
  BEFORE UPDATE ON shipments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ================================================
-- DONE!
-- ================================================
