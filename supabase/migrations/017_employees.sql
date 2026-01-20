-- Employees table for role-based access control
-- Employees have limited admin access based on assigned permissions

CREATE TABLE IF NOT EXISTS employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  permissions TEXT[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Index for quick lookups by user_id
CREATE INDEX IF NOT EXISTS idx_employees_user_id ON employees(user_id);

-- Index for filtering active employees
CREATE INDEX IF NOT EXISTS idx_employees_active ON employees(is_active) WHERE is_active = true;

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_employees_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER employees_updated_at
  BEFORE UPDATE ON employees
  FOR EACH ROW
  EXECUTE FUNCTION update_employees_updated_at();

-- RLS policies
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

-- Super admins can do everything
CREATE POLICY "Super admins can manage employees"
  ON employees
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );

-- Employees can read their own record
CREATE POLICY "Employees can read own record"
  ON employees
  FOR SELECT
  USING (user_id = auth.uid());

-- Comment on table
COMMENT ON TABLE employees IS 'Admin employees with module-based permissions';
COMMENT ON COLUMN employees.permissions IS 'Array of module names: dashboard, quotes, loads, customers, analytics, sync';
