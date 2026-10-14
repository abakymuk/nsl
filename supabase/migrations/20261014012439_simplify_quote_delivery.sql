BEGIN;
-- Retire browser access to the former portal without deleting historical data.
REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC, anon, authenticated;
-- Preserve backend access to defaults, including UUID extension functions.
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;

CREATE TABLE public.quote_rate_limits (
  identifier text PRIMARY KEY CHECK (length(identifier) = 64),
  window_start timestamptz NOT NULL,
  requests integer NOT NULL CHECK (requests > 0)
);
ALTER TABLE public.quote_rate_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.quote_rate_limits FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.quote_rate_limits TO service_role;

CREATE FUNCTION public.check_quote_rate_limit(p_identifier text)
RETURNS boolean LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE allowed boolean := false;
BEGIN
  DELETE FROM public.quote_rate_limits WHERE window_start < now() - interval '1 hour';
  INSERT INTO public.quote_rate_limits AS limits (identifier, window_start, requests)
    VALUES (p_identifier, now(), 1)
  ON CONFLICT (identifier) DO UPDATE SET
    requests = CASE WHEN limits.window_start <= now() - interval '1 minute' THEN 1 ELSE limits.requests + 1 END,
    window_start = CASE WHEN limits.window_start <= now() - interval '1 minute' THEN now() ELSE limits.window_start END
  WHERE limits.window_start <= now() - interval '1 minute' OR limits.requests < 5
  RETURNING true INTO allowed;
  RETURN coalesce(allowed, false);
END $$;
REVOKE ALL ON FUNCTION public.check_quote_rate_limit(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_quote_rate_limit(text) TO service_role;

-- The quote and its Slack job are committed in the same transaction.
CREATE OR REPLACE FUNCTION public.queue_quote_notifications()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  INSERT INTO public.notification_outbox(quote_id, channel) VALUES (NEW.id, 'slack');
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.queue_quote_notifications() FROM PUBLIC, anon, authenticated;

-- Old email/in-app jobs remain as history and are no longer claimed or sent.
CREATE OR REPLACE FUNCTION public.claim_quote_notifications(p_quote_id uuid DEFAULT NULL)
RETURNS SETOF public.notification_outbox LANGUAGE sql SECURITY INVOKER SET search_path = '' AS $$
  UPDATE public.notification_outbox SET available_at = now() + interval '5 minutes', attempts = attempts + 1
  WHERE id IN (SELECT id FROM public.notification_outbox WHERE channel = 'slack' AND delivered_at IS NULL
    AND available_at <= now() AND (p_quote_id IS NULL OR quote_id = p_quote_id)
    ORDER BY available_at LIMIT 20 FOR UPDATE SKIP LOCKED)
  RETURNING *;
$$;
REVOKE ALL ON FUNCTION public.claim_quote_notifications(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_quote_notifications(uuid) TO service_role;
COMMIT;
