-- Comprehensive Notification System
-- Tracks employee notifications, preferences, and customer quote activity

-- =============================================================================
-- NOTIFICATIONS TABLE
-- Stores all notifications for employees
-- =============================================================================

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  entity_type TEXT CHECK (entity_type IN ('quote', 'load', 'customer')),
  entity_id UUID,
  metadata JSONB DEFAULT '{}',
  read_at TIMESTAMPTZ,
  dismissed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fetching user notifications efficiently
CREATE INDEX idx_notifications_recipient ON notifications(recipient_id, created_at DESC);
CREATE INDEX idx_notifications_unread ON notifications(recipient_id, read_at) WHERE read_at IS NULL;
CREATE INDEX idx_notifications_entity ON notifications(entity_type, entity_id);

-- =============================================================================
-- NOTIFICATION PREFERENCES TABLE
-- Per-employee notification settings
-- =============================================================================

CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE UNIQUE,
  -- Channel toggles: {"in_app": true, "email": true, "slack": true}
  channels JSONB DEFAULT '{"in_app": true, "email": true, "slack": true}',
  -- Per-event overrides: {"quote_accepted": {"email": false}, ...}
  event_settings JSONB DEFAULT '{}',
  -- Quiet hours: {"enabled": true, "start": "22:00", "end": "08:00", "timezone": "America/Los_Angeles"}
  quiet_hours JSONB DEFAULT '{"enabled": false}',
  -- Minimum priority for immediate email (skip digest)
  email_priority_threshold TEXT DEFAULT 'high' CHECK (email_priority_threshold IN ('low', 'normal', 'high', 'urgent')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger to update updated_at
CREATE TRIGGER notification_preferences_updated_at
  BEFORE UPDATE ON notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_employees_updated_at();

-- =============================================================================
-- QUOTE ACTIVITY LOG TABLE
-- Tracks customer interactions with quotes (page views, email opens, etc.)
-- =============================================================================

CREATE TABLE IF NOT EXISTS quote_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL CHECK (activity_type IN (
    'email_sent',
    'email_opened',
    'status_viewed',
    'accept_page_viewed',
    'acceptance_started',
    'accepted',
    'rejected'
  )),
  ip_address TEXT,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fetching quote activity timeline
CREATE INDEX idx_quote_activity_quote ON quote_activity_log(quote_id, created_at DESC);
CREATE INDEX idx_quote_activity_type ON quote_activity_log(activity_type, created_at DESC);

-- =============================================================================
-- NOTIFICATION DIGEST TABLE
-- Queues low-priority notifications for daily digest
-- =============================================================================

CREATE TABLE IF NOT EXISTS notification_digest_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  scheduled_for DATE DEFAULT CURRENT_DATE + 1,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_digest_queue_pending ON notification_digest_queue(scheduled_for, sent_at) WHERE sent_at IS NULL;
CREATE INDEX idx_digest_queue_employee ON notification_digest_queue(employee_id, scheduled_for);

-- =============================================================================
-- RLS POLICIES
-- =============================================================================

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_digest_queue ENABLE ROW LEVEL SECURITY;

-- Notifications: employees can only see their own
CREATE POLICY "Employees can view own notifications"
  ON notifications
  FOR SELECT
  USING (
    recipient_id IN (
      SELECT id FROM employees WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Employees can update own notifications"
  ON notifications
  FOR UPDATE
  USING (
    recipient_id IN (
      SELECT id FROM employees WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    recipient_id IN (
      SELECT id FROM employees WHERE user_id = auth.uid()
    )
  );

-- Super admins can manage all notifications
CREATE POLICY "Super admins can manage all notifications"
  ON notifications
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );

-- Notification preferences: employees can manage their own
CREATE POLICY "Employees can view own preferences"
  ON notification_preferences
  FOR SELECT
  USING (
    employee_id IN (
      SELECT id FROM employees WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Employees can update own preferences"
  ON notification_preferences
  FOR UPDATE
  USING (
    employee_id IN (
      SELECT id FROM employees WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    employee_id IN (
      SELECT id FROM employees WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Employees can insert own preferences"
  ON notification_preferences
  FOR INSERT
  WITH CHECK (
    employee_id IN (
      SELECT id FROM employees WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Super admins can manage all preferences"
  ON notification_preferences
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );

-- Quote activity log: employees with quotes permission can view
CREATE POLICY "Employees with quotes access can view activity"
  ON quote_activity_log
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM employees
      WHERE employees.user_id = auth.uid()
      AND employees.is_active = true
      AND 'quotes' = ANY(employees.permissions)
    )
    OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );

-- Super admins can manage all activity logs
CREATE POLICY "Super admins can manage quote activity"
  ON quote_activity_log
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );

-- Digest queue: same as notifications
CREATE POLICY "Employees can view own digest queue"
  ON notification_digest_queue
  FOR SELECT
  USING (
    employee_id IN (
      SELECT id FROM employees WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Super admins can manage digest queue"
  ON notification_digest_queue
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );

-- =============================================================================
-- SERVICE ROLE POLICIES (for API routes)
-- =============================================================================

-- Allow service role to insert notifications (for API triggers)
CREATE POLICY "Service role can insert notifications"
  ON notifications
  FOR INSERT
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role can insert activity logs"
  ON quote_activity_log
  FOR INSERT
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role can manage digest queue"
  ON notification_digest_queue
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- =============================================================================
-- CLEANUP FUNCTION (90-day retention)
-- =============================================================================

CREATE OR REPLACE FUNCTION cleanup_old_notifications()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  WITH deleted AS (
    DELETE FROM notifications
    WHERE created_at < NOW() - INTERVAL '90 days'
    AND read_at IS NOT NULL
    RETURNING id
  )
  SELECT COUNT(*) INTO deleted_count FROM deleted;

  -- Also clean up old activity logs (keep 90 days)
  DELETE FROM quote_activity_log
  WHERE created_at < NOW() - INTERVAL '90 days';

  -- Clean up sent digest entries
  DELETE FROM notification_digest_queue
  WHERE sent_at IS NOT NULL
  AND sent_at < NOW() - INTERVAL '7 days';

  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- REALTIME SUBSCRIPTIONS
-- =============================================================================

-- Enable realtime for notifications table
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON TABLE notifications IS 'Employee notifications for business events';
COMMENT ON TABLE notification_preferences IS 'Per-employee notification channel and timing preferences';
COMMENT ON TABLE quote_activity_log IS 'Customer journey tracking for quotes (views, opens, actions)';
COMMENT ON TABLE notification_digest_queue IS 'Queue for batched daily digest emails';
COMMENT ON FUNCTION cleanup_old_notifications() IS 'Cleans up notifications older than 90 days. Run via cron.';
