-- Migration: Add billing fields for PortPro billing data
-- Adds billing_total and load_margin columns to track financial data from PortPro

-- Add billing columns to loads table
ALTER TABLE loads ADD COLUMN IF NOT EXISTS billing_total DECIMAL(10,2);
ALTER TABLE loads ADD COLUMN IF NOT EXISTS load_margin DECIMAL(10,2);

-- Create index for billing lookups (useful for reports/dashboards)
CREATE INDEX IF NOT EXISTS idx_loads_billing ON loads(billing_total) WHERE billing_total IS NOT NULL;
