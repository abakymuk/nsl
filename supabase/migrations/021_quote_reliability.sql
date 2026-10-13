BEGIN;
-- Legacy trigger uses unqualified table names; pin its lookup path even when
-- called by the new RPCs, whose own search_path is empty.
ALTER FUNCTION public.log_quote_status_change() SET search_path = pg_catalog, public;
ALTER TABLE public.quotes DROP CONSTRAINT IF EXISTS quotes_status_check;
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS submission_key uuid UNIQUE;
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS submission_hash text;
-- Preserve completed legacy requests as accepted offers; delivery completion
-- belongs to loads. lifecycle_status is authoritative from this migration on.
UPDATE public.quotes SET lifecycle_status = CASE
  WHEN status = 'completed' THEN 'accepted'::public.quote_status
  ELSE lifecycle_status END;
UPDATE public.quotes SET status = lifecycle_status::text;
ALTER TABLE public.quotes ADD CONSTRAINT quotes_status_check
  CHECK (status IN ('pending','in_review','quoted','accepted','rejected','expired','cancelled'));

CREATE OR REPLACE FUNCTION public.enforce_quote_lifecycle()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.lifecycle_status = OLD.lifecycle_status
    AND NEW.status IS DISTINCT FROM OLD.status THEN
    NEW.lifecycle_status := NEW.status::public.quote_status;
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.lifecycle_status IS DISTINCT FROM OLD.lifecycle_status THEN
    IF NOT ((OLD.lifecycle_status = 'pending' AND NEW.lifecycle_status IN ('in_review','quoted','cancelled'))
      OR (OLD.lifecycle_status = 'in_review' AND NEW.lifecycle_status IN ('quoted','cancelled'))
      OR (OLD.lifecycle_status = 'quoted' AND NEW.lifecycle_status IN ('accepted','rejected','expired','cancelled'))
      OR (OLD.lifecycle_status = 'accepted' AND NEW.lifecycle_status = 'cancelled')) THEN
      RAISE EXCEPTION 'Invalid quote status transition' USING ERRCODE = '23514';
    END IF;
  END IF;
  NEW.status := NEW.lifecycle_status::text;
  IF NEW.lifecycle_status = 'quoted' THEN
    IF NEW.quoted_price IS NULL OR NEW.quoted_price <= 0 THEN
      RAISE EXCEPTION 'A positive quote price is required' USING ERRCODE = '23514';
    END IF;
    NEW.expires_at := coalesce(NEW.expires_at, now() + interval '7 days');
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER a_enforce_quote_lifecycle BEFORE INSERT OR UPDATE ON public.quotes
  FOR EACH ROW EXECUTE FUNCTION public.enforce_quote_lifecycle();

CREATE OR REPLACE FUNCTION public.check_load_quote()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE q public.quotes%ROWTYPE;
BEGIN
  IF NEW.quote_id IS NOT NULL THEN
    SELECT * INTO q FROM public.quotes WHERE id = NEW.quote_id FOR UPDATE;
    IF q.id IS NULL OR q.lifecycle_status <> 'accepted' THEN
      RAISE EXCEPTION 'An accepted quote is required' USING ERRCODE = '23514';
    END IF;
    NEW.organization_id := q.organization_id;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER check_load_quote BEFORE INSERT ON public.loads
  FOR EACH ROW EXECUTE FUNCTION public.check_load_quote();

CREATE TABLE public.notification_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  channel text NOT NULL CHECK (channel IN ('email','slack','in_app')),
  attempts integer NOT NULL DEFAULT 0,
  available_at timestamptz NOT NULL DEFAULT now(),
  delivered_at timestamptz,
  last_error text,
  UNIQUE (quote_id, channel)
);
ALTER TABLE public.notification_outbox ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.notification_outbox FROM anon, authenticated;
GRANT ALL ON public.notification_outbox TO service_role;
CREATE INDEX notification_outbox_pending ON public.notification_outbox(available_at)
  WHERE delivered_at IS NULL;

CREATE OR REPLACE FUNCTION public.queue_quote_notifications()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  INSERT INTO public.notification_outbox(quote_id, channel)
    VALUES (NEW.id, 'email'), (NEW.id, 'slack'), (NEW.id, 'in_app');
  RETURN NEW;
END $$;
CREATE TRIGGER queue_quote_notifications AFTER INSERT ON public.quotes
  FOR EACH ROW EXECUTE FUNCTION public.queue_quote_notifications();

