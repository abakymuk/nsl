-- Extended PortPro fields for shipments
-- Adds additional fields captured from PortPro TMS

-- Container type (HC = High Cube, ST = Standard, RF = Reefer)
ALTER TABLE shipments
  ADD COLUMN IF NOT EXISTS container_type TEXT;

-- Booking and shipping info
ALTER TABLE shipments
  ADD COLUMN IF NOT EXISTS booking_number TEXT,
  ADD COLUMN IF NOT EXISTS shipping_line TEXT;

-- Cargo info
ALTER TABLE shipments
  ADD COLUMN IF NOT EXISTS commodity TEXT;

-- Return location for empty container
ALTER TABLE shipments
  ADD COLUMN IF NOT EXISTS return_location TEXT;

-- Customer phone
ALTER TABLE shipments
  ADD COLUMN IF NOT EXISTS customer_phone TEXT;

-- Last free day (important for demurrage)
ALTER TABLE shipments
  ADD COLUMN IF NOT EXISTS last_free_day TIMESTAMPTZ;

-- Total miles
ALTER TABLE shipments
  ADD COLUMN IF NOT EXISTS total_miles DECIMAL;

-- Create indexes for commonly queried fields
CREATE INDEX IF NOT EXISTS idx_shipments_booking_number ON shipments(booking_number);
CREATE INDEX IF NOT EXISTS idx_shipments_shipping_line ON shipments(shipping_line);
