BEGIN;
CREATE TABLE public.sync_cursors (name text PRIMARY KEY, offset_value integer NOT NULL DEFAULT 0);
ALTER TABLE public.sync_cursors ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.sync_cursors FROM anon, authenticated;
GRANT ALL ON public.sync_cursors TO service_role;
INSERT INTO public.sync_cursors(name) VALUES ('portpro');
ALTER TABLE public.loads ADD COLUMN IF NOT EXISTS portpro_updated_at timestamptz;
ALTER TABLE public.loads ALTER COLUMN container_number DROP NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS loads_portpro_reference_unique ON public.loads(portpro_reference);
CREATE TABLE public.portpro_processed_events (
  event_key text PRIMARY KEY,
  processed_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.portpro_processed_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.portpro_processed_events FROM anon, authenticated;
GRANT ALL ON public.portpro_processed_events TO service_role;

CREATE OR REPLACE FUNCTION public.apply_portpro_event(p_key text, p_reference text,
  p_patch jsonb, p_events jsonb, p_create boolean, p_updated_at timestamptz DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE l public.loads%ROWTYPE; event jsonb; assignments text;
BEGIN
  IF p_reference IS NULL OR length(p_reference) = 0 THEN RAISE EXCEPTION 'Missing reference'; END IF;
  -- Serializes webhook, retry and snapshot writers for the same load.
  PERFORM pg_advisory_xact_lock(hashtext(p_reference));
  IF EXISTS (SELECT 1 FROM public.portpro_processed_events WHERE event_key = p_key) THEN
    RETURN jsonb_build_object('duplicate', true, 'id', (SELECT id FROM public.loads WHERE portpro_reference = p_reference));
  END IF;
  SELECT * INTO l FROM public.loads WHERE portpro_reference = p_reference FOR UPDATE;
  IF l.id IS NULL THEN
    IF NOT p_create THEN RAISE EXCEPTION 'Load not yet available; retry event'; END IF;
    INSERT INTO public.loads(portpro_reference, tracking_number)
      VALUES(p_reference, 'NSL' || replace(gen_random_uuid()::text, '-', '')) RETURNING * INTO l;
  END IF;
  IF p_updated_at IS NULL OR l.portpro_updated_at IS NULL OR p_updated_at >= l.portpro_updated_at THEN
    IF EXISTS (SELECT 1 FROM jsonb_object_keys(p_patch) k WHERE k <> ALL(ARRAY[
      'portpro_load_id','container_number','container_size','container_type','status',
      'origin','destination','current_location','return_location','customer_name','customer_email','customer_phone',
      'booking_number','shipping_line','commodity','eta','last_free_day','pickup_time',
      'weight','seal_number','chassis_number','total_miles','billing_total','load_margin'])) THEN
      RAISE EXCEPTION 'Unsupported load field';
    END IF;
    SELECT string_agg(format('%1$I = (jsonb_populate_record(NULL::public.loads, $1)).%1$I', k), ', ')
      INTO assignments FROM jsonb_object_keys(p_patch) k;
    IF assignments IS NOT NULL THEN
      EXECUTE 'UPDATE public.loads SET ' || assignments || ' WHERE id = $2' USING p_patch, l.id;
    END IF;
    IF p_updated_at IS NOT NULL THEN
      UPDATE public.loads SET portpro_updated_at = p_updated_at WHERE id = l.id;
    END IF;
    FOR event IN SELECT * FROM jsonb_array_elements(p_events) LOOP
      INSERT INTO public.load_events(load_id, status, description, portpro_event)
        VALUES (l.id, event->>'status', event->>'description', true);
    END LOOP;
  END IF;
  INSERT INTO public.portpro_processed_events(event_key) VALUES(p_key);
  RETURN jsonb_build_object('duplicate', false, 'id', l.id);
END $$;
REVOKE ALL ON FUNCTION public.apply_portpro_event(text,text,jsonb,jsonb,boolean,timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_portpro_event(text,text,jsonb,jsonb,boolean,timestamptz) TO service_role;
CREATE OR REPLACE FUNCTION public.replace_portpro_tracking(p_load_id uuid, p_events jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  PERFORM 1 FROM public.loads WHERE id = p_load_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Load not found'; END IF;
  DELETE FROM public.load_events WHERE load_id = p_load_id AND event_type IN ('move_start','stop');
  INSERT INTO public.load_events(load_id, event_type, status, description, move_number, stop_number,
    driver_id, driver_name, driver_avatar, distance_miles, portpro_move_id, portpro_stop_id,
    stop_type, location_name, location_address, start_time, arrival_time, departure_time,
    duration_minutes, created_at, portpro_event)
  SELECT p_load_id, e.event_type, e.status, e.description, e.move_number, e.stop_number,
    e.driver_id, e.driver_name, e.driver_avatar, e.distance_miles, e.portpro_move_id, e.portpro_stop_id,
    e.stop_type, e.location_name, e.location_address, e.start_time, e.arrival_time, e.departure_time,
    e.duration_minutes, coalesce(e.created_at, now()), true
    FROM jsonb_populate_recordset(NULL::public.load_events, p_events) e;
END $$;
REVOKE ALL ON FUNCTION public.replace_portpro_tracking(uuid,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.replace_portpro_tracking(uuid,jsonb) TO service_role;
COMMIT;