CREATE OR REPLACE FUNCTION public.claim_quote_notifications(p_quote_id uuid DEFAULT NULL)
RETURNS SETOF public.notification_outbox LANGUAGE sql SECURITY DEFINER SET search_path = '' AS $$
  UPDATE public.notification_outbox SET available_at = now() + interval '5 minutes', attempts = attempts + 1
  WHERE id IN (SELECT id FROM public.notification_outbox WHERE delivered_at IS NULL
    AND available_at <= now() AND (p_quote_id IS NULL OR quote_id = p_quote_id)
    ORDER BY available_at LIMIT 20 FOR UPDATE SKIP LOCKED)
  RETURNING *;
$$;
REVOKE ALL ON FUNCTION public.claim_quote_notifications(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_quote_notifications(uuid) TO service_role;

-- Claim and acceptance are one transaction, including token consumption.
CREATE OR REPLACE FUNCTION public.respond_to_quote(p_token text, p_action text,
  p_signature text DEFAULT NULL, p_reason text DEFAULT NULL, p_ip inet DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE t public.quote_tokens%ROWTYPE; q public.quotes%ROWTYPE;
BEGIN
  SELECT * INTO t FROM public.quote_tokens WHERE token = p_token AND type = 'accept' FOR UPDATE;
  IF t.id IS NULL THEN RAISE EXCEPTION 'Invalid link' USING ERRCODE = '22023'; END IF;
  SELECT * INTO q FROM public.quotes WHERE id = t.quote_id FOR UPDATE;
  IF p_action NOT IN ('accept','reject') THEN RAISE EXCEPTION 'Invalid action' USING ERRCODE = '22023'; END IF;
  IF t.used_at IS NOT NULL AND ((p_action = 'accept' AND q.lifecycle_status = 'accepted')
    OR (p_action = 'reject' AND q.lifecycle_status = 'rejected')) THEN
    RETURN jsonb_build_object('id', q.id, 'reference_number', q.reference_number,
      'status', q.lifecycle_status, 'duplicate', true);
  END IF;
  IF t.used_at IS NOT NULL OR t.expires_at <= now() OR q.lifecycle_status <> 'quoted'
    OR q.expires_at <= now() THEN RAISE EXCEPTION 'Offer unavailable' USING ERRCODE = '22023'; END IF;
  IF p_action = 'accept' AND coalesce(length(trim(p_signature)), 0) = 0 THEN
    RAISE EXCEPTION 'Signature required' USING ERRCODE = '22023';
  END IF;
  IF p_action = 'reject' AND coalesce(length(trim(p_reason)), 0) = 0 THEN
    RAISE EXCEPTION 'Reason required' USING ERRCODE = '22023';
  END IF;
  UPDATE public.quotes SET
    lifecycle_status = CASE WHEN p_action = 'accept' THEN 'accepted'::public.quote_status ELSE 'rejected'::public.quote_status END,
    accepted_at = CASE WHEN p_action = 'accept' THEN now() ELSE NULL END,
    accepted_signature = CASE WHEN p_action = 'accept' THEN trim(p_signature) ELSE NULL END,
    accepted_ip = CASE WHEN p_action = 'accept' THEN p_ip ELSE NULL END,
    rejected_at = CASE WHEN p_action = 'reject' THEN now() ELSE NULL END,
    rejection_reason = CASE WHEN p_action = 'reject' THEN p_reason ELSE NULL END
    WHERE id = q.id RETURNING * INTO q;
  UPDATE public.quote_tokens SET used_at = now() WHERE id = t.id;
  INSERT INTO public.quote_audit_log(quote_id, action, old_status, new_status, actor_type, ip_address, metadata)
    VALUES(q.id, 'customer_' || CASE WHEN p_action = 'accept' THEN 'accepted' ELSE 'rejected' END,
      'quoted', q.lifecycle_status, 'customer', p_ip,
      jsonb_build_object('token_id', t.id, 'signature', p_signature, 'reason', p_reason));
  RETURN jsonb_build_object('id', q.id, 'reference_number', q.reference_number, 'status', q.lifecycle_status, 'duplicate', false);
END $$;
REVOKE ALL ON FUNCTION public.respond_to_quote(text,text,text,text,inet) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.respond_to_quote(text,text,text,text,inet) TO service_role;
COMMIT;
