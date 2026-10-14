-- Run after historical regression fixtures to verify preservation and retirement.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.quotes WHERE reference_number='Q1') THEN
    RAISE EXCEPTION 'Historical quote was lost';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.loads WHERE portpro_reference='REF1') THEN
    RAISE EXCEPTION 'Historical load was lost';
  END IF;
END $$;
SET ROLE authenticated;
DO $$ BEGIN
  BEGIN PERFORM * FROM public.loads; RAISE EXCEPTION 'Retired portal still reads loads';
    EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN PERFORM * FROM public.quotes; RAISE EXCEPTION 'Retired portal still reads quotes';
    EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN PERFORM public.check_quote_rate_limit(repeat('a',64)); RAISE EXCEPTION 'Public rate limiter access';
    EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
SET ROLE service_role;
DO $$ DECLARE i integer; q uuid; channels text[]; claimed integer; BEGIN
  FOR i IN 1..5 LOOP
    IF NOT public.check_quote_rate_limit(repeat('b',64)) THEN RAISE EXCEPTION 'Limit rejected too early'; END IF;
  END LOOP;
  IF public.check_quote_rate_limit(repeat('b',64)) THEN RAISE EXCEPTION 'Rate limit did not block'; END IF;
  UPDATE public.quote_rate_limits SET window_start=now()-interval '61 seconds' WHERE identifier=repeat('b',64);
  IF NOT public.check_quote_rate_limit(repeat('b',64)) THEN RAISE EXCEPTION 'Rate limit did not reset'; END IF;
  INSERT INTO public.quotes(company_name,delivery_zip,reference_number)
    VALUES ('Local test only','90210','SLACK-ONLY-TEST') RETURNING id INTO q;
  SELECT array_agg(channel) INTO channels FROM public.notification_outbox WHERE quote_id=q;
  IF channels <> ARRAY['slack'] THEN RAISE EXCEPTION 'Non-Slack notification enqueued'; END IF;
  SELECT count(*) INTO claimed FROM public.claim_quote_notifications(q);
  IF claimed <> 1 THEN RAISE EXCEPTION 'Slack job not claimed'; END IF;
  SELECT count(*) INTO claimed FROM public.claim_quote_notifications(q);
  IF claimed <> 0 THEN RAISE EXCEPTION 'Active lease claimed twice'; END IF;
  UPDATE public.notification_outbox SET available_at=now()-interval '1 second' WHERE quote_id=q;
  SELECT count(*) INTO claimed FROM public.claim_quote_notifications(q);
  IF claimed <> 1 THEN RAISE EXCEPTION 'Expired lease not retried'; END IF;
  UPDATE public.notification_outbox SET delivered_at=now(), available_at=now() WHERE quote_id=q;
  SELECT count(*) INTO claimed FROM public.claim_quote_notifications(q);
  IF claimed <> 0 THEN RAISE EXCEPTION 'Delivered job claimed again'; END IF;
  IF EXISTS (SELECT 1 FROM public.claim_quote_notifications() WHERE channel <> 'slack') THEN
    RAISE EXCEPTION 'Legacy channels still being delivered';
  END IF;
END $$;
RESET ROLE;
